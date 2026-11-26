import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMERA_PATH_POINTS,
  OPENING_DURATION_SEC,
  RIDE_DURATION_SEC,
  computeBankingAngle,
  computeDynamicFov,
  computeStarCloseupFrame,
  evaluateTimeline,
  mapRideTimeToCurveU,
} from './timeline';
import { processLogoPixels } from './logoProcessor';

test('timeline starts in cover state before opening is triggered', () => {
  const snap = evaluateTimeline(0, false, false);
  assert.equal(snap.phase, 'cover');
  assert.equal(snap.rideProgress, 0);
  assert.equal(snap.openingProgress, 0);
  assert.equal(snap.arrivedAtStar, false);
});

test('timeline transitions smoothly from opening to vortex, room, star, and farewell', () => {
  const opening = evaluateTimeline(OPENING_DURATION_SEC * 0.6, true, false);
  assert.equal(opening.phase, 'opening');
  assert.equal(opening.portalGlow, 0, 'no flash veil cut during 4-flap opening');
  assert.ok(opening.rideProgress > 0 && opening.rideProgress < 0.14);

  const vortex = evaluateTimeline(OPENING_DURATION_SEC + RIDE_DURATION_SEC * 0.25, true, false);
  assert.equal(vortex.phase, 'vortex');
  assert.ok(vortex.rideProgress > 0.1 && vortex.rideProgress < 0.745);

  const room = evaluateTimeline(OPENING_DURATION_SEC + RIDE_DURATION_SEC * 0.8, true, false);
  assert.equal(room.phase, 'room');
  assert.ok(room.rideProgress >= 0.745 && room.rideProgress < 1);

  const star = evaluateTimeline(OPENING_DURATION_SEC + RIDE_DURATION_SEC + 0.5, true, false);
  assert.equal(star.phase, 'star');
  assert.equal(star.rideProgress, 1);
  assert.equal(star.arrivedAtStar, true);

  const farewell = evaluateTimeline(OPENING_DURATION_SEC + RIDE_DURATION_SEC + 1, true, true);
  assert.equal(farewell.phase, 'farewell');
});

test('roller-coaster curve u mapping is monotonic at endpoints and clamped to [0, 1]', () => {
  assert.equal(mapRideTimeToCurveU(-0.5), 0);
  assert.equal(mapRideTimeToCurveU(0), 0);
  assert.equal(mapRideTimeToCurveU(1), 1);
  assert.equal(mapRideTimeToCurveU(1.5), 1);

  let prev = -1;
  let prevDelta: number | null = null;
  for (let i = 0; i <= 40; i++) {
    const u = mapRideTimeToCurveU(i / 40);
    assert.ok(u >= prev - 0.001, `expected monotonic progress at step ${i}`);
    if (prev >= 0) {
      const delta = u - prev;
      if (prevDelta !== null) {
        assert.ok(
          Math.abs(delta - prevDelta) < 0.004,
          `expected C1-smooth velocity without jumps at step ${i}`,
        );
      }
      prevDelta = delta;
    }
    prev = u;
  }
});

test('banking angle tilts in vortex and levels to zero at the star', () => {
  const inVortex = computeBankingAngle(0.8, 0.25);
  const atStar = computeBankingAngle(0.8, 0.95);
  assert.ok(inVortex > 0.15);
  assert.equal(atStar, 0);
});

test('responsive star close-up adapts distance for mobile portrait vs desktop landscape', () => {
  const mobile = computeStarCloseupFrame(390 / 844);
  const desktop = computeStarCloseupFrame(1440 / 900);
  assert.ok(mobile.cameraPos.z > desktop.cameraPos.z, 'mobile portrait steps back slightly to fit star cleanly');
  assert.ok(computeDynamicFov(0.3, 1440 / 900) > computeDynamicFov(1.0, 1440 / 900));
  assert.ok(CAMERA_PATH_POINTS.length >= 12);
});

test('processLogoPixels removes white background while preserving blue A and dark text', () => {
  const w = 10;
  const h = 10;
  const data = new Uint8ClampedArray(w * h * 4);
  // Fill entire image with pure white
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = 255;
    data[i * 4 + 1] = 255;
    data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 255;
  }
  // Draw a cobalt-blue "A" pixel in the center (5, 5)
  const centerIdx = (5 * w + 5) * 4;
  data[centerIdx] = 31;
  data[centerIdx + 1] = 78;
  data[centerIdx + 2] = 121;
  data[centerIdx + 3] = 255;

  const result = processLogoPixels(data, w, h);
  assert.equal(result.backgroundType, 'white');
  assert.equal(data[3], 0, 'white corner becomes transparent');
  assert.equal(data[centerIdx + 3], 255, 'blue logo pixel remains opaque');
  assert.ok(result.cropW <= 5 && result.cropH <= 5, 'bounding box tightly crops around logo');
});

test('processLogoPixels removes dark navy background while preserving white letters and blue A', () => {
  const w = 10;
  const h = 10;
  const data = new Uint8ClampedArray(w * h * 4);
  // Fill with dark navy background matching uploaded TRACT logo card (#1D2636)
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = 29;
    data[i * 4 + 1] = 38;
    data[i * 4 + 2] = 54;
    data[i * 4 + 3] = 255;
  }
  // Draw white letter pixel at (4, 5) and cobalt-blue "A" pixel at (5, 5)
  const whiteIdx = (5 * w + 4) * 4;
  data[whiteIdx] = 218;
  data[whiteIdx + 1] = 220;
  data[whiteIdx + 2] = 224;
  data[whiteIdx + 3] = 255;

  const blueIdx = (5 * w + 5) * 4;
  data[blueIdx] = 48;
  data[blueIdx + 1] = 107;
  data[blueIdx + 2] = 179;
  data[blueIdx + 3] = 255;

  const result = processLogoPixels(data, w, h);
  assert.equal(result.backgroundType, 'dark');
  assert.equal(data[3], 0, 'dark navy corner becomes transparent');
  assert.equal(data[whiteIdx + 3], 255, 'silver-white letter remains opaque');
  assert.equal(data[blueIdx + 3], 255, 'cobalt-blue A remains opaque');
});
