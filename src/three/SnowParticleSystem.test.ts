import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSnowInitialBuffers,
  getOptimalSnowCount,
  stepSnowParticles,
  type SnowBounds,
} from './SnowParticleSystem.ts';

const BOUNDS: SnowBounds = {
  minX: -9,
  maxX: 9,
  minY: -1.5,
  maxY: 13.0,
  minZ: -4,
  maxZ: 8,
};

test('getOptimalSnowCount scales down cleanly for mobile devices to sustain 60fps', () => {
  const mobileCover = getOptimalSnowCount(390, true, 'cover');
  const desktopCover = getOptimalSnowCount(1440, false, 'cover');
  const mobileRoom = getOptimalSnowCount(390, true, 'room');
  const desktopRoom = getOptimalSnowCount(1440, false, 'room');

  assert.ok(mobileCover > 0 && mobileCover < desktopCover);
  assert.ok(mobileRoom > 0 && mobileRoom < desktopRoom);
  assert.ok(mobileCover <= 120, 'mobile cover particle count should stay low for 60fps');
  assert.ok(mobileRoom <= 90, 'mobile room particle count should stay low for 60fps');
});

test('createSnowInitialBuffers initializes all particles strictly inside bounds', () => {
  const count = 64;
  const buffers = createSnowInitialBuffers(count, BOUNDS, 0.45, 1.2, 0.2, 991);

  assert.equal(buffers.positions.length, count * 3);
  assert.equal(buffers.speeds.length, count);

  for (let i = 0; i < count; i++) {
    const x = buffers.positions[i * 3];
    const y = buffers.positions[i * 3 + 1];
    const z = buffers.positions[i * 3 + 2];
    assert.ok(x >= BOUNDS.minX && x <= BOUNDS.maxX);
    assert.ok(y >= BOUNDS.minY && y <= BOUNDS.maxY);
    assert.ok(z >= BOUNDS.minZ && z <= BOUNDS.maxZ);
    assert.ok(buffers.speeds[i] >= 0.45 && buffers.speeds[i] <= 1.21);
  }
});

test('stepSnowParticles moves particles downward in-place and wraps seamlessly at minY', () => {
  const positions = new Float32Array([
    0.0, 5.0, 1.0,
    8.95, -1.4, 2.0,
  ]);
  const speeds = new Float32Array([1.0, 1.0]);
  const phases = new Float32Array([0.0, Math.PI / 2]);
  const swayAmps = new Float32Array([0.2, 0.5]);

  stepSnowParticles(positions, speeds, phases, swayAmps, BOUNDS, 0.2, 1.0);

  // First particle descends from 5.0 by 0.2 -> 4.8 and drifts horizontally
  assert.ok(Math.abs(positions[1] - 4.8) < 1e-5);
  assert.notEqual(positions[0], 0.0);
  assert.equal(positions[2], 1.0);

  // Second particle falls below minY (-1.4 - 0.2 = -1.6 < -1.5) and wraps to near maxY (12.9)
  assert.ok(positions[4] > 12.5 && positions[4] <= BOUNDS.maxY);
  // Horizontal wrap stays within [minX, maxX]
  assert.ok(positions[3] >= BOUNDS.minX && positions[3] <= BOUNDS.maxX);
});
