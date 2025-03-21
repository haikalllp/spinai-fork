import { createAction } from "spinai";
import type {
  ReviewState,
  GeneratedContent,
  PlannedDocUpdate,
  DocStructure, 
  CodeAnalysis
} from "../types";
import { Octokit } from "@octokit/rest";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { ai } from "../utils/ai";

// Helper function to find a template file to use for new content
async function findTemplateFile(
  docStructure: DocStructure,
  update: PlannedDocUpdate
): Promise<string | null> {
  // Look for similar files in the same category
  const category = update.path.split("/").slice(-2, -1)[0];
  const similarFiles = docStructure.files.filter(
    (file) => file.category === category && file.path !== update.path
  );

  if (similarFiles.length > 0) {
    return similarFiles[0].path;
  }

  return null;
}

// Function to generate content for a single file
async function generateFileContent(
  update: PlannedDocUpdate,
  docStructure: DocStructure,
  codeAnalysis: CodeAnalysis,
  existingContent: string | null,
  templateContent: string | null,
  config: ReviewState["config"]
): Promise<string> {
  const { text: content } = await generateText({
    model: ai("gpt-4-turbo-preview"),
    temperature: config.llmConfig?.temperature || 0.3,
    messages: [
      {
        role: "system",
        content: `You are a technical documentation expert specializing in Mintlify MDX documentation.
Your task is to ${update.type === "create" ? "create new" : "update existing"} documentation based on code changes.

MDX Formatting Rules:
1. Use {/* */} for comments, not HTML <!-- --> style
2. Always add a blank line before and after code blocks
3. Ensure code blocks have proper language tags:
   \`\`\`typescript
   // code here
   \`\`\`
4. Use proper heading spacing: "## Heading" not "##Heading"
5. Keep consistent newline spacing - one blank line between sections
6. Use proper MDX components for callouts, tabs, etc.
7. Start with frontmatter (---) containing title and description
8. IMPORTANT: Return the MDX content directly, do not wrap in backticks

Content Guidelines:
- Be precise and technical in descriptions
- Include code examples where relevant
- Follow existing documentation style
- Maintain any existing metadata and tags
- If documenting APIs, include:
  - Function signatures
  - Parameter descriptions
  - Return types
  - Usage examples
${config.llmConfig?.styleGuide ? `\nStyle Guide:\n${config.llmConfig.styleGuide}` : ""}`,
      },
      {
        role: "user",
        content: `Task: ${update.type === "create" ? "Create new" : "Update"} documentation file at ${update.path}

Context:
${update.reason}

Source Files:
${update.sourceFiles
  .map((file) => {
    const change = codeAnalysis.changes.find((c) => c.file === file);
    return `
File: ${file}
Type: ${change?.type || "unknown"}
Patch:
\`\`\`diff
${change?.patch || ""}
\`\`\`
`;
  })
  .join("\n")}

${templateContent ? `Template to follow:\n${templateContent}\n` : ""}
${existingContent ? `Current content to update:\n${existingContent}\n` : ""}

Suggested Structure:
${update.suggestedContent ? JSON.stringify(update.suggestedContent, null, 2) : "Standard documentation structure"}

Related Documentation:
${
  update.relatedDocs
    ?.map((doc) => {
      const existing = docStructure.files.find((f) => f.path === doc);
      return `- ${doc}${existing ? " (exists)" : " (planned)"}`;
    })
    .join("\n") || "No related documentation"
}

Please provide the complete MDX content for this documentation file.
Remember: Return the content directly, starting with frontmatter (---). Do not wrap in backticks.`,
      },
    ],
  });

  if (!content) {
    throw new Error("Failed to generate content");
  }

  // Clean up any accidental backtick wrapping
  return content.replace(/^```mdx?\n|```$/g, "").trim();
}

export const generateContent = createAction({
  id: "generateContent",
  description: "Generates content for documentation updates based on the plan",
  parameters: { type: "object", properties: {}, required: [] },
  async run({ context }) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    if (!process.env.GITHUB_TOKEN) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }

    const state = context.state as ReviewState;
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    if (!state.updatePlan) {
      throw new Error("No update plan found. Please create a plan first.");
    }
    if (!state.docStructure) {
      throw new Error("No documentation structure found. Please analyze docs first.");
    }
    if (!state.codeAnalysis) {
      throw new Error("No code analysis found. Please analyze code first.");
    }

    console.log("\n=== Generating Documentation Content ===");
    
    // Get the repository info for fetching code context
    const repoInfo = {
      owner: state.owner,
      repo: state.repo,
    };
    
    const generatedFiles = [];
    
    // Process each planned update
    for (const update of state.updatePlan.updates) {
      console.log(`\nProcessing: ${update.path}`);
      console.log(`Type: ${update.type}`);
      console.log(`Priority: ${update.priority}`);
      
      let existingContent = null;
      let templateContent = null;
      
      // Get existing content if updating
      if (update.type === "update") {
        try {
          const docsRepo = state.docsRepo || repoInfo;
          const { data } = await octokit.repos.getContent({
            owner: docsRepo.owner,
            repo: docsRepo.repo,
            path: update.path,
            ref: state.docsRepo?.branch || "main",
          });
          
          if ("content" in data) {
            existingContent = Buffer.from(data.content, "base64").toString("utf-8");
            console.log("Found existing content");
          }
        } catch (error) {
          console.log("No existing content found");
        }
      }
      
      // Find a template file if creating new content
      if (update.type === "create") {
        const templatePath = await findTemplateFile(state.docStructure, update);
        if (templatePath) {
          try {
            const docsRepo = state.docsRepo || repoInfo;
            const { data: fileData } = await octokit.repos.getContent({
              owner: docsRepo.owner,
              repo: docsRepo.repo,
              path: templatePath,
              ref: state.docsRepo?.branch || "main",
            });

            if ("content" in fileData) {
              templateContent = Buffer.from(fileData.content, "base64").toString("utf-8");
              console.log("Found template:", templatePath);
            }
          } catch (error) {
            console.log("No template found");
          }
        }
      }
      
      // Get source file content for context
      const sourceContent = [];
      for (const file of update.sourceFiles) {
        try {
          const { data } = await octokit.repos.getContent({
            ...repoInfo,
            path: file,
            ref: `refs/pull/${state.pull_number}/head`,
          });
          
          if ("content" in data) {
            sourceContent.push({
              file,
              content: Buffer.from(data.content, "base64").toString("utf-8"),
            });
          }
        } catch (error) {
          console.warn(`Could not fetch ${file}:`, error);
        }
      }
      
      // Generate content
      const content = await generateFileContent(
        update,
        state.docStructure,
        state.codeAnalysis,
        existingContent,
        templateContent,
        state.config
      );
      
      generatedFiles.push({
        path: update.path,
        content,
        type: update.type,
        reason: update.reason,
      });
    }
    
    // Generate navigation updates if needed
    let navigationUpdate;
    if (state.updatePlan.navigationChanges && state.updatePlan.navigationChanges.length > 0) {
      // This is handled by the updateNavigation action
      console.log("Navigation changes will be processed by the updateNavigation action");
    }
    
    // Create the final generated content
    const generatedContent: GeneratedContent = {
      files: generatedFiles,
      navigationUpdate,
    };
    
    // Store content in state
    state.generatedContent = generatedContent;
    
    console.log("\n=== Content Generation Results ===");
    console.log("Total Files:", generatedContent.files.length);
    for (const file of generatedContent.files) {
      console.log(`- ${file.path} (${file.type})`);
    }
    if (generatedContent.navigationUpdate) {
      console.log("Navigation Updates:", 
        generatedContent.navigationUpdate.changes.length);
    }
    
    return generatedContent;
  },
}); 