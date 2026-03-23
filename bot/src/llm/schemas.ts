import { z } from "zod";

/**
 * Les actions possibles que le LLM peut décider.
 * On commence petit — 5 actions atomiques.
 * On ajoutera les skills composites plus tard.
 */
export const ActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("move"),
    x: z.number().describe("Coordonnée X de la destination"),
    y: z.number().describe("Coordonnée Y de la destination"),
    z: z.number().describe("Coordonnée Z de la destination"),
    reason: z.string().describe("Pourquoi se déplacer ici"),
  }),
  z.object({
    type: z.literal("dig"),
    x: z.number().describe("Coordonnée X du bloc à casser"),
    y: z.number().describe("Coordonnée Y du bloc à casser"),
    z: z.number().describe("Coordonnée Z du bloc à casser"),
    reason: z.string().describe("Pourquoi casser ce bloc"),
  }),
  z.object({
    type: z.literal("chat"),
    message: z.string().describe("Message à envoyer dans le chat"),
    reason: z.string().describe("Pourquoi envoyer ce message"),
  }),
  z.object({
    type: z.literal("collect"),
    blockName: z.string().describe("Nom du bloc/ressource à collecter"),
    count: z.number().min(1).max(10).describe("Nombre à collecter"),
    reason: z.string().describe("Pourquoi collecter cette ressource"),
  }),
  z.object({
    type: z.literal("wait"),
    reason: z.string().describe("Pourquoi ne rien faire ce tick"),
  }),
]);

export type Action = z.infer<typeof ActionSchema>;

/**
 * Schema complet de la décision du LLM.
 * Inclut le raisonnement (pour debug) et l'action choisie.
 */
export const DecisionSchema = z.object({
  thinking: z.string().describe("Ton raisonnement interne — analyse la situation, les priorités, les risques"),
  action: ActionSchema,
});

export type Decision = z.infer<typeof DecisionSchema>;
