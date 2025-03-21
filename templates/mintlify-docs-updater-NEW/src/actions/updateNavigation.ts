import { createAction } from "spinai";
import type { ReviewState, NavigationItem } from "../types";
import { Octokit } from "@octokit/rest";

// Helper function to get mint.json content from different possible locations
async function getMintJsonContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  docsPath: string
): Promise<{ content: string; path: string; sha: string }> {
  // Try first in the docs directory (monorepo case)
  const mintJsonPath = `${docsPath}/mint.json`;
  console.log("Looking for mint.json at:", mintJsonPath);

  try {
    const { data: mintJsonData } = await octokit.repos.getContent({
      owner,
      repo,
      path: mintJsonPath,
      ref: branch,
    });

    if (!("content" in mintJsonData)) {
      throw new Error("mint.json not found or is a directory");
    }

    return {
      content: Buffer.from(mintJsonData.content, "base64").toString("utf-8"),
      path: mintJsonPath,
      sha: mintJsonData.sha,
    };
  } catch (error: any) {
    if (error.status === 404) {
      // If not found in docs directory, try at root (regular Mintlify case)
      console.log("mint.json not found in docs directory, trying root...");
      try {
        const { data: rootMintJsonData } = await octokit.repos.getContent({
          owner,
          repo,
          path: "mint.json",
          ref: branch,
        });

        if (!("content" in rootMintJsonData)) {
          throw new Error("mint.json not found or is a directory");
        }

        return {
          content: Buffer.from(rootMintJsonData.content, "base64").toString(
            "utf-8"
          ),
          path: "mint.json",
          sha: rootMintJsonData.sha,
        };
      } catch (error: any) {
        console.error("mint.json not found in root directory either");
        throw error;
      }
    }
    throw error;
  }
}

// Helper function to apply navigation changes
function applyNavigationChanges(
  navigation: NavigationItem[],
  changes: Array<{
    type: "add" | "move" | "remove";
    page: string;
    group: string;
  }>
): NavigationItem[] {
  const updatedNavigation = [...navigation];

  for (const change of changes) {
    // Find or create the target group
    let groupIndex = updatedNavigation.findIndex(
      (item) => item.group.toLowerCase() === change.group.toLowerCase()
    );

    if (groupIndex === -1 && change.type === "add") {
      // Create new group if adding a page
      updatedNavigation.push({
        group: change.group,
        pages: [],
      });
      groupIndex = updatedNavigation.length - 1;
    }

    if (groupIndex === -1) {
      console.log(
        `Warning: Group '${change.group}' not found for operation: ${change.type}`
      );
      continue;
    }

    const group = updatedNavigation[groupIndex];

    switch (change.type) {
      case "add":
        if (!group.pages.includes(change.page)) {
          group.pages.push(change.page);
        }
        break;

      case "remove":
        group.pages = group.pages.filter((page) => page !== change.page);
        // Remove empty groups
        if (group.pages.length === 0) {
          updatedNavigation.splice(groupIndex, 1);
        }
        break;

      case "move":
        // Handle moves between groups in a separate pass to avoid conflicts
        const sourceGroupIndex = updatedNavigation.findIndex((item) =>
          item.pages.includes(change.page)
        );
        if (sourceGroupIndex !== -1 && sourceGroupIndex !== groupIndex) {
          // Remove from source group
          updatedNavigation[sourceGroupIndex].pages = updatedNavigation[
            sourceGroupIndex
          ].pages.filter((page) => page !== change.page);
          // Add to target group
          if (!group.pages.includes(change.page)) {
            group.pages.push(change.page);
          }
          // Remove empty source group
          if (updatedNavigation[sourceGroupIndex].pages.length === 0) {
            updatedNavigation.splice(sourceGroupIndex, 1);
          }
        }
        break;
    }
  }

  return updatedNavigation;
}

export const updateNavigation = createAction({
  id: "updateNavigation",
  description: "Updates the navigation structure in mint.json",
  parameters: { type: "object", properties: {}, required: [] },
  async run({ context }) {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }

    const state = context.state as ReviewState;
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    if (!state.updatePlan) {
      throw new Error("Update plan must be created before updating navigation");
    }
    if (!state.docStructure) {
      throw new Error(
        "Documentation structure must be analyzed before updating navigation"
      );
    }
    
    console.log("\n=== Updating Navigation Structure ===");
    
    if (!state.updatePlan.navigationChanges || state.updatePlan.navigationChanges.length === 0) {
      console.log("No navigation changes required.");
      return null;
    }

    // Get docs repository info
    const docsRepo = state.docsRepo || {
      owner: state.owner,
      repo: state.repo,
      branch: "main",
    };
    
    // Collect all navigation changes
    const allChanges = state.updatePlan.navigationChanges.flatMap(group => 
      group.changes.map(change => ({
        ...change,
        group: group.group,
      }))
    );

    console.log(`Found ${allChanges.length} navigation changes to process`);

    try {
      // Get current mint.json content using the helper function
      const { content: mintJsonContent, path: mintJsonPath, sha } = 
        await getMintJsonContent(
          octokit,
          docsRepo.owner,
          docsRepo.repo,
          docsRepo.branch,
          state.config.docsPath
        );

      // Parse the mint.json file
      const mintJson = JSON.parse(mintJsonContent);
      
      if (!mintJson.navigation || !Array.isArray(mintJson.navigation)) {
        console.log("No navigation array found in mint.json");
        return null;
      }

      console.log("Current navigation structure:");
      console.log(`- Groups: ${mintJson.navigation.length}`);
      
      // Apply changes to the navigation structure using the helper function
      const updatedNavigation = applyNavigationChanges(
        mintJson.navigation,
        allChanges
      );
      
      // Check if navigation was actually modified
      if (JSON.stringify(mintJson.navigation) === JSON.stringify(updatedNavigation)) {
        console.log("No changes made to navigation structure");
        return null;
      }
      
      // Update navigation in mint.json
      mintJson.navigation = updatedNavigation;
      
      // Format the updated mint.json with proper indentation
      const updatedContent = JSON.stringify(mintJson, null, 2);

      console.log("\n=== Navigation Update Summary ===");
      console.log("Changes applied:", allChanges.length);
      allChanges.forEach((change) => {
        console.log(
          `- ${change.type}: ${change.page} in group '${change.group}'`
        );
      });

      // Return the navigation update info
      return {
        path: mintJsonPath,
        content: updatedContent,
        changes: allChanges,
      };
    } catch (error) {
      console.error("Error updating navigation:", error);
      return null;
    }
  },
});
