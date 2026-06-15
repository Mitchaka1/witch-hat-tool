import { describe, expect, it } from "vitest";
import {
  castBasicAttack,
  createRuntime,
  updateRuntime,
  type ControlKey,
  type Projectile,
} from "@/components/ArenaGame";

const FRAME = 1 / 60;

function step(
  runtime: ReturnType<typeof createRuntime>,
  frames: number,
  controls: Set<ControlKey> = new Set(),
  startTime = 1000,
) {
  for (let index = 0; index < frames; index += 1) {
    updateRuntime(runtime, FRAME, startTime + index * 16, controls);
  }
}

describe("arena combat engine", () => {
  it("jump is edge-triggered: one jump per press, no auto-hop", () => {
    const runtime = createRuntime();
    const controls = new Set<ControlKey>(["jump"]);

    expect(runtime.player.onGround).toBe(true);
    updateRuntime(runtime, FRAME, 1000, controls);

    expect(runtime.player.vy).toBeLessThan(0); // launched upward
    expect(controls.has("jump")).toBe(false); // press was consumed
    expect(runtime.player.onGround).toBe(false);
  });

  it("knockback actually displaces the enemy instead of being cancelled", () => {
    // Regression: push used to be added to vx, which the AI overwrites every
    // frame, so knockback did nothing. It now lives in a decaying impulse.
    const pushed = createRuntime();
    const control = createRuntime();
    pushed.enemy.knockbackVx = 900;

    step(pushed, 8);
    step(control, 8);

    // The shoved enemy ends up clearly further right than the un-shoved one.
    expect(pushed.enemy.x).toBeGreaterThan(control.enemy.x + 30);
    // ...and the impulse is already bleeding off rather than lingering.
    expect(pushed.enemy.knockbackVx).toBeLessThan(500);

    // After a beat it has essentially settled (snappy shove, not a slide).
    step(pushed, 40);
    expect(pushed.enemy.knockbackVx).toBeLessThan(25);
  });

  it("a damaging hit reduces health and applies knockback", () => {
    const runtime = createRuntime();
    const centerX = runtime.enemy.x + runtime.enemy.width / 2;
    const centerY = runtime.enemy.y + runtime.enemy.height / 2;
    const projectile: Projectile = {
      id: 999,
      owner: "player",
      kind: "water",
      x: centerX,
      y: centerY,
      vx: 120, // moving right -> knockback pushes the enemy right
      vy: 0,
      radius: 18,
      damage: 14,
      push: 480,
      explosionRadius: 0,
      ttl: 2,
      color: "#48b7d8",
    };
    runtime.projectiles.push(projectile);

    const startHealth = runtime.enemy.health;
    updateRuntime(runtime, FRAME, 1000, new Set());

    expect(runtime.enemy.health).toBeLessThan(startHealth);
    expect(runtime.enemy.knockbackVx).toBeGreaterThan(100);
  });

  it("basic ink flick spawns a player projectile and respects its cooldown", () => {
    const runtime = createRuntime();
    runtime.aim = {
      x: runtime.player.x + 220,
      y: runtime.player.y + runtime.player.height / 2,
    };

    castBasicAttack(runtime, 1000);
    const firstWave = runtime.projectiles.filter(
      (projectile) => projectile.kind === "spark" && projectile.owner === "player",
    );
    expect(firstWave).toHaveLength(1);
    expect(firstWave[0].damage).toBeGreaterThan(0);

    // Still on cooldown -> no new flick.
    castBasicAttack(runtime, 1000);
    expect(
      runtime.projectiles.filter((projectile) => projectile.kind === "spark"),
    ).toHaveLength(1);

    // After the cooldown it fires again.
    castBasicAttack(runtime, 1600);
    expect(
      runtime.projectiles.filter((projectile) => projectile.kind === "spark"),
    ).toHaveLength(2);
  });

  it("a single basic flick connects and damages the enemy (no dead-end)", () => {
    // With every page spent the player can still chip the enemy down, so the
    // duel is never unwinnable.
    const runtime = createRuntime();
    runtime.player.x = runtime.enemy.x - 130; // in range, out of melee
    runtime.aim = {
      x: runtime.enemy.x + runtime.enemy.width / 2,
      y: runtime.enemy.y + runtime.enemy.height / 2,
    };

    const startHealth = runtime.enemy.health;
    castBasicAttack(runtime, 1000);

    // Let the flick travel into the advancing enemy.
    step(runtime, 24);

    expect(runtime.enemy.health).toBeLessThan(startHealth);
  });
});
