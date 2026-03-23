import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const modelId = process.env.LLM_MODEL ?? "deepseek/deepseek-chat";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export function getModel() {
  return openrouter(modelId);
}

export function getModelName(): string {
  return modelId;
}
