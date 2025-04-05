/* eslint-disable @typescript-eslint/no-explicit-any */
import { LoggingConfig } from "./logging.types";
import { getPackageVersion } from "../utils/version";

const DEFAULT_LOGGING_ENDPOINT = "https://logs.spinai.dev/log";

/**
 * Core logging service that maps directly to the steps database table
 */
export class LoggingService {
  private agentId?: string;
  private spinApiKey?: string;
  private sessionId: string;
  private interactionId: string;
  private modelId: string;
  private modelProvider: string;
  private externalCustomerId?: string;
  private startTime: number;
  private loggingEndpoint: string;
  private isRerun: boolean;
  private input: string = "";
  private initialState?: Record<string, unknown>;
  private packageVersion: string;

  constructor(config: LoggingConfig) {
    this.agentId = config.agentId;
    this.spinApiKey = config.spinApiKey;
    this.sessionId = config.sessionId;
    this.interactionId = config.interactionId;
    this.modelId = config.modelId;
    this.modelProvider = config.modelProvider || "unknown";
    this.externalCustomerId = config.externalCustomerId;
    this.startTime = Date.now();
    this.isRerun = config.isRerun || false;
    this.loggingEndpoint = config.loggingEndpoint || DEFAULT_LOGGING_ENDPOINT;
    this.input = config.input;
    this.initialState = config.initialState;
    this.packageVersion = getPackageVersion();
  }

  /**
   * Core method to log a step to the database
   */
  private async logStep(params: Record<string, unknown>): Promise<void> {
    if (!this.agentId || !this.spinApiKey) {
      return;
    }

    try {
      const body = {
        created_at: new Date().toISOString(),
        agent_id: this.agentId,
        session_id: this.sessionId,
        interaction_id: this.interactionId,
        model_id: this.modelId,
        model_provider: this.modelProvider,
        external_customer_id: this.externalCustomerId,
        is_rerun: this.isRerun,
        package_version: this.packageVersion,
        ...params,
      };

      // Temporarily console.log the log body
      // console.log(`[LOG ${params.step_type}]`, JSON.stringify(body, null, 2));

      try {
        console.log({ body });
        const response = await fetch(this.loggingEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.spinApiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          console.error(
            `Failed to log ${params.stepType}: Server returned ${response.status} ${response.statusText}`
          );
        }
      } catch (fetchError) {
        console.error(
          `Failed to log ${params.stepType}: Could not reach log server at ${this.loggingEndpoint}`,
          fetchError instanceof Error ? fetchError.message : String(fetchError)
        );
      }
    } catch (error) {
      console.error(
        `Error preparing log: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Log the start of an interaction
   */
  async logInteractionStart(): Promise<void> {
    return this.logStep({
      step_type: "interaction_start",
      status: "started",
      input_text: this.input,
      model_id: this.modelId,
      model_provider: this.modelProvider,
      is_rerun: this.isRerun,
      initial_interaction_state: this.initialState,
      spin_version: this.packageVersion,
    });
  }

  /**
   * Log an agent planning step (reasoning and next actions)
   */
  async logPlanning(params: {
    reasoning: string;
    textResponse: string;
    nextActions?: any[];
    promptTokens: number;
    completionTokens: number;
    costCents?: number;
    durationMs: number;
    state?: Record<string, unknown>;
    rawInput?: unknown;
    rawOutput?: unknown;
    status: "completed" | "failed";
    error_message?: string;
  }): Promise<void> {
    return this.logStep({
      step_type: "plan_next_actions",
      state: params.state || {},
      reasoning: params.reasoning,
      response: params.textResponse,
      planned_actions: params.nextActions,
      input_tokens: params.promptTokens,
      output_tokens: params.completionTokens,
      cost_cents: params.costCents || 0,
      duration_ms: params.durationMs,
      raw_input: params.rawInput,
      raw_output: params.rawOutput,
      status: params.status || "completed",
      error_message: params.error_message || undefined,
    });
  }

  /**
   * Log an action execution
   */
  async logAction(params: {
    actionId: string;
    parameters?: Record<string, unknown>;
    result: unknown;
    durationMs: number;
    state?: Record<string, unknown>;
    error?: Error;
  }): Promise<void> {
    return this.logStep({
      step_type: "execute_action",
      status: params.error ? "failed" : "completed",
      state: params.state || {},
      executed_action_id: params.actionId,
      action_parameters: params.parameters,
      action_result: params.result,
      duration_ms: params.durationMs,
      error_message: params.error?.message,
    });
  }

  /**
   * Log the final response generation
   */
  async logFinalResponse(params: {
    response: unknown;
    usage: {
      promptTokens: number;
      completionTokens: number;
      costCents?: number;
    };
    durationMs: number;
    state?: Record<string, unknown>;
    rawInput?: unknown;
    rawOutput?: unknown;
  }): Promise<void> {
    return this.logStep({
      step_type: "plan_final_response",
      state: params.state || {},
      response: params.response,
      input_tokens: params.usage.promptTokens,
      output_tokens: params.usage.completionTokens,
      cost_cents: params.usage.costCents || 0,
      duration_ms: params.durationMs,
      raw_input: params.rawInput,
      raw_output: params.rawOutput,
    });
  }

  /**
   * Log the completion of an interaction
   */
  async logInteractionComplete(params: {
    response: unknown;
    durationMs?: number;
    error?: Error;
    state?: Record<string, unknown>;
    messages?: unknown[];
    totalCostCents: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
  }): Promise<void> {
    const durationMs = params.durationMs || Date.now() - this.startTime;

    return this.logStep({
      step_type: "interaction_complete",
      status: params.error ? "failed" : "success",
      input_tokens: params.totalPromptTokens,
      output_tokens: params.totalCompletionTokens,
      cost_cents: params.totalCostCents,
      final_messages_state: params.messages,
      response: params.response,
      final_interaction_state: params.state,
      duration_ms: durationMs,
      error_message: params.error?.message,
    });
  }
}
