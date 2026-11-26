export type ExperiencePhase =
  | 'cover'
  | 'opening'
  | 'vortex'
  | 'room'
  | 'star'
  | 'farewell';

export interface ProcessedLogoAssets {
  /** Transparent PNG data URL for crisp DOM rendering (wax seal & farewell card). */
  dataUrl: string;
  /** High-resolution transparent HTMLCanvasElement ready for THREE.CanvasTexture. */
  canvas: HTMLCanvasElement;
  /** Aspect ratio (width / height) of the tightly cropped logo. */
  aspect: number;
  /** Indicates whether the logo came from the uploaded image or procedural fallback. */
  source: 'uploaded' | 'fallback';
}

export interface TimelineSnapshot {
  phase: ExperiencePhase;
  /** Normalized progress [0..1] along the entire 3D ride (vortex -> chimney -> room -> star). */
  rideProgress: number;
  /** Normalized progress [0..1] during envelope opening transition. */
  openingProgress: number;
  /** Normalized portal radiance [0..1] for blending cover into the vortex. */
  portalGlow: number;
  /** Whether the camera has arrived at the final star close-up. */
  arrivedAtStar: boolean;
}
