import { createAction } from "spinai";
import type { ReviewState, CodeChange, CodeAnalysis } from "../types";
import { Octokit } from "@octokit/rest";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { ai } from "../utils/ai";

interface AnalyzeCodeChangesParams {
  owner: string;
  repo: string;
  pull_number: number;
}

function isAnalyzeCodeChangesParams(
  params: unknown
): params is AnalyzeCodeChangesParams {
  return (
    typeof params === "object" &&
    params !== null &&
    typeof (params as any).owner === "string" &&
    typeof (params as any).repo === "string" &&
    typeof (params as any).pull_number === "number"
  );
}

async function analyzeChanges(
  files: { filename: string; patch?: string; status: string }[]
): Promise<CodeAnalysis> {
  const changes: CodeChange[] = [];
  const impactedAreas = new Set<string>();

  // First pass: Basic analysis of each file
  for (const file of files) {
    const pathParts = file.filename.split("/");
    const category = pathParts[pathParts.length - 2] || "";

    // Basic significance checks
    const significance = {
      hasExports: file.patch?.includes("export ") || false,
      hasInterfaces: file.patch?.includes("interface ") || false,
      hasClasses: file.patch?.includes("class ") || false,
      hasTypes: file.patch?.includes("type ") || false,
      hasEnums: file.patch?.includes("enum ") || false,
      isTest:
        file.filename.includes(".test.") || file.filename.includes(".spec."),
    };

    changes.push({
      file: file.filename,
      patch: file.patch || "",
      type: file.status as "added" | "modified" | "deleted",
      significance,
      category,
    });

    if (category && !significance.isTest) {
      impactedAreas.add(category);
    }
  }

  // Use LLM for deeper analysis
  const { text: responseContent } = await generateText({
    model: ai("gpt-4-turbo-preview"),
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `You are a code analysis expert. Analyze the following code changes and provide:
1. A brief summary of the changes
2. Identification of impacted areas/categories
3. Assessment of whether these are significant changes (new features, API changes, etc.)
4. Related files that might need documentation updates

Return your analysis as a JSON object with this structure:
{
  "summary": "Brief description of changes",
  "impactedAreas": ["area1", "area2"],
  "significantChanges": boolean,
  "relatedFiles": ["file1", "file2"]
}`,
      },
      {
        role: "user",
        content: `Here are the code changes to analyze:
${changes
  .map(
    (change) => `
File: ${change.file} (${change.type})
Category: ${change.category}
Significance: ${JSON.stringify(change.significance)}
Patch:
\`\`\`diff
${change.patch}
\`\`\`
`
  )
  .join("\n")}`,
      },
    ],
  });

  let analysis;
  try {
    analysis = JSON.parse(responseContent || "{}");
  } catch (e) {
    console.error("Failed to parse JSON response for code analysis");
    analysis = {
      summary: "Error parsing analysis",
      impactedAreas: [],
      significantChanges: false,
      relatedFiles: []
    };
  }

  // Update changes with related files from analysis
  for (const change of changes) {
    change.relatedFiles = analysis.relatedFiles?.filter(
      (file: string) => file !== change.file
    );
  }

  return {
    changes,
    impactedAreas: Array.from(
      new Set([...impactedAreas, ...(analysis.impactedAreas || [])])
    ),
    significantChanges: analysis.significantChanges || false,
    summary: analysis.summary || "No summary provided",
  };
}

export const analyzeCodeChanges = createAction({
  id: "analyzeCodeChanges",
  description:
    "Analyzes code changes from a PR to determine what documentation needs updating",
  parameters: {
    type: "object",
    properties: {
      owner: { type: "string", description: "Repository owner" },
      repo: { type: "string", description: "Repository name" },
      pull_number: { type: "number", description: "PR number" },
    },
    required: ["owner", "repo", "pull_number"],
  },
  async run({ parameters, context }) {
    console.log("\n=== Analyzing Code Changes ===");
    
    if (!process.env.GITHUB_TOKEN) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    if (!parameters || !isAnalyzeCodeChangesParams(parameters)) {
      throw new Error("Invalid parameters provided");
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    
    // Using centralized AI client from utils/ai.ts
    // No need to create another instance here

    console.log(`Analyzing PR #${parameters.pull_number} in ${parameters.owner}/${parameters.repo}`);

    // Get the PR diff
    console.log("Fetching PR files...");
    const { data: files } = await octokit.pulls.listFiles({
      owner: parameters.owner,
      repo: parameters.repo,
      pull_number: parameters.pull_number,
    });
    console.log(`Found ${files.length} changed files`);

    // Analyze the changes
    console.log("Analyzing code changes...");
    const analysis = await analyzeChanges(files);

    // Store analysis in state
    const state = context.state as ReviewState;
    state.codeAnalysis = analysis;

    console.log("\n=== Code Analysis Results ===");
    console.log("Summary:", analysis.summary);
    console.log("Impacted Areas:", analysis.impactedAreas.join(", "));
    console.log("Significant Changes:", analysis.significantChanges);
    console.log("Number of Files:", analysis.changes.length);

    return analysis;
  },
});
