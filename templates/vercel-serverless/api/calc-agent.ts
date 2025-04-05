// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as dotenv from "dotenv";
import { openai } from "@ai-sdk/openai";
import { sum } from "../actions/sum";
import { minus } from "../actions/minus";
import { divide } from "../actions/divide";
import { multiply } from "../actions/multiply";
import { createAgent } from "spinai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

dotenv.config();

export default async function POST(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // Extract user input and auth token from request
    const { input } = req.body;
    if (!input) {
      return res.status(400).json({ error: "Missing input" });
    }

    const calculatorAgent = createAgent({
      instructions: `You are a calculator agent that helps users perform mathematical calculations.`,
      actions: [sum, minus, multiply, divide],
      model: openai("gpt-4o-mini"),
      spinApiKey: process.env.SPINAI_API_KEY,
      agentId: "vercel-calculator-agent",
    });

    // (Step 4) Run the Agent
    const { response } = await calculatorAgent({
      input,
    });

    // (Step 5) Send Response
    return res.status(200).json({ response });
  } catch (error) {
    console.error("Agent Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
