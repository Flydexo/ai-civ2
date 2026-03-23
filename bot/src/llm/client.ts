import "dotenv/config";
import { createOpenAI } from "@ai-sdk/openai";

const provider = process.env.LLM_PROVIDER ?? "deepseek";

/**
 * Provider OpenAI (GPT-4o)
 */
const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Provider DeepSeek (API compatible OpenAI)
 */
const deepseekProvider = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

/**
 * Retourne le modèle actif selon LLM_PROVIDER.
 */
export function getModel() {
  if (provider === "openai") {
    return openaiProvider("gpt-4o");
  }
  return deepseekProvider("deepseek-chat");
}

export function getProviderName(): string {
  return provider;
}
