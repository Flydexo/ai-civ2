import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import {
  pathfinder,
  Movements,
  goals,
} from "mineflayer-pathfinder";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

/**
 * Initialise le plugin pathfinder sur le bot.
 * À appeler une seule fois après le spawn.
 */
export function setupPathfinder(bot: Bot): void {
  bot.loadPlugin(pathfinder);
  const mcData = require("minecraft-data")(bot.version);
  const movements = new Movements(bot);
  movements.scafoldingBlocks = [];   // Pas de scaffold pour le proto
  bot.pathfinder.setMovements(movements);
}

/**
 * Déplace le bot vers une position (x, y, z).
 * Résout quand le bot est arrivé à ~1 bloc de la cible.
 */
export async function moveTo(bot: Bot, x: number, y: number, z: number): Promise<void> {
  const goal = new goals.GoalNear(x, y, z, 1);
  await bot.pathfinder.goto(goal);
}

/**
 * Casse le bloc à la position donnée.
 * Le bot doit être à portée (~4.5 blocs).
 */
export async function digBlock(bot: Bot, position: Vec3): Promise<void> {
  const block = bot.blockAt(position);
  if (!block || block.name === "air") {
    throw new Error(`Pas de bloc à casser en ${position}`);
  }
  if (!bot.canDigBlock(block)) {
    throw new Error(`Impossible de casser ${block.name} (outil manquant ou trop loin)`);
  }
  await bot.dig(block);
}

/**
 * Place un bloc depuis l'inventaire sur la face d'un bloc existant.
 * referencePosition = le bloc contre lequel on place.
 * faceVector = direction de la face (ex: Vec3(0,1,0) = dessus).
 */
export async function placeBlock(
  bot: Bot,
  blockName: string,
  referencePosition: Vec3,
  faceVector: Vec3
): Promise<void> {
  const item = bot.inventory.items().find((i) => i.name === blockName);
  if (!item) {
    throw new Error(`${blockName} pas dans l'inventaire`);
  }
  const referenceBlock = bot.blockAt(referencePosition);
  if (!referenceBlock) {
    throw new Error(`Pas de bloc de référence en ${referencePosition}`);
  }
  await bot.equip(item, "hand");
  await bot.placeBlock(referenceBlock, faceVector);
}

/**
 * Envoie un message dans le chat du serveur.
 */
export function chat(bot: Bot, message: string): void {
  bot.chat(message);
}
