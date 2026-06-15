"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Footprints,
  RotateCcw,
  Swords,
} from "lucide-react";
import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import GrimoireBar from "@/components/GrimoireBar";
import { demoSpellById, type DemoSpell } from "@/data/demoSpells";
import { qualityLabel } from "@/lib/circleQuality";
import {
  loadGrimoire,
  type PreparedSpell,
} from "@/lib/grimoireStorage";
import { getScaledSpellStats } from "@/lib/spellEffects";

const STAGE_WIDTH = 960;
const STAGE_HEIGHT = 540;
const GROUND_Y = 466;
const GRAVITY = 1320;

type GameStatus = "playing" | "victory" | "defeat";
type ControlKey = "left" | "right" | "jump";

type Actor = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  onGround: boolean;
  facing: 1 | -1;
};

type ProjectileKind = "flame" | "water" | "pyreball" | "ink";

type Projectile = {
  id: number;
  owner: "player" | "enemy";
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  push: number;
  explosionRadius: number;
  ttl: number;
  color: string;
};

type WaterPlatform = {
  id: number;
  x: number;
  y: number;
  targetY: number;
  width: number;
  height: number;
  ttl: number;
};

type WindWall = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  push: number;
  ttl: number;
};

type SandTrap = {
  id: number;
  x: number;
  y: number;
  radius: number;
  slow: number;
  damage: number;
  ttl: number;
};

type Beam = {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  ttl: number;
};

type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  ttl: number;
  maxTtl: number;
  color: string;
};

type Runtime = {
  player: Actor;
  enemy: Actor;
  projectiles: Projectile[];
  platforms: WaterPlatform[];
  walls: WindWall[];
  traps: SandTrap[];
  beams: Beam[];
  particles: Particle[];
  aim: { x: number; y: number };
  status: GameStatus;
  lastTime: number;
  nextId: number;
  enemyAttackReadyAt: number;
  enemyShotReadyAt: number;
  enemyJumpAt: number;
  speedBuffUntil: number;
  message: string;
  messageUntil: number;
  shakeUntil: number;
};

type HudState = {
  playerHealth: number;
  enemyHealth: number;
  status: GameStatus;
  buffActive: boolean;
  message: string;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createRuntime(): Runtime {
  return {
    player: {
      x: 140,
      y: GROUND_Y - 58,
      vx: 0,
      vy: 0,
      width: 38,
      height: 58,
      health: 100,
      maxHealth: 100,
      onGround: true,
      facing: 1,
    },
    enemy: {
      x: 760,
      y: GROUND_Y - 62,
      vx: 0,
      vy: 0,
      width: 42,
      height: 62,
      health: 120,
      maxHealth: 120,
      onGround: true,
      facing: -1,
    },
    projectiles: [],
    platforms: [],
    walls: [],
    traps: [],
    beams: [],
    particles: [],
    aim: { x: 700, y: 300 },
    status: "playing",
    lastTime: 0,
    nextId: 1,
    enemyAttackReadyAt: 0,
    enemyShotReadyAt: 1700,
    enemyJumpAt: 1200,
    speedBuffUntil: 0,
    message: "The duel begins.",
    messageUntil: 1600,
    shakeUntil: 0,
  };
}

function actorCenter(actor: Actor) {
  return {
    x: actor.x + actor.width / 2,
    y: actor.y + actor.height / 2,
  };
}

function rectanglesOverlap(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function circleHitsActor(projectile: Projectile, actor: Actor) {
  const closestX = clamp(
    projectile.x,
    actor.x,
    actor.x + actor.width,
  );
  const closestY = clamp(
    projectile.y,
    actor.y,
    actor.y + actor.height,
  );
  return (
    Math.hypot(projectile.x - closestX, projectile.y - closestY) <=
    projectile.radius
  );
}

function pointToSegmentDistance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection = clamp(
    ((point.x - start.x) * segmentX +
      (point.y - start.y) * segmentY) /
      lengthSquared,
    0,
    1,
  );
  const nearestX = start.x + segmentX * projection;
  const nearestY = start.y + segmentY * projection;
  return Math.hypot(point.x - nearestX, point.y - nearestY);
}

function emitParticles(
  runtime: Runtime,
  x: number,
  y: number,
  color: string,
  count: number,
  speed = 150,
) {
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.35 + Math.random() * 0.65);
    const ttl = 0.35 + Math.random() * 0.5;
    runtime.particles.push({
      id: runtime.nextId++,
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      size: 2 + Math.random() * 5,
      ttl,
      maxTtl: ttl,
      color,
    });
  }
}

function damageEnemy(
  runtime: Runtime,
  damage: number,
  push: number,
  direction: number,
  color: string,
  now: number,
) {
  runtime.enemy.health = clamp(
    runtime.enemy.health - damage,
    0,
    runtime.enemy.maxHealth,
  );
  runtime.enemy.vx += direction * push;
  const center = actorCenter(runtime.enemy);
  emitParticles(runtime, center.x, center.y, color, 10);
  runtime.shakeUntil = now + 120;
}

function damagePlayer(
  runtime: Runtime,
  damage: number,
  push: number,
  direction: number,
  now: number,
) {
  runtime.player.health = clamp(
    runtime.player.health - damage,
    0,
    runtime.player.maxHealth,
  );
  runtime.player.vx += direction * push;
  const center = actorCenter(runtime.player);
  emitParticles(runtime, center.x, center.y, "#d76a65", 8);
  runtime.shakeUntil = now + 100;
}

