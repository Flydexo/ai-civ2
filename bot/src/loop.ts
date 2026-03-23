import mineflayer from "mineflayer";
import { Vec3 } from "vec3";
import { createRequire } from "module";
import { perceive } from "./perception.js";
import { decide } from "./llm/decide.js";
import { setupPathfinder, moveTo, digBlock, chat } from "./actions.js";
import { printCostSummary } from "./cost.js";
import type { Decision } from "./llm/schemas.js";

const require = createRequire(import.meta.url);

const BOT_NAME = process.argv[2] ?? "CivBot_01";
const MAX_TICKS = parseInt(process.argv[3] ?? "10");

const bot = mineflayer.createBot({
  host: "localhost",
  port: 25565,
  username: BOT_NAME,
  version: "1.20.4",
});

bot.on("error", (err) => console.error("[ERROR]", err));
bot.on("kicked", (reason) => console.log("[KICKED]", reason));

// Historique des dernières actions (patch mémoire minimale inter-tick)
const actionHistory: string[] = [];

bot.once("spawn", async () => {
  console.log(`[${BOT_NAME}] Connecté. Lancement de ${MAX_TICKS} ticks.\n`);
  setupPathfinder(bot);
  await sleep(3000); // Attendre le chargement des chunks

  for (let tick = 1; tick <= MAX_TICKS; tick++) {
    console.log(`\n--- TICK ${tick}/${MAX_TICKS} ---`);

    try {
      // 1. Percevoir
      const snapshot = perceive(bot);
      console.log(
        `  [PERCEIVE] Pos: (${snapshot.position.x}, ${snapshot.position.y}, ${snapshot.position.z}) | HP: ${snapshot.health} | Food: ${snapshot.food} | Items: ${snapshot.inventory.length}`
      );

      // 2. Décider (appel LLM)
      console.log("  [DECIDE] Appel LLM...");
      const decision = await decide(snapshot, actionHistory);
      console.log(`  [DECIDE] Thinking: ${decision.thinking.slice(0, 100)}...`);
      console.log(`  [DECIDE] Action: ${decision.action.type} — ${decision.action.reason}`);

      // Mémoriser l'action
      actionHistory.push(`Tick ${tick}: ${decision.action.type} — ${decision.action.reason}`);
      if (actionHistory.length > 5) actionHistory.shift();

      // 3. Exécuter
      await executeAction(bot, decision);

    } catch (err) {
      console.error(`  [ERROR] Tick ${tick} échoué:`, err);
    }

    // Pause entre les ticks (laisser le serveur MAJ + éviter rate limit)
    await sleep(2000);
  }

  // Récap
  printCostSummary();
  console.log("Run terminé. Ctrl+C pour quitter.");
});

/**
 * Exécute l'action décidée par le LLM.
 */
async function executeAction(bot: mineflayer.Bot, decision: Decision): Promise<void> {
  const action = decision.action;

  switch (action.type) {
    case "move":
      console.log(`  [ACT] Déplacement vers (${action.x}, ${action.y}, ${action.z})`);
      await moveTo(bot, action.x, action.y, action.z);
      console.log("  [ACT] Arrivé.");
      break;

    case "dig":
      console.log(`  [ACT] Casse du bloc en (${action.x}, ${action.y}, ${action.z})`);
      await moveTo(bot, action.x, action.y, action.z);
      await digBlock(bot, new Vec3(action.x, action.y, action.z));
      console.log("  [ACT] Bloc cassé.");
      break;

    case "chat":
      console.log(`  [ACT] Chat: "${action.message}"`);
      chat(bot, action.message);
      break;

    case "collect": {
      console.log(`  [ACT] Collecte de ${action.count}x ${action.blockName}`);
      const mcData = require("minecraft-data")(bot.version);
      const blockType = mcData.blocksByName[action.blockName];
      if (!blockType) {
        console.log(`  [ACT] Bloc inconnu: ${action.blockName} — skip`);
        break;
      }
      const found = bot.findBlock({
        matching: blockType.id,
        maxDistance: 32,
        count: action.count,
      });
      if (found) {
        await moveTo(bot, found.position.x, found.position.y, found.position.z);
        await digBlock(bot, found.position);
        console.log(`  [ACT] 1x ${action.blockName} collecté (simplifié).`);
      } else {
        console.log(`  [ACT] Aucun ${action.blockName} trouvé à portée.`);
      }
      break;
    }

    case "wait":
      console.log("  [ACT] Attente.");
      break;
  }
}

bot.on("chat", (username, message) => {
  if (username === bot.username) return;
  console.log(`  [CHAT] ${username}: ${message}`);
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
