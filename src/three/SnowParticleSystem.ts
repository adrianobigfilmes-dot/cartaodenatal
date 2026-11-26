import * as THREE from 'three';

export interface SnowBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface SnowParticleConfig {
  count: number;
  bounds: SnowBounds;
  color: number;
  size: number;
  opacity: number;
  minSpeed: number;
  maxSpeed: number;
  swayAmplitude: number;
  map: THREE.Texture;
  seed?: number;
}

export interface SnowBuffers {
  positions: Float32Array;
  speeds: Float32Array;
  phases: Float32Array;
  swayAmps: Float32Array;
}

/**
 * Computes a mobile-optimized snow particle count so devices maintain a steady 60fps
 * with a single lightweight BufferGeometry draw call.
 */
export function getOptimalSnowCount(
  viewportWidth: number,
  isCoarsePointer: boolean,
  tier: 'cover' | 'room',
): number {
  const isMobile = isCoarsePointer || viewportWidth <= 768;
  if (tier === 'cover') {
    return isMobile ? 110 : 200;
  }
  return isMobile ? 75 : 130;
}

/**
 * Generates deterministic initial typed-array buffers for the falling snow particles.
 */
export function createSnowInitialBuffers(
  count: number,
  bounds: SnowBounds,
  minSpeed: number,
  maxSpeed: number,
  swayAmplitude: number,
  seed = 777,
): SnowBuffers {
  const safeCount = Math.max(1, Math.floor(count));
  const positions = new Float32Array(safeCount * 3);
  const speeds = new Float32Array(safeCount);
  const phases = new Float32Array(safeCount);
  const swayAmps = new Float32Array(safeCount);

  let state = Math.max(1, Math.floor(seed)) % 2147483647;
  const rand = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };

  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  const spanZ = bounds.maxZ - bounds.minZ;
  const speedSpan = Math.max(0.01, maxSpeed - minSpeed);

  for (let i = 0; i < safeCount; i++) {
    const i3 = i * 3;
    positions[i3] = bounds.minX + rand() * spanX;
    positions[i3 + 1] = bounds.minY + rand() * spanY;
    positions[i3 + 2] = bounds.minZ + rand() * spanZ;
    speeds[i] = minSpeed + rand() * speedSpan;
    phases[i] = rand() * Math.PI * 2;
    swayAmps[i] = swayAmplitude * (0.55 + rand() * 0.9);
  }

  return { positions, speeds, phases, swayAmps };
}

/**
 * Zero-allocation in-place simulation step for falling snow particles.
 * Updates X (gentle sinusoidal drift) and Y (gravity descent with seamless wrap-around).
 */
export function stepSnowParticles(
  positions: Float32Array,
  speeds: Float32Array,
  phases: Float32Array,
  swayAmps: Float32Array,
  bounds: SnowBounds,
  dt: number,
  elapsedTime: number,
): void {
  const count = speeds.length;
  const heightSpan = Math.max(0.001, bounds.maxY - bounds.minY);
  const widthSpan = Math.max(0.001, bounds.maxX - bounds.minX);
  const clampedDt = Math.max(0, Math.min(dt, 0.25));

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    let x = positions[i3] + Math.sin(elapsedTime * 0.72 + phases[i]) * swayAmps[i] * clampedDt;
    let y = positions[i3 + 1] - speeds[i] * clampedDt;

    if (y < bounds.minY) {
      const overshoot = (bounds.minY - y) % heightSpan;
      y = bounds.maxY - overshoot;
    }

    if (x < bounds.minX) {
      x += widthSpan;
    } else if (x > bounds.maxX) {
      x -= widthSpan;
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
  }
}

/**
 * Mobile-optimized Three.js falling snow system powered by a single BufferGeometry
 * (DynamicDrawUsage Float32Array) and a lightweight PointsMaterial.
 */
export class SnowParticleSystem {
  public readonly points: THREE.Points;
  public readonly count: number;

  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;
  private readonly positionAttr: THREE.BufferAttribute;
  private readonly positions: Float32Array;
  private readonly speeds: Float32Array;
  private readonly phases: Float32Array;
  private readonly swayAmps: Float32Array;
  private readonly bounds: SnowBounds;

  constructor(config: SnowParticleConfig) {
    this.count = Math.max(1, Math.floor(config.count));
    this.bounds = { ...config.bounds };

    const buffers = createSnowInitialBuffers(
      this.count,
      this.bounds,
      config.minSpeed,
      config.maxSpeed,
      config.swayAmplitude,
      config.seed ?? 777,
    );

    this.positions = buffers.positions;
    this.speeds = buffers.speeds;
    this.phases = buffers.phases;
    this.swayAmps = buffers.swayAmps;

    this.geometry = new THREE.BufferGeometry();
    this.positionAttr = new THREE.BufferAttribute(this.positions, 3);
    this.positionAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.positionAttr);

    // Lightweight PointsMaterial without lighting calculations for steady 60fps on mobile GPUs
    this.material = new THREE.PointsMaterial({
      color: config.color,
      map: config.map,
      size: config.size,
      sizeAttenuation: true,
      transparent: true,
      opacity: config.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      alphaTest: 0.01,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  public setVisible(visible: boolean): void {
    this.points.visible = visible;
  }

  public get visible(): boolean {
    return this.points.visible;
  }

  public update(dt: number, elapsedTime: number): void {
    if (!this.points.visible) return;
    stepSnowParticles(
      this.positions,
      this.speeds,
      this.phases,
      this.swayAmps,
      this.bounds,
      dt,
      elapsedTime,
    );
    this.positionAttr.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
