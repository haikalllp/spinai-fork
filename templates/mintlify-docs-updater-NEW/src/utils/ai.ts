import { createOpenAI } from "@ai-sdk/openai";

/**
 * Centralized OpenAI client configuration
 * Used for all AI operations in the codebase to ensure consistent settings
 */
export const ai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: 'strict',
  // Default to gpt-4-turbo for best results in documentation generation
  // Any organization or custom settings can be added here
}); 