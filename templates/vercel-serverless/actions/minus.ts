import { createAction } from "spinai";

export const minus = createAction({
  id: "minus",
  description: "Subtracts two numbers.",
  parameters: {
    type: "object",
    properties: {
      a: { type: "number", description: "Number to subtract from" },
      b: { type: "number", description: "Number to subtract" },
    },
    required: ["a", "b"],
  },
  async run({ parameters }) {
    const { a, b } = parameters || {};

    if (typeof a !== "number" || typeof b !== "number") {
      throw new Error("Both a and b must be numbers");
    }

    const result = a - b;

    return result;
  },
});
