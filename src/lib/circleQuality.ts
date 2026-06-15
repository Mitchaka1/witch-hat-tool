export type TracePoint = {
  x: number;
  y: number;
};

export type CircleQualityResult = {
  score: number;
  acceptable: boolean;
  roundness: number;
  closure: number;
  coverage: number;
};

const MINIMUM_POINTS = 12;
const ACCEPTABLE_SCORE = 0.58;

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function scoreCircleQuality(
  points: readonly TracePoint[],
): CircleQualityResult {
  if (points.length < MINIMUM_POINTS) {
    return {
      score: 0,
      acceptable: false,
      roundness: 0,
      closure: 0,
      coverage: 0,
    };
  }

  const center = points.reduce(
    (total, point) => ({
      x: total.x + point.x / points.length,
      y: total.y + point.y / points.length,
    }),
    { x: 0, y: 0 },
  );
  const radii = points.map((point) =>
    Math.hypot(point.x - center.x, point.y - center.y),
  );
  const meanRadius =
    radii.reduce((total, radius) => total + radius, 0) / radii.length;

  if (meanRadius < 8) {
    return {
      score: 0,
      acceptable: false,
      roundness: 0,
      closure: 0,
      coverage: 0,
    };
  }

  const radiusVariance =
    radii.reduce(
      (total, radius) => total + Math.pow(radius - meanRadius, 2),
      0,
    ) / radii.length;
  const normalizedDeviation = Math.sqrt(radiusVariance) / meanRadius;
  const roundness = clamp(1 - normalizedDeviation / 0.22);

  const first = points[0];
  const last = points[points.length - 1];
  const endpointDistance = Math.hypot(last.x - first.x, last.y - first.y);
  const closure = clamp(1 - endpointDistance / (meanRadius * 0.7));

  const occupiedAngleBins = new Set(
    points.map((point) => {
      const angle = Math.atan2(point.y - center.y, point.x - center.x);
      const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle;
      return Math.min(35, Math.floor((normalizedAngle / (Math.PI * 2)) * 36));
    }),
  );
  const coverage = occupiedAngleBins.size / 36;
  const score = clamp(roundness * 0.55 + closure * 0.25 + coverage * 0.2);

  return {
    score,
    acceptable:
      score >= ACCEPTABLE_SCORE && closure >= 0.42 && coverage >= 0.72,
    roundness,
    closure,
    coverage,
  };
}

export function qualityLabel(score: number) {
  if (score >= 0.9) return "Masterwork";
  if (score >= 0.78) return "Precise";
  if (score >= 0.68) return "Steady";
  if (score >= ACCEPTABLE_SCORE) return "Usable";
  return "Unstable";
}
