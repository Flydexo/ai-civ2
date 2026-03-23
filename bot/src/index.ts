import mineflayer from "mineflayer";
import { perceive } from "./perception.js";
import { setupPathfinder, moveTo, digBlock, chat } from "./actions.js";

const BOT_NAME = "CivBot_01";

const bot = mineflayer.createBot({
  host: "localhost",
  port: 25565,
  username: BOT_NAME,
  version: "1.20.4",
  // auth: "offline" est implicite quand le serveur est en ONLINE_MODE=FALSE
});

bot.on("error", (err) => console.error("[ERROR]", err));
bot.on("kicked", (reason) => console.log("[KICKED]", reason));

bot.once("spawn", async () => {
  console.log(`[${BOT_NAME}] Connecté. Position:`, bot.entity.position);

  // Setup pathfinder
  setupPathfinder(bot);

  // Attendre 2 secondes que les chunks chargent
  await sleep(2000);

  // 1. Percevoir le monde
  console.log("\n=== PERCEPTION ===");
  const snapshot = perceive(bot);
  console.log("Position:", snapshot.position);
  console.log("Health:", snapshot.health, "| Food:", snapshot.food);
  console.log("Inventaire:", snapshot.inventory.length, "items");
  console.log("Blocs proches (non-air):", snapshot.nearbyBlocks.length);
  console.log("Entités proches:", snapshot.nearbyEntities);

  // 2. Se déplacer de 10 blocs en avant
  console.log("\n=== DÉPLACEMENT ===");
  const target = bot.entity.position.offset(10, 0, 0);
  console.log(`Déplacement vers (${target.x}, ${target.y}, ${target.z})...`);
  try {
    await moveTo(bot, target.x, target.y, target.z);
    console.log("Arrivé !");
  } catch (err) {
    console.error("Échec déplacement:", err);
  }

  // 3. Trouver et casser un bloc proche (terre ou pierre)
  console.log("\n=== DIG ===");
  const breakable = ["dirt", "grass_block", "stone", "cobblestone", "sand"];
  const targetBlock = snapshot.nearbyBlocks.find((b) =>
    breakable.includes(b.name)
  );
  if (targetBlock) {
    console.log(`Casse de ${targetBlock.name} en ${targetBlock.position}...`);
    try {
      // Se rapprocher d'abord
      await moveTo(
        bot,
        targetBlock.position.x,
        targetBlock.position.y,
        targetBlock.position.z
      );
      await digBlock(bot, targetBlock.position);
      console.log("Bloc cassé !");
    } catch (err) {
      console.error("Échec dig:", err);
    }
  } else {
    console.log("Aucun bloc cassable trouvé à proximité.");
  }

  // 4. Envoyer un message chat
  console.log("\n=== CHAT ===");
  chat(bot, "Hello world! CivBot_01 opérationnel.");

  // 5. Re-percevoir pour voir les changements
  console.log("\n=== PERCEPTION (après actions) ===");
  const snapshot2 = perceive(bot);
  console.log("Position:", snapshot2.position);
  console.log("Inventaire:", snapshot2.inventory);

  // 6. Done
  console.log("\n=== JOUR 1 TERMINÉ ===");
  console.log("Tout fonctionne. Le bot peut percevoir, se déplacer, casser, et parler.");
  console.log("Ctrl+C pour quitter.");
});

// Écouter les messages chat (utile pour le jour 3 — multi-bots)
bot.on("chat", (username, message) => {
  if (username === bot.username) return;
  console.log(`[CHAT] ${username}: ${message}`);
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
