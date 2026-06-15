export type SpellElement = "fire" | "water" | "wind" | "earth" | "light";

export type SpellType =
  | "projectile"
  | "platform"
  | "defense"
  | "trap"
  | "buff"
  | "beam"
  | "heavy-projectile";

export type QualityScaling = {
  damage: boolean;
  size: boolean;
  speed: boolean;
  duration: boolean;
  push: boolean;
  height: boolean;
};

export type SpellDefinition = {
  id: string;
  name: string;
  element: SpellElement;
  type: SpellType;
  preparationInkCost: number;
  battleUses: number;
  basePower: number;
  complexity: 1 | 2 | 3 | 4 | 5;
  difficulty: 1 | 2 | 3 | 4 | 5;
  grimoireSlots: number;
  designImage: string;
  effectDescription: string;
  shortEffect: string;
  accent: string;
  qualityScaling: QualityScaling;
};

export const demoSpells = [
  {
    id: "flame_shot",
    name: "Flame Shot Seal",
    element: "fire",
    type: "projectile",
    preparationInkCost: 12,
    battleUses: 4,
    basePower: 20,
    complexity: 1,
    difficulty: 1,
    grimoireSlots: 1,
    designImage: "/spell-designs/flame-shot.svg",
    effectDescription:
      "Shoots a fast fire bolt toward the aim direction. Precision improves its damage, size, and speed.",
    shortEffect: "Fast damage bolt",
    accent: "#ef6a3a",
    qualityScaling: {
      damage: true,
      size: true,
      speed: true,
      duration: false,
      push: false,
      height: false,
    },
  },
  {
    id: "watershot",
    name: "Watershot Seal",
    element: "water",
    type: "projectile",
    preparationInkCost: 10,
    battleUses: 4,
    basePower: 12,
    complexity: 1,
    difficulty: 1,
    grimoireSlots: 1,
    designImage: "/spell-designs/watershot.svg",
    effectDescription:
      "Launches a water pulse that deals light damage and pushes the enemy away.",
    shortEffect: "Light hit, heavy push",
    accent: "#48b7d8",
    qualityScaling: {
      damage: true,
      size: true,
      speed: false,
      duration: false,
      push: true,
      height: false,
    },
  },
  {
    id: "rising_platform",
    name: "Rising Platform of Water",
    element: "water",
    type: "platform",
    preparationInkCost: 18,
    battleUses: 2,
    basePower: 8,
    complexity: 3,
    difficulty: 2,
    grimoireSlots: 2,
    designImage: "/spell-designs/rising-platform.svg",
    effectDescription:
      "Raises a temporary water platform at the aimed location for escape or elevation.",
    shortEffect: "Create rising terrain",
    accent: "#5ed1d6",
    qualityScaling: {
      damage: false,
      size: true,
      speed: false,
      duration: true,
      push: false,
      height: true,
    },
  },
  {
    id: "wind_wall",
    name: "Wind Wall",
    element: "wind",
    type: "defense",
    preparationInkCost: 20,
    battleUses: 2,
    basePower: 8,
    complexity: 3,
    difficulty: 2,
    grimoireSlots: 2,
    designImage: "/spell-designs/wind-wall.svg",
    effectDescription:
      "Forms a temporary wall that pushes enemies away and disperses hostile projectiles.",
    shortEffect: "Deflect and repel",
    accent: "#a5dfb5",
    qualityScaling: {
      damage: false,
      size: true,
      speed: false,
      duration: true,
      push: true,
      height: false,
    },
  },
  {
    id: "sand_cage",
    name: "Sand Cage",
    element: "earth",
    type: "trap",
    preparationInkCost: 30,
    battleUses: 1,
    basePower: 12,
    complexity: 5,
    difficulty: 4,
    grimoireSlots: 3,
    designImage: "/spell-designs/sand-cage.svg",
    effectDescription:
      "Creates a grounding sand field that slows and briefly binds an enemy.",
    shortEffect: "Area slow and bind",
    accent: "#d1a85d",
    qualityScaling: {
      damage: true,
      size: true,
      speed: false,
      duration: true,
      push: false,
      height: false,
    },
  },
  {
    id: "sylph_shoes",
    name: "Sylph Shoes Seal",
    element: "wind",
    type: "buff",
    preparationInkCost: 18,
    battleUses: 2,
    basePower: 10,
    complexity: 3,
    difficulty: 3,
    grimoireSlots: 2,
    designImage: "/spell-designs/sylph-shoes.svg",
    effectDescription:
      "Wraps the caster in a current that improves running speed, jump height, and air control.",
    shortEffect: "Movement and jump boost",
    accent: "#93e0c2",
    qualityScaling: {
      damage: false,
      size: false,
      speed: true,
      duration: true,
      push: false,
      height: true,
    },
  },
  {
    id: "light_beam",
    name: "Light Beam",
    element: "light",
    type: "beam",
    preparationInkCost: 22,
    battleUses: 2,
    basePower: 26,
    complexity: 4,
    difficulty: 3,
    grimoireSlots: 2,
    designImage: "/spell-designs/light-beam.svg",
    effectDescription:
      "Fires an immediate straight beam through the aimed point.",
    shortEffect: "Instant piercing beam",
    accent: "#f7df79",
    qualityScaling: {
      damage: true,
      size: true,
      speed: false,
      duration: false,
      push: false,
      height: false,
    },
  },
  {
    id: "pyreball",
    name: "Pyreball Seal",
    element: "fire",
    type: "heavy-projectile",
    preparationInkCost: 28,
    battleUses: 1,
    basePower: 42,
    complexity: 5,
    difficulty: 4,
    grimoireSlots: 3,
    designImage: "/spell-designs/pyreball.svg",
    effectDescription:
      "Launches a slow, unstable fireball that bursts into a damaging explosion on contact.",
    shortEffect: "Heavy explosive orb",
    accent: "#f1913d",
    qualityScaling: {
      damage: true,
      size: true,
      speed: false,
      duration: false,
      push: true,
      height: false,
    },
  },
] as const satisfies readonly SpellDefinition[];

export type DemoSpell = (typeof demoSpells)[number];

export const demoSpellById = new Map<string, DemoSpell>(
  demoSpells.map((spell) => [spell.id, spell]),
);
