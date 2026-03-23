import { generateObject } from "ai";
import { getModel, getProviderName } from "./client.js";
import { DecisionSchema, type Decision } from "./schemas.js";
import type { WorldSnapshot } from "../perception.js";
import { trackCost } from "../cost.js";

const SYSTEM_PROMPT = `Tu es un agent autonome dans Minecraft. Tu dois survivre, explorer, et collecter des ressources.

## État du monde
Tu reçois un snapshot JSON de ce que tu perçois : ta position, ta santé, ta faim, ton inventaire, les blocs proches, les entités proches, l'heure du jour.

## Règles
- Tu choisis UNE action par tick.
- Priorise la survie (santé, faim) puis l'exploration et la collecte de ressources.
- Si ta faim est basse (< 10), cherche de la nourriture.
- Si ta santé est basse (< 10), mets-toi en sécurité.
- Explore des zones variées — ne reste pas au même endroit.
- Collecte des ressources utiles : bois, pierre, fer quand possible.
- Le champ "reason" doit expliquer brièvement ton raisonnement.

## Actions disponibles
- move : te déplacer vers des coordonnées (x, y, z)
- dig : casser un bloc à une position précise (tu dois être à portée ~4 blocs)
- chat : envoyer un message dans le chat
- collect : collecter N blocs d'un type donné (navigation automatique)
- wait : ne rien faire (si aucune action pertinente)`;

/**
 * Prend un snapshot du monde et un historique optionnel des dernières actions,
 * demande au LLM quoi faire, retourne une décision structurée et validée par Zod.
 */
export async function decide(
  snapshot: WorldSnapshot,
  actionHistory: string[] = []
): Promise<Decision> {
  const startTime = Date.now();

  const historySection =
    actionHistory.length > 0
      ? `\nTes ${actionHistory.length} dernières actions :\n${actionHistory.join("\n")}\n`
      : "";

  const userPrompt = `Voici l'état actuel du monde :

\`\`\`json
${JSON.stringify(snapshot, null, 2)}
\`\`\`
${historySection}
Que fais-tu ?`;

  const result = await generateObject({
    model: getModel(),
    schema: DecisionSchema,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.7,
    maxRetries: 2,
  });

  const elapsed = Date.now() - startTime;

  trackCost({
    provider: getProviderName(),
    inputTokens: result.usage?.promptTokens ?? 0,
    outputTokens: result.usage?.completionTokens ?? 0,
    latencyMs: elapsed,
  });

  return result.object;
}
