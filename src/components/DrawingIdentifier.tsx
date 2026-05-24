"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ClipboardPaste,
  Copy,
  Eraser,
  Library,
  PenTool,
  Plus,
  RotateCcw,
  Search,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  ChangeEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent,
  WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import signsData from "@/data/signs.json";
import sigilsData from "@/data/sigils.json";

type SymbolType = "sign" | "sigil";

type RawSign = {
  id: string;
  name: string;
  category?: string;
  description?: string;
  spellsUsing?: string[];
  vector?: {
    suggestedFileName?: string;
  };
};

type RawSigil = {
  id: string;
  name: string;
  category?: string;
  description?: string;
  spellsUsing?: string[];
  svg?: string | null;
};

type SymbolReference = {
  id: string;
  name: string;
  type: SymbolType;
  category: string;
  description: string;
  spellsUsing: string[];
  assetPath: string | null;
};

type PreparedReference = SymbolReference & {
  signature: Uint8Array<ArrayBufferLike>;
  distanceMap: Uint8Array<ArrayBufferLike>;
  inkPixels: number;
};

type MatchResult = PreparedReference & {
  score: number;
};

type Point = {
  x: number;
  y: number;
};

type Stroke = Point[];

type ToolMode = "select" | "pen" | "eraser";

type Mark = {
  tool: "pen" | "eraser";
  points: Stroke;
};

type Rect = {
  x: number;
  y: number;
  size: number;
};

type SymbolAnnotation = {
  note: string;
  possibleEffect: string;
};

type DrawnSymbol = {
  id: string;
  marks: Mark[];
  rotation: number;
  scale: number;
  parentCircleId?: string;
  annotation?: SymbolAnnotation;
  imported?: {
    source: "image";
    confidence: number;
    matchName?: string;
    matchId?: string;
    bounds: Rect;
  };
  tweaks: {
    inverted: boolean;
    power: number;
  };
  replacement?: {
    reference: PreparedReference;
    rect: Rect;
  };
};

type CircleComponent = {
  id: string;
  center: Point;
  radius: number;
  rotation: number;
  perfection: number;
  sourceStroke: Stroke;
  closed: boolean;
  sealed: boolean;
  imported?: {
    source: "image";
    bounds: Rect;
  };
  parentCircleId?: string;
};

type ImportedInkLayer = {
  id: string;
  dataUrl: string;
};

type ClipboardPayload =
  | {
      type: "symbol";
      symbol: DrawnSymbol;
    }
  | {
      type: "spell";
      rootCircleId: string;
      circles: CircleComponent[];
      symbols: DrawnSymbol[];
    };