function resolveActorFloor(
  actor: Actor,
  previousY: number,
  platforms: readonly WaterPlatform[],
) {
  actor.onGround = false;

  if (actor.vy >= 0) {
    const previousBottom = previousY + actor.height;
    const nextBottom = actor.y + actor.height;

    for (const platform of platforms) {
      const horizontal =
        actor.x + actor.width > platform.x &&
        actor.x < platform.x + platform.width;
      const crossedTop =
        previousBottom <= platform.y + 8 && nextBottom >= platform.y;

      if (horizontal && crossedTop) {
        actor.y = platform.y - actor.height;
        actor.vy = 0;
        actor.onGround = true;
        return;
      }
    }
  }

  if (actor.y + actor.height >= GROUND_Y) {
    actor.y = GROUND_Y - actor.height;
    actor.vy = 0;
    actor.onGround = true;
  }
}

function explodePyreball(
  runtime: Runtime,
  projectile: Projectile,
  now: number,
) {
  const enemy = actorCenter(runtime.enemy);
  const distance = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y);

  if (distance <= projectile.explosionRadius + runtime.enemy.width / 2) {
    const direction = enemy.x >= projectile.x ? 1 : -1;
    const falloff = clamp(
      1 - distance / (projectile.explosionRadius * 1.4),
      0.45,
      1,
    );
    damageEnemy(
      runtime,
      projectile.damage * falloff,
      projectile.push * falloff,
      direction,
      "#f1913d",
      now,
    );
  }

  emitParticles(runtime, projectile.x, projectile.y, "#ff9a3d", 28, 260);
  emitParticles(runtime, projectile.x, projectile.y, "#ffdd72", 16, 170);
  runtime.shakeUntil = now + 220;
}

function updateRuntime(
  runtime: Runtime,
  delta: number,
  now: number,
  controls: ReadonlySet<ControlKey>,
) {
  if (runtime.status !== "playing") {
    updateParticles(runtime, delta);
    return;
  }

  const buffActive = now < runtime.speedBuffUntil;
  const moveSpeed = buffActive ? 355 : 245;
  const jumpSpeed = buffActive ? 610 : 490;
  const playerDirection =
    (controls.has("right") ? 1 : 0) - (controls.has("left") ? 1 : 0);

  runtime.player.vx = playerDirection * moveSpeed;
  if (playerDirection !== 0) {
    runtime.player.facing = playerDirection > 0 ? 1 : -1;
  }
  if (controls.has("jump") && runtime.player.onGround) {
    runtime.player.vy = -jumpSpeed;
    runtime.player.onGround = false;
  }

  const previousPlayerY = runtime.player.y;
  runtime.player.vy += GRAVITY * delta;
  runtime.player.x += runtime.player.vx * delta;
  runtime.player.y += runtime.player.vy * delta;
  runtime.player.x = clamp(
    runtime.player.x,
    22,
    STAGE_WIDTH - runtime.player.width - 22,
  );
  resolveActorFloor(runtime.player, previousPlayerY, runtime.platforms);

  updateEnemy(runtime, delta, now);
  updateWorldEffects(runtime, delta, now);
  updateParticles(runtime, delta);

  if (runtime.enemy.health <= 0) {
    runtime.status = "victory";
    runtime.message = "The rival's ink breaks apart.";
    runtime.messageUntil = Number.POSITIVE_INFINITY;
  } else if (runtime.player.health <= 0) {
    runtime.status = "defeat";
    runtime.message = "Your grimoire falls silent.";
    runtime.messageUntil = Number.POSITIVE_INFINITY;
  }
}

