import { createAction } from "spinai";

export const multiply = createAction({
  id: "multiply",
  description: "Multiply two numbers together",
  parameters: {
    type: "object",
    properties: {
      a: {
        type: "number",
        description: "First number",
      },
      b: {
        type: "number",
        description: "Second number",
      },
    },
    required: ["a", "b"],
  },
  async run({ parameters }) {
    const a = parameters?.a as number;
    const b = parameters?.b as number;

    const result = a * b;

    console.log(`Multiplying ${a} * ${b} = ${result}`);

    return result;
  },
});
