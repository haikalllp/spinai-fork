import { analyzeCodeChanges } from "./analyzeCodeChanges";
import { analyzeDocStructure } from "./analyzeDocStructure";
import { planDocUpdates } from "./planDocUpdates";
import { generateContent } from "../actions/generateContent";
import { updateNavigation } from "./updateNavigation";
import { createDocsPR } from "./createDocsPR";

// Export actions array for use in the application
export const actions = [
  analyzeCodeChanges,
  analyzeDocStructure,
  planDocUpdates,
  generateContent,
  updateNavigation,
  createDocsPR,
];

// Export all action modules
export * from "./analyzeCodeChanges";
export * from "./analyzeDocStructure";
export * from "./planDocUpdates";
export * from "../actions/generateContent";
export * from "./updateNavigation";
export * from "./createDocsPR";
