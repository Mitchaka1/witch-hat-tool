import { describe, expect, it } from "vitest";
import { scoreCircleQuality, type TracePoint } from "@/lib/circleQuality";

function circlePoints({
  radius = 100,
  count = 96,
  start = 0,
  end = Math.PI * 2,
  wobble = 0,
}: {
  radius?: number;
  count?: number;
  start?: number;
  end?: number;
  wobble?: number;
} = {}): TracePoint[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = start + ((end - start) * index) / (count - 1);
    const adjustedRadius = radius + Math.sin(angle * 5) * wobble;
    return {
      x: 140 + Math.cos(angle) * adjustedRadius,
      y: 140 + Math.sin(angle) * adjustedRadius,
    };
  });
}

describe("scoreCircleQuality", () => {
  it("rates a closed, even ring as excellent", () => {
    const result = scoreCircleQuality(circlePoints());

    expect(result.acceptable).toBe(true);
    expect(result.score).toBeGreaterThan(0.9);
    expect(result.coverage).toBeGreaterThan(0.95);
  });

  it("allows a visibly hand-drawn but complete ring", () => {
    const result = scoreCircleQuality(circlePoints({ wobble: 12 }));

    expect(result.acceptable).toBe(true);
    expect(result.score).toBeGreaterThan(0.58);
    expect(result.score).toBeLessThan(0.95);
  });

  it("rejects an open arc even when its radius is consistent", () => {
    const result = scoreCircleQuality(
      circlePoints({ start: 0, end: Math.PI * 1.35 }),
    );

    expect(result.acceptable).toBe(false);
    expect(result.closure).toBeLessThan(0.5);
  });

  it("rejects a straight line", () => {
    const points = Array.from({ length: 60 }, (_, index) => ({
      x: 20 + index * 4,
      y: 120,
    }));

    const result = scoreCircleQuality(points);

    expect(result.acceptable).toBe(false);
    expect(result.score).toBeLessThan(0.4);
  });

  it("rejects traces with too few points", () => {
    const result = scoreCircleQuality([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);

    expect(result).toMatchObject({
      acceptable: false,
      score: 0,
    });
  });
});