function updateEnemy(runtime: Runtime, delta: number, now: number) {
  const playerCenter = actorCenter(runtime.player);
  const enemyCenter = actorCenter(runtime.enemy);
  const deltaX = playerCenter.x - enemyCenter.x;
  const distanceX = Math.abs(deltaX);
  const direction = deltaX >= 0 ? 1 : -1;
  let speedScale = 1;

  for (const trap of runtime.traps) {
    const distance = Math.hypot(enemyCenter.x - trap.x, enemyCenter.y - trap.y);
    if (distance <= trap.radius) {
      speedScale = Math.min(speedScale, 1 - trap.slow);
      runtime.enemy.health = clamp(
        runtime.enemy.health - trap.damage * delta * 0.28,
        0,
        runtime.enemy.maxHealth,
      );
    }
  }

  runtime.enemy.facing = direction;
  runtime.enemy.vx = distanceX > 58 ? direction * 158 * speedScale : 0;

  if (now >= runtime.enemyJumpAt && runtime.enemy.onGround) {
    runtime.enemy.vy = -455;
    runtime.enemy.onGround = false;
    runtime.enemyJumpAt = now + 1700 + Math.random() * 1900;
  }

  if (
    distanceX < 62 &&
    Math.abs(playerCenter.y - enemyCenter.y) < 70 &&
    now >= runtime.enemyAttackReadyAt
  ) {
    damagePlayer(runtime, 9, 230, direction, now);
    runtime.enemyAttackReadyAt = now + 920;
    runtime.message = "The rival strikes at close range.";
    runtime.messageUntil = now + 850;
  }

  if (
    distanceX > 230 &&
    now >= runtime.enemyShotReadyAt &&
    Math.abs(playerCenter.y - enemyCenter.y) < 190
  ) {
    const length = Math.max(
      1,
      Math.hypot(playerCenter.x - enemyCenter.x, playerCenter.y - enemyCenter.y),
    );
    runtime.projectiles.push({
      id: runtime.nextId++,
      owner: "enemy",
      kind: "ink",
      x: enemyCenter.x,
      y: enemyCenter.y - 8,
      vx: ((playerCenter.x - enemyCenter.x) / length) * 310,
      vy: ((playerCenter.y - enemyCenter.y) / length) * 310,
      radius: 9,
      damage: 7,
      push: 145,
      explosionRadius: 0,
      ttl: 3.2,
      color: "#d86c8f",
    });
    runtime.enemyShotReadyAt = now + 2300 + Math.random() * 900;
  }

  const previousEnemyY = runtime.enemy.y;
  runtime.enemy.vy += GRAVITY * delta;
  runtime.enemy.x += runtime.enemy.vx * delta;
  runtime.enemy.y += runtime.enemy.vy * delta;
  runtime.enemy.x = clamp(
    runtime.enemy.x,
    22,
    STAGE_WIDTH - runtime.enemy.width - 22,
  );
  resolveActorFloor(runtime.enemy, previousEnemyY, runtime.platforms);

  for (const wall of runtime.walls) {
    if (rectanglesOverlap(runtime.enemy, wall)) {
      const wallCenter = wall.x + wall.width / 2;
      const pushDirection = enemyCenter.x >= wallCenter ? 1 : -1;
      runtime.enemy.x += pushDirection * wall.push * delta;
      runtime.enemy.vx = pushDirection * wall.push * 0.45;
    }
  }
}

function updateWorldEffects(runtime: Runtime, delta: number, now: number) {
  runtime.platforms = runtime.platforms
    .map((platform) => ({
      ...platform,
      y: Math.max(platform.targetY, platform.y - 145 * delta),
      ttl: platform.ttl - delta,
    }))
    .filter((platform) => platform.ttl > 0);
  runtime.walls = runtime.walls
    .map((wall) => ({ ...wall, ttl: wall.ttl - delta }))
    .filter((wall) => wall.ttl > 0);
  runtime.traps = runtime.traps
    .map((trap) => ({ ...trap, ttl: trap.ttl - delta }))
    .filter((trap) => trap.ttl > 0);
  runtime.beams = runtime.beams
    .map((beam) => ({ ...beam, ttl: beam.ttl - delta }))
    .filter((beam) => beam.ttl > 0);

  const activeProjectiles: Projectile[] = [];
  for (const projectile of runtime.projectiles) {
    projectile.ttl -= delta;
    projectile.x += projectile.vx * delta;
    projectile.y += projectile.vy * delta;

    if (projectile.kind === "pyreball") {
      projectile.vy += 90 * delta;
    }

    let consumed = false;

    if (projectile.owner === "enemy") {
      for (const wall of runtime.walls) {
        if (
          projectile.x + projectile.radius > wall.x &&
          projectile.x - projectile.radius < wall.x + wall.width &&
          projectile.y + projectile.radius > wall.y &&
          projectile.y - projectile.radius < wall.y + wall.height
        ) {
          emitParticles(
            runtime,
            projectile.x,
            projectile.y,
            "#a5dfb5",
            10,
          );
          consumed = true;
          break;
        }
      }

      if (!consumed && circleHitsActor(projectile, runtime.player)) {
        const direction = projectile.vx >= 0 ? 1 : -1;
        damagePlayer(
          runtime,
          projectile.damage,
          projectile.push,
          direction,
          now,
        );
        consumed = true;
      }
    } else if (circleHitsActor(projectile, runtime.enemy)) {
      if (projectile.kind === "pyreball") {
        explodePyreball(runtime, projectile, now);
      } else {
        const direction = projectile.vx >= 0 ? 1 : -1;
        damageEnemy(
          runtime,
          projectile.damage,
          projectile.push,
          direction,
          projectile.color,
          now,
        );
      }
      consumed = true;
    }

    if (
      projectile.kind === "pyreball" &&
      !consumed &&
      projectile.y + projectile.radius >= GROUND_Y
    ) {
      explodePyreball(runtime, projectile, now);
      consumed = true;
    }

    const inBounds =
      projectile.x > -100 &&
      projectile.x < STAGE_WIDTH + 100 &&
      projectile.y > -100 &&
      projectile.y < STAGE_HEIGHT + 100;

    if (!consumed && projectile.ttl > 0 && inBounds) {
      activeProjectiles.push(projectile);
    }
  }
  runtime.projectiles = activeProjectiles;
}

function updateParticles(runtime: Runtime, delta: number) {
  runtime.particles = runtime.particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * delta,
      y: particle.y + particle.vy * delta,
      vy: particle.vy + 90 * delta,
      ttl: particle.ttl - delta,
    }))
    .filter((particle) => particle.ttl > 0);
}

