/**
 * Tracking simple du coût par appel LLM.
 * Affiche un récap à la fin du run.
 */

interface CallRecord {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costUsd: number;
}

const records: CallRecord[] = [];

// Prix par million de tokens (mars 2026 — vérifie si ça a changé)
const PRICING: Record<string, { input: number; output: number }> = {
  openai: { input: 2.5, output: 10.0 },     // GPT-4o
  deepseek: { input: 0.27, output: 1.10 },   // DeepSeek v3
};

export function trackCost(call: Omit<CallRecord, "costUsd">): void {
  const pricing = PRICING[call.provider] ?? { input: 0, output: 0 };
  const costUsd =
    (call.inputTokens / 1_000_000) * pricing.input +
    (call.outputTokens / 1_000_000) * pricing.output;

  const record = { ...call, costUsd };
  records.push(record);

  console.log(
    `  [COST] ${call.provider} | ${call.inputTokens}in + ${call.outputTokens}out | ${call.latencyMs}ms | $${costUsd.toFixed(6)}`
  );
}

export function printCostSummary(): void {
  if (records.length === 0) return;

  const totalCost = records.reduce((sum, r) => sum + r.costUsd, 0);
  const avgLatency =
    records.reduce((sum, r) => sum + r.latencyMs, 0) / records.length;
  const totalInput = records.reduce((sum, r) => sum + r.inputTokens, 0);
  const totalOutput = records.reduce((sum, r) => sum + r.outputTokens, 0);
  const avgCostPerTick = totalCost / records.length;

  console.log("\n========== COST SUMMARY ==========");
  console.log(`Provider:       ${records[0].provider}`);
  console.log(`Total calls:    ${records.length}`);
  console.log(`Total tokens:   ${totalInput} in + ${totalOutput} out`);
  console.log(`Total cost:     $${totalCost.toFixed(6)}`);
  console.log(`Avg cost/tick:  $${avgCostPerTick.toFixed(6)}`);
  console.log(`Avg latency:    ${Math.round(avgLatency)}ms`);
  console.log("");
  console.log("--- Projection ---");
  console.log(`1 agent, 1h (360 ticks):  $${(avgCostPerTick * 360).toFixed(4)}`);
  console.log(`10 agents, 1h:            $${(avgCostPerTick * 3600).toFixed(4)}`);
  console.log(`10 agents, 1h (PIANO 6x): $${(avgCostPerTick * 3600 * 6).toFixed(4)}`);
  console.log("==================================\n");
}
