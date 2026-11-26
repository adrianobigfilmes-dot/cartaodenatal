import type { ExperiencePhase, TimelineSnapshot } from '../types/experience';

export interface Vec3Tuple {
  x: number;
  y: number;
  z: number;
}

/**
 * Snappy, fluid 4-flap envelope opening seamlessly launching straight into the roller-coaster vortex
 * with continuous forward momentum (zero pause after the flaps open!).
 */
export const OPENING_DURATION_SEC = 1.45;
export const RIDE_DURATION_SEC = 8.6;

/** Key architectural anchor positions shared between the 3D scene and camera path. */
export const SCENE_ANCHORS = {
  /** Brick fireplace hearth archway built into the front wall of the living room where the vortex opens horizontally. */
  fireplacePortal: { x: 0.0, y: 0.0, z: 9.8 } as Vec3Tuple,
  /** Grand photorealistic Christmas tree standing at the heart of the decorated living room. */
  treeBase: { x: 0.0, y: 0.0, z: -3.2 } as Vec3Tuple,
  /** Hero TRACT Cobalt Blue 3D Star topper crowning the tree. */
  starCenter: { x: 0.0, y: 6.62, z: -3.2 } as Vec3Tuple,
};

/**
 * Control points for the continuous, stutter-free CatmullRomCurve3 POV flight:
 * - Points 0..11 (z = +118 -> +11.4): Extended, exhilarating 106m spiraling roller-coaster vortex
 *   with steep climbs, thrilling drops, and sweeping banked S-turns pointing straight into the
 *   glowing brick fireplace hearth opening.
 * - Points 11..13 (z = +11.4 -> +6.6): Gliding horizontally straight out of the brick fireplace
 *   into the grand, fully furnished 3D Christmas living room.
 * - Points 13..18 (z = +6.6 -> -0.05): Panoramic architectural tour sweeping gracefully past the
 *   tufted sofa, leather armchair, candlelit coffee table, paneled doors, and snowy winter windows
 *   before rising smoothly up to a close-up of the organic TRACT star.
 */
export const CAMERA_PATH_POINTS: readonly Vec3Tuple[] = [
  // Broad, ultra-fluid sweeping vortex S-curves (wide curvature radii for cinema-dolly smoothness!)
  { x: 0.0, y: 1.9, z: 118.0 },
  { x: 1.9, y: 2.75, z: 108.0 },
  { x: 3.6, y: 3.05, z: 98.0 },
  { x: 3.4, y: 2.1, z: 88.0 },
  { x: 1.2, y: 0.9, z: 78.0 },
  { x: -1.8, y: 0.85, z: 68.0 },
  { x: -3.8, y: 1.9, z: 58.0 },
  { x: -3.5, y: 3.05, z: 48.0 },
  { x: -1.1, y: 2.95, z: 38.5 },
  { x: 1.7, y: 1.85, z: 29.0 },
  { x: 2.0, y: 1.5, z: 20.5 },
  // Effortless long glide straightening directly into the glowing brick fireplace hearth opening
  { x: 0.58, y: 1.68, z: 14.2 },
  { x: 0.0, y: 1.74, z: 11.2 },
  // Gliding horizontally straight out of the brick firebox into the grand living room
  { x: 0.0, y: 1.82, z: 8.2 },
  { x: 1.45, y: 2.32, z: 5.5 },
  // Sweeping wide architectural arc showcasing sofa, armchair, doors, snowy windows, coffee table & tree
  { x: 1.95, y: 2.95, z: 3.1 },
  { x: 1.25, y: 4.05, z: 1.65 },
  { x: 0.44, y: 5.38, z: 0.72 },
  { x: 0.1, y: 6.24, z: 0.18 },
  // Final serene close-up directly in front of the steady TRACT star
  { x: 0.0, y: 6.52, z: -0.15 },
];

export function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Single C-infinity smooth cubic velocity profile across the ENTIRE journey (zero piecewise seams!):
 * - Effortless continuous glide right out of the unfolding envelope (no pause)
 * - Sustained, silky flowing cruise through the sweeping vortex curves
 * - Velvety zero-jerk deceleration through the fireplace across the living room to the TRACT star
 */
export function mapRideTimeToCurveU(normalizedTime: number): number {
  const t = clamp01(normalizedTime);
  const inv = 1 - t;
  return clamp01(1 - inv * inv * (1 + 1.51 * t));
}

