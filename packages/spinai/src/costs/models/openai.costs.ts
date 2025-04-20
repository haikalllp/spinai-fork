import { ModelCostsMap } from "../costs.types";

/**
 * Cost per 1M tokens in USD for OpenAI models
 */
export const OPENAI_MODEL_COSTS: ModelCostsMap = {
  // GPT-4.1 Models
  "gpt-4.1": { input: 2.0, output: 8.0 },
  "gpt-4.1-2025-04-14": { input: 2.0, output: 8.0 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-mini-2025-04-14": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "gpt-4.1-nano-2025-04-14": { input: 0.1, output: 0.4 },

  // GPT-4.5 Models
  "gpt-4.5-preview": { input: 75, output: 150 },
  "gpt-4.5-preview-2025-02-27": { input: 75, output: 150 },

  // GPT-4o Models
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-2024-08-06": { input: 2.5, output: 10 },
  "gpt-4o-2024-11-20": { input: 2.5, output: 10 },
  "gpt-4o-2024-05-13": { input: 5, output: 15 },

  // GPT-4o Audio Models
  "gpt-4o-audio-preview": { input: 2.5, output: 10 },
  "gpt-4o-audio-preview-2024-12-17": { input: 2.5, output: 10 },
  "gpt-4o-audio-preview-2024-10-01": { input: 2.5, output: 10 },

  // GPT-4o Realtime Models
  "gpt-4o-realtime-preview": { input: 5, output: 20 },
  "gpt-4o-realtime-preview-2024-12-17": { input: 5, output: 20 },
  "gpt-4o-realtime-preview-2024-10-01": { input: 5, output: 20 },

  // GPT-4o Mini Models
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o-mini-2024-07-18": { input: 0.15, output: 0.6 },
  "gpt-4o-mini-audio-preview": { input: 0.15, output: 0.6 },
  "gpt-4o-mini-audio-preview-2024-12-17": { input: 0.15, output: 0.6 },
  "gpt-4o-mini-realtime-preview": { input: 0.6, output: 2.4 },
  "gpt-4o-mini-realtime-preview-2024-12-17": { input: 0.6, output: 2.4 },

  // O1 Models
  o1: { input: 15, output: 60 },
  "o1-2024-12-17": { input: 15, output: 60 },
  "o1-preview-2024-09-12": { input: 15, output: 60 },

  // O3 Mini Models
  "o3-mini": { input: 1.1, output: 4.4 },
  "o3-mini-2025-01-31": { input: 1.1, output: 4.4 },

  // O1 Mini Models
  "o1-mini": { input: 1.1, output: 4.4 },
  "o1-mini-2024-09-12": { input: 1.1, output: 4.4 },
};
