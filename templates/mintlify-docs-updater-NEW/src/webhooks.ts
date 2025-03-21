import type { Context } from "hono";
import type { ReviewState } from "./types";
import { responseSchema } from "./types";
import { createFullConfig } from "./config";

type Agent = any;

export async function handleWebhook(c: Context, agent: Agent) {
  try {
    const event = c.req.header("x-github-event");
    if (!event) return c.json({ error: "No GitHub event header found" }, 400);

    const body = await parseWebhookBody(c);
    if (!isValidPullRequest(body)) {
      return c.json({ error: "Invalid webhook payload" }, 400);
    }

    // Skip bot PRs
    if (isBotPR(body.pull_request)) {
      return c.json({ message: "Skipping bot PR" });
    }

    // Process only PR opens/updates
    if (!isRelevantPREvent(event, body.action)) {
      return c.json({ message: "Event ignored" });
    }

    // Create the initial state with proper config
    const config = createFullConfig(body.config || {});
    const state: ReviewState = {
      owner: body.repository.owner.login,
      repo: body.repository.name,
      pull_number: body.pull_request.number,
      config,
    };

    // Process the PR
    const { response } = await agent({
      input: `Review pull request #${body.pull_request.number}`,
      state,
      responseFormat: responseSchema
    });

    return c.json({ message: "Documentation update completed", response });
  } catch (error) {
    console.error("Webhook error:", error);
    return c.json(
      {
        error: "Webhook processing failed",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

async function parseWebhookBody(c: Context) {
  const contentType = c.req.header("content-type") || "";

  if (contentType.includes("application/json")) {
    return await c.req.json();
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await c.req.parseBody();
    if (typeof formData.payload === "string") {
      return JSON.parse(formData.payload);
    }
  }

  throw new Error("Unsupported content type");
}

function isValidPullRequest(body: any): boolean {
  return !!(
    body?.pull_request?.number &&
    body?.repository?.owner?.login &&
    body?.repository?.name &&
    body?.action
  );
}

function isBotPR(pr: any): boolean {
  return (
    pr.title.startsWith("📚 Update documentation") ||
    (pr.labels || []).some((label: any) => label.name === "documentation")
  );
}

function isRelevantPREvent(event: string, action: string): boolean {
  return event === "pull_request" && ["opened", "synchronize"].includes(action);
}
