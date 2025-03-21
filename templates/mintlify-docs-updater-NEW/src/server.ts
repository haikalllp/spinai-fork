import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createDocUpdateAgent } from "./index";
import { handleWebhook } from "./webhooks";
import type { DocConfig } from "./types";

export interface ServerOptions {
  config?: Partial<DocConfig>;
  openAiKey?: string;
  githubToken?: string;
  port?: number;
}

export async function startServer(options: ServerOptions = {}) {
  const agent = createDocUpdateAgent(options);
  const app = new Hono();

  // Single webhook endpoint
  app.post("/webhook", (c) => handleWebhook(c, agent));

  // Start server
  const port = options.port || parseInt(process.env.PORT || "3000", 10);
  const server = serve({
    fetch: app.fetch,
    port,
  });

  console.log(`🚀 Server running at http://localhost:${port}`);

  // Return both the agent and server instance
  return { agent, server };
}
