/**
 * Test de fumée : connect → perceive → act → disconnect
 *
 * Usage: pnpm smoke
 *
 * Ce test valide que le pipeline d'exécution complet fonctionne :
 * 1. Connexion au serveur
 * 2. Perception du monde (snapshot cohérent)
 * 3. Déplacement minimal
 * 4. Message chat
 * 5. Déconnexion propre
 */

import mineflayer from "mineflayer";
import { perceive } from "../src/perception.js";
import { setupPathfinder, moveTo, chat } from "../src/actions.js";

const BOT_NAME = "SmokeBot";
const TIMEOUT_MS = 60_000;

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

const bot = mineflayer.createBot({
  host: "localhost",
  port: 25565,
  username: BOT_NAME,
  version: "1.20.4",
});

// Timeout global
const timeout = setTimeout(() => {
  console.error("\n[TIMEOUT] Le test a dépassé", TIMEOUT_MS / 1000, "secondes");
  process.exit(1);
}, TIMEOUT_MS);

bot.on("error", (err) => {
  console.error("[ERROR]", err.message);
  if (err.message.includes("ECONNREFUSED")) {
    console.error("→ Le serveur Minecraft n'est pas accessible sur localhost:25565");
    console.error("→ Lance: docker compose up -d && attend 'Done' dans les logs");
  }
  clearTimeout(timeout);
  process.exit(1);
});

bot.on("kicked", (reason) => {
  console.error("[KICKED]", reason);
  clearTimeout(timeout);
  process.exit(1);
});

bot.once("spawn", async () => {
  console.log("\n=== SMOKE TEST — Minecraft Mineflayer ===\n");

  try {
    // Setup
    setupPathfinder(bot);
    await sleep(2000);

    // Test 1 : Connexion
    console.log("1. Connexion");
    assert(bot.entity !== null, "Bot entity existe après spawn");
    assert(bot.entity.position.y > 0, "Position Y > 0 (bot est dans le monde)");

    // Test 2 : Perception
    console.log("\n2. Perception");
    const snapshot = perceive(bot);

    assert(typeof snapshot.position.x === "number", "position.x est un nombre");
    assert(typeof snapshot.position.y === "number", "position.y est un nombre");
    assert(typeof snapshot.position.z === "number", "position.z est un nombre");
    assert(snapshot.health >= 0 && snapshot.health <= 20, `health dans [0,20] (valeur: ${snapshot.health})`);
    assert(snapshot.food >= 0 && snapshot.food <= 20, `food dans [0,20] (valeur: ${snapshot.food})`);
    assert(Array.isArray(snapshot.inventory), "inventory est un tableau");
    assert(Array.isArray(snapshot.nearbyBlocks), "nearbyBlocks est un tableau");
    assert(snapshot.nearbyBlocks.length > 0, `nearbyBlocks non vide (${snapshot.nearbyBlocks.length} blocs)`);
    assert(Array.isArray(snapshot.nearbyEntities), "nearbyEntities est un tableau");
    assert(typeof snapshot.timeOfDay === "number", "timeOfDay est un nombre");

    // Test 3 : Déplacement
    console.log("\n3. Déplacement");
    const startPos = { ...snapshot.position };
    const targetX = bot.entity.position.x + 5;
    const targetZ = bot.entity.position.z;

    try {
      await moveTo(bot, targetX, bot.entity.position.y, targetZ);
      const newPos = bot.entity.position;
      const moved = Math.abs(newPos.x - startPos.x) > 1 || Math.abs(newPos.z - startPos.z) > 1;
      assert(moved, `Bot s'est déplacé (delta x: ${Math.abs(newPos.x - startPos.x).toFixed(1)})`);
    } catch (err) {
      assert(false, `moveTo a échoué: ${err}`);
    }

    // Test 4 : Chat
    console.log("\n4. Chat");
    try {
      chat(bot, "[SmokeTest] OK");
      assert(true, "Message chat envoyé sans erreur");
    } catch (err) {
      assert(false, `chat a échoué: ${err}`);
    }

    // Résumé
    console.log("\n=== RÉSULTATS ===");
    console.log(`Passés : ${passed}`);
    console.log(`Échoués : ${failed}`);

    if (failed === 0) {
      console.log("\n✓ Tous les tests passent — pipeline Mineflayer opérationnel");
    } else {
      console.log(`\n✗ ${failed} test(s) en échec`);
    }

  } catch (err) {
    console.error("\n[FATAL]", err);
    failed++;
  } finally {
    clearTimeout(timeout);
    bot.quit();
    process.exit(failed > 0 ? 1 : 0);
  }
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
