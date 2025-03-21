# Architecture Changes: SpinAI Docs Updater Migration

## Overview

This document details the architectural changes made to the SpinAI Docs Updater application to migrate from the older SpinAI API to the latest API structure. The migration focused on updating the agent creation pattern, action structure, and ensuring cross-platform compatibility.

## Core API Changes

### Agent Creation

#### Previous Implementation:
```typescript
const agent = createAgent<ReviewState>({
  instructions: `You are a documentation maintenance agent...`,
  actions,
  llm: createOpenAILLM({
    apiKey: openAiKey,
    model: "gpt-4-turbo-preview",
  }),
  agentId: "mintlify-update-agent",
  // spinApiKey: process.env.SPINAI_API_KEY,
});
```

#### New Implementation:
```typescript
const customOpenAI = createOpenAI({
  apiKey: openAiKey,
});

const agent = createAgent({
  instructions: `You are a documentation maintenance agent...`,
  actions,
  model: customOpenAI("gpt-4-turbo"),
  agentId: "mintlify-update-agent",
  spinApiKey: process.env.SPINAI_API_KEY,
});
```

**Key Changes:**
- Eliminated `createOpenAILLM` in favor of the more direct `openai`/`createOpenAI` from `@ai-sdk/openai`
- Removed explicit generic type parameter (`<ReviewState>`)
- Model configuration is now handled through the `customOpenAI` function
- Simplified API structure for creating the agent

### Action Structure

#### Previous Implementation:
```typescript
export const analyzeCodeChanges = createAction({
  id: "analyzeCodeChanges",
  description: "Analyzes code changes from a PR to determine what documentation needs updating",
  parameters: {
    // parameter definition
  },
  async run(
    context: SpinAiContext,
    parameters?: Record<string, unknown>
  ): Promise<SpinAiContext> {
    // Implementation
    return context;
  },
});
```

#### New Implementation:
```typescript
export const analyzeCodeChanges = createAction({
  id: "analyzeCodeChanges",
  description: "Analyzes code changes from a PR to determine what documentation needs updating",
  parameters: {
    // parameter definition
  },
  async run({ parameters, context }) {
    // Implementation
    return analysis; // Return the actual result instead of context
  },
});
```

**Key Changes:**
- Removed `SpinAiContext` type which is no longer needed
- Parameters are now destructured in the `run` method signature
- Actions now return their actual result data instead of the context
- Simplified parameter handling without explicit type checking

### Webhook Handler

#### Previous Implementation:
```typescript
const result = await agent({
  input: `Review pull request #${body.pull_request.number}`,
  externalCustomerId: body.repository.owner.login,
  state,
});

return c.json({ message: "Documentation update completed", ...result });
```

#### New Implementation:
```typescript
const { response } = await agent({
  input: `Review pull request #${body.pull_request.number}`,
  state,
  responseFormat: responseSchema
});

return c.json({ message: "Documentation update completed", response });
```

**Key Changes:**
- Added Zod schema for response validation using `responseSchema`
- Removed `externalCustomerId` parameter
- Response is now destructured from the agent result

## Added Type Definitions

### Response Schema
Added Zod schema for validating agent responses:

```typescript
import { z } from "zod";

export const responseSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  pull_number: z.number(),
  config: z.any(),
  codeAnalysis: z.any().optional(),
  docStructure: z.any().optional(),
  updatePlan: z.any().optional(),
  generatedContent: z.any().optional(),
  docUpdates: z.any().optional(),
  docsRepo: z.object({
    owner: z.string(),
    repo: z.string(),
    branch: z.string(),
  }).optional(),
});
```

## Build System Improvements

### Cross-Platform Compatibility

#### Previous Implementation:
```json
"scripts": {
  "clean": "rm -rf dist",
  "build": "npm run clean && tsc"
}
```

#### New Implementation:
```json
"scripts": {
  "clean": "rimraf dist",
  "build": "npm run clean && tsc"
}
```

**Key Changes:**
- Replaced Unix-specific `rm -rf` command with cross-platform `rimraf`
- Added `rimraf` as a dependency in package.json

## Dependency Updates

### Added Dependencies:
- `@ai-sdk/openai`: For the new OpenAI interface
- `zod`: For response schema validation
- `rimraf`: For cross-platform directory removal

### Updated Dependencies:
- Updated `spinai` to use the latest API

## Action-Specific Changes

### generateContent.ts
- Completely rewritten to use the new API structure
- Simplified file content generation logic
- Improved error handling and logging
- Returns actual content instead of context

### analyzeCodeChanges.ts
- Updated to follow new SpinAI API patterns
- Modified to return analysis results directly

### updateNavigation.ts
- Streamlined navigation update logic
- Modified to return navigation update data directly

### createDocsPR.ts
- Updated to use new context and parameter patterns
- Returns PR creation results directly

## File Organization

The overall file organization remained the same, but internal implementations were updated:

```
src/
├── actions/
│   ├── analyzeCodeChanges.ts
│   ├── analyzeDocStructure.ts
│   ├── createDocsPR.ts
│   ├── generateContent.ts
│   ├── index.ts
│   ├── planDocUpdates.ts
│   └── updateNavigation.ts
├── config.ts
├── index.ts
├── server.ts
├── types.ts
└── webhooks.ts
```

## Error Handling Improvements

- More explicit error messages for missing environment variables
- Better handling of missing state data between actions
- Improved validation in webhook handling

## Usage Example

The new implementation includes usage documentation:

```typescript
// Usage example:
// 
// const agent = createDocUpdateAgent();
// const { response } = await agent({
//   input: "Review pull request #123",
//   state: initialState,
//   responseFormat: responseSchema
// });
```

## Conclusion

The migration to the new SpinAI API structure has significantly modernized the codebase, making it more maintainable and less verbose. The new implementation takes advantage of the latest patterns from the SpinAI ecosystem, including better type safety through Zod schemas and simplified action structures. The build system improvements ensure the application works consistently across different platforms. 