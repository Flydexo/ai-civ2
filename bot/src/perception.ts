import { Bot } from "mineflayer";
import { Vec3 } from "vec3";

/**
 * Récupère un snapshot structuré de l'état du monde
 * visible par le bot. C'est ce qui deviendra l'input
 * du nœud Perceive dans l'architecture PIANO.
 */
export interface WorldSnapshot {
  position: { x: number; y: number; z: number };
  health: number;
  food: number;
  inventory: { name: string; count: number }[];
  nearbyBlocks: { name: string; position: Vec3 }[];
  nearbyEntities: { name: string; type: string; distance: number }[];
  timeOfDay: number;
  biome: string;
}

export function perceive(bot: Bot): WorldSnapshot {
  const pos = bot.entity.position;

  // Inventaire
  const inventory = bot.inventory.items().map((item) => ({
    name: item.name,
    count: item.count,
  }));

  // Blocs proches (rayon 4)
  const nearbyBlocks: WorldSnapshot["nearbyBlocks"] = [];
  const radius = 4;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const block = bot.blockAt(pos.offset(dx, dy, dz));
        if (block && block.name !== "air" && block.name !== "cave_air") {
          nearbyBlocks.push({
            name: block.name,
            position: block.position,
          });
        }
      }
    }
  }

  // Entités proches
  const nearbyEntities = Object.values(bot.entities)
    .filter((e) => e !== bot.entity)
    .filter((e) => e.position.distanceTo(pos) < 20)
    .map((e) => ({
      name: e.username ?? e.name ?? "unknown",
      type: e.type ?? "unknown",
      distance: Math.round(e.position.distanceTo(pos) * 10) / 10,
    }));

  return {
    position: { x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) },
    health: bot.health,
    food: bot.food,
    inventory,
    nearbyBlocks,
    nearbyEntities,
    timeOfDay: bot.time.timeOfDay,
    biome: bot.blockAt(pos)?.biome?.name ?? "unknown",
  };
}