function drawRuntime(
  context: CanvasRenderingContext2D,
  runtime: Runtime,
  now: number,
) {
  context.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
  context.save();

  if (now < runtime.shakeUntil) {
    context.translate(
      (Math.random() - 0.5) * 7,
      (Math.random() - 0.5) * 5,
    );
  }

  drawStageFloor(context);
  runtime.traps.forEach((trap) => drawSandTrap(context, trap));
  runtime.platforms.forEach((platform) =>
    drawWaterPlatform(context, platform),
  );
  runtime.walls.forEach((wall) => drawWindWall(context, wall, now));
  runtime.beams.forEach((beam) => drawBeam(context, beam));
  runtime.projectiles.forEach((projectile) =>
    drawProjectile(context, projectile),
  );
  runtime.particles.forEach((particle) => drawParticle(context, particle));

  drawPlayer(
    context,
    runtime.player,
    now < runtime.speedBuffUntil,
    runtime.aim,
  );
  drawEnemy(context, runtime.enemy);
  drawAim(context, runtime.aim);
  context.restore();
}

function drawStageFloor(context: CanvasRenderingContext2D) {
  const gradient = context.createLinearGradient(0, GROUND_Y, 0, STAGE_HEIGHT);
  gradient.addColorStop(0, "rgba(29, 25, 49, 0.88)");
  gradient.addColorStop(1, "rgba(8, 8, 18, 0.98)");
  context.fillStyle = gradient;
  context.fillRect(0, GROUND_Y, STAGE_WIDTH, STAGE_HEIGHT - GROUND_Y);
  context.fillStyle = "rgba(222, 188, 103, 0.72)";
  context.fillRect(0, GROUND_Y, STAGE_WIDTH, 3);

  context.strokeStyle = "rgba(255, 244, 206, 0.15)";
  context.lineWidth = 1;
  for (let x = 18; x < STAGE_WIDTH; x += 54) {
    context.beginPath();
    context.moveTo(x, GROUND_Y + 10);
    context.lineTo(x + 22, STAGE_HEIGHT);
    context.stroke();
  }
}

function drawWaterPlatform(
  context: CanvasRenderingContext2D,
  platform: WaterPlatform,
) {
  const gradient = context.createLinearGradient(
    platform.x,
    platform.y,
    platform.x,
    platform.y + platform.height,
  );
  gradient.addColorStop(0, "rgba(121, 231, 239, 0.95)");
  gradient.addColorStop(1, "rgba(39, 117, 163, 0.78)");
  context.fillStyle = gradient;
  context.strokeStyle = "rgba(219, 252, 255, 0.95)";
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(
    platform.x,
    platform.y,
    platform.width,
    platform.height,
    10,
  );
  context.fill();
  context.stroke();
  context.fillStyle = "rgba(86, 190, 211, 0.26)";
  context.fillRect(
    platform.x + platform.width * 0.12,
    platform.y + platform.height,
    platform.width * 0.76,
    GROUND_Y - platform.y - platform.height,
  );
}

