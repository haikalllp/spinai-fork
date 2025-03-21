import { createAction } from "spinai";
import type { ReviewState, UpdatePlan, PlannedDocUpdate, CodeAnalysis, DocStructure } from "../types";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { ai } from "../utils/ai";

interface PlanDocUpdatesParams {
  owner: string;
  repo: string;
}

function isPlanDocUpdatesParams(
  params: unknown
): params is PlanDocUpdatesParams {
  return (
    typeof params === "object" &&
    params !== null &&
    typeof (params as any).owner === "string" &&
    typeof (params as any).repo === "string"
  );
}

async function generateUpdatePlan(
  codeAnalysis: CodeAnalysis,
  docStructure: DocStructure,
  config: ReviewState["config"]
): Promise<UpdatePlan> {
  console.log("Generating update plan with LLM...");
  
  // Use LLM to analyze changes and plan documentation updates
  const { text: responseContent } = await generateText({
    model: ai("gpt-4-turbo-preview"),
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `You are a documentation planning expert. Your task is to analyze code changes and the existing documentation structure to plan necessary documentation updates.

Key principles:
1. Focus on user value - what would developers need to know?
2. Respect existing documentation structure and organization
3. Prioritize updates based on significance and impact
4. Consider relationships between documents
5. Plan navigation changes to maintain good organization

Consider these factors when planning:
- New features or APIs need comprehensive documentation
- Significant changes to existing features need doc updates
- Related documents may need cross-reference updates
- Overview/index files need updates for significant changes
- Navigation structure should reflect content organization

Return a detailed plan as a JSON object with this structure:
{
  "summary": "Brief summary of overall documentation update needs",
  "updates": [
    {
      "path": "docs/path/to/file.mdx",
      "type": "create|update|delete",
      "priority": "high|medium|low",
      "reason": "Explanation of why this update is needed",
      "sourceFiles": ["src/path/to/file.ts"],
      "relatedDocs": ["docs/path/to/related.mdx"],
      "suggestedContent": {
        "sections": ["Section 1", "Section 2"],
        "examples": ["Example usage 1"],
        "notes": ["Important note"]
      }
    }
  ],
  "navigationChanges": [
    {
      "type": "add|update|move|delete",
      "group": "category name",
      "item": "item name",
      "path": "docs/path/to/file.mdx"
    }
  ]
}`,
      },
      {
        role: "user",
        content: `Here is the code analysis:
${JSON.stringify(codeAnalysis, null, 2)}

Here is the current documentation structure:
${JSON.stringify(docStructure, null, 2)}

Please create a detailed documentation update plan based on these changes.
The docs directory is: ${config.docsPath}
`,
      },
    ],
  });

  try {
    // Parse the completion into a JSON object
    const plan = JSON.parse(responseContent);
    console.log(`Plan generated with ${plan.updates?.length || 0} updates and ${plan.navigationChanges?.length || 0} navigation changes`);
    return plan;
  } catch (error) {
    console.error("Failed to parse plan response:", error);
    // Return a minimal valid plan
    return {
      summary: "Error parsing LLM response",
      updates: [],
      navigationChanges: []
    };
  }
}

export const planDocUpdates = createAction({
  id: "planDocUpdates",
  description: "Plans documentation updates based on code changes",
  parameters: {
    type: "object",
    properties: {
      owner: { type: "string", description: "Repository owner" },
      repo: { type: "string", description: "Repository name" },
    },
    required: ["owner", "repo"],
  },
  async run({ context }) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    const state = context.state as ReviewState;
    
    if (!state.codeAnalysis) {
      throw new Error("No code analysis found. Please analyze code first.");
    }
    if (!state.docStructure) {
      throw new Error("No documentation structure found. Please analyze docs first.");
    }

    console.log("\n=== Planning Documentation Updates ===");
    
    // Generate the update plan using LLM
    const updatePlan = await generateUpdatePlan(
      state.codeAnalysis,
      state.docStructure,
      state.config
    );

    // Save plan to state
    state.updatePlan = updatePlan;

    console.log("\n=== Documentation Update Plan ===");
    console.log("Summary:", updatePlan.summary);
    console.log("Number of Updates:", updatePlan.updates.length);
    
    // Log details of each update
    updatePlan.updates.forEach((update, i) => {
      console.log(`\nUpdate ${i+1}: ${update.path}`);
      console.log(`Type: ${update.type}, Priority: ${update.priority}`);
      console.log(`Reason: ${update.reason.substring(0, 100)}...`);
    });

    // Log navigation changes
    if (updatePlan.navigationChanges && updatePlan.navigationChanges.length > 0) {
      console.log("\nNavigation Changes:", updatePlan.navigationChanges.length);
      updatePlan.navigationChanges.forEach((change, i) => {
        console.log(`Change ${i+1}: ${change.group}`);
        if (change.changes) {
          change.changes.forEach(c => {
            console.log(`  - ${c.type}: ${c.page}`);
          });
        }
      });
    }

    return updatePlan;
  },
});
