import { createAction } from "spinai";
import type { ReviewState } from "../types";
import { Octokit } from "@octokit/rest";

export const createDocsPR = createAction({
  id: "createDocsPR",
  description: "Creates a pull request with documentation updates",
  parameters: { type: "object", properties: {}, required: [] },
  async run({ context }) {
    console.log("\n=== CreateDocsPR: Starting ===");

    if (!process.env.GITHUB_TOKEN) {
      console.error("GITHUB_TOKEN environment variable is missing");
      throw new Error("GITHUB_TOKEN environment variable is required");
    }

    const state = context.state as ReviewState;
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    if (!state.generatedContent) {
      throw new Error("No generated content found. Please generate content first.");
    }
    if (!state.updatePlan) {
      throw new Error("Update plan must be created before creating PR");
    }

    console.log("\n=== Creating Documentation PR ===");

    // Get docs repository info
    const docsRepo = state.docsRepo || {
      owner: state.owner,
      repo: state.repo,
      branch: "main",
    };

    console.log(`Docs Repository: ${docsRepo.owner}/${docsRepo.repo}`);
    console.log(`Base Branch: ${docsRepo.branch}`);

    const { files, navigationUpdate } = state.generatedContent;
    console.log("Files to process:", files.length);
    console.log("Navigation update:", navigationUpdate ? "Yes" : "No");

    if (files.length === 0 && !navigationUpdate) {
      console.log("No updates to process, skipping PR creation");
      return {
        prNumber: 0,
        prUrl: "",
        branch: "",
        files: [],
      };
    }

    // Get the original PR details if available
    if (state.pull_number) {
      console.log("Fetching original PR details...");
      try {
        const { data: pr } = await octokit.pulls.get({
          owner: state.owner,
          repo: state.repo,
          pull_number: state.pull_number,
        });
        console.log("Original PR found:", pr.title);
      } catch (error) {
        console.log("Could not fetch original PR details");
      }
    }

    // Create a new branch for the PR
    const timestamp = Math.floor(Date.now() / 1000);
    const branchName = `${state.config.prConfig.branchPrefix}${state.pull_number}-${timestamp}`;
    console.log(`Creating branch: ${branchName}`);

    // Get the SHA of the base branch
    console.log("Getting base branch SHA...");
    const { data: refData } = await octokit.git.getRef({
      owner: docsRepo.owner,
      repo: docsRepo.repo,
      ref: `heads/${docsRepo.branch}`,
    });
    const baseSha = refData.object.sha;
    console.log("Base branch SHA:", baseSha);

    // Create the new branch
    console.log("Creating new branch from SHA...");
    await octokit.git.createRef({
      owner: docsRepo.owner,
      repo: docsRepo.repo,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });
    console.log("New branch created successfully");

    // Commit changes to the new branch
    console.log("\n=== Processing Documentation Updates ===");
    for (const file of state.generatedContent.files) {
      console.log(`\nProcessing update for file: ${file.path}`);
      
      try {
        // Check if file exists
        let existingFile;
        try {
          console.log("Checking if file exists...");
          const { data } = await octokit.repos.getContent({
            owner: docsRepo.owner,
            repo: docsRepo.repo,
            path: file.path,
            ref: branchName,
          });
          existingFile = data;
          console.log("File exists - will update");
        } catch (error) {
          // File doesn't exist, which is fine for new files
          console.log("File doesn't exist - will create new file");
        }

        // Create or update the file
        console.log(existingFile ? "Updating existing file..." : "Creating new file...");
        await octokit.repos.createOrUpdateFileContents({
          owner: docsRepo.owner,
          repo: docsRepo.repo,
          path: file.path,
          message: `${file.type === "create" ? "Add" : "Update"} ${file.path}`,
          content: Buffer.from(file.content).toString("base64"),
          branch: branchName,
          sha: existingFile && "sha" in existingFile ? existingFile.sha : undefined,
        });
        console.log("File operation completed successfully");
      } catch (error) {
        console.error(`Error committing ${file.path}:`, error);
      }
    }

    // Update navigation if needed
    if (state.generatedContent.navigationUpdate) {
      console.log("\nProcessing navigation update");
      try {
        console.log("Checking for existing navigation file...");
        const { data: navFile } = await octokit.repos.getContent({
          owner: docsRepo.owner,
          repo: docsRepo.repo,
          path: state.generatedContent.navigationUpdate.path,
          ref: branchName,
        });

        if ("sha" in navFile) {
          console.log("Updating navigation structure...");
          await octokit.repos.createOrUpdateFileContents({
            owner: docsRepo.owner,
            repo: docsRepo.repo,
            path: state.generatedContent.navigationUpdate.path,
            message: "Update navigation structure",
            content: Buffer.from(state.generatedContent.navigationUpdate.content).toString("base64"),
            branch: branchName,
            sha: navFile.sha,
          });
          
          console.log("Updated navigation structure");
        }
      } catch (error) {
        console.error("Error updating navigation:", error);
      }
    }

    // Create the pull request
    console.log("\n=== Creating Pull Request ===");
    const prTitle = state.config.prConfig.titleTemplate
      .replace("{{PR_NUMBER}}", state.pull_number.toString())
      .replace("{{TIMESTAMP}}", new Date().toISOString().split("T")[0]);
    console.log("PR Title:", prTitle);

    const prBody = state.config.prConfig.bodyTemplate
      .replace("{{PR_NUMBER}}", state.pull_number.toString())
      .replace(
        "{{SUMMARY}}",
        state.updatePlan?.summary || "Documentation updates"
      );

    console.log(`Creating PR: ${prTitle}`);
    
    const { data: pr } = await octokit.pulls.create({
      owner: docsRepo.owner,
      repo: docsRepo.repo,
      title: prTitle,
      body: prBody,
      head: branchName,
      base: docsRepo.branch,
    });
    console.log("Pull request created:", pr.html_url);

    // Add labels if configured
    if (state.config.prConfig.labels.length > 0) {
      console.log("Adding labels to PR...");
      await octokit.issues.addLabels({
        owner: docsRepo.owner,
        repo: docsRepo.repo,
        issue_number: pr.number,
        labels: state.config.prConfig.labels,
      });
      console.log("Labels added successfully");
    }

    // Add a comment to the original PR if we have one
    if (state.pull_number) {
      console.log("Adding comment to original PR...");
      try {
        await octokit.issues.createComment({
          owner: state.owner,
          repo: state.repo,
          issue_number: state.pull_number,
          body: `I've created a documentation update PR: ${pr.html_url}`,
        });
        console.log("Comment added successfully");
      } catch (error) {
        console.error("Failed to add comment to original PR:", error);
      }
    }

    console.log("\n=== CreateDocsPR: Completed Successfully ===");

    return {
      prNumber: pr.number,
      prUrl: pr.html_url,
      branch: branchName,
      files: state.generatedContent.files.map((f) => f.path),
    };
  },
});