function drawWindWall(
  context: CanvasRenderingContext2D,
  wall: WindWall,
  now: number,
) {
  context.save();
  context.strokeStyle = "rgba(177, 244, 205, 0.82)";
  context.shadowColor = "#8ce2b0";
  context.shadowBlur = 14;
  context.lineWidth = 5;

  for (let line = 0; line < 4; line += 1) {
    context.beginPath();
    for (let step = 0; step <= 16; step += 1) {
      const progress = step / 16;
      const y = wall.y + progress * wall.height;
      const x =
        wall.x +
        wall.width / 2 +
        Math.sin(progress * Math.PI * 5 + now / 180 + line) * (13 + line * 2);
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
  context.restore();
}

function drawSandTrap(context: CanvasRenderingContext2D, trap: SandTrap) {
  context.save();
  context.translate(trap.x, trap.y - 4);
  context.fillStyle = "rgba(197, 151, 79, 0.24)";
  context.strokeStyle = "rgba(235, 198, 120, 0.88)";
  context.lineWidth = 4;
  context.beginPath();
  context.ellipse(0, 0, trap.radius, trap.radius * 0.28, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  for (let index = -2; index <= 2; index += 1) {
    context.beginPath();
    context.moveTo(index * trap.radius * 0.18, -5);
    context.quadraticCurveTo(
      index * trap.radius * 0.26,
      -trap.radius * 0.65,
      index * trap.radius * 0.36,
      -trap.radius * 0.82,
    );
    context.stroke();
  }
  context.restore();
}

function drawBeam(context: CanvasRenderingContext2D, beam: Beam) {
  context.save();
  context.strokeStyle = "rgba(255, 249, 192, 0.94)";
  context.shadowColor = "#f7df79";
  context.shadowBlur = 22;
  context.lineWidth = beam.width;
  context.beginPath();
  context.moveTo(beam.x1, beam.y1);
  context.lineTo(beam.x2, beam.y2);
  context.stroke();
  context.strokeStyle = "white";
  context.lineWidth = Math.max(2, beam.width * 0.24);
  context.stroke();
  context.restore();
}

function drawProjectile(
  context: CanvasRenderingContext2D,
  projectile: Projectile,
) {
  context.save();
  const gradient = context.createRadialGradient(
    projectile.x - projectile.radius * 0.35,
    projectile.y - projectile.radius * 0.35,
    1,
    projectile.x,
    projectile.y,
    projectile.radius,
  );

  if (projectile.kind === "water") {
    gradient.addColorStop(0, "#e5fdff");
    gradient.addColorStop(0.4, "#65d9ee");
    gradient.addColorStop(1, "#2676ae");
  } else if (projectile.kind === "ink") {
    gradient.addColorStop(0, "#ffd9eb");
    gradient.addColorStop(0.45, "#d86c8f");
    gradient.addColorStop(1, "#5d214d");
  } else {
    gradient.addColorStop(0, "#fff3a8");
    gradient.addColorStop(0.45, "#ff9c3f");
    gradient.addColorStop(1, "#b92f22");
  }

  context.fillStyle = gradient;
  context.shadowColor = projectile.color;
  context.shadowBlur = projectile.kind === "pyreball" ? 24 : 13;
  context.beginPath();
  context.arc(
    projectile.x,
    projectile.y,
    projectile.radius,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.globalAlpha = 0.55;
  context.strokeStyle = projectile.color;
  context.lineWidth = projectile.radius * 0.55;
  context.beginPath();
  context.moveTo(projectile.x, projectile.y);
  context.lineTo(
    projectile.x - projectile.vx * 0.08,
    projectile.y - projectile.vy * 0.08,
  );
  context.stroke();
  context.restore();
}

function drawParticle(context: CanvasRenderingContext2D, particle: Particle) {
  context.save();
  context.globalAlpha = clamp(particle.ttl / particle.maxTtl, 0, 1);
  context.fillStyle = particle.color;
  context.beginPath();
  context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  actor: Actor,
  buffActive: boolean,
  aim: { x: number; y: number },
) {
  const centerX = actor.x + actor.width / 2;
  const bottom = actor.y + actor.height;
  context.save();
  context.translate(centerX, bottom);

  if (buffActive) {
    context.strokeStyle = "rgba(147, 224, 194, 0.72)";
    context.lineWidth = 3;
    for (let index = 0; index < 3; index += 1) {
      context.beginPath();
      context.arc(
        0,
        -30,
        25 + index * 6,
        -Math.PI * 0.8,
        Math.PI * 0.7,
      );
      context.stroke();
    }
  }

  context.strokeStyle = "#211a12";
  context.lineWidth = 3;
  context.fillStyle = "#f0e1b9";
  context.beginPath();
  context.moveTo(-17, -2);
  context.quadraticCurveTo(-21, -35, -10, -43);
  context.lineTo(12, -43);
  context.quadraticCurveTo(22, -28, 17, -2);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#5d5797";
  context.beginPath();
  context.moveTo(-14, -8);
  context.lineTo(0, -35);
  context.lineTo(16, -8);
  context.closePath();
  context.fill();

  context.fillStyle = "#f4d7ae";
  context.beginPath();
  context.arc(0, -48, 9, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = "#292342";
  context.beginPath();
  context.moveTo(-19, -55);
  context.lineTo(0, -81);
  context.lineTo(16, -55);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillRect(-23, -57, 46, 5);

  const aimAngle = Math.atan2(aim.y - (bottom - 35), aim.x - centerX);
  context.rotate(aimAngle);
  context.strokeStyle = "#d8b760";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(8, -35);
  context.lineTo(36, -35);
  context.stroke();
  context.restore();
}

function drawEnemy(context: CanvasRenderingContext2D, actor: Actor) {
  const centerX = actor.x + actor.width / 2;
  const bottom = actor.y + actor.height;
  context.save();
  context.translate(centerX, bottom);
  context.strokeStyle = "#160f19";
  context.lineWidth = 3;

  context.fillStyle = "#5b263f";
  context.beginPath();
  context.moveTo(-20, -2);
  context.quadraticCurveTo(-22, -40, -9, -52);
  context.lineTo(10, -52);
  context.quadraticCurveTo(23, -36, 20, -2);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#2a1a31";
  context.beginPath();
  context.moveTo(-18, -14);
  context.lineTo(0, -47);
  context.lineTo(18, -14);
  context.closePath();
  context.fill();

  context.fillStyle = "#e6d7bf";
  context.beginPath();
  context.arc(0, -58, 10, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#a83c5d";
  context.fillRect(-8, -61, 16, 5);

  context.fillStyle = "#1e172b";
  context.beginPath();
  context.moveTo(-18, -66);
  context.lineTo(1, -85);
  context.lineTo(18, -66);
  context.closePath();
  context.fill();
  context.fillRect(-22, -68, 44, 5);
  context.restore();
}

function drawAim(
  context: CanvasRenderingContext2D,
  aim: { x: number; y: number },
) {
  context.save();
  context.strokeStyle = "rgba(255, 246, 204, 0.9)";
  context.lineWidth = 2;
  context.setLineDash([5, 5]);
  context.beginPath();
  context.arc(aim.x, aim.y, 13, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(aim.x - 20, aim.y);
  context.lineTo(aim.x + 20, aim.y);
  context.moveTo(aim.x, aim.y - 20);
  context.lineTo(aim.x, aim.y + 20);
  context.stroke();
  context.restore();
}

export default function ArenaGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime>(createRuntime());
  const controlsRef = useRef<Set<ControlKey>>(new Set());
  const pagesRef = useRef<PreparedSpell[]>([]);
  const initialPagesRef = useRef<PreparedSpell[]>([]);
  const selectedIndexRef = useRef(0);
  const lastHudUpdateRef = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [pages, setPages] = useState<PreparedSpell[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hud, setHud] = useState<HudState>({
    playerHealth: 100,
    enemyHealth: 120,
    status: "playing",
    buffActive: false,
    message: "The duel begins.",
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = loadGrimoire();
      const fresh = stored.map((page) => ({ ...page }));
      initialPagesRef.current = fresh;
      pagesRef.current = fresh;
      setPages(fresh);
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const selectPage = useCallback((index: number) => {
    if (pagesRef.current.length === 0) return;
    const nextIndex =
      ((index % pagesRef.current.length) + pagesRef.current.length) %
      pagesRef.current.length;
    selectedIndexRef.current = nextIndex;
    setSelectedIndex(nextIndex);
  }, []);

  const flipPage = useCallback(
    (direction: number) => {
      selectPage(selectedIndexRef.current + direction);
    },
    [selectPage],
  );

  const castSelectedSpell = useCallback(() => {
    const runtime = runtimeRef.current;
    const page = pagesRef.current[selectedIndexRef.current];

    if (!page || runtime.status !== "playing") return;
    if (page.remainingUses <= 0) {
      runtime.message = "That page is spent. Flip to another spell.";
      runtime.messageUntil = performance.now() + 1100;
      return;
    }

    const definition = demoSpellById.get(page.spellId);
    if (!definition) return;

    const stats = getScaledSpellStats(definition, page.preparedQuality);
    const playerCenter = actorCenter(runtime.player);
    const deltaX = runtime.aim.x - playerCenter.x;
    const deltaY = runtime.aim.y - playerCenter.y;
    const length = Math.max(1, Math.hypot(deltaX, deltaY));
    const directionX =
      length <= 1 ? runtime.player.facing : deltaX / length;
    const directionY = length <= 1 ? 0 : deltaY / length;
    const now = performance.now();

    activateSpell(
      runtime,
      definition,
      stats,
      playerCenter,
      directionX,
      directionY,
      now,
    );

    const updatedPages = pagesRef.current.map((current, index) =>
      index === selectedIndexRef.current
        ? { ...current, remainingUses: current.remainingUses - 1 }
        : current,
    );
    pagesRef.current = updatedPages;
    setPages(updatedPages);
    runtime.message = `${definition.name} cast.`;
    runtime.messageUntil = now + 950;
  }, []);

  const resetBattle = useCallback(() => {
    const freshPages = initialPagesRef.current.map((page) => ({
      ...page,
      remainingUses:
        demoSpellById.get(page.spellId)?.battleUses ?? page.remainingUses,
    }));
    pagesRef.current = freshPages;
    setPages(freshPages);
    selectedIndexRef.current = 0;
    setSelectedIndex(0);
    runtimeRef.current = createRuntime();
    setHud({
      playerHealth: 100,
      enemyHealth: 120,
      status: "playing",
      buffActive: false,
      message: "The duel begins.",
    });
  }, []);

  useEffect(() => {
    if (!loaded || pagesRef.current.length === 0) return;

    let animationFrame = 0;
    const tick = (timestamp: number) => {
      const runtime = runtimeRef.current;
      if (runtime.lastTime === 0) runtime.lastTime = timestamp;
      const delta = Math.min((timestamp - runtime.lastTime) / 1000, 0.034);
      runtime.lastTime = timestamp;
      updateRuntime(runtime, delta, timestamp, controlsRef.current);

      const context = canvasRef.current?.getContext("2d");
      if (context) drawRuntime(context, runtime, timestamp);

      if (timestamp - lastHudUpdateRef.current > 80) {
        lastHudUpdateRef.current = timestamp;
        setHud({
          playerHealth: runtime.player.health,
          enemyHealth: runtime.enemy.health,
          status: runtime.status,
          buffActive: timestamp < runtime.speedBuffUntil,
          message:
            timestamp < runtime.messageUntil ? runtime.message : "",
        });
      }

      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [loaded]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const gameKey =
        key === "a" ||
        key === "d" ||
        key === "w" ||
        key === "q" ||
        key === "e" ||
        key === "f" ||
        event.code === "Space";
      if (gameKey) event.preventDefault();

      if (key === "a") controlsRef.current.add("left");
      if (key === "d") controlsRef.current.add("right");
      if (key === "w" || event.code === "Space") {
        controlsRef.current.add("jump");
      }

      if (!event.repeat && key === "q") flipPage(-1);
      if (!event.repeat && key === "e") flipPage(1);
      if (!event.repeat && key === "f") castSelectedSpell();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "a") controlsRef.current.delete("left");
      if (key === "d") controlsRef.current.delete("right");
      if (key === "w" || event.code === "Space") {
        controlsRef.current.delete("jump");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [castSelectedSpell, flipPage]);

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    runtimeRef.current.aim = {
      x: ((event.clientX - bounds.left) / bounds.width) * STAGE_WIDTH,
      y: ((event.clientY - bounds.top) / bounds.height) * STAGE_HEIGHT,
    };
  };

  const setControl = (control: ControlKey, active: boolean) => {
    if (active) controlsRef.current.add(control);
    else controlsRef.current.delete(control);
  };

  if (!loaded) {
    return (
      <main className="game-page grid min-h-screen place-items-center text-white">
        <p className="font-[family-name:var(--font-cinzel)] text-xl">
          Opening the grimoire...
        </p>
      </main>
    );
  }

  if (pages.length === 0) {
    return (
      <main className="game-page grid min-h-screen place-items-center px-4 text-white">
        <section className="max-w-lg rounded-2xl border border-white/15 bg-[#17152b]/95 p-8 text-center shadow-2xl">
          <BookOpen className="mx-auto h-10 w-10 text-[#d9bd70]" />
          <h1 className="mt-4 font-[family-name:var(--font-cinzel)] text-3xl font-semibold">
            Your grimoire is empty
          </h1>
          <p className="mt-3 leading-7 text-white/65">
            The arena only accepts spells traced and bound during preparation.
          </p>
          <Link
            href="/prepare"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#b64f2c] px-5 py-3 font-semibold text-white"
          >
            Prepare spells
          </Link>
        </section>
      </main>
    );
  }

  const selectedPage = pages[selectedIndex] ?? pages[0];
  const selectedDefinition = demoSpellById.get(selectedPage.spellId);

  return (
    <main className="game-page min-h-screen px-3 py-4 text-white sm:px-5">
      <div className="mx-auto max-w-[1320px]">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#17152b]/95 px-4 py-3 shadow-xl">
          <div className="flex items-center gap-3">
            <Swords className="h-6 w-6 text-[#d9bd70]" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d9bd70]">
                One-player duel
              </p>
              <h1 className="font-[family-name:var(--font-cinzel)] text-lg font-semibold sm:text-xl">
                Ink Grimoire Arena
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/prepare"
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              Reprepare
            </Link>
            <button
              type="button"
              onClick={resetBattle}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Restart
            </button>
          </div>
        </header>

        <section className="mb-3 grid gap-3 md:grid-cols-2">
          <HealthPanel
            label="Inkweaver"
            health={hud.playerHealth}
            maximum={100}
            color="#6ed7c8"
          />
          <HealthPanel
            label="Rival Scribe"
            health={hud.enemyHealth}
            maximum={120}
            color="#d86c8f"
            alignRight
          />
        </section>

        <section className="relative mx-auto max-w-[960px] overflow-hidden rounded-2xl border border-white/15 bg-[#17152b] shadow-2xl">
          <div className="arena-stage relative aspect-video w-full">
            <canvas
              ref={canvasRef}
              width={STAGE_WIDTH}
              height={STAGE_HEIGHT}
              aria-label="Ink Grimoire Arena combat stage"
              onPointerMove={handlePointerMove}
              onClick={castSelectedSpell}
              className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
            />

            {hud.message ? (
              <div
                aria-live="polite"
                className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-white/15 bg-[#17152b]/85 px-4 py-2 text-center text-xs font-semibold shadow-lg backdrop-blur-sm sm:text-sm"
              >
                {hud.message}
              </div>
            ) : null}

            {hud.status !== "playing" ? (
              <div className="absolute inset-0 grid place-items-center bg-[#0d0c1b]/72 p-4 backdrop-blur-sm">
                <div className="max-w-md rounded-2xl border border-white/15 bg-[#17152b]/95 p-7 text-center shadow-2xl">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d9bd70]">
                    Duel complete
                  </p>
                  <h2 className="mt-2 font-[family-name:var(--font-cinzel)] text-4xl font-semibold">
                    {hud.status === "victory" ? "Victory" : "Defeat"}
                  </h2>
                  <p className="mt-3 text-white/65">
                    {hud.status === "victory"
                      ? "Your prepared pages outlasted the rival's ink."
                      : "Change your loadout or retry the duel with a different page order."}
                  </p>
                  <div className="mt-5 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={resetBattle}
                      className="rounded-xl bg-[#b64f2c] px-5 py-3 font-semibold"
                    >
                      Duel again
                    </button>
                    <Link
                      href="/prepare"
                      className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-white/75"
                    >
                      Reprepare
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-3 grid gap-3 lg:grid-cols-[360px_1fr]">
          <article className="rounded-2xl border border-white/10 bg-[#17152b]/95 p-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-[#fff7dc] p-2">
                <Image
                  src={selectedPage.designImage}
                  alt=""
                  width={72}
                  height={72}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d9bd70]">
                  Page {selectedIndex + 1} of {pages.length}
                </p>
                <h2 className="mt-1 truncate font-[family-name:var(--font-cinzel)] text-lg font-semibold">
                  {selectedPage.name}
                </h2>
                <p className="mt-1 text-xs text-white/55">
                  {qualityLabel(selectedPage.preparedQuality)} ·{" "}
                  {Math.round(selectedPage.preparedQuality * 100)}% quality ·{" "}
                  {selectedPage.remainingUses} uses
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-white/70">
                  {selectedDefinition?.shortEffect}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-[44px_1fr_44px] gap-2">
              <button
                type="button"
                onClick={() => flipPage(-1)}
                aria-label="Previous grimoire page"
                className="grid place-items-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={castSelectedSpell}
                disabled={selectedPage.remainingUses <= 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b64f2c] px-4 py-3 font-[family-name:var(--font-cinzel)] font-semibold shadow-lg transition hover:bg-[#963d22] disabled:opacity-35"
              >
                <Crosshair className="h-4 w-4" aria-hidden="true" />
                Cast spell
              </button>
              <button
                type="button"
                onClick={() => flipPage(1)}
                aria-label="Next grimoire page"
                className="grid place-items-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </article>

          <div className="rounded-2xl border border-white/10 bg-[#17152b]/95 p-3 shadow-xl">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-white/55">
              <p>Q / E flip pages · Mouse aims · Click or F casts</p>
              <p className="flex items-center gap-1.5">
                <Footprints className="h-3.5 w-3.5" aria-hidden="true" />
                A / D move · Space or W jumps
                {hud.buffActive ? " · Sylph current active" : ""}
              </p>
            </div>
            <GrimoireBar
              pages={pages}
              selectedIndex={selectedIndex}
              onSelect={selectPage}
            />
          </div>
        </section>

        <div className="mt-3 grid grid-cols-4 gap-2 sm:hidden">
          <ControlButton
            label="Left"
            onChange={(active) => setControl("left", active)}
          />
          <ControlButton
            label="Jump"
            onChange={(active) => setControl("jump", active)}
          />
          <ControlButton
            label="Right"
            onChange={(active) => setControl("right", active)}
          />
          <button
            type="button"
            onClick={castSelectedSpell}
            className="rounded-xl bg-[#b64f2c] px-3 py-3 text-sm font-bold"
          >
            Cast
          </button>
        </div>
      </div>
    </main>
  );
}

function activateSpell(
  runtime: Runtime,
  definition: DemoSpell,
  stats: ReturnType<typeof getScaledSpellStats>,
  origin: { x: number; y: number },
  directionX: number,
  directionY: number,
  now: number,
) {
  emitParticles(runtime, origin.x, origin.y, definition.accent, 8, 100);

  switch (definition.id) {
    case "flame_shot":
    case "watershot":
    case "pyreball": {
      const kind: ProjectileKind =
        definition.id === "flame_shot"
          ? "flame"
          : definition.id === "watershot"
            ? "water"
            : "pyreball";
      runtime.projectiles.push({
        id: runtime.nextId++,
        owner: "player",
        kind,
        x: origin.x + directionX * 28,
        y: origin.y + directionY * 28,
        vx: directionX * stats.speed,
        vy: directionY * stats.speed,
        radius: stats.size,
        damage: stats.damage,
        push: stats.push,
        explosionRadius: stats.radius,
        ttl: kind === "pyreball" ? 4 : 2.5,
        color: definition.accent,
      });
      break;
    }
    case "rising_platform":
      runtime.platforms.push({
        id: runtime.nextId++,
        x: clamp(
          runtime.aim.x - stats.size / 2,
          20,
          STAGE_WIDTH - stats.size - 20,
        ),
        y: GROUND_Y + 10,
        targetY: clamp(GROUND_Y - stats.height, 250, GROUND_Y - 55),
        width: stats.size,
        height: 18,
        ttl: stats.duration,
      });
      break;
    case "wind_wall":
      runtime.walls.push({
        id: runtime.nextId++,
        x: clamp(runtime.aim.x - 12, 40, STAGE_WIDTH - 64),
        y: GROUND_Y - stats.size,
        width: 24,
        height: stats.size,
        push: stats.push,
        ttl: stats.duration,
      });
      break;
    case "sand_cage":
      runtime.traps.push({
        id: runtime.nextId++,
        x: clamp(runtime.aim.x, 70, STAGE_WIDTH - 70),
        y: GROUND_Y,
        radius: stats.radius,
        slow: stats.slow,
        damage: stats.damage,
        ttl: stats.duration,
      });
      break;
    case "sylph_shoes":
      runtime.speedBuffUntil = now + stats.duration * 1000;
      emitParticles(runtime, origin.x, origin.y, "#93e0c2", 22, 180);
      break;
    case "light_beam": {
      const end = {
        x: origin.x + directionX * stats.radius,
        y: origin.y + directionY * stats.radius,
      };
      runtime.beams.push({
        id: runtime.nextId++,
        x1: origin.x,
        y1: origin.y,
        x2: end.x,
        y2: end.y,
        width: stats.size,
        ttl: 0.16,
      });
      const enemyCenter = actorCenter(runtime.enemy);
      const distance = pointToSegmentDistance(enemyCenter, origin, end);
      if (distance <= runtime.enemy.width / 2 + stats.size) {
        damageEnemy(
          runtime,
          stats.damage,
          90,
          directionX >= 0 ? 1 : -1,
          "#f7df79",
          now,
        );
      }
      break;
    }
  }
}

function HealthPanel({
  label,
  health,
  maximum,
  color,
  alignRight = false,
}: {
  label: string;
  health: number;
  maximum: number;
  color: string;
  alignRight?: boolean;
}) {
  const percent = clamp((health / maximum) * 100, 0, 100);

  return (
    <div className="rounded-xl border border-white/10 bg-[#17152b]/92 px-4 py-3 shadow-lg">
      <div
        className={`mb-2 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.14em] ${
          alignRight ? "flex-row-reverse" : ""
        }`}
      >
        <span>{label}</span>
        <span className="font-mono text-white/55">
          {Math.ceil(health)} / {maximum}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-black/35">
        <div
          className={`h-full rounded-full transition-[width] duration-150 ${
            alignRight ? "ml-auto" : ""
          }`}
          style={{
            width: `${percent}%`,
            backgroundColor: color,
            boxShadow: `0 0 14px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onChange,
}: {
  label: string;
  onChange: (active: boolean) => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={() => onChange(true)}
      onPointerUp={() => onChange(false)}
      onPointerCancel={() => onChange(false)}
      onPointerLeave={() => onChange(false)}
      className="rounded-xl border border-white/15 bg-[#17152b]/95 px-3 py-3 text-sm font-bold"
    >
      {label}
    </button>
  );
}