type ComponentBox = {
  center: Point;
  size: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type InteractionState =
  | {
      mode: "move-symbol";
      id: string;
      lastPoint: Point;
    }
  | {
      mode: "move-circle";
      id: string;
      lastPoint: Point;
      circleIds: string[];
      symbolIds: string[];
    }
  | {
      mode: "resize-symbol";
      id: string;
      center: Point;
      startDistance: number;
      startScale: number;
    }
  | {
      mode: "resize-circle";
      id: string;
      center: Point;
    }
  | {
      mode: "rotate-symbol";
      id: string;
      center: Point;
      startAngle: number;
      startRotation: number;
    }
  | {
      mode: "rotate-circle";
      id: string;
      center: Point;
      startAngle: number;
      startRotation: number;
    };

const CANVAS_SIZE = 512;
const SIGNATURE_SIZE = 64;
const MATCH_THRESHOLD = 0.42;
const LIVE_MATCH_DELAY = 160;
const MAX_DISTANCE = 16;
const DRAW_LINE_WIDTH = 18;
const ERASER_LINE_WIDTH = 42;
const CIRCLE_LINE_WIDTH = 16;
const IMPORT_LINE_WIDTH = 5;
const HANDLE_SIZE = 14;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;
const CANVAS_CENTER = { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 };
const CANVAS_RADIUS = CANVAS_SIZE / 2;
const MIN_SPELL_RADIUS = 28;
const PASTE_STEP = 64;
const IMPORT_MATCH_THRESHOLD = 0.48;
const MIN_IMPORT_PIXELS = 18;
const PEN_CURSOR =
  'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2732%27 viewBox=%270 0 32 32%27%3E%3Cpath d=%27M7 26 20 3l5 2-6 25-5-7z%27 fill=%27%23171717%27/%3E%3Cpath d=%27m20 3 5 2%27 stroke=%27white%27 stroke-width=%271.5%27/%3E%3Cpath d=%27M14 23 8 29%27 stroke=%27%23171717%27 stroke-width=%272%27 stroke-linecap=%27round%27/%3E%3C/svg%3E") 8 28, crosshair';
const ERASER_CURSOR =
  'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2732%27 viewBox=%270 0 32 32%27%3E%3Cpath d=%27M8 21 20 9l6 6-12 12H8z%27 fill=%27%23ffffff%27 stroke=%27%23171717%27 stroke-width=%272%27/%3E%3Cpath d=%27M15 14l6 6%27 stroke=%27%23171717%27 stroke-width=%272%27/%3E%3C/svg%3E") 9 23, crosshair';

const references: SymbolReference[] = [
  ...(signsData.signs as RawSign[]).map<SymbolReference>((sign) => ({
    id: sign.id,
    name: sign.name,
    type: "sign",
    category: sign.category ?? "unknown",
    description: cleanText(sign.description),
    spellsUsing: sign.spellsUsing ?? [],
    assetPath: signAssetPath(sign),
  })),
  ...(sigilsData as RawSigil[]).map<SymbolReference>((sigil) => ({
    id: sigil.id,
    name: sigil.name,
    type: "sigil",
    category: sigil.category ?? "unknown",
    description: cleanText(sigil.description),
    spellsUsing: sigil.spellsUsing ?? [],
    assetPath: sigilAssetPath(sigil),
  })),
];

function cleanText(value?: string) {
  return (value ?? "No description available.").replace(/\s+/g, " ").trim();
}

function signAssetPath(sign: RawSign) {
  const fileName =
    sign.vector?.suggestedFileName === "Region.svg"
      ? "Region_Sign_Demo.svg"
      : sign.vector?.suggestedFileName;

  return fileName ? `/vectors/signs/${fileName}` : null;
}

function sigilAssetPath(sigil: RawSigil) {
  const fileName = sigil.svg?.split("/").pop();
  return fileName ? `/vectors/sigils/${fileName}` : null;
}

function compilerEffect(reference: PreparedReference) {
  return {
    id: reference.id,
    name: reference.name,
    kind: reference.type,
    category: reference.category,
    description: reference.description,
    spellsUsing: reference.spellsUsing,
    compilerHint: {
      role:
        reference.type === "sigil"
          ? "noun/core magical element"
          : "modifier/adverbial instruction",
      operation: reference.category,
      readableSummary: `${reference.name}: ${reference.description}`,
    },
  };
}

function categoryLabel(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createCanvas(size = SIGNATURE_SIZE) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function signatureFromCanvas(source: HTMLCanvasElement) {
  const sourceContext = source.getContext("2d", { willReadFrequently: true });

  if (!sourceContext) {
    return null;
  }

  const sourceData = sourceContext.getImageData(0, 0, source.width, source.height);
  const bounds = inkBounds(sourceData.data, source.width, source.height);

  if (!bounds) {
    return null;
  }

  const normalized = createCanvas();
  const normalizedContext = normalized.getContext("2d", { willReadFrequently: true });

  if (!normalizedContext) {
    return null;
  }

  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const scale = Math.min((SIGNATURE_SIZE - 10) / width, (SIGNATURE_SIZE - 10) / height);
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const targetX = Math.round((SIGNATURE_SIZE - targetWidth) / 2);
  const targetY = Math.round((SIGNATURE_SIZE - targetHeight) / 2);

  normalizedContext.fillStyle = "#ffffff";
  normalizedContext.fillRect(0, 0, SIGNATURE_SIZE, SIGNATURE_SIZE);
  normalizedContext.drawImage(
    source,
    bounds.minX,
    bounds.minY,
    width,
    height,
    targetX,
    targetY,
    targetWidth,
    targetHeight,
  );

  const normalizedData = normalizedContext.getImageData(
    0,
    0,
    SIGNATURE_SIZE,
    SIGNATURE_SIZE,
  ).data;
  const signature = new Uint8Array(SIGNATURE_SIZE * SIGNATURE_SIZE);
  let inkPixels = 0;

  for (let index = 0; index < signature.length; index += 1) {
    const pixelIndex = index * 4;
    const alpha = normalizedData[pixelIndex + 3];
    const red = normalizedData[pixelIndex];
    const green = normalizedData[pixelIndex + 1];
    const blue = normalizedData[pixelIndex + 2];
    const darkness = 255 - (red + green + blue) / 3;

    if (alpha > 24 && darkness > 35) {
      signature[index] = 1;
      inkPixels += 1;
    }
  }

  return {
    signature,
    distanceMap: distanceMapFromSignature(signature),
    inkPixels,
  };
}

function inkBounds(data: Uint8ClampedArray, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];
      const darkness = 255 - (data[index] + data[index + 1] + data[index + 2]) / 3;

      if (alpha > 24 && darkness > 35) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return maxX >= 0 ? { minX, minY, maxX, maxY } : null;
}

function compareSignatures(
  drawing: {
    signature: Uint8Array<ArrayBufferLike>;
    distanceMap: Uint8Array<ArrayBufferLike>;
    inkPixels: number;
  },
  reference: PreparedReference,
) {
  let overlap = 0;
  let union = 0;
  let drawingDistance = 0;
  let referenceDistance = 0;

  for (let index = 0; index < drawing.signature.length; index += 1) {
    const drawn = drawing.signature[index] === 1;
    const stored = reference.signature[index] === 1;

    if (drawn && stored) {
      overlap += 1;
    }

    if (drawn || stored) {
      union += 1;
    }

    if (drawn) {
      drawingDistance += Math.min(reference.distanceMap[index], MAX_DISTANCE);
    }

    if (stored) {
      referenceDistance += Math.min(drawing.distanceMap[index], MAX_DISTANCE);
    }
  }

  const overlapScore = union === 0 ? 0 : overlap / union;
  const drawingFit =
    drawing.inkPixels === 0
      ? 0
      : 1 - drawingDistance / (drawing.inkPixels * MAX_DISTANCE);
  const referenceFit =
    reference.inkPixels === 0
      ? 0
      : 1 - referenceDistance / (reference.inkPixels * MAX_DISTANCE);
  const sizeRatio =
    Math.min(drawing.inkPixels, reference.inkPixels) /
    Math.max(drawing.inkPixels, reference.inkPixels);

  return Math.max(
    0,
    drawingFit * 0.36 + referenceFit * 0.36 + overlapScore * 0.18 + sizeRatio * 0.1,
  );
}

function distanceMapFromSignature(signature: Uint8Array<ArrayBufferLike>) {
  const distanceMap = new Uint8Array(SIGNATURE_SIZE * SIGNATURE_SIZE);
  const inkPoints: Point[] = [];

  for (let y = 0; y < SIGNATURE_SIZE; y += 1) {
    for (let x = 0; x < SIGNATURE_SIZE; x += 1) {
      const index = y * SIGNATURE_SIZE + x;

      if (signature[index] === 1) {
        inkPoints.push({ x, y });
      }
    }
  }

  if (inkPoints.length === 0) {
    distanceMap.fill(MAX_DISTANCE);
    return distanceMap;
  }

  for (let y = 0; y < SIGNATURE_SIZE; y += 1) {
    for (let x = 0; x < SIGNATURE_SIZE; x += 1) {
      let nearest = MAX_DISTANCE;

      for (const point of inkPoints) {
        const distance = Math.hypot(point.x - x, point.y - y);

        if (distance < nearest) {
          nearest = distance;
        }

        if (nearest <= 1) {
          break;
        }
      }

      distanceMap[y * SIGNATURE_SIZE + x] = Math.min(MAX_DISTANCE, Math.round(nearest));
    }
  }

  return distanceMap;
}

async function loadReference(reference: SymbolReference): Promise<PreparedReference | null> {
  if (!reference.assetPath) {
    return null;
  }

  const image = new window.Image();
  image.decoding = "async";
  image.src = reference.assetPath;

  await image.decode();

  const canvas = createCanvas(CANVAS_SIZE);
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return null;
  }

  const size = Math.min(image.naturalWidth || CANVAS_SIZE, image.naturalHeight || CANVAS_SIZE);
  const x = ((image.naturalWidth || CANVAS_SIZE) - size) / 2;
  const y = ((image.naturalHeight || CANVAS_SIZE) - size) / 2;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  context.drawImage(image, x, y, size, size, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const signature = signatureFromCanvas(canvas);

  return signature ? { ...reference, ...signature } : null;
}

function symbolId() {
  return `symbol-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function circleId() {
  return `circle-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function defaultSymbol(id: string, mark: Mark): DrawnSymbol {
  return {
    id,
    marks: [mark],
    rotation: 0,
    scale: 1,
    tweaks: {
      inverted: false,
      power: 1,
    },
  };
}

function defaultAnnotation(): SymbolAnnotation {
  return {
    note: "",
    possibleEffect: "",
  };
}

function activeDrawableSymbol(symbols: DrawnSymbol[], activeSymbolId: string | null) {
  return symbols.find(
    (symbol) =>
      symbol.id === activeSymbolId && symbol.marks.length > 0 && !symbol.replacement,
  );
}

function marksBounds(marks: Mark[]) {
  const points = marks
    .filter((mark) => mark.tool === "pen")
    .flatMap((mark) => mark.points);

  if (points.length === 0) {
    return null;
  }

  let minX = CANVAS_SIZE;
  let minY = CANVAS_SIZE;
  let maxX = 0;
  let maxY = 0;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}

function replacementRect(marks: Mark[]) {
  const bounds = marksBounds(marks);

  if (!bounds) {
    return null;
  }

  const padding = DRAW_LINE_WIDTH * 1.8;
  const width = bounds.maxX - bounds.minX + padding * 2;
  const height = bounds.maxY - bounds.minY + padding * 2;
  const size = Math.max(36, Math.min(CANVAS_SIZE, Math.max(width, height)));
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return {
    x: Math.max(0, Math.min(CANVAS_SIZE - size, centerX - size / 2)),
    y: Math.max(0, Math.min(CANVAS_SIZE - size, centerY - size / 2)),
    size,
  };
}

function symbolCenter(symbol: DrawnSymbol) {
  if (symbol.replacement) {
    return {
      x: symbol.replacement.rect.x + symbol.replacement.rect.size / 2,
      y: symbol.replacement.rect.y + symbol.replacement.rect.size / 2,
    };
  }

  const bounds = marksBounds(symbol.marks);

  if (!bounds) {
    return null;
  }

  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

function findContainingCircle(
  point: Point | null,
  circles: CircleComponent[],
  ignoredCircleId?: string,
) {
  if (!point) {
    return undefined;
  }

  return circles
    .filter((circle) => circle.id !== ignoredCircleId)
    .filter((circle) => Math.hypot(point.x - circle.center.x, point.y - circle.center.y) < circle.radius)
    .sort((left, right) => left.radius - right.radius)[0]?.id;
}

function findParentCircleIdForCircle(
  target: CircleComponent,
  circles: CircleComponent[],
) {
  return circles
    .filter((circle) => circle.id !== target.id)
    .filter((circle) => circle.radius > target.radius)
    .filter(
      (circle) =>
        distanceBetween(target.center, circle.center) + target.radius <
        circle.radius - CIRCLE_LINE_WIDTH / 2,
    )
    .sort((left, right) => left.radius - right.radius)[0]?.id;
}

function circleContainsCircle(parent: CircleComponent, child: CircleComponent) {
  return (
    parent.radius > child.radius &&
    distanceBetween(child.center, parent.center) + child.radius <
      parent.radius - CIRCLE_LINE_WIDTH / 2
  );
}

function reparentCircles(circles: CircleComponent[]) {
  return circles.map((circle) => ({
    ...circle,
    parentCircleId:
      circle.parentCircleId &&
      circles.some(
        (parent) =>
          parent.id === circle.parentCircleId && circleContainsCircle(parent, circle),
      )
        ? circle.parentCircleId
        : findParentCircleIdForCircle(circle, circles),
  }));
}

function symbolParentId(symbol: DrawnSymbol, circles: CircleComponent[]) {
  const center = symbolCenter(symbol);
  const explicitParent = circles.find((circle) => circle.id === symbol.parentCircleId);

  if (
    center &&
    explicitParent &&
    distanceBetween(center, explicitParent.center) < explicitParent.radius
  ) {
    return explicitParent.id;
  }

  return findContainingCircle(center, circles);
}

function relativeToCircle(point: Point | null, circle?: CircleComponent) {
  if (!point || !circle) {
    return null;
  }

  const dx = point.x - circle.center.x;
  const dy = point.y - circle.center.y;
  const radialDistanceRatio = Math.hypot(dx, dy) / circle.radius;
  const angleDegrees = angleFromNorthClockwise(dx, dy);

  return {
    xRatio: roundedRatio(dx / circle.radius),
    yRatio: roundedRatio(dy / circle.radius),
    radialDistanceRatio: roundedRatio(radialDistanceRatio),
    angleDegrees: Number(angleDegrees.toFixed(1)),
    canvasPosition: {
      x: Number(point.x.toFixed(2)),
      y: Number(point.y.toFixed(2)),
    },
  };
}

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

function angleFromNorthClockwise(dx: number, dy: number) {
  return normalizeDegrees((Math.atan2(dx, -dy) * 180) / Math.PI);
}

function signedAngleDeltaDegrees(actual: number, expected: number) {
  return ((normalizeDegrees(actual - expected) + 540) % 360) - 180;
}

function orientationScore(actual: number, expected: number) {
  return Number(Math.max(0, 1 - Math.abs(signedAngleDeltaDegrees(actual, expected)) / 90).toFixed(3));
}

function average(values: number[]) {
  return values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function roundedRatio(value: number) {
  return Number(value.toFixed(3));
}

function symbolSizeInParent(symbol: DrawnSymbol, parent?: CircleComponent) {
  const box = symbolVisualBox(symbol);

  if (!box) {
    return null;
  }

  const absoluteSize = Number(box.size.toFixed(2));

  if (!parent) {
    return {
      absoluteSize,
      diameterRatio: null,
      radiusRatio: null,
    };
  }

  return {
    absoluteSize,
    diameterRatio: roundedRatio(box.size / (parent.radius * 2)),
    radiusRatio: roundedRatio(box.size / parent.radius),
  };
}

function circleSizeInParent(circle: CircleComponent, parent?: CircleComponent) {
  if (!parent) {
    return {
      radius: Number(circle.radius.toFixed(2)),
      diameterRatio: null,
      radiusRatio: null,
    };
  }

  return {
    radius: Number(circle.radius.toFixed(2)),
    diameterRatio: roundedRatio(circle.radius / parent.radius),
    radiusRatio: roundedRatio(circle.radius / parent.radius),
  };
}

function symbolPositionGeometry(symbol: DrawnSymbol, parent?: CircleComponent) {
  const center = symbolCenter(symbol);

  if (!center || !parent) {
    return null;
  }

  return relativeToCircle(center, parent);
}

function symbolOrientationGeometry(symbol: DrawnSymbol, parent?: CircleComponent) {
  const position = symbolPositionGeometry(symbol, parent);
  const rotationDegrees = normalizeDegrees(symbol.rotation);

  if (!position) {
    return {
      rotationDegrees,
      radialFacingDegrees: null,
      inwardFacingDegrees: null,
      outwardFacingDegrees: null,
      clockwiseTangentDegrees: null,
      counterClockwiseTangentDegrees: null,
      orientationMode: "custom",
      orientationOffsetDegrees: 0,
      orientationScores: {
        fixed: 1,
        faceCenter: 0,
        faceOutward: 0,
        tangentialClockwise: 0,
        tangentialCounterclockwise: 0,
      },
    };
  }

  const outwardFacingDegrees = normalizeDegrees(position.angleDegrees);
  const inwardFacingDegrees = normalizeDegrees(position.angleDegrees + 180);
  const clockwiseTangentDegrees = normalizeDegrees(position.angleDegrees + 90);
  const counterClockwiseTangentDegrees = normalizeDegrees(position.angleDegrees - 90);
  const candidates = [
    { mode: "fixed", expected: 0 },
    { mode: "face_center", expected: inwardFacingDegrees },
    { mode: "face_outward", expected: outwardFacingDegrees },
    { mode: "tangential_clockwise", expected: clockwiseTangentDegrees },
    { mode: "tangential_counterclockwise", expected: counterClockwiseTangentDegrees },
  ].map((candidate) => ({
    ...candidate,
    score: orientationScore(rotationDegrees, candidate.expected),
    offset: signedAngleDeltaDegrees(rotationDegrees, candidate.expected),
  }));
  const best = candidates.sort((left, right) => right.score - left.score)[0];
  const orientationMode = best.score >= 0.82 ? best.mode : "custom";

  return {
    rotationDegrees: Number(rotationDegrees.toFixed(1)),
    radialFacingDegrees: outwardFacingDegrees,
    inwardFacingDegrees,
    outwardFacingDegrees,
    clockwiseTangentDegrees,
    counterClockwiseTangentDegrees,
    orientationMode,
    orientationOffsetDegrees: Number(best.offset.toFixed(1)),
    orientationScores: {
      fixed: candidates.find((candidate) => candidate.mode === "fixed")?.score ?? 0,
      faceCenter: candidates.find((candidate) => candidate.mode === "face_center")?.score ?? 0,
      faceOutward: candidates.find((candidate) => candidate.mode === "face_outward")?.score ?? 0,
      tangentialClockwise:
        candidates.find((candidate) => candidate.mode === "tangential_clockwise")?.score ?? 0,
      tangentialCounterclockwise:
        candidates.find((candidate) => candidate.mode === "tangential_counterclockwise")?.score ?? 0,
    },
  };
}

function fitCircleFromStroke(stroke: Stroke): CircleComponent | null {
  if (stroke.length < 12) {
    return null;
  }

  const minX = Math.min(...stroke.map((point) => point.x));
  const maxX = Math.max(...stroke.map((point) => point.x));
  const minY = Math.min(...stroke.map((point) => point.y));
  const maxY = Math.max(...stroke.map((point) => point.y));
  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
  const distances = stroke.map((point) => Math.hypot(point.x - center.x, point.y - center.y));
  const radius =
    distances.reduce((total, distance) => total + distance, 0) / distances.length;
  const variance =
    distances.reduce((total, distance) => total + (distance - radius) ** 2, 0) /
    distances.length;
  const radialStdDev = Math.sqrt(variance);
  const radialScore = Math.max(0, 1 - radialStdDev / Math.max(1, radius) * 2.4);
  const first = stroke[0];
  const last = stroke[stroke.length - 1];
  const closureDistance = distanceBetween(first, last);
  const closureScore = Math.max(0, 1 - closureDistance / Math.max(18, radius * 0.22));
  const sampledAngles = new Set(
    stroke.map((point) =>
      Math.floor((((Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI + 360) % 360) / 8),
    ),
  );
  const coverageScore = Math.min(1, sampledAngles.size / 42);
  const perfection = Math.max(
    0,
    Math.min(1, radialScore * 0.62 + coverageScore * 0.2 + closureScore * 0.18),
  );
  const closed =
    closureDistance <= Math.max(28, radius * 0.32) &&
    coverageScore > 0.66 &&
    radialScore > 0.28;

  return {
    id: "circle-draft",
    center,
    radius,
    rotation: 0,
    perfection,
    sourceStroke: stroke,
    closed,
    sealed: closed,
  };
}

function distanceBetween(left: Point, right: Point) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function angleBetween(center: Point, point: Point) {
  return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI;
}

function hitTestComponents(
  point: Point,
  symbols: DrawnSymbol[],
  circles: CircleComponent[],
) {
  for (const symbol of symbols.slice().reverse()) {
    const center = symbolCenter(symbol);

    if (!center) {
      continue;
    }

    const bounds = symbol.replacement
      ? {
          minX:
            center.x -
            (symbol.replacement.rect.size * symbol.scale) / 2 -
            DRAW_LINE_WIDTH,
          maxX:
            center.x +
            (symbol.replacement.rect.size * symbol.scale) / 2 +
            DRAW_LINE_WIDTH,
          minY:
            center.y -
            (symbol.replacement.rect.size * symbol.scale) / 2 -
            DRAW_LINE_WIDTH,
          maxY:
            center.y +
            (symbol.replacement.rect.size * symbol.scale) / 2 +
            DRAW_LINE_WIDTH,
        }
      : marksBounds(symbol.marks);

    if (
      bounds &&
      point.x >= bounds.minX - DRAW_LINE_WIDTH &&
      point.x <= bounds.maxX + DRAW_LINE_WIDTH &&
      point.y >= bounds.minY - DRAW_LINE_WIDTH &&
      point.y <= bounds.maxY + DRAW_LINE_WIDTH
    ) {
      return { type: "symbol" as const, id: symbol.id };
    }
  }

  for (const circle of circles.slice().reverse()) {
    const distance = distanceBetween(point, circle.center);

    if (Math.abs(distance - circle.radius) <= CIRCLE_LINE_WIDTH + 10) {
      return { type: "circle" as const, id: circle.id };
    }
  }

  return null;
}

function symbolVisualBox(symbol: DrawnSymbol): ComponentBox | null {
  const center = symbolCenter(symbol);

  if (!center) {
    return null;
  }

  if (symbol.replacement) {
    const size = symbol.replacement.rect.size * symbol.scale;

    return {
      center,
      size,
      minX: center.x - size / 2,
      maxX: center.x + size / 2,
      minY: center.y - size / 2,
      maxY: center.y + size / 2,
    };
  }

  const bounds = marksBounds(symbol.marks);

  if (!bounds) {
    return null;
  }

  return {
    center,
    size: Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY),
    ...bounds,
  };
}

function selectedHandleAt(
  point: Point,
  selectedSymbol: DrawnSymbol | undefined,
  selectedCircle: CircleComponent | undefined,
) {
  if (selectedSymbol) {
    const box = symbolVisualBox(selectedSymbol);

    if (!box) {
      return null;
    }

    const resizeHandle = { x: box.maxX + 16, y: box.center.y };
    const rotateHandle = { x: box.maxX + 18, y: box.maxY + 18 };

    if (distanceBetween(point, rotateHandle) <= HANDLE_SIZE + 3) {
      return { mode: "rotate-symbol" as const, id: selectedSymbol.id, center: box.center };
    }

    if (distanceBetween(point, resizeHandle) <= HANDLE_SIZE + 3) {
      return { mode: "resize-symbol" as const, id: selectedSymbol.id, center: box.center };
    }

    if (
      point.x >= box.minX - 12 &&
      point.x <= box.maxX + 12 &&
      point.y >= box.minY - 12 &&
      point.y <= box.maxY + 12
    ) {
      return { mode: "move-symbol" as const, id: selectedSymbol.id };
    }
  }

  if (selectedCircle) {
    const radius = selectedCircle.radius;
    const resizeHandle = {
      x: selectedCircle.center.x + radius + 18,
      y: selectedCircle.center.y,
    };
    const rotateHandle = {
      x: selectedCircle.center.x + radius / Math.SQRT2 + 18,
      y: selectedCircle.center.y + radius / Math.SQRT2 + 18,
    };

    if (distanceBetween(point, rotateHandle) <= HANDLE_SIZE + 3) {
      return {
        mode: "rotate-circle" as const,
        id: selectedCircle.id,
        center: selectedCircle.center,
      };
    }

    if (distanceBetween(point, resizeHandle) <= HANDLE_SIZE + 3) {
      return {
        mode: "resize-circle" as const,
        id: selectedCircle.id,
        center: selectedCircle.center,
      };
    }

    if (distanceBetween(point, selectedCircle.center) <= radius) {
      return { mode: "move-circle" as const, id: selectedCircle.id };
    }
  }

  return null;
}

function moveSymbol(symbol: DrawnSymbol, dx: number, dy: number) {
  if (symbol.replacement) {
    return {
      ...symbol,
      replacement: {
        ...symbol.replacement,
        rect: {
          ...symbol.replacement.rect,
          x: symbol.replacement.rect.x + dx,
          y: symbol.replacement.rect.y + dy,
        },
      },
    };
  }

  return {
    ...symbol,
    marks: symbol.marks.map((mark) => ({
      ...mark,
      points: mark.points.map((point) => ({
        x: point.x + dx,
        y: point.y + dy,
      })),
    })),
  };
}

function moveCircle(circle: CircleComponent, dx: number, dy: number) {
  return {
    ...circle,
    center: {
      x: circle.center.x + dx,
      y: circle.center.y + dy,
    },
    sourceStroke: circle.sourceStroke.map((point) => ({
      x: point.x + dx,
      y: point.y + dy,
    })),
  };
}

function scaleCircle(circle: CircleComponent, nextRadius: number) {
  const ratio = nextRadius / Math.max(1, circle.radius);

  return {
    ...circle,
    radius: nextRadius,
    sourceStroke: circle.sourceStroke.map((point) => ({
      x: circle.center.x + (point.x - circle.center.x) * ratio,
      y: circle.center.y + (point.y - circle.center.y) * ratio,
    })),
  };
}

function rotateCircle(circle: CircleComponent, nextRotation: number) {
  const delta = ((nextRotation - circle.rotation) * Math.PI) / 180;
  const cos = Math.cos(delta);
  const sin = Math.sin(delta);

  return {
    ...circle,
    rotation: nextRotation,
    sourceStroke: circle.sourceStroke.map((point) => {
      const dx = point.x - circle.center.x;
      const dy = point.y - circle.center.y;

      return {
        x: circle.center.x + dx * cos - dy * sin,
        y: circle.center.y + dx * sin + dy * cos,
      };
    }),
  };
}

function splitStrokeByErase(stroke: Stroke, point: Point, radius: number) {
  const segments: Stroke[] = [];
  let currentSegment: Stroke = [];

  for (const strokePoint of stroke) {
    if (distanceBetween(strokePoint, point) <= radius) {
      if (currentSegment.length > 1) {
        segments.push(currentSegment);
      }

      currentSegment = [];
      continue;
    }

    currentSegment.push(strokePoint);
  }

  if (currentSegment.length > 1) {
    segments.push(currentSegment);
  }

  return segments;
}

function eraseSymbolInk(symbol: DrawnSymbol, point: Point, radius: number) {
  if (symbol.replacement) {
    const box = symbolVisualBox(symbol);

    if (!box) {
      return symbol;
    }

    return point.x >= box.minX - radius &&
      point.x <= box.maxX + radius &&
      point.y >= box.minY - radius &&
      point.y <= box.maxY + radius
      ? null
      : symbol;
  }

  const marks = symbol.marks
    .filter((mark) => mark.tool === "pen")
    .flatMap((mark) =>
      splitStrokeByErase(mark.points, point, radius).map((points) => ({
        ...mark,
        points,
      })),
    );

  return marks.length > 0 ? { ...symbol, marks } : null;
}

function eraseCircleInk(circle: CircleComponent, point: Point, radius: number) {
  return circle.sourceStroke.some((strokePoint) => distanceBetween(strokePoint, point) <= radius)
    ? null
    : circle;
}

function scaleSymbol(symbol: DrawnSymbol, center: Point, ratio: number, startScale: number) {
  if (symbol.replacement) {
    return {
      ...symbol,
      scale: Math.max(0.25, Math.min(3, startScale * ratio)),
    };
  }

  return {
    ...symbol,
    marks: symbol.marks.map((mark) => ({
      ...mark,
      points: mark.points.map((point) => ({
        x: center.x + (point.x - center.x) * ratio,
        y: center.y + (point.y - center.y) * ratio,
      })),
    })),
  };
}

function rotateSymbol(symbol: DrawnSymbol, center: Point, nextRotation: number) {
  const delta = ((nextRotation - symbol.rotation) * Math.PI) / 180;
  const cos = Math.cos(delta);
  const sin = Math.sin(delta);

  if (symbol.replacement) {
    return {
      ...symbol,
      rotation: nextRotation,
    };
  }

  return {
    ...symbol,
    rotation: nextRotation,
    marks: symbol.marks.map((mark) => ({
      ...mark,
      points: mark.points.map((point) => {
        const dx = point.x - center.x;
        const dy = point.y - center.y;

        return {
          x: center.x + dx * cos - dy * sin,
          y: center.y + dx * sin + dy * cos,
        };
      }),
    })),
  };
}

function cloneSymbolWithOffset(
  symbol: DrawnSymbol,
  offset: Point,
  id = symbolId(),
  parentCircleId?: string,
) {
  return {
    ...symbol,
    id,
    parentCircleId,
    marks: symbol.marks.map((mark) => ({
      ...mark,
      points: mark.points.map((point) => ({
        x: point.x + offset.x,
        y: point.y + offset.y,
      })),
    })),
    tweaks: {
      ...symbol.tweaks,
    },
    replacement: symbol.replacement
      ? {
          reference: symbol.replacement.reference,
          rect: {
            ...symbol.replacement.rect,
            x: symbol.replacement.rect.x + offset.x,
            y: symbol.replacement.rect.y + offset.y,
          },
        }
      : undefined,
  };
}

function cloneCircleWithOffset(
  circle: CircleComponent,
  offset: Point,
  id: string,
  parentCircleId?: string,
) {
  return {
    ...circle,
    id,
    parentCircleId,
    center: {
      x: circle.center.x + offset.x,
      y: circle.center.y + offset.y,
    },
    sourceStroke: circle.sourceStroke.map((point) => ({
      x: point.x + offset.x,
      y: point.y + offset.y,
    })),
  };
}

function clipboardBounds(payload: ClipboardPayload) {
  const boxes: Array<ComponentBox | null> =
    payload.type === "symbol"
      ? [symbolVisualBox(payload.symbol)]
      : [
          ...payload.circles.map((circle) => ({
            center: circle.center,
            size: circle.radius * 2,
            minX: circle.center.x - circle.radius,
            maxX: circle.center.x + circle.radius,
            minY: circle.center.y - circle.radius,
            maxY: circle.center.y + circle.radius,
          })),
          ...payload.symbols.map(symbolVisualBox),
        ];
  const visibleBoxes = boxes.filter((box): box is ComponentBox => Boolean(box));

  if (visibleBoxes.length === 0) {
    return null;
  }

  return {
    minX: Math.min(...visibleBoxes.map((box) => box.minX)),
    maxX: Math.max(...visibleBoxes.map((box) => box.maxX)),
    minY: Math.min(...visibleBoxes.map((box) => box.minY)),
    maxY: Math.max(...visibleBoxes.map((box) => box.maxY)),
  };
}

function pasteOffsetFor(payload: ClipboardPayload, pasteCount: number) {
  const bounds = clipboardBounds(payload);
  const edgePadding = 12;

  if (!bounds) {
    const fallbackStep = PASTE_STEP * pasteCount;

    return { x: fallbackStep, y: fallbackStep };
  }

  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const step = Math.max(PASTE_STEP, span * 0.75) * pasteCount;

  return {
    x:
      bounds.maxX + step > CANVAS_SIZE - edgePadding
        ? -step
        : step,
    y:
      bounds.maxY + step > CANVAS_SIZE - edgePadding
        ? -step
        : step,
  };
}

function circleGroupIds(rootId: string, circles: CircleComponent[]) {
  const ids = new Set([rootId]);
  let changed = true;

  while (changed) {
    changed = false;

    for (const circle of circles) {
      const parentId = findParentCircleIdForCircle(circle, circles);

      if (parentId && ids.has(parentId) && !ids.has(circle.id)) {
        ids.add(circle.id);
        changed = true;
      }
    }
  }

  return ids;
}

function symbolIdsInCircleGroup(
  groupIds: Set<string>,
  symbols: DrawnSymbol[],
  circles: CircleComponent[],
) {
  return symbols
    .filter((symbol) => {
      const parentId = symbolParentId(symbol, circles);

      return Boolean(parentId && groupIds.has(parentId));
    })
    .map((symbol) => symbol.id);
}

function isInsideCanvasCircle(point: Point) {
  return distanceBetween(point, CANVAS_CENTER) <= CANVAS_RADIUS;
}

function canvasPoint(
  event: PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement | null,
) {
  return canvasPointFromClient(event.clientX, event.clientY, canvas);
}

function canvasPointFromClient(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement | null,
) {
  if (!canvas) {
    return null;
  }

  const rect = canvas.getBoundingClientRect();

  return {
    x: ((clientX - rect.left) / rect.width) * CANVAS_SIZE,
    y: ((clientY - rect.top) / rect.height) * CANVAS_SIZE,
  };
}

export default function DrawingIdentifier() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const activeStrokeRef = useRef<Stroke>([]);
  const interactionRef = useRef<InteractionState | null>(null);
  const activeSymbolIdRef = useRef<string | null>(null);
  const selectedCircleIdRef = useRef<string | null>(null);
  const pasteCountRef = useRef(1);
  const insertCountRef = useRef(0);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const glowTimeoutsRef = useRef<number[]>([]);
  const preparedRef = useRef<PreparedReference[]>([]);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [symbols, setSymbols] = useState<DrawnSymbol[]>([]);
  const [circles, setCircles] = useState<CircleComponent[]>([]);
  const [importedInkLayers, setImportedInkLayers] = useState<ImportedInkLayer[]>([]);
  const [activeSymbolId, setActiveSymbolId] = useState<string | null>(null);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"all" | SymbolType>("all");
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const [status, setStatus] = useState("Preparing symbol database...");
  const [isReady, setIsReady] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [preparedSymbols, setPreparedSymbols] = useState<PreparedReference[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardPayload | null>(null);
  const [glowingCircleIds, setGlowingCircleIds] = useState<Set<string>>(new Set());
  const [showSymbolShelf, setShowSymbolShelf] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    activeSymbolIdRef.current = activeSymbolId;
  }, [activeSymbolId]);

  useEffect(() => {
    selectedCircleIdRef.current = selectedCircleId;
  }, [selectedCircleId]);

  const activeSymbol = useMemo(
    () => activeDrawableSymbol(symbols, activeSymbolId),
    [activeSymbolId, symbols],
  );
  const selectedSymbol = useMemo(
    () => symbols.find((symbol) => symbol.id === activeSymbolId),
    [activeSymbolId, symbols],
  );
  const selectedCircle = useMemo(
    () => circles.find((circle) => circle.id === selectedCircleId),
    [circles, selectedCircleId],
  );
  const spellSnapshot = useMemo(
    () => buildSpellSnapshot(symbols, circles, importedInkLayers),
    [circles, importedInkLayers, symbols],
  );

  const filteredMatches = useMemo(
    () =>
      matches.filter((match) => activeType === "all" || match.type === activeType),
    [activeType, matches],
  );
  const shelfSymbols = useMemo(
    () =>
      preparedSymbols.filter(
        (reference) => activeType === "all" || reference.type === activeType,
      ),
    [activeType, preparedSymbols],
  );

  const updateMatches = useCallback(
    (mode: "live" | "manual") => {
      if (!activeSymbol || preparedRef.current.length === 0) {
        return;
      }

      const drawingCanvas = createCanvas(CANVAS_SIZE);
      drawMarks(drawingCanvas, activeSymbol.marks, false);
      const drawing = signatureFromCanvas(drawingCanvas);

      if (!drawing || drawing.inkPixels < 12) {
        setMatches([]);
        setStatus("Draw a little more ink in the active symbol to see suggestions.");
        return;
      }

      const nextMatches = preparedRef.current
        .filter((reference) => activeType === "all" || reference.type === activeType)
        .map((reference) => ({
          ...reference,
          score: compareSignatures(drawing, reference),
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, 6);

      setMatches(nextMatches);
      setStatus(
        nextMatches[0]?.score >= MATCH_THRESHOLD
          ? mode === "live"
            ? "Live suggestions updating for the active symbol."
            : "Closest matches found for the active symbol."
          : "No confident match yet. Try drawing that symbol larger and centered.",
      );
    },
    [activeSymbol, activeType],
  );

  useEffect(() => {
    let cancelled = false;

    async function prepareReferences() {
      const loaded = await Promise.all(references.map(loadReference));
      const prepared = loaded.filter((item): item is PreparedReference => Boolean(item));

      if (!cancelled) {
        preparedRef.current = prepared;
        setPreparedSymbols(prepared);
        setStatus(`Ready to compare against ${prepared.length} drawable symbols.`);
        setIsReady(true);
      }
    }

    prepareReferences().catch(() => {
      if (!cancelled) {
        setStatus("Could not prepare the symbol database.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    redrawSpellCanvas({
      symbols,
      circles,
      importedInkLayers,
      selectedSymbolId: activeSymbolId,
      selectedCircleId,
      glowingCircleIds,
      canvas: canvasRef.current,
      imageCache: imageCacheRef.current,
      isCancelled: () => cancelled,
    });

    return () => {
      cancelled = true;
    };
  }, [activeSymbolId, circles, glowingCircleIds, importedInkLayers, selectedCircleId, symbols]);

  useEffect(() => {
    return () => {
      for (const timeoutId of glowTimeoutsRef.current) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!activeSymbol) {
        setMatches([]);
        setStatus(`Ready to compare against ${preparedRef.current.length} drawable symbols.`);
        return;
      }

      updateMatches("live");
    }, LIVE_MATCH_DELAY);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeSymbol, isReady, updateMatches]);

  function startNewSymbol() {
    setActiveSymbolId(null);
    setSelectedCircleId(null);
    setToolMode("pen");
    setMatches([]);
    setStatus("Start drawing the next symbol.");
  }

  function selectComponentAt(point: Point) {
    const hit = hitTestComponents(point, symbols, circles);

    activeSymbolIdRef.current = hit?.type === "symbol" ? hit.id : null;
    selectedCircleIdRef.current = hit?.type === "circle" ? hit.id : null;
    setActiveSymbolId(hit?.type === "symbol" ? hit.id : null);
    setSelectedCircleId(hit?.type === "circle" ? hit.id : null);
    setToolMode("select");
    setMatches([]);
    setStatus(hit ? "Selected component." : "No component selected.");
  }

  function eraseAtPoint(point: Point) {
    setSymbols((current) =>
      current
        .map((symbol) => eraseSymbolInk(symbol, point, ERASER_LINE_WIDTH / 2))
        .filter((symbol): symbol is DrawnSymbol => Boolean(symbol)),
    );
    setCircles((current) =>
      reparentCircles(
        current
          .map((circle) => eraseCircleInk(circle, point, ERASER_LINE_WIDTH / 2))
          .filter((circle): circle is CircleComponent => Boolean(circle)),
      ),
    );
    activeSymbolIdRef.current = null;
    selectedCircleIdRef.current = null;
    setActiveSymbolId(null);
    setSelectedCircleId(null);
    setMatches([]);
    setStatus("Erased ink.");
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const point = canvasPoint(event, canvasRef.current);

    if (!point) {
      return;
    }

    if (event.button === 2) {
      event.preventDefault();
      drawingRef.current = false;
      activeStrokeRef.current = [];
      interactionRef.current = null;
      selectComponentAt(point);
      return;
    }

    if (toolMode !== "select" && !isInsideCanvasCircle(point)) {
      setStatus("Draw inside the circular canvas.");
      return;
    }

    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    drawingRef.current = true;

    if (toolMode === "select") {
      const handle = selectedHandleAt(point, selectedSymbol, selectedCircle);

      if (handle) {
        if (handle.mode === "move-symbol") {
          interactionRef.current = { ...handle, lastPoint: point };
        } else if (handle.mode === "move-circle") {
          const groupIds = circleGroupIds(handle.id, circles);

          interactionRef.current = {
            ...handle,
            lastPoint: point,
            circleIds: [...groupIds],
            symbolIds: symbolIdsInCircleGroup(groupIds, symbols, circles),
          };
        } else if (handle.mode === "resize-symbol") {
          const symbol = symbols.find((item) => item.id === handle.id);

          interactionRef.current = {
            ...handle,
            startDistance: Math.max(1, distanceBetween(handle.center, point)),
            startScale: symbol?.scale ?? 1,
          };
        } else if (handle.mode === "resize-circle") {
          interactionRef.current = handle;
        } else if (handle.mode === "rotate-symbol") {
          const symbol = symbols.find((item) => item.id === handle.id);

          interactionRef.current = {
            ...handle,
            startAngle: angleBetween(handle.center, point),
            startRotation: symbol?.rotation ?? 0,
          };
        } else {
          const circle = circles.find((item) => item.id === handle.id);

          interactionRef.current = {
            ...handle,
            startAngle: angleBetween(handle.center, point),
            startRotation: circle?.rotation ?? 0,
          };
        }

        setStatus("Drag the selected component handle.");
        return;
      }

      selectComponentAt(point);
      return;
    }

    if (toolMode === "eraser") {
      activeStrokeRef.current = [];
      eraseAtPoint(point);
      return;
    }

    activeStrokeRef.current = [point];

    setSymbols((current) => {
      const currentActiveId = activeSymbolIdRef.current;
      const active = current.find((symbol) => symbol.id === currentActiveId);
      const mark = { tool: "pen" as const, points: [point] };

      if (!active || active.replacement) {
        const nextSymbol = defaultSymbol(symbolId(), mark);

        activeSymbolIdRef.current = nextSymbol.id;
        selectedCircleIdRef.current = null;
        setActiveSymbolId(nextSymbol.id);
        setSelectedCircleId(null);
        return [...current, nextSymbol];
      }

      return current.map((symbol) =>
        symbol.id === currentActiveId
          ? {
              ...symbol,
              marks: [...symbol.marks, mark],
            }
          : symbol,
      );
    });
  }

  function selectFromCanvasClientPoint(clientX: number, clientY: number) {
    const point = canvasPointFromClient(
      clientX,
      clientY,
      canvasRef.current,
    );

    if (!point) {
      return;
    }

    drawingRef.current = false;
    activeStrokeRef.current = [];
    interactionRef.current = null;
    selectComponentAt(point);
  }

  function handleCanvasMouseDown(event: ReactMouseEvent<HTMLCanvasElement>) {
    if (event.button !== 2) {
      return;
    }

    event.preventDefault();
    selectFromCanvasClientPoint(event.clientX, event.clientY);
  }

  function handleCanvasContextMenu(event: ReactMouseEvent<HTMLCanvasElement>) {
    event.preventDefault();
    selectFromCanvasClientPoint(event.clientX, event.clientY);
  }

  function handleCanvasWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    changeZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }

  function updateInteraction(point: Point) {
    const interaction = interactionRef.current;

    if (!interaction) {
      return;
    }

    if (interaction.mode === "move-symbol") {
      const dx = point.x - interaction.lastPoint.x;
      const dy = point.y - interaction.lastPoint.y;

      interactionRef.current = { ...interaction, lastPoint: point };
      setSymbols((current) =>
        current.map((symbol) =>
          symbol.id === interaction.id ? moveSymbol(symbol, dx, dy) : symbol,
        ),
      );
      return;
    }

    if (interaction.mode === "move-circle") {
      const dx = point.x - interaction.lastPoint.x;
      const dy = point.y - interaction.lastPoint.y;
      const circleIds = new Set(interaction.circleIds);
      const symbolIds = new Set(interaction.symbolIds);

      interactionRef.current = { ...interaction, lastPoint: point };
      setSymbols((current) =>
        current.map((symbol) =>
          symbolIds.has(symbol.id) ? moveSymbol(symbol, dx, dy) : symbol,
        ),
      );
      setCircles((current) =>
        reparentCircles(
          current.map((circle) =>
            circleIds.has(circle.id) ? moveCircle(circle, dx, dy) : circle,
          ),
        ),
      );
      return;
    }

    if (interaction.mode === "resize-symbol") {
      const ratio =
        distanceBetween(interaction.center, point) / Math.max(1, interaction.startDistance);

      setSymbols((current) =>
        current.map((symbol) =>
          symbol.id === interaction.id
            ? scaleSymbol(symbol, interaction.center, ratio, interaction.startScale)
            : symbol,
        ),
      );
      return;
    }

    if (interaction.mode === "resize-circle") {
      setCircles((current) =>
        reparentCircles(
          current.map((circle) =>
            circle.id === interaction.id
              ? scaleCircle(
                  circle,
                  Math.max(
                    12,
                    Math.min(CANVAS_SIZE, distanceBetween(interaction.center, point)),
                  ),
                )
              : circle,
          ),
        ),
      );
      return;
    }

    if (interaction.mode === "rotate-symbol") {
      const delta = angleBetween(interaction.center, point) - interaction.startAngle;

      setSymbols((current) =>
        current.map((symbol) =>
          symbol.id === interaction.id
            ? rotateSymbol(symbol, interaction.center, interaction.startRotation + delta)
            : symbol,
        ),
      );
      return;
    }

    const delta = angleBetween(interaction.center, point) - interaction.startAngle;

    setCircles((current) =>
      reparentCircles(
        current.map((circle) =>
          circle.id === interaction.id
            ? rotateCircle(circle, interaction.startRotation + delta)
            : circle,
        ),
      ),
    );
  }

  function continueDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) {
      return;
    }

    const point = canvasPoint(event, canvasRef.current);

    if (!point) {
      return;
    }

    if (interactionRef.current) {
      updateInteraction(point);
      return;
    }

    if (toolMode === "select") {
      return;
    }

    if (!isInsideCanvasCircle(point)) {
      return;
    }

    if (toolMode === "eraser") {
      eraseAtPoint(point);
      return;
    }

    if (toolMode === "pen") {
      activeStrokeRef.current = [...activeStrokeRef.current, point];
    }

    const currentActiveId = activeSymbolIdRef.current;

    setSymbols((current) =>
      current.map((symbol) => {
        if (symbol.id !== currentActiveId || symbol.replacement) {
          return symbol;
        }

        const nextMarks = symbol.marks.slice();
        const latest = nextMarks[nextMarks.length - 1];

        if (!latest || latest.tool !== "pen") {
          return {
            ...symbol,
            marks: [...nextMarks, { tool: "pen", points: [point] }],
          };
        }

        nextMarks[nextMarks.length - 1] = {
          ...latest,
          points: [...latest.points, point],
        };

        return { ...symbol, marks: nextMarks };
      }),
    );
  }

  function triggerCircleGlow(id: string) {
    setGlowingCircleIds((current) => new Set(current).add(id));
    const timeoutId = window.setTimeout(() => {
      setGlowingCircleIds((current) => {
        const next = new Set(current);

        next.delete(id);
        return next;
      });
    }, 900);

    glowTimeoutsRef.current = [...glowTimeoutsRef.current, timeoutId];
  }

  function storeClosedSpellBoundary() {
    const stroke = activeStrokeRef.current;
    const activeId = activeSymbolIdRef.current;
    const estimate = fitCircleFromStroke(stroke);

    if (!activeId || !estimate || !estimate.closed || estimate.radius < MIN_SPELL_RADIUS) {
      return false;
    }

    const nextCircle = {
      ...estimate,
      id: circleId(),
      sealed: true,
    };

    setSymbols((current) =>
      current
        .map((symbol) => {
          if (symbol.id !== activeId || symbol.replacement) {
            return symbol;
          }

          return {
            ...symbol,
            marks: symbol.marks.slice(0, -1),
          };
        })
        .filter((symbol) => symbol.replacement || symbol.marks.length > 0),
    );
    setCircles((current) => reparentCircles([...current, nextCircle]));
    triggerCircleGlow(nextCircle.id);
    activeSymbolIdRef.current = null;
    selectedCircleIdRef.current = nextCircle.id;
    setActiveSymbolId(null);
    setSelectedCircleId(nextCircle.id);
    setMatches([]);
    setStatus(
      `Closed boundary stored as a spell. Boundary quality ${Math.round(
        nextCircle.perfection * 100,
      )}%; contents inside it are now nested in the JSON.`,
    );

    return true;
  }

  function stopDrawing(event: PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;

    if (interactionRef.current) {
      interactionRef.current = null;
    }

    if (toolMode === "pen") {
      storeClosedSpellBoundary();
    }

    activeStrokeRef.current = [];

    if (
      typeof event.currentTarget.hasPointerCapture === "function" &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function applyMatch(match: MatchResult) {
    if (!activeSymbol) {
      return;
    }

    const rect = replacementRect(activeSymbol.marks);

    if (!rect) {
      return;
    }

    setSymbols((current) =>
      current.map((symbol) =>
        symbol.id === activeSymbol.id
          ? {
              ...symbol,
              marks: [],
              parentCircleId: findContainingCircle(
                {
                  x: rect.x + rect.size / 2,
                  y: rect.y + rect.size / 2,
                },
                circles,
              ),
              replacement: {
                reference: match,
                rect,
              },
            }
          : symbol,
      ),
    );
    setMatches([]);
    setStatus(`Changed active symbol to ${match.name}. Draw again to add another symbol.`);
  }

  function insertPreparedSymbol(reference: PreparedReference) {
    const size = 74;
    const stagger = (insertCountRef.current % 7) * 14;
    const center = selectedCircle?.center ?? {
      x: CANVAS_CENTER.x + stagger,
      y: CANVAS_CENTER.y + stagger,
    };
    const rect = {
      x: Math.max(0, Math.min(CANVAS_SIZE - size, center.x - size / 2)),
      y: Math.max(0, Math.min(CANVAS_SIZE - size, center.y - size / 2)),
      size,
    };
    const nextSymbol: DrawnSymbol = {
      id: symbolId(),
      marks: [],
      rotation: 0,
      scale: 1,
      parentCircleId: findContainingCircle(
        {
          x: rect.x + rect.size / 2,
          y: rect.y + rect.size / 2,
        },
        circles,
      ),
      tweaks: {
        inverted: false,
        power: 1,
      },
      replacement: {
        reference,
        rect,
      },
    };

    insertCountRef.current += 1;
    setSymbols((current) => [...current, nextSymbol]);
    activeSymbolIdRef.current = nextSymbol.id;
    selectedCircleIdRef.current = null;
    setActiveSymbolId(nextSymbol.id);
    setSelectedCircleId(null);
    setToolMode("select");
    setMatches([]);
    setStatus(`Placed ${reference.name} on the canvas.`);
  }

  async function importSpellImage(file: File) {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.src = url;
    await image.decode();
    URL.revokeObjectURL(url);

    const importCanvas = createCanvas(CANVAS_SIZE);
    const context = importCanvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const scale = Math.min(CANVAS_SIZE / image.naturalWidth, CANVAS_SIZE / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const x = (CANVAS_SIZE - width) / 2;
    const y = (CANVAS_SIZE - height) / 2;

    context.drawImage(image, x, y, width, height);

    const imageData = context.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const importedLayerDataUrl = thresholdLayerDataUrl(imageData);
    const visited = new Uint8Array(CANVAS_SIZE * CANVAS_SIZE);
    const isInk = (px: number, py: number) => {
      if (px < 0 || py < 0 || px >= CANVAS_SIZE || py >= CANVAS_SIZE) {
        return false;
      }

      const index = (py * CANVAS_SIZE + px) * 4;
      const darkness =
        255 -
        (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) /
          3;

      return imageData.data[index + 3] > 24 && darkness > 70;
    };
    const components: Point[][] = [];

    for (let py = 0; py < CANVAS_SIZE; py += 1) {
      for (let px = 0; px < CANVAS_SIZE; px += 1) {
        const startIndex = py * CANVAS_SIZE + px;

        if (visited[startIndex] || !isInk(px, py)) {
          continue;
        }

        const queue = [{ x: px, y: py }];
        const points: Point[] = [];
        visited[startIndex] = 1;

        while (queue.length > 0) {
          const point = queue.pop();

          if (!point) {
            continue;
          }

          points.push(point);

          for (const next of [
            { x: point.x + 1, y: point.y },
            { x: point.x - 1, y: point.y },
            { x: point.x, y: point.y + 1 },
            { x: point.x, y: point.y - 1 },
          ]) {
            const nextIndex = next.y * CANVAS_SIZE + next.x;

            if (
              next.x < 0 ||
              next.y < 0 ||
              next.x >= CANVAS_SIZE ||
              next.y >= CANVAS_SIZE ||
              visited[nextIndex] ||
              !isInk(next.x, next.y)
            ) {
              continue;
            }

            visited[nextIndex] = 1;
            queue.push(next);
          }
        }

        if (points.length >= MIN_IMPORT_PIXELS) {
          components.push(points);
        }
      }
    }

    const importedCircles: CircleComponent[] = [];
    const importedSymbols: DrawnSymbol[] = [];

    for (const points of components) {
      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      const rect = rectFromBounds(
        Math.min(...xs),
        Math.min(...ys),
        Math.max(...xs),
        Math.max(...ys),
      );
      const circle = circleFromImportedComponent(points, rect);

      if (circle) {
        importedCircles.push(circle);
        continue;
      }

      const marks = marksFromImportedPixels(points);
      const match = bestReferenceMatch(marks, preparedRef.current);
      const center = {
        x: rect.x + rect.size / 2,
        y: rect.y + rect.size / 2,
      };

      importedSymbols.push({
        id: symbolId(),
        marks: match && match.score >= IMPORT_MATCH_THRESHOLD ? [] : marks,
        rotation: estimateComponentRotation(points),
        scale: 1,
        tweaks: {
          inverted: false,
          power: 1,
        },
        annotation: defaultAnnotation(),
        imported: {
          source: "image",
          confidence: Number((match?.score ?? 0).toFixed(3)),
          matchId: match?.id,
          matchName: match?.name,
          bounds: rect,
        },
        replacement:
          match && match.score >= IMPORT_MATCH_THRESHOLD
            ? {
                reference: match,
                rect,
              }
            : undefined,
        parentCircleId: findContainingCircle(center, importedCircles),
      });
    }

    const nextCircles = reparentCircles([...circles, ...importedCircles]);
    const nextSymbols = importedSymbols.map((symbol) => ({
      ...symbol,
      parentCircleId: findContainingCircle(symbolCenter(symbol), nextCircles),
    }));

    setCircles(nextCircles);
    if (importedLayerDataUrl) {
      setImportedInkLayers((current) => [
        ...current,
        {
          id: `import-layer-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          dataUrl: importedLayerDataUrl,
        },
      ]);
    }
    setSymbols((current) => [...current, ...nextSymbols]);
    setActiveSymbolId(nextSymbols[0]?.id ?? null);
    activeSymbolIdRef.current = nextSymbols[0]?.id ?? null;
    setSelectedCircleId(nextSymbols.length === 0 ? nextCircles[0]?.id ?? null : null);
    selectedCircleIdRef.current = nextSymbols.length === 0 ? nextCircles[0]?.id ?? null : null;
    setToolMode("select");
    setMatches([]);
    setStatus(
      `Imported ${importedCircles.length} possible spell circle${
        importedCircles.length === 1 ? "" : "s"
      } and ${nextSymbols.length} symbol component${nextSymbols.length === 1 ? "" : "s"}.`,
    );
  }

  function handleImportImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    importSpellImage(file).catch(() => {
      setStatus("Could not import that image.");
    });
    event.target.value = "";
  }

  function copySelection() {
    if (selectedSymbol) {
      setClipboard({
        type: "symbol",
        symbol: cloneSymbolWithOffset(selectedSymbol, { x: 0, y: 0 }, selectedSymbol.id),
      });
      pasteCountRef.current = 1;
      setStatus("Copied selected symbol.");
      return;
    }

    if (selectedCircle) {
      const groupIds = circleGroupIds(selectedCircle.id, circles);
      const copiedCircles = circles
        .filter((circle) => groupIds.has(circle.id))
        .map((circle) => cloneCircleWithOffset(
          circle,
          { x: 0, y: 0 },
          circle.id,
          circle.parentCircleId,
        ));
      const copiedSymbols = symbols
        .filter((symbol) => {
          const parentId = symbolParentId(symbol, circles);

          return Boolean(parentId && groupIds.has(parentId));
        })
        .map((symbol) =>
          cloneSymbolWithOffset(
            symbol,
            { x: 0, y: 0 },
            symbol.id,
            symbolParentId(symbol, circles),
          ),
        );

      setClipboard({
        type: "spell",
        rootCircleId: selectedCircle.id,
        circles: copiedCircles,
        symbols: copiedSymbols,
      });
      pasteCountRef.current = 1;
      setStatus(
        `Copied spell boundary with ${copiedSymbols.length + copiedCircles.length - 1} nested component${
          copiedSymbols.length + copiedCircles.length - 1 === 1 ? "" : "s"
        }.`,
      );
    }
  }

  function pasteClipboard() {
    if (!clipboard) {
      return;
    }

    const offset = pasteOffsetFor(clipboard, pasteCountRef.current);
    pasteCountRef.current += 1;

    if (clipboard.type === "symbol") {
      const pastedSymbol = cloneSymbolWithOffset(clipboard.symbol, offset);
      const nextParentId = findContainingCircle(symbolCenter(pastedSymbol), circles);
      const nextSymbol = {
        ...pastedSymbol,
        parentCircleId: nextParentId,
      };

      setSymbols((current) => [...current, nextSymbol]);
      activeSymbolIdRef.current = nextSymbol.id;
      selectedCircleIdRef.current = null;
      setActiveSymbolId(nextSymbol.id);
      setSelectedCircleId(null);
      setToolMode("select");
      setMatches([]);
      setStatus("Pasted symbol copy.");
      return;
    }

    const idMap = new Map(
      clipboard.circles.map((circle) => [circle.id, circleId()] as const),
    );
    const pastedCircles = clipboard.circles.map((circle) =>
      cloneCircleWithOffset(
        circle,
        offset,
        idMap.get(circle.id) ?? circleId(),
        circle.parentCircleId ? idMap.get(circle.parentCircleId) : undefined,
      ),
    );
    const nextCircles = reparentCircles([...circles, ...pastedCircles]);
    const pastedSymbols = clipboard.symbols.map((symbol) => {
      const pastedSymbol = cloneSymbolWithOffset(
        symbol,
        offset,
        symbolId(),
        symbol.parentCircleId ? idMap.get(symbol.parentCircleId) : undefined,
      );

      return {
        ...pastedSymbol,
        parentCircleId:
          pastedSymbol.parentCircleId ??
          findContainingCircle(symbolCenter(pastedSymbol), nextCircles),
      };
    });
    const nextRootId = idMap.get(clipboard.rootCircleId) ?? null;

    setCircles(nextCircles);
    setSymbols((current) => [...current, ...pastedSymbols]);
    activeSymbolIdRef.current = null;
    selectedCircleIdRef.current = nextRootId;
    setActiveSymbolId(null);
    setSelectedCircleId(nextRootId);
    setToolMode("select");
    setMatches([]);
    setStatus(
      `Pasted spell boundary with ${pastedSymbols.length + pastedCircles.length - 1} nested component${
        pastedSymbols.length + pastedCircles.length - 1 === 1 ? "" : "s"
      }.`,
    );
  }

  function deleteSelection() {
    if (selectedSymbol) {
      const deletedId = selectedSymbol.id;

      setSymbols((current) => current.filter((symbol) => symbol.id !== deletedId));
      activeSymbolIdRef.current = null;
      setActiveSymbolId(null);
      setMatches([]);
      setStatus("Deleted selected symbol.");
      return;
    }

    if (selectedCircle) {
      const groupIds = circleGroupIds(selectedCircle.id, circles);

      setCircles((current) =>
        reparentCircles(current.filter((circle) => !groupIds.has(circle.id))),
      );
      setSymbols((current) =>
        current.filter((symbol) => {
          const parentId = symbolParentId(symbol, circles);

          return !parentId || !groupIds.has(parentId);
        }),
      );
      selectedCircleIdRef.current = null;
      setSelectedCircleId(null);
      setMatches([]);
      setStatus("Deleted selected spell boundary.");
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isEditable) {
        return;
      }

      const key = event.key.toLowerCase();
      const hasModifier = event.ctrlKey || event.metaKey;

      if (hasModifier && key === "c") {
        event.preventDefault();
        copySelection();
      }

      if (hasModifier && key === "v") {
        event.preventDefault();
        pasteClipboard();
      }

      if (hasModifier && key === "z") {
        event.preventDefault();
        undoStroke();
      }

      if (hasModifier && key === "0") {
        event.preventDefault();
        changeZoom(1);
      }

      if (hasModifier && (key === "=" || key === "+")) {
        event.preventDefault();
        changeZoom(zoom + ZOOM_STEP);
      }

      if (hasModifier && key === "-") {
        event.preventDefault();
        changeZoom(zoom - ZOOM_STEP);
      }

      if (!hasModifier && (key === "delete" || key === "backspace")) {
        event.preventDefault();
        deleteSelection();
      }

      if (!hasModifier && key === "escape") {
        event.preventDefault();
        activeSymbolIdRef.current = null;
        selectedCircleIdRef.current = null;
        setActiveSymbolId(null);
        setSelectedCircleId(null);
        setMatches([]);
        setStatus("Selection cleared.");
      }

      if (!hasModifier && key === "v") {
        event.preventDefault();
        setToolMode("select");
        setStatus("Select tool active.");
      }

      if (!hasModifier && key === "p") {
        event.preventDefault();
        setToolMode("pen");
        setStatus("Pen tool active.");
      }

      if (!hasModifier && key === "e") {
        event.preventDefault();
        setToolMode("eraser");
        setStatus("Eraser tool active.");
      }

      if (!hasModifier && key === "n") {
        event.preventDefault();
        startNewSymbol();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  function clearDrawing() {
    setSymbols([]);
    setCircles([]);
    setImportedInkLayers([]);
    setActiveSymbolId(null);
    setSelectedCircleId(null);
    setMatches([]);
    setStatus(
      isReady
        ? `Ready to compare against ${preparedRef.current.length} drawable symbols.`
        : "Preparing symbol database...",
    );
  }

  function updateSelectedSymbol(
    updater: (symbol: DrawnSymbol) => DrawnSymbol,
  ) {
    if (!activeSymbolId) {
      return;
    }

    setSymbols((current) =>
      current.map((symbol) => (symbol.id === activeSymbolId ? updater(symbol) : symbol)),
    );
  }

  function updateSelectedCircle(
    updater: (circle: CircleComponent) => CircleComponent,
  ) {
    if (!selectedCircleId) {
      return;
    }

    setCircles((current) =>
      reparentCircles(
        current.map((circle) =>
          circle.id === selectedCircleId ? updater(circle) : circle,
        ),
      ),
    );
  }

  function undoStroke() {
    if (!activeSymbolId) {
      return;
    }

    setSymbols((current) =>
      current
        .map((symbol) => {
          if (symbol.id !== activeSymbolId) {
            return symbol;
          }

          if (symbol.replacement) {
            return { ...symbol, replacement: undefined };
          }

          return { ...symbol, marks: symbol.marks.slice(0, -1) };
        })
        .filter((symbol) => symbol.marks.length > 0 || symbol.replacement),
    );
  }

  function changeZoom(nextZoom: number) {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom)));
  }

  const selectedSymbolCenter = selectedSymbol ? symbolCenter(selectedSymbol) : null;
  const selectedSymbolParentId = selectedSymbol
    ? symbolParentId(selectedSymbol, circles)
    : undefined;
  const selectedSymbolParent = circles.find(
    (circle) => circle.id === selectedSymbolParentId,
  );
  const selectedSymbolRelative = relativeToCircle(
    selectedSymbolCenter,
    selectedSymbolParent,
  );
  const selectedCircleParentId = selectedCircle
    ? findParentCircleIdForCircle(selectedCircle, circles)
    : undefined;
  const selectedCircleParent = circles.find(
    (circle) => circle.id === selectedCircleParentId,
  );
  const selectedCircleRelative = relativeToCircle(
    selectedCircle?.center ?? null,
    selectedCircleParent,
  );

  return (
    <div className="min-h-screen bg-stone-100 text-stone-950">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-stone-300 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Draw and identify
            </p>
            <h1 className="text-3xl font-semibold tracking-normal text-stone-950 sm:text-4xl">
              Symbol Sketch Matcher
            </h1>
          </div>

          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-2 rounded border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 shadow-sm transition hover:border-amber-600 hover:text-stone-950"
          >
            <Library className="h-4 w-4" aria-hidden="true" />
            Library
          </Link>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <div className="rounded-md border border-stone-300 bg-white p-3 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {(["all", "sign", "sigil"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setActiveType(type);
                      setMatches([]);
                    }}
                    className={`rounded px-4 py-2 text-sm font-semibold capitalize transition ${
                      activeType === type
                        ? "bg-stone-950 text-stone-50"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {type === "all" ? "All symbols" : `${type}s`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={startNewSymbol}
                  className="inline-flex items-center gap-2 rounded bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-200"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New symbol
                </button>
                <div className="grid grid-cols-3 rounded-md border border-stone-300 bg-stone-100 p-1">
                  <button
                    type="button"
                    onClick={() => setToolMode("select")}
                    className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-sm font-semibold transition ${
                      toolMode === "select"
                        ? "bg-stone-950 text-stone-50"
                        : "text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    Select
                  </button>
                  <button
                    type="button"
                    onClick={() => setToolMode("pen")}
                    className={`inline-flex items-center justify-center gap-2 rounded px-3 py-1.5 text-sm font-semibold transition ${
                      toolMode === "pen"
                        ? "bg-stone-950 text-stone-50"
                        : "text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    <PenTool className="h-4 w-4" aria-hidden="true" />
                    Pen
                  </button>
                  <button
                    type="button"
                    onClick={() => setToolMode("eraser")}
                    className={`inline-flex items-center justify-center gap-2 rounded px-3 py-1.5 text-sm font-semibold transition ${
                      toolMode === "eraser"
                        ? "bg-stone-950 text-stone-50"
                        : "text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    <Eraser className="h-4 w-4" aria-hidden="true" />
                    Eraser
                  </button>
                </div>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2 border-t border-stone-200 pt-3">
                <button
                  type="button"
                  onClick={() => changeZoom(zoom - ZOOM_STEP)}
                  className="grid h-9 w-9 place-items-center rounded border border-stone-300 bg-white text-stone-700 transition hover:border-amber-600 hover:text-stone-950"
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" aria-hidden="true" />
                </button>
                <input
                  aria-label="Canvas zoom"
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={ZOOM_STEP}
                  value={zoom}
                  onChange={(event) => changeZoom(Number(event.target.value))}
                  className="h-9 min-w-44 flex-1 accent-stone-950"
                />
                <button
                  type="button"
                  onClick={() => changeZoom(zoom + ZOOM_STEP)}
                  className="grid h-9 w-9 place-items-center rounded border border-stone-300 bg-white text-stone-700 transition hover:border-amber-600 hover:text-stone-950"
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => changeZoom(1)}
                  className="grid h-9 w-9 place-items-center rounded border border-stone-300 bg-white text-stone-700 transition hover:border-amber-600 hover:text-stone-950"
                  aria-label="Reset zoom"
                  title="Reset zoom"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="rounded bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <div
                onWheel={handleCanvasWheel}
                className="h-[72vh] min-h-96 overflow-auto rounded border border-stone-300 bg-stone-200 p-6 shadow-inner"
              >
                <div className="grid min-h-full min-w-full place-items-center">
                  <canvas
                    ref={canvasRef}
                    width={CANVAS_SIZE}
                    height={CANVAS_SIZE}
                    onPointerDown={startDrawing}
                    onPointerMove={continueDrawing}
                    onPointerUp={stopDrawing}
                    onPointerCancel={stopDrawing}
                    onMouseDown={handleCanvasMouseDown}
                    onContextMenu={handleCanvasContextMenu}
                    className="block aspect-square touch-none rounded-full bg-white shadow-sm ring-1 ring-stone-400"
                    style={{
                      cursor:
                        toolMode === "pen"
                          ? PEN_CURSOR
                          : toolMode === "eraser"
                            ? ERASER_CURSOR
                            : "default",
                      width: `${zoom * 100}%`,
                      height: "auto",
                      maxWidth: "none",
                    }}
                    aria-label="Drawing canvas"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={importInputRef}
                type="file"
                accept="image/*"
                onChange={handleImportImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="inline-flex h-11 items-center gap-2 rounded border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:border-amber-600 hover:text-stone-950"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Import spell
              </button>
              <button
                type="button"
                onClick={() => setShowSymbolShelf((current) => !current)}
                className={`inline-flex h-11 items-center gap-2 rounded border px-4 text-sm font-semibold transition ${
                  showSymbolShelf
                    ? "border-stone-950 bg-stone-950 text-stone-50"
                    : "border-stone-300 bg-white text-stone-700 hover:border-amber-600 hover:text-stone-950"
                }`}
              >
                <Library className="h-4 w-4" aria-hidden="true" />
                Symbols
              </button>
              <button
                type="button"
                onClick={() => updateMatches("manual")}
                disabled={!isReady || !activeSymbol}
                className="inline-flex h-11 items-center gap-2 rounded bg-stone-950 px-5 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Refresh matches
              </button>
              <button
                type="button"
                onClick={undoStroke}
                disabled={!activeSymbolId}
                className="inline-flex h-11 items-center gap-2 rounded border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:border-amber-600 hover:text-stone-950 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                <Undo2 className="h-4 w-4" aria-hidden="true" />
                Undo active
              </button>
              <button
                type="button"
                onClick={copySelection}
                disabled={!selectedSymbol && !selectedCircle}
                className="inline-flex h-11 items-center gap-2 rounded border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:border-amber-600 hover:text-stone-950 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy
              </button>
              <button
                type="button"
                onClick={pasteClipboard}
                disabled={!clipboard}
                className="inline-flex h-11 items-center gap-2 rounded border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:border-amber-600 hover:text-stone-950 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
                Paste
              </button>
              <button
                type="button"
                onClick={clearDrawing}
                className="inline-flex h-11 items-center gap-2 rounded border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:border-amber-600 hover:text-stone-950"
              >
                <Eraser className="h-4 w-4" aria-hidden="true" />
                Clear canvas
              </button>
              <p className="text-sm font-medium text-stone-600">{status}</p>
            </div>

            {showSymbolShelf ? (
              <div className="rounded-md border border-stone-300 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-700">
                    Signs and Sigils
                  </h2>
                  <span className="rounded bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
                    {shelfSymbols.length}
                  </span>
                </div>

                {shelfSymbols.length > 0 ? (
                  <div className="grid max-h-72 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2 xl:grid-cols-3">
                    {shelfSymbols.map((reference) => (
                      <button
                        key={`${reference.type}-${reference.id}`}
                        type="button"
                        onClick={() => insertPreparedSymbol(reference)}
                        className="flex min-h-20 items-center gap-3 rounded border border-stone-200 bg-stone-50 p-2 text-left transition hover:border-stone-950 hover:bg-white"
                      >
                        {reference.assetPath ? (
                          <Image
                            src={reference.assetPath}
                            alt={`${reference.name} ${reference.type}`}
                            width={52}
                            height={52}
                            className="h-13 w-13 shrink-0 object-contain"
                          />
                        ) : (
                          <div className="grid h-13 w-13 shrink-0 place-items-center rounded border border-dashed border-stone-300 text-[10px] font-semibold uppercase text-stone-500">
                            No vector
                          </div>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-stone-950">
                            {reference.name}
                          </span>
                          <span className="block truncate text-xs font-medium uppercase text-stone-500">
                            {reference.type} / {categoryLabel(reference.category)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded border border-dashed border-stone-300 p-5 text-center text-sm font-medium text-stone-600">
                    Drawable symbols are still loading.
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
            <div className="rounded-md border border-stone-300 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-stone-950">Matches</h2>
                <span className="rounded bg-stone-100 px-2.5 py-1 text-xs font-semibold uppercase text-stone-600">
                  {filteredMatches.length || 0}
                </span>
              </div>

              {filteredMatches.length > 0 ? (
                <div className="space-y-3">
                  {filteredMatches.map((match) => (
                    <button
                      key={`${match.type}-${match.id}`}
                      type="button"
                      onClick={() => applyMatch(match)}
                      className={`w-full rounded-md border p-3 text-left transition hover:border-amber-700 hover:shadow-sm ${
                        match.score >= MATCH_THRESHOLD
                          ? "border-amber-500 bg-amber-50"
                          : "border-stone-300 bg-stone-50"
                      }`}
                    >
                      <div className="flex gap-3">
                        {match.assetPath ? (
                          <Image
                            src={match.assetPath}
                            alt={`${match.name} ${match.type}`}
                            width={72}
                            height={72}
                            className="h-18 w-18 shrink-0 object-contain"
                          />
                        ) : (
                          <div className="grid h-18 w-18 shrink-0 place-items-center rounded border border-dashed border-stone-300 text-[10px] font-semibold uppercase text-stone-500">
                            No vector
                          </div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold leading-5 text-stone-950">
                              {match.name}
                            </h3>
                            <span className="rounded bg-stone-950 px-2 py-0.5 text-[10px] font-semibold uppercase text-stone-50">
                              {match.type}
                            </span>
                          </div>
                          <p className="text-xs font-medium uppercase text-stone-500">
                            {categoryLabel(match.category)}
                          </p>
                          <p className="text-sm font-semibold text-amber-800">
                            {Math.round(match.score * 100)}% match
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-stone-300 p-8 text-center text-sm font-medium text-stone-600">
                  Draw one symbol at a time to see live close matches. Click a match to snap only the active symbol.
                </div>
              )}
            </div>

            <div className="rounded-md border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-stone-950">
                Selected Component
              </h2>

              {selectedSymbol ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-950">
                      {selectedSymbol.replacement?.reference.name ?? "Freehand symbol"}
                    </p>
                    <p className="text-xs font-medium uppercase text-stone-500">
                      {selectedSymbol.replacement?.reference.type ?? "unidentified"} component
                    </p>
                  </div>

                  <label className="block text-sm font-semibold text-stone-700">
                    Rotation {selectedSymbol.rotation} deg
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={selectedSymbol.rotation}
                      onChange={(event) =>
                        updateSelectedSymbol((symbol) => ({
                          ...symbol,
                          rotation: Number(event.target.value),
                        }))
                      }
                      className="mt-2 w-full accent-stone-950"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-stone-700">
                    Scale {selectedSymbol.scale.toFixed(2)}x
                    <input
                      type="range"
                      min="0.35"
                      max="2.5"
                      step="0.05"
                      value={selectedSymbol.scale}
                      onChange={(event) =>
                        updateSelectedSymbol((symbol) => ({
                          ...symbol,
                          scale: Number(event.target.value),
                        }))
                      }
                      className="mt-2 w-full accent-stone-950"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-stone-700">
                    Power tweak {selectedSymbol.tweaks.power.toFixed(2)}
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={selectedSymbol.tweaks.power}
                      onChange={(event) =>
                        updateSelectedSymbol((symbol) => ({
                          ...symbol,
                          tweaks: {
                            ...symbol.tweaks,
                            power: Number(event.target.value),
                          },
                        }))
                      }
                      className="mt-2 w-full accent-stone-950"
                    />
                  </label>

                  <label className="flex items-center gap-2 text-sm font-semibold text-stone-700">
                    <input
                      type="checkbox"
                      checked={selectedSymbol.tweaks.inverted}
                      onChange={(event) =>
                        updateSelectedSymbol((symbol) => ({
                          ...symbol,
                          tweaks: {
                            ...symbol.tweaks,
                            inverted: event.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 accent-stone-950"
                    />
                    Inverted / reversed
                  </label>

                  <label className="block text-sm font-semibold text-stone-700">
                    Annotation note
                    <textarea
                      value={selectedSymbol.annotation?.note ?? ""}
                      onChange={(event) =>
                        updateSelectedSymbol((symbol) => ({
                          ...symbol,
                          annotation: {
                            ...(symbol.annotation ?? defaultAnnotation()),
                            note: event.target.value,
                          },
                        }))
                      }
                      rows={3}
                      className="mt-2 w-full rounded border border-stone-300 bg-white p-2 text-sm font-medium text-stone-800 outline-none focus:border-stone-950"
                      placeholder="Notes about this unknown or imported symbol"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-stone-700">
                    Possible effect
                    <textarea
                      value={selectedSymbol.annotation?.possibleEffect ?? ""}
                      onChange={(event) =>
                        updateSelectedSymbol((symbol) => ({
                          ...symbol,
                          annotation: {
                            ...(symbol.annotation ?? defaultAnnotation()),
                            possibleEffect: event.target.value,
                          },
                        }))
                      }
                      rows={3}
                      className="mt-2 w-full rounded border border-stone-300 bg-white p-2 text-sm font-medium text-stone-800 outline-none focus:border-stone-950"
                      placeholder="Hypothesis for later compiler review"
                    />
                  </label>

                  {selectedSymbol.imported ? (
                    <div className="rounded bg-stone-100 p-3 text-sm text-stone-700">
                      <p>
                        Import confidence:{" "}
                        <span className="font-semibold text-stone-950">
                          {Math.round(selectedSymbol.imported.confidence * 100)}%
                        </span>
                      </p>
                      <p>
                        Imported match:{" "}
                        <span className="font-semibold text-stone-950">
                          {selectedSymbol.imported.matchName ?? "unknown"}
                        </span>
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded bg-stone-100 p-3 text-sm text-stone-700">
                    <p>
                      Parent spell:{" "}
                      <span className="font-semibold text-stone-950">
                        {selectedSymbolParentId ?? "none"}
                      </span>
                    </p>
                    {selectedSymbolRelative ? (
                      <p>
                        Spell position: r{" "}
                        {selectedSymbolRelative.radialDistanceRatio}, angle{" "}
                        {selectedSymbolRelative.angleDegrees} deg
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : selectedCircle ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-950">
                      Spell boundary
                    </p>
                    <p className="text-xs font-medium uppercase text-stone-500">
                      Boundary quality {Math.round(selectedCircle.perfection * 100)}%
                    </p>
                  </div>

                  <label className="block text-sm font-semibold text-stone-700">
                    Radius {Math.round(selectedCircle.radius)}
                    <input
                      type="range"
                      min="20"
                      max={CANVAS_SIZE / 2}
                      step="1"
                      value={selectedCircle.radius}
                      onChange={(event) =>
                        updateSelectedCircle((circle) => ({
                          ...circle,
                          radius: Number(event.target.value),
                        }))
                      }
                      className="mt-2 w-full accent-stone-950"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-stone-700">
                    Rotation {selectedCircle.rotation} deg
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={selectedCircle.rotation}
                      onChange={(event) =>
                        updateSelectedCircle((circle) => ({
                          ...circle,
                          rotation: Number(event.target.value),
                        }))
                      }
                      className="mt-2 w-full accent-stone-950"
                    />
                  </label>

                  <div className="rounded bg-stone-100 p-3 text-sm text-stone-700">
                    <p>
                      Parent spell:{" "}
                      <span className="font-semibold text-stone-950">
                        {selectedCircleParentId ?? "none"}
                      </span>
                    </p>
                    {selectedCircleRelative ? (
                      <p>
                        Nested position: r{" "}
                        {selectedCircleRelative.radialDistanceRatio}, angle{" "}
                        {selectedCircleRelative.angleDegrees} deg
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-stone-300 p-6 text-center text-sm font-medium text-stone-600">
                  Use Select, then click a symbol or spell boundary to edit its stored data.
                </div>
              )}
            </div>

            <div className="rounded-md border border-stone-300 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-stone-950">Spell Data</h2>
                <span className="rounded bg-stone-100 px-2.5 py-1 text-xs font-semibold uppercase text-stone-600">
                  JSON
                </span>
              </div>
              <pre className="max-h-72 overflow-auto rounded bg-stone-950 p-3 text-xs leading-5 text-stone-50">
                {JSON.stringify(spellSnapshot, null, 2)}
              </pre>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function drawMarks(canvas: HTMLCanvasElement, marks: Mark[], includeBackground: boolean) {
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return;
  }

  if (includeBackground) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  } else {
    context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  for (const mark of marks) {
    drawMark(context, mark);
  }
}

function drawMarksWithLineWidth(
  canvas: HTMLCanvasElement,
  marks: Mark[],
  includeBackground: boolean,
  lineWidth: number,
) {
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return;
  }

  if (includeBackground) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  } else {
    context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  for (const mark of marks) {
    drawMark(context, mark, lineWidth);
  }
}

async function redrawSpellCanvas({
  symbols,
  circles,
  importedInkLayers,
  selectedSymbolId,
  selectedCircleId,
  glowingCircleIds,
  canvas,
  imageCache,
  isCancelled,
}: {
  symbols: DrawnSymbol[];
  circles: CircleComponent[];
  importedInkLayers: ImportedInkLayer[];
  selectedSymbolId: string | null;
  selectedCircleId: string | null;
  glowingCircleIds: Set<string>;
  canvas: HTMLCanvasElement | null;
  imageCache: Map<string, HTMLImageElement>;
  isCancelled: () => boolean;
}) {
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  for (const layer of importedInkLayers) {
    const image = await cachedImage(layer.dataUrl, imageCache);

    if (isCancelled()) {
      return;
    }

    context.drawImage(image, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  for (const circle of circles) {
    drawCircleComponent(
      context,
      circle,
      circle.id === selectedCircleId,
      glowingCircleIds.has(circle.id),
    );
  }

  for (const symbol of symbols) {
    if (isCancelled()) {
      return;
    }

    if (symbol.imported) {
      drawSymbolSelection(context, symbol, symbol.id === selectedSymbolId);
      continue;
    }

    if (symbol.replacement?.reference.assetPath) {
      const image = await cachedImage(symbol.replacement.reference.assetPath, imageCache);

      if (isCancelled()) {
        return;
      }

      drawReplacementSymbol(context, image, symbol, symbol.id === selectedSymbolId);
      continue;
    }

    drawSymbolMarks(context, symbol.marks, symbol.imported ? IMPORT_LINE_WIDTH : DRAW_LINE_WIDTH);
    drawSymbolSelection(context, symbol, symbol.id === selectedSymbolId);
  }
}

function drawCircleComponent(
  context: CanvasRenderingContext2D,
  circle: CircleComponent,
  selected: boolean,
  glowing: boolean,
) {
  context.save();

  if (circle.imported && !selected && !glowing) {
    context.restore();
    return;
  }

  if (circle.sourceStroke.length > 1) {
    context.beginPath();
    context.strokeStyle = "#000000";
    context.lineWidth = glowing ? CIRCLE_LINE_WIDTH + 4 : CIRCLE_LINE_WIDTH;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.shadowColor = glowing ? "rgba(0, 0, 0, 0.55)" : "transparent";
    context.shadowBlur = glowing ? 24 : 0;
    context.moveTo(circle.sourceStroke[0].x, circle.sourceStroke[0].y);

    for (const point of circle.sourceStroke.slice(1)) {
      context.lineTo(point.x, point.y);
    }

    context.stroke();
  }

  if (selected) {
    context.setLineDash([]);
    drawHandle(context, {
      x: circle.center.x + circle.radius + 18,
      y: circle.center.y,
    });
    drawHandle(context, {
      x: circle.center.x + circle.radius / Math.SQRT2 + 18,
      y: circle.center.y + circle.radius / Math.SQRT2 + 18,
    }, true);
  }

  context.restore();
}

function drawReplacementSymbol(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  symbol: DrawnSymbol,
  selected: boolean,
) {
  if (!symbol.replacement) {
    return;
  }

  const rect = symbol.replacement.rect;
  const size = rect.size * symbol.scale;
  const centerX = rect.x + rect.size / 2;
  const centerY = rect.y + rect.size / 2;

  context.save();
  context.translate(centerX, centerY);
  context.rotate((symbol.rotation * Math.PI) / 180);
  context.drawImage(image, -size / 2, -size / 2, size, size);

  if (selected) {
    context.strokeStyle = "#111827";
    context.lineWidth = 2;
    context.setLineDash([8, 6]);
    context.strokeRect(-size / 2 - 6, -size / 2 - 6, size + 12, size + 12);
    context.setLineDash([]);
    drawHandle(context, { x: size / 2 + 16, y: 0 });
    drawHandle(context, { x: size / 2 + 18, y: size / 2 + 18 }, true);
  }

  context.restore();
}

function drawSymbolSelection(
  context: CanvasRenderingContext2D,
  symbol: DrawnSymbol,
  selected: boolean,
) {
  if (!selected) {
    return;
  }

  const bounds = symbolVisualBox(symbol);

  if (!bounds) {
    return;
  }

  context.save();
  context.strokeStyle = "#111827";
  context.lineWidth = 2;
  context.setLineDash([8, 6]);
  context.strokeRect(
    bounds.minX - 10,
    bounds.minY - 10,
    bounds.maxX - bounds.minX + 20,
    bounds.maxY - bounds.minY + 20,
  );
  context.setLineDash([]);
  drawHandle(context, { x: bounds.maxX + 16, y: bounds.center.y });
  drawHandle(context, { x: bounds.maxX + 18, y: bounds.maxY + 18 }, true);
  context.restore();
}

function drawHandle(context: CanvasRenderingContext2D, point: Point, rotate = false) {
  context.save();
  context.fillStyle = rotate ? "#111827" : "#ffffff";
  context.strokeStyle = "#111827";
  context.lineWidth = 2;
  context.beginPath();
  context.rect(
    point.x - HANDLE_SIZE / 2,
    point.y - HANDLE_SIZE / 2,
    HANDLE_SIZE,
    HANDLE_SIZE,
  );
  context.fill();
  context.stroke();

  if (rotate) {
    context.strokeStyle = "#111827";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 1.5);
    context.stroke();
  }

  context.restore();
}

function drawSymbolMarks(
  context: CanvasRenderingContext2D,
  marks: Mark[],
  lineWidth = DRAW_LINE_WIDTH,
) {
  for (const mark of marks) {
    drawMark(context, mark, lineWidth);
  }
}

function drawMark(context: CanvasRenderingContext2D, mark: Mark, lineWidth = DRAW_LINE_WIDTH) {
  const stroke = mark.points;

  if (stroke.length === 0 || mark.tool === "eraser") {
    return;
  }

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#000000";
  context.lineWidth = lineWidth;
  context.beginPath();
  context.moveTo(stroke[0].x, stroke[0].y);

  if (stroke.length === 1) {
    context.lineTo(stroke[0].x + 0.1, stroke[0].y + 0.1);
  }

  for (let index = 1; index < stroke.length; index += 1) {
    context.lineTo(stroke[index].x, stroke[index].y);
  }

  context.stroke();
  context.restore();
}

function rectFromBounds(minX: number, minY: number, maxX: number, maxY: number): Rect {
  const padding = 8;
  const width = maxX - minX + 1 + padding * 2;
  const height = maxY - minY + 1 + padding * 2;
  const size = Math.max(16, Math.max(width, height));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return {
    x: Math.max(0, Math.min(CANVAS_SIZE - size, centerX - size / 2)),
    y: Math.max(0, Math.min(CANVAS_SIZE - size, centerY - size / 2)),
    size,
  };
}

function marksFromImportedPixels(points: Point[]) {
  const rows = new Map<number, number[]>();

  for (const point of points) {
    const y = Math.round(point.y);
    rows.set(y, [...(rows.get(y) ?? []), Math.round(point.x)]);
  }

  const marks: Mark[] = [];

  for (const [y, xs] of rows) {
    const sorted = [...new Set(xs)].sort((left, right) => left - right);
    let start = sorted[0];
    let previous = sorted[0];

    for (const x of sorted.slice(1)) {
      if (x > previous + 1) {
        if (previous - start >= 1) {
          marks.push({ tool: "pen", points: [{ x: start, y }, { x: previous, y }] });
        }

        start = x;
      }

      previous = x;
    }

    if (previous - start >= 1) {
      marks.push({ tool: "pen", points: [{ x: start, y }, { x: previous, y }] });
    }
  }

  return marks;
}

function estimateComponentRotation(points: Point[]) {
  if (points.length < 2) {
    return 0;
  }

  const center = {
    x: average(points.map((point) => point.x)),
    y: average(points.map((point) => point.y)),
  };
  let xx = 0;
  let yy = 0;
  let xy = 0;

  for (const point of points) {
    const dx = point.x - center.x;
    const dy = point.y - center.y;

    xx += dx * dx;
    yy += dy * dy;
    xy += dx * dy;
  }

  return Number(normalizeDegrees((Math.atan2(2 * xy, xx - yy) * 90) / Math.PI).toFixed(1));
}

function circleFromImportedComponent(points: Point[], rect: Rect) {
  if (points.length < 80 || rect.size < 58) {
    return null;
  }

  const center = {
    x: average(points.map((point) => point.x)),
    y: average(points.map((point) => point.y)),
  };
  const distances = points.map((point) => distanceBetween(point, center));
  const radius = average(distances);
  const radialDeviation = standardDeviation(distances) / Math.max(1, radius);
  const fillRatio = points.length / Math.max(1, rect.size * rect.size);

  if (radialDeviation > 0.18 || fillRatio > 0.42) {
    return null;
  }

  const sourceStroke = points
    .filter((_, index) => index % Math.max(1, Math.floor(points.length / 240)) === 0)
    .sort(
      (left, right) =>
        angleFromNorthClockwise(left.x - center.x, left.y - center.y) -
        angleFromNorthClockwise(right.x - center.x, right.y - center.y),
    );

  return {
    id: circleId(),
    center,
    radius,
    rotation: 0,
    perfection: Number(Math.max(0, 1 - radialDeviation * 4).toFixed(3)),
    sourceStroke,
    closed: true,
    sealed: true,
    imported: {
      source: "image" as const,
      bounds: rect,
    },
  };
}

function componentCanvasFromMarks(marks: Mark[]) {
  const canvas = createCanvas(CANVAS_SIZE);
  drawMarksWithLineWidth(canvas, marks, true, IMPORT_LINE_WIDTH);
  return canvas;
}

function thresholdLayerDataUrl(imageData: ImageData) {
  const layerCanvas = createCanvas(CANVAS_SIZE);
  const layerContext = layerCanvas.getContext("2d", { willReadFrequently: true });

  if (!layerContext) {
    return null;
  }

  const output = layerContext.createImageData(CANVAS_SIZE, CANVAS_SIZE);

  for (let index = 0; index < imageData.data.length; index += 4) {
    const darkness =
      255 -
      (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) /
        3;

    if (imageData.data[index + 3] > 24 && darkness > 70) {
      output.data[index] = 0;
      output.data[index + 1] = 0;
      output.data[index + 2] = 0;
      output.data[index + 3] = 255;
    }
  }

  layerContext.putImageData(output, 0, 0);
  return layerCanvas.toDataURL("image/png");
}

function bestReferenceMatch(marks: Mark[], referencesToMatch: PreparedReference[]) {
  const drawing = signatureFromCanvas(componentCanvasFromMarks(marks));

  if (!drawing) {
    return null;
  }

  return referencesToMatch
    .map((reference) => ({
      ...reference,
      score: compareSignatures(drawing, reference),
    }))
    .sort((left, right) => right.score - left.score)[0] ?? null;
}

function symbolCompilerId(symbol: DrawnSymbol) {
  return symbol.replacement?.reference.id ?? "freehand";
}

function circularSpacingStats(angles: number[]) {
  if (angles.length < 2) {
    return {
      averageSpacingDegrees: 0,
      spacingUniformityScore: 1,
    };
  }

  const sortedAngles = [...angles].sort((left, right) => left - right);
  const gaps = sortedAngles.map((angle, index) => {
    const nextAngle = sortedAngles[(index + 1) % sortedAngles.length];
    return normalizeDegrees(nextAngle - angle);
  });
  const expectedSpacing = 360 / sortedAngles.length;
  const gapError = standardDeviation(gaps.map((gap) => gap - expectedSpacing));

  return {
    averageSpacingDegrees: Number(average(gaps).toFixed(1)),
    spacingUniformityScore: roundedRatio(Math.max(0, 1 - gapError / expectedSpacing)),
  };
}

function likelyPatternLabel({
  count,
  spacingUniformityScore,
  radialUniformityScore,
  inwardFacingScore,
  outwardFacingScore,
  clockwiseFlowScore,
  counterClockwiseFlowScore,
  tangentialFlowScore,
}: {
  count: number;
  spacingUniformityScore: number;
  radialUniformityScore: number;
  inwardFacingScore: number;
  outwardFacingScore: number;
  clockwiseFlowScore: number;
  counterClockwiseFlowScore: number;
  tangentialFlowScore: number;
}) {
  if (count < 2) {
    return "single symbol";
  }

  if (
    clockwiseFlowScore >= 0.82 &&
    tangentialFlowScore >= 0.82 &&
    spacingUniformityScore >= 0.65
  ) {
    return "clockwise vortex";
  }

  if (
    counterClockwiseFlowScore >= 0.82 &&
    tangentialFlowScore >= 0.82 &&
    spacingUniformityScore >= 0.65
  ) {
    return "counterclockwise vortex";
  }

  if (
    inwardFacingScore >= 0.82 &&
    spacingUniformityScore >= 0.65 &&
    radialUniformityScore >= 0.65
  ) {
    return "repeated inward-facing ring";
  }

  if (
    outwardFacingScore >= 0.82 &&
    spacingUniformityScore >= 0.65 &&
    radialUniformityScore >= 0.65
  ) {
    return "repeated outward-facing ring";
  }

  if (spacingUniformityScore >= 0.75 && radialUniformityScore >= 0.75) {
    return "stable ring pattern";
  }

  return "repeated symbol group";
}

function analyzeSymbolGroups(symbols: DrawnSymbol[], parent: CircleComponent) {
  const groups = new Map<string, DrawnSymbol[]>();

  for (const symbol of symbols) {
    const key = symbolCompilerId(symbol);
    groups.set(key, [...(groups.get(key) ?? []), symbol]);
  }

  return [...groups.entries()]
    .map(([symbolId, groupSymbols]) => {
      const geometries = groupSymbols
        .map((symbol) => ({
          symbol,
          position: symbolPositionGeometry(symbol, parent),
          orientation: symbolOrientationGeometry(symbol, parent),
        }))
        .filter(
          (item): item is {
            symbol: DrawnSymbol;
            position: NonNullable<ReturnType<typeof symbolPositionGeometry>>;
            orientation: ReturnType<typeof symbolOrientationGeometry>;
          } => Boolean(item.position),
        );

      const angles = geometries.map((item) => item.position.angleDegrees);
      const radialRatios = geometries.map((item) => item.position.radialDistanceRatio);
      const spacing = circularSpacingStats(angles);
      const radialMean = average(radialRatios);
      const radialSpread = standardDeviation(radialRatios);
      const radialUniformityScore = roundedRatio(
        Math.max(0, 1 - radialSpread / Math.max(0.001, radialMean)),
      );
      const inwardFacingScore = roundedRatio(
        average(geometries.map((item) => item.orientation.orientationScores.faceCenter)),
      );
      const outwardFacingScore = roundedRatio(
        average(geometries.map((item) => item.orientation.orientationScores.faceOutward)),
      );
      const clockwiseFlowScore = roundedRatio(
        average(geometries.map((item) => item.orientation.orientationScores.tangentialClockwise)),
      );
      const counterClockwiseFlowScore = roundedRatio(
        average(
          geometries.map(
            (item) => item.orientation.orientationScores.tangentialCounterclockwise,
          ),
        ),
      );
      const tangentialFlowScore = roundedRatio(
        Math.max(clockwiseFlowScore, counterClockwiseFlowScore),
      );
      const orientationScores = [
        { mode: "face_center", score: inwardFacingScore },
        { mode: "face_outward", score: outwardFacingScore },
        { mode: "tangential_clockwise", score: clockwiseFlowScore },
        { mode: "tangential_counterclockwise", score: counterClockwiseFlowScore },
      ];
      const orientationModeDetected =
        orientationScores.sort((left, right) => right.score - left.score)[0]?.mode ??
        "custom";

      return {
        symbolId,
        symbolName:
          groupSymbols[0]?.replacement?.reference.name ??
          (symbolId === "freehand" ? "Freehand symbol" : symbolId),
        count: groupSymbols.length,
        averageSpacingDegrees: spacing.averageSpacingDegrees,
        spacingUniformityScore: spacing.spacingUniformityScore,
        orientationUniformityScore: roundedRatio(
          Math.max(
            inwardFacingScore,
            outwardFacingScore,
            clockwiseFlowScore,
            counterClockwiseFlowScore,
          ),
        ),
        radialUniformityScore,
        clockwiseFlowScore,
        counterClockwiseFlowScore,
        inwardFacingScore,
        outwardFacingScore,
        tangentialFlowScore,
        orientationModeDetected,
        possiblePattern: likelyPatternLabel({
          count: groupSymbols.length,
          spacingUniformityScore: spacing.spacingUniformityScore,
          radialUniformityScore,
          inwardFacingScore,
          outwardFacingScore,
          clockwiseFlowScore,
          counterClockwiseFlowScore,
          tangentialFlowScore,
        }),
      };
    })
    .filter((group) => group.count > 1);
}

function buildSpellSnapshot(
  symbols: DrawnSymbol[],
  circles: CircleComponent[],
  importedInkLayers: ImportedInkLayer[],
) {
  const symbolSnapshot = (symbol: DrawnSymbol, parent?: CircleComponent) => {
    const center = symbolCenter(symbol);
    const positionInParent = relativeToCircle(center, parent);
    const sizeInParent = symbolSizeInParent(symbol, parent);
    const orientationInParent = symbolOrientationGeometry(symbol, parent);

    return {
      id: symbol.id,
      kind: "spell-symbol",
      role: symbol.replacement?.reference.type ?? "freehand",
      reference: symbol.replacement
        ? {
            id: symbol.replacement.reference.id,
            name: symbol.replacement.reference.name,
            type: symbol.replacement.reference.type,
            category: symbol.replacement.reference.category,
            description: symbol.replacement.reference.description,
            spellsUsing: symbol.replacement.reference.spellsUsing,
          }
        : null,
      effect: symbol.replacement
        ? compilerEffect(symbol.replacement.reference)
        : {
            id: null,
            name: "Freehand symbol",
            kind: "freehand",
            category: "unknown",
            description: "Unidentified hand-drawn symbol. Identify or snap it to a known sign/sigil before compiling.",
            spellsUsing: [],
            compilerHint: {
              role: "unknown",
              operation: "unknown",
              readableSummary: "Unidentified hand-drawn symbol.",
            },
          },
      center: center
        ? {
            x: Number(center.x.toFixed(2)),
            y: Number(center.y.toFixed(2)),
          }
        : null,
      parentSpellId: parent?.id ?? null,
      positionInParent,
      sizeInParent,
      orientationInParent,
      localTransform: parent
        ? {
            position: positionInParent,
            size: sizeInParent,
            orientation: orientationInParent,
          }
        : null,
      rotationDegrees: orientationInParent.rotationDegrees,
      scale: symbol.scale,
      tweaks: symbol.tweaks,
      annotation: symbol.annotation ?? null,
      imported: symbol.imported ?? null,
      freehandMarkCount: symbol.marks.length,
    };
  };

  const spellSnapshot = (
    circle: CircleComponent,
    parent?: CircleComponent,
  ): Record<string, unknown> => {
    const childSpells = circles.filter(
      (item) => findParentCircleIdForCircle(item, circles) === circle.id,
    );
    const childSymbols = symbols.filter(
      (symbol) => symbolParentId(symbol, circles) === circle.id,
    );
    const repeatedSymbolGroups = analyzeSymbolGroups(childSymbols, circle);

    return {
      id: circle.id,
      kind: "spell",
      boundary: {
        center: {
          x: Number(circle.center.x.toFixed(2)),
          y: Number(circle.center.y.toFixed(2)),
        },
        radius: Number(circle.radius.toFixed(2)),
        sizeInParent: circleSizeInParent(circle, parent),
        rotation: circle.rotation,
        boundaryQuality: Number(circle.perfection.toFixed(3)),
        closed: circle.closed,
        sourcePointCount: circle.sourceStroke.length,
      },
      imported: circle.imported ?? null,
      parentSpellId: parent?.id ?? null,
      positionInParent: relativeToCircle(circle.center, parent),
      localTransform: parent
        ? {
            position: relativeToCircle(circle.center, parent),
            size: circleSizeInParent(circle, parent),
            rotation: circle.rotation,
          }
        : null,
      groupAnalysis: {
        repeatedSymbolGroups,
        hasRepeatedSymbols: repeatedSymbolGroups.length > 0,
        strongestPattern:
          repeatedSymbolGroups
            .slice()
            .sort(
              (left, right) =>
                right.orientationUniformityScore +
                right.spacingUniformityScore +
                right.radialUniformityScore -
                (left.orientationUniformityScore +
                  left.spacingUniformityScore +
                  left.radialUniformityScore),
            )[0] ?? null,
      },
      contents: {
        spells: childSpells.map((child) => spellSnapshot(child, circle)),
        symbols: childSymbols.map((symbol) => symbolSnapshot(symbol, circle)),
      },
    };
  };

  const rootSpells = circles.filter(
    (circle) => !findParentCircleIdForCircle(circle, circles),
  );
  const looseSymbols = symbols.filter(
    (symbol) => !symbolParentId(symbol, circles),
  );

  return {
    version: 1,
    canvas: {
      shape: "circle",
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      radius: CANVAS_RADIUS,
    },
    importedInkLayers: importedInkLayers.length,
    spells: rootSpells.map((circle) => spellSnapshot(circle)),
    looseSymbols: looseSymbols.map((symbol) => symbolSnapshot(symbol)),
  };
}

async function cachedImage(src: string, cache: Map<string, HTMLImageElement>) {
  const cached = cache.get(src);

  if (cached) {
    return cached;
  }

  const image = new window.Image();
  image.decoding = "async";
  image.src = src;
  await image.decode();
  cache.set(src, image);
  return image;
}