/**
 * Evaluates the continuous experience state from elapsed seconds since clicking the wax seal.
 * During `opening`, `rideProgress` immediately accelerates inside the live 3D vortex so
 * unfolding the 4 flaps flows seamlessly into the roller-coaster flight without any pause.
 */
export function evaluateTimeline(
  elapsedSinceOpenSec: number,
  isOpenRequested: boolean,
  isFarewell: boolean,
): TimelineSnapshot {
  if (isFarewell) {
    return {
      phase: 'farewell',
      rideProgress: 1,
      openingProgress: 1,
      portalGlow: 0,
      arrivedAtStar: true,
    };
  }

  if (!isOpenRequested) {
    return {
      phase: 'cover',
      rideProgress: 0,
      openingProgress: 0,
      portalGlow: 0,
      arrivedAtStar: false,
    };
  }

  const totalRideWindow = OPENING_DURATION_SEC + RIDE_DURATION_SEC;

  if (elapsedSinceOpenSec < OPENING_DURATION_SEC) {
    const openingProgress = clamp01(elapsedSinceOpenSec / OPENING_DURATION_SEC);
    const rideProgress = mapRideTimeToCurveU(
      clamp01(elapsedSinceOpenSec / totalRideWindow),
    );
    return {
      phase: 'opening',
      rideProgress,
      openingProgress,
      portalGlow: 0,
      arrivedAtStar: false,
    };
  }

  const rawTotalT = clamp01(elapsedSinceOpenSec / totalRideWindow);
  const rideProgress = mapRideTimeToCurveU(rawTotalT);

  if (rawTotalT >= 1) {
    return {
      phase: 'star',
      rideProgress: 1,
      openingProgress: 1,
      portalGlow: 0,
      arrivedAtStar: true,
    };
  }

  // u < 0.745: inside spiraling roller-coaster vortex; u >= 0.745: emerging into grand living room
  const phase: ExperiencePhase = rideProgress < 0.745 ? 'vortex' : 'room';
  return {
    phase,
    rideProgress,
    openingProgress: 1,
    portalGlow: 0,
    arrivedAtStar: false,
  };
}

/**
 * Computes graceful, fluid lateral roll (banking) angle in radians from lateral curvature.
 * Gently leans into sweeping vortex arcs and levels out smoothly before entering the fireplace.
 */
export function computeBankingAngle(
  lateralTurnSignal: number,
  rideProgress: number,
): number {
  const startWeight = smoothstep(0.02, 0.14, rideProgress);
  const vortexWeight = 1 - smoothstep(0.58, 0.74, rideProgress);
  const clampedTurn = Math.max(-1, Math.min(1, lateralTurnSignal));
  return clampedTurn * 0.32 * startWeight * vortexWeight;
}

/**
 * Dynamic FOV modulation: gentle, fluid lens breathing through the vortex,
 * settling smoothly into a crisp architectural lens in the living room and close-up on the TRACT star.
 */
export function computeDynamicFov(rideProgress: number, aspect: number): number {
  const isPortrait = aspect < 0.85;
  const baseFov = isPortrait ? 60 : 50;
  const speedBoost =
    smoothstep(0.0, 0.22, rideProgress) *
    (1 - smoothstep(0.62, 0.92, rideProgress)) *
    11;
  return baseFov + speedBoost;
}

/**
 * Computes the final responsive camera position & look target for Scene 3 (Star close-up)
 * so the TRACT star sits framed cleanly above the bottom serif greeting & buttons
 * on both vertical phones (390x844) and desktop monitors (1440x900).
 */
export function computeStarCloseupFrame(aspect: number): {
  cameraPos: Vec3Tuple;
  lookTarget: Vec3Tuple;
} {
  const star = SCENE_ANCHORS.starCenter;
  if (aspect < 0.85) {
    return {
      cameraPos: { x: star.x, y: star.y - 0.14, z: star.z + 5.15 },
      lookTarget: { x: star.x, y: star.y - 0.54, z: star.z },
    };
  }
  if (aspect < 1.25) {
    return {
      cameraPos: { x: star.x, y: star.y - 0.12, z: star.z + 3.55 },
      lookTarget: { x: star.x, y: star.y - 0.36, z: star.z },
    };
  }
  return {
    cameraPos: { x: star.x, y: star.y - 0.1, z: star.z + 3.4 },
    lookTarget: { x: star.x, y: star.y - 0.36, z: star.z },
  };
}
