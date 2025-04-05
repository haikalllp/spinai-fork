import { createAction } from "spinai";

export const divide = createAction({
  id: "divide",
  description: "Divide the first number by the second number",
  parameters: {
    type: "object",
    properties: {
      a: {
        type: "number",
        description: "Numerator (number to be divided)",
      },
      b: {
        type: "number",
        description: "Denominator (number to divide by)",
      },
    },
    required: ["a", "b"],
  },
  async run({ parameters }) {
    const a = parameters?.a as number;
    const b = parameters?.b as number;

    if (b === 0) {
      throw new Error("Cannot divide by zero");
    }

    const result = a / b;

    console.log(`Dividing ${a} / ${b} = ${result}`);

    return result;
  },
});
