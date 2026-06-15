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

export type LibraryComponent = {
  id: string;
  name: string;
  kind: "sigil" | "sign";
  assetPath: string;
  role: string;
};

export type SpellDefinition = {
  id: string;
  name: string;
  publicName: string;
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
  librarySourceUrl: string;
  formationDescription: string;
  libraryComponents: readonly LibraryComponent[];
  qualityScaling: QualityScaling;
};

const sourceUrl =
  "https://witchhatatelier.telepedia.net/wiki/Signs_Explained";

const components = {
  fire: {
    id: "fire",
    name: "Fire",
    kind: "sigil",
    assetPath: "/vectors/sigils/Fire_sigil.svg",
    role: "Defines flame and heat as the spell's material domain.",
  },
  water: {
    id: "water",
    name: "Water",
    kind: "sigil",
    assetPath: "/vectors/sigils/Water.svg",
    role: "Defines water as the spell's created or manipulated medium.",
  },
  wind: {
    id: "wind",
    name: "Wind",
    kind: "sigil",
    assetPath: "/vectors/sigils/Wind_(redirect).svg",
    role: "Moves and redirects the surrounding air.",
  },
  windUnderfoot: {
    id: "wind_underfoot",
    name: "Wind Underfoot",
    kind: "sigil",
    assetPath: "/vectors/sigils/Wind_Underfoot.svg",
    role: "Supports the caster on a stable current of air.",
  },
  earth: {
    id: "earth",
    name: "Earth",
    kind: "sigil",
    assetPath: "/vectors/sigils/Earth.svg",
    role: "Manipulates available sand, soil, and other solid material.",
  },
  light: {
    id: "light",
    name: "Light",
    kind: "sigil",
    assetPath: "/vectors/sigils/Light.svg",
    role: "Defines light as the spell's manifested medium.",
  },
  column: {
    id: "column",
    name: "Column",
    kind: "sign",
    assetPath: "/vectors/signs/Column.svg",
    role: "Projects the spell outward as a directed column or beam.",
  },
  region: {
    id: "region",
    name: "Region",
    kind: "sign",
    assetPath: "/vectors/signs/Region_Sign_Demo.svg",
    role: "Constrains the launch area so the projectile forms cleanly.",
  },
  levitation: {
    id: "levitation",
    name: "Levitation",
    kind: "sign",
    assetPath: "/vectors/signs/Levitation.svg",
    role: "Raises or suspends the manifested material.",
  },
  convergence: {
    id: "convergence",
    name: "Convergence",
    kind: "sign",
    assetPath: "/vectors/signs/Convergence.svg",
    role: "Pulls the flow together into a stable, concentrated formation.",
  },
  crush: {
    id: "crush",
    name: "Crush",
    kind: "sign",
    assetPath: "/vectors/signs/Crush.svg",
    role: "Applies inward pressure; its inverted cage use closes around a target.",
  },
} as const satisfies Record<string, LibraryComponent>;

export const demoSpells = [
  {
    id: "flame_shot",
    name: "Flame Shot Seal",
    publicName: "Cinder Lance",
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
    librarySourceUrl: sourceUrl,
    formationDescription:
      "Fire supplies the flame, Column drives it forward, and Region stabilizes the launch boundary.",
    libraryComponents: [
      components.fire,
      components.column,
      components.region,
    ],
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
    publicName: "Tideburst",
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
    librarySourceUrl: sourceUrl,
    formationDescription:
      "Water forms the pulse while Column sends it outward as a compact, forceful shot.",
    libraryComponents: [components.water, components.column],
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
    publicName: "Springstep Dais",
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
    librarySourceUrl: sourceUrl,
    formationDescription:
      "Water supplies the platform, Column gives it vertical direction, and Levitation holds it aloft.",
    libraryComponents: [
      components.water,
      components.column,
      components.levitation,
    ],
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
    publicName: "Gale Ward",
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
    librarySourceUrl: sourceUrl,
    formationDescription:
      "Wind moves the air, Column raises it into a wall, and Convergence keeps the barrier coherent.",
    libraryComponents: [
      components.wind,
      components.column,
      components.convergence,
    ],
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
    publicName: "Dune Bind",
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
    librarySourceUrl: sourceUrl,
    formationDescription:
      "Earth gathers nearby sand, Column raises it, and the inverted Crush formation closes the cage inward.",
    libraryComponents: [
      components.earth,
      components.column,
      components.crush,
    ],
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
    publicName: "Zephyr Treads",
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
    librarySourceUrl: sourceUrl,
    formationDescription:
      "Wind Underfoot provides support, Levitation lightens each step, and Convergence anchors the current to the caster.",
    libraryComponents: [
      components.windUnderfoot,
      components.levitation,
      components.convergence,
    ],
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
    publicName: "Dawnline",
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
    librarySourceUrl: sourceUrl,
    formationDescription:
      "Light supplies the luminous medium and Column focuses it into a direct beam.",
    libraryComponents: [components.light, components.column],
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
    publicName: "Ember Comet",
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
    librarySourceUrl: sourceUrl,
    formationDescription:
      "Fire creates the burning mass while Levitation suspends it long enough to launch and burst.",
    libraryComponents: [components.fire, components.levitation],
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
