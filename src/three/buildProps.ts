import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ProceduralTextureSet } from '../utils/proceduralTextures';

export interface SharedHolidayMaterials {
  goldMetal: THREE.MeshPhysicalMaterial;
  velvetRed: THREE.MeshPhysicalMaterial;
  tractCobalt: THREE.MeshPhysicalMaterial;
  tractNavy: THREE.MeshStandardMaterial;
  pineGreen: THREE.MeshPhysicalMaterial;
  pineDark: THREE.MeshPhysicalMaterial;
  snowWhite: THREE.MeshStandardMaterial;
  candyCane: THREE.MeshPhysicalMaterial;
  crystalSnowflake: THREE.MeshPhysicalMaterial;
  woodMantle: THREE.MeshStandardMaterial;
  brick: THREE.MeshStandardMaterial;
  warmFlameOuter: THREE.MeshBasicMaterial;
  warmFlameInner: THREE.MeshBasicMaterial;
  giftWrapBase: THREE.CanvasTexture;
  giftBumpBase: THREE.CanvasTexture;
  goldRoughnessBase: THREE.CanvasTexture;
  goldBumpBase: THREE.CanvasTexture;
  dispose: () => void;
}

export function createSharedHolidayMaterials(
  textures: ProceduralTextureSet,
): SharedHolidayMaterials {
  const goldMetal = new THREE.MeshPhysicalMaterial({
    color: 0xe6c14c,
    metalness: 0.94,
    roughness: 0.22,
    roughnessMap: textures.goldRoughnessMap,
    bumpMap: textures.goldBumpMap,
    bumpScale: 0.015,
    clearcoat: 0.4,
    clearcoatRoughness: 0.14,
  });

  const velvetRed = new THREE.MeshPhysicalMaterial({
    color: 0x8e151a,
    metalness: 0.04,
    roughness: 0.76,
    sheen: 1.0,
    sheenRoughness: 0.52,
    sheenColor: new THREE.Color(0xff5a5a),
    bumpMap: textures.giftBumpMap,
    bumpScale: 0.014,
  });

  const tractCobalt = new THREE.MeshPhysicalMaterial({
    color: 0x1f4e79,
    metalness: 0.42,
    roughness: 0.18,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    emissive: 0x12385f,
    emissiveIntensity: 0.45,
  });

  const tractNavy = new THREE.MeshStandardMaterial({
    color: 0x112542,
    metalness: 0.2,
    roughness: 0.42,
  });

  const pineGreen = new THREE.MeshPhysicalMaterial({
    color: 0x6ea680,
    map: textures.pineColorMap,
    bumpMap: textures.pineBumpMap,
    bumpScale: 0.11,
    metalness: 0.02,
    roughness: 0.78,
    sheen: 0.16,
    sheenRoughness: 0.74,
    sheenColor: new THREE.Color(0x528f6a),
  });

  const pineDark = new THREE.MeshPhysicalMaterial({
    color: 0x426b50,
    map: textures.pineColorMap,
    bumpMap: textures.pineBumpMap,
    bumpScale: 0.11,
    metalness: 0.02,
    roughness: 0.84,
    sheen: 0.1,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color(0x2f5940),
  });

  const snowWhite = new THREE.MeshStandardMaterial({
    color: 0xf4f7fc,
    metalness: 0.04,
    roughness: 0.48,
    emissive: 0x263b5a,
    emissiveIntensity: 0.14,
  });

  const candyCane = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: textures.candyStripeMap,
    metalness: 0.08,
    roughness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  const crystalSnowflake = new THREE.MeshPhysicalMaterial({
    color: 0xf2f8ff,
    metalness: 0.35,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    emissive: 0x6cb4ff,
    emissiveIntensity: 0.42,
  });

  const woodMantle = new THREE.MeshStandardMaterial({
    color: 0x452616,
    metalness: 0.06,
    roughness: 0.52,
    bumpMap: textures.woodFloorBump,
    bumpScale: 0.025,
  });

  const brick = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.brickMap,
    bumpMap: textures.brickBump,
    bumpScale: 0.065,
    metalness: 0.04,
    roughness: 0.86,
  });

  const warmFlameOuter = new THREE.MeshBasicMaterial({
    color: 0xff6e1c,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const warmFlameInner = new THREE.MeshBasicMaterial({
    color: 0xffe494,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const all = [
    goldMetal,
    velvetRed,
    tractCobalt,
    tractNavy,
    pineGreen,
    pineDark,
    snowWhite,
    candyCane,
    crystalSnowflake,
    woodMantle,
    brick,
    warmFlameOuter,
    warmFlameInner,
  ];

  return {
    goldMetal,
    velvetRed,
    tractCobalt,
    tractNavy,
    pineGreen,
    pineDark,
    snowWhite,
    candyCane,
    crystalSnowflake,
    woodMantle,
    brick,
    warmFlameOuter,
    warmFlameInner,
    giftWrapBase: textures.giftWrapMap,
    giftBumpBase: textures.giftBumpMap,
    goldRoughnessBase: textures.goldRoughnessMap,
    goldBumpBase: textures.goldBumpMap,
    dispose: () => {
      all.forEach((m) => m.dispose());
    },
  };
}

/**
 * 1. Photorealistic Blown-Glass Lacquered Bauble Ornament (high-segment clearcoat sphere + fluted brass crown).
 */
export function createBaubleGroup(
  materials: SharedHolidayMaterials,
  colorHex: number,
  radius = 0.42,
): THREE.Group {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: colorHex,
    metalness: 0.86,
    roughness: 0.09,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    bumpMap: materials.goldBumpBase,
    bumpScale: 0.004,
    emissive: colorHex,
    emissiveIntensity: 0.12,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 22), bodyMat);
  group.add(sphere);

  const band = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.996, radius * 0.045, 10, 32),
    materials.goldMetal,
  );
  band.rotation.x = Math.PI / 2;
  group.add(band);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.22, radius * 0.3, radius * 0.24, 16),
    materials.goldMetal,
  );
  cap.position.y = radius * 0.96;
  group.add(cap);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.16, radius * 0.03, 8, 20),
    materials.goldMetal,
  );
  ring.position.y = radius * 1.18;
  group.add(ring);

  return group;
}

/**
 * 2. Sculpted Brushed-Gold Christmas Bell with Velvet Bow.
 */
export function createBellGroup(
  materials: SharedHolidayMaterials,
  scale = 1,
): THREE.Group {
  const group = new THREE.Group();

  const profile = [
    new THREE.Vector2(0.0, 0.56),
    new THREE.Vector2(0.14, 0.54),
    new THREE.Vector2(0.24, 0.38),
    new THREE.Vector2(0.32, 0.12),
    new THREE.Vector2(0.45, -0.22),
    new THREE.Vector2(0.52, -0.34),
    new THREE.Vector2(0.46, -0.36),
  ];
  const bellMesh = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 32),
    materials.goldMetal,
  );
  group.add(bellMesh);

  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.035, 10, 32),
    materials.goldMetal,
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.y = -0.34;
  group.add(lip);

  const clapper = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 16, 12),
    materials.goldMetal,
  );
  clapper.position.y = -0.36;
  group.add(clapper);

  const topLoop = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.028, 8, 18),
    materials.goldMetal,
  );
  topLoop.position.y = 0.63;
  group.add(topLoop);

  const bowLeft = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.045, 8, 18),
    materials.velvetRed,
  );
  bowLeft.position.set(-0.14, 0.56, 0.06);
  bowLeft.rotation.y = 0.35;
  group.add(bowLeft);

  const bowRight = bowLeft.clone();
  bowRight.position.x = 0.14;
  bowRight.rotation.y = -0.35;
  group.add(bowRight);

  group.scale.setScalar(scale);
  return group;
}

/**
 * 3. Faceted Crystal 3D Snowflake Ornament.
 */
export function createSnowflakeGroup(
  materials: SharedHolidayMaterials,
  scale = 1,
): THREE.Group {
  const group = new THREE.Group();
  const armGeo = new THREE.CylinderGeometry(0.026, 0.036, 1.12, 6);
  const barbGeo = new THREE.CylinderGeometry(0.018, 0.026, 0.34, 6);

  const hub = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.17, 1),
    materials.crystalSnowflake,
  );
  group.add(hub);

  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI) / 3;
    const arm = new THREE.Mesh(armGeo, materials.crystalSnowflake);
    arm.rotation.z = angle;
    group.add(arm);

    for (const dir of [-1, 1]) {
      const barbA = new THREE.Mesh(barbGeo, materials.crystalSnowflake);
      barbA.position.set(
        -Math.sin(angle) * dir * 0.34,
        Math.cos(angle) * dir * 0.34,
        0,
      );
      barbA.rotation.z = angle + Math.PI / 4;
      group.add(barbA);

      const barbB = new THREE.Mesh(barbGeo, materials.crystalSnowflake);
      barbB.position.set(
        -Math.sin(angle) * dir * 0.34,
        Math.cos(angle) * dir * 0.34,
        0,
      );
      barbB.rotation.z = angle - Math.PI / 4;
      group.add(barbB);
    }
  }

  group.scale.setScalar(scale);
  return group;
}

/**
 * 4. Luxury Satin-Wrapped Holiday Gift Box (damask weave + bump map + brushed gold bow).
 */
export function createGiftBoxGroup(
  materials: SharedHolidayMaterials,
  boxColorHex: number,
  ribbonMat: THREE.Material,
  w = 0.72,
  h = 0.62,
  d = 0.72,
): THREE.Group {
  const group = new THREE.Group();

  const paperMat = new THREE.MeshPhysicalMaterial({
    color: boxColorHex,
    map: materials.giftWrapBase,
    bumpMap: materials.giftBumpBase,
    bumpScale: 0.018,
    metalness: 0.14,
    roughness: 0.42,
    sheen: 0.5,
    sheenRoughness: 0.48,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.84, d), paperMat);
  body.position.y = h * 0.42;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.07, h * 0.2, d * 1.07),
    paperMat,
  );
  lid.position.y = h * 0.9;
  lid.castShadow = true;
  group.add(lid);

  const ribbonX = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.09, h * 1.01, w * 0.16),
    ribbonMat,
  );
  ribbonX.position.y = h * 0.505;
  group.add(ribbonX);

  const ribbonZ = new THREE.Mesh(
    new THREE.BoxGeometry(d * 0.16, h * 1.01, d * 1.09),
    ribbonMat,
  );
  ribbonZ.position.y = h * 0.505;
  group.add(ribbonZ);

  const loopGeo = new THREE.TorusGeometry(w * 0.16, w * 0.042, 8, 18);
  const loop1 = new THREE.Mesh(loopGeo, ribbonMat);
  loop1.position.set(-w * 0.14, h * 1.08, 0);
  loop1.rotation.set(0.25, 0.4, 0.35);
  group.add(loop1);

  const loop2 = new THREE.Mesh(loopGeo, ribbonMat);
  loop2.position.set(w * 0.14, h * 1.08, 0);
  loop2.rotation.set(0.25, -0.4, -0.35);
  group.add(loop2);

  return group;
}

/**
 * 5. Glossy Porcelain Candy Cane.
 */
export function createCandyCaneGroup(
  materials: SharedHolidayMaterials,
  scale = 1,
): THREE.Group {
  const group = new THREE.Group();

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.68, 0),
    new THREE.Vector3(0, 0.18, 0),
    new THREE.Vector3(0.05, 0.46, 0),
    new THREE.Vector3(0.24, 0.56, 0),
    new THREE.Vector3(0.4, 0.42, 0),
    new THREE.Vector3(0.41, 0.22, 0),
  ]);

  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 32, 0.085, 14, false),
    materials.candyCane,
  );
  group.add(tube);

  const capGeo = new THREE.SphereGeometry(0.085, 12, 10);
  const bottomCap = new THREE.Mesh(capGeo, materials.snowWhite);
  bottomCap.position.set(0, -0.68, 0);
  group.add(bottomCap);

  const hookCap = new THREE.Mesh(capGeo, materials.snowWhite);
  hookCap.position.set(0.41, 0.22, 0);
  group.add(hookCap);

  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.105, 0.025, 8, 16),
    materials.goldMetal,
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.02, 0);
  group.add(collar);

  group.scale.setScalar(scale);
  return group;
}

export interface FireplacePortalRig {
  group: THREE.Group;
  flames: THREE.Mesh[];
  fireLight: THREE.PointLight;
}

/**
 * 6. Open-Passage Cozy Brick Fireplace Portal (NO vertical chimney crawl!).
 * Built into the front wall at z = +9.8 so the vortex opens HORIZONTALLY straight
 * through the glowing brick hearth opening into the decorated Christmas living room!
 */
export function createFireplacePortalGroup(
  materials: SharedHolidayMaterials,
): FireplacePortalRig {
  const group = new THREE.Group();

  // Wide solid brick surround piers flanking the open hearth passage (clear central opening: x ∈ [-1.95, +1.95], y ∈ [0.14, 3.1])
  // Generous outer width (x ∈ [-6.15, +6.15]) completely seals the circular vortex exit with zero side gaps!
  const pierGeo = new THREE.BoxGeometry(4.2, 3.4, 2.2);
  const pierLeft = new THREE.Mesh(pierGeo, materials.brick);
  pierLeft.position.set(-4.05, 1.7, 0.1);
  pierLeft.castShadow = true;
  pierLeft.receiveShadow = true;
  group.add(pierLeft);

  const pierRight = new THREE.Mesh(pierGeo, materials.brick);
  pierRight.position.set(4.05, 1.7, 0.1);
  pierRight.castShadow = true;
  pierRight.receiveShadow = true;
  group.add(pierRight);

  // Heavy brick lintel & upper chimney breast spanning cleanly over the archway (y = 3.1 -> 8.9)
  const upperBreast = new THREE.Mesh(
    new THREE.BoxGeometry(12.4, 5.8, 2.22),
    materials.brick,
  );
  upperBreast.position.set(0, 6.0, 0.1);
  upperBreast.castShadow = true;
  group.add(upperBreast);

  // Solid brick hearth apron & deep foundation underneath (y = -3.1 -> +0.14) so ZERO void ever shows beneath the hearth!
  const hearthSlab = new THREE.Mesh(
    new THREE.BoxGeometry(12.4, 3.24, 3.6),
    materials.brick,
  );
  hearthSlab.position.set(0, -1.48, 0.25);
  hearthSlab.receiveShadow = true;
  group.add(hearthSlab);

  // Carved dark-oak mantelpiece shelf spanning cleanly above the brick hearth opening
  const mantle = new THREE.Mesh(
    new THREE.BoxGeometry(7.6, 0.28, 2.65),
    materials.woodMantle,
  );
  mantle.position.set(0, 3.32, 0.12);
  mantle.castShadow = true;
  mantle.receiveShadow = true;
  group.add(mantle);

  // Lush evergreen pine garland draped along the mantelpiece facing the incoming viewer (+Z)
  const garlandCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.2, 3.24, 1.12),
    new THREE.Vector3(-1.6, 2.98, 1.18),
    new THREE.Vector3(0.0, 3.18, 1.14),
    new THREE.Vector3(1.6, 2.98, 1.18),
    new THREE.Vector3(3.2, 3.24, 1.12),
  ]);
  const garland = new THREE.Mesh(
    new THREE.TubeGeometry(garlandCurve, 32, 0.14, 8, false),
    materials.pineGreen,
  );
  group.add(garland);

  for (let i = 0; i < 9; i++) {
    const pt = garlandCurve.getPoint(i / 8);
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 12, 10),
      i % 2 === 0 ? materials.goldMetal : materials.velvetRed,
    );
    bead.position.copy(pt);
    bead.position.z += 0.1;
    group.add(bead);
  }

  // Velvet Christmas stockings hanging safely on the left & right brick piers (never blocking center passage)
  for (const sx of [-2.45, 2.45]) {
    const stocking = new THREE.Group();
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.1, 0.44, 12),
      materials.velvetRed,
    );
    const cuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.135, 0.135, 0.12, 12),
      materials.snowWhite,
    );
    cuff.position.y = 0.22;
    const foot = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.095, 0.14, 4, 8),
      materials.velvetRed,
    );
    foot.rotation.z = sx < 0 ? -Math.PI / 2 : Math.PI / 2;
    foot.position.set(sx < 0 ? 0.08 : -0.08, -0.2, 0);
    stocking.add(leg, cuff, foot);
    stocking.position.set(sx, 2.72, 1.12);
    group.add(stocking);
  }

  // Warm flickering embers & hearth flames tucked neatly along the lower left & right sides of the firebox
  const flames: THREE.Mesh[] = [];
  const logGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.9, 8);
  for (const side of [-1, 1]) {
    const log = new THREE.Mesh(logGeo, materials.woodMantle);
    log.rotation.set(0.15, 0.4 * side, Math.PI / 2);
    log.position.set(side * 1.48, 0.22, 0.1);
    group.add(log);

    const outer = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.62, 8),
      materials.warmFlameOuter,
    );
    outer.position.set(side * 1.48, 0.52, 0.12);
    group.add(outer);
    flames.push(outer);

    const inner = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.42, 8),
      materials.warmFlameInner,
    );
    inner.position.set(side * 1.46, 0.44, 0.14);
    group.add(inner);
    flames.push(inner);
  }

  // Warm cozy flickering firelight spilling both into the vortex mouth and across the oak living room floor
  const fireLight = new THREE.PointLight(0xff8c3d, 7.0, 16, 1.45);
  fireLight.position.set(0, 1.4, -0.8);
  group.add(fireLight);

  return { group, flames, fireLight };
}

export interface ChristmasTreeRig {
  group: THREE.Group;
  fairyLightsMesh: THREE.InstancedMesh;
  fairyGlowsMesh: THREE.InstancedMesh;
  fairyBaseColors: THREE.Color[];
  fairyPhases: number[];
}

/**
 * 7. Photorealistic Grand Illuminated Christmas Tree (bottom-center pivot at y = 0, crown tip at y = 6.05).
 */
export function createChristmasTreeGroup(
  materials: SharedHolidayMaterials,
  sparkleMap: THREE.CanvasTexture,
): ChristmasTreeRig {
  const group = new THREE.Group();

  const standBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.76, 1.35, 0.24, 24),
    materials.velvetRed,
  );
  standBase.position.y = 0.12;
  standBase.receiveShadow = true;
  group.add(standBase);

  const standRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.32, 0.042, 10, 32),
    materials.goldMetal,
  );
  standRim.rotation.x = Math.PI / 2;
  standRim.position.y = 0.05;
  group.add(standRim);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.34, 1.35, 12),
    materials.woodMantle,
  );
  trunk.position.y = 0.75;
  trunk.castShadow = true;
  group.add(trunk);

  // Deep shadowed inner spruce core cones (recessed behind 220 lush overhanging outer pine fronds)
  const tiers = [
    { y: 1.48, r: 1.94, h: 1.62 },
    { y: 2.18, r: 1.72, h: 1.54 },
    { y: 2.86, r: 1.48, h: 1.46 },
    { y: 3.5, r: 1.24, h: 1.36 },
    { y: 4.1, r: 0.99, h: 1.26 },
    { y: 4.66, r: 0.76, h: 1.14 },
    { y: 5.18, r: 0.54, h: 0.98 },
    { y: 5.64, r: 0.32, h: 0.82 },
  ];

  tiers.forEach((tier, idx) => {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(tier.r, tier.h, 20, 2),
      materials.pineDark,
    );
    cone.position.y = tier.y;
    cone.rotation.y = idx * 0.42;
    cone.castShadow = true;
    cone.receiveShadow = true;
    group.add(cone);
  });

  // 220 instanced sculpted drooping spruce branch fronds (1 draw call — lush organic evergreen silhouette!)
  const frondGeo = new THREE.ConeGeometry(0.44, 1.06, 7);
  frondGeo.translate(0, -0.38, 0);
  const frondCount = 220;
  const frondsMesh = new THREE.InstancedMesh(frondGeo, materials.pineGreen, frondCount);
  frondsMesh.castShadow = true;
  frondsMesh.receiveShadow = true;
  const dummy = new THREE.Object3D();

  for (let i = 0; i < frondCount; i++) {
    const t = i / (frondCount - 1);
    const y = 0.84 + t * 4.9;
    const baseRadius = THREE.MathUtils.lerp(2.18, 0.25, t);
    const angle = i * 2.39996 + (i % 3) * 0.15;
    const radialOffset = baseRadius * (0.76 + (i % 4) * 0.055);

    dummy.position.set(
      Math.cos(angle) * radialOffset,
      y,
      Math.sin(angle) * radialOffset,
    );
    dummy.lookAt(
      Math.cos(angle) * (radialOffset + 1.5),
      y - 0.64,
      Math.sin(angle) * (radialOffset + 1.5),
    );
    dummy.rotateX(Math.PI / 2);
    const s = THREE.MathUtils.lerp(1.22, 0.38, t) * (0.86 + (i % 5) * 0.065);
    dummy.scale.set(s * 1.18, s, s * 0.72);
    dummy.updateMatrix();
    frondsMesh.setMatrixAt(i, dummy.matrix);
  }
  frondsMesh.instanceMatrix.needsUpdate = true;
  frondsMesh.computeBoundingSphere();
  group.add(frondsMesh);

  // Spiraling brushed-gold luxury ribbon garland
  const spiralPts: THREE.Vector3[] = [];
  const spiralTurns = 6.2;
  const spiralSteps = 84;
  for (let i = 0; i <= spiralSteps; i++) {
    const t = i / spiralSteps;
    const angle = t * spiralTurns * Math.PI * 2;
    const y = 1.0 + t * 4.72;
    const radius = THREE.MathUtils.lerp(2.24, 0.3, t);
    spiralPts.push(
      new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius),
    );
  }
  const garlandCurve = new THREE.CatmullRomCurve3(spiralPts);
  const ribbonMesh = new THREE.Mesh(
    new THREE.TubeGeometry(garlandCurve, 108, 0.044, 7, false),
    materials.goldMetal,
  );
  group.add(ribbonMesh);

  // 88 instanced lacquered blown-glass ornaments
  const baubleCount = 88;
  const baubleGeo = new THREE.SphereGeometry(0.115, 14, 12);
  const baubleMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.84,
    roughness: 0.11,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });
  const baublesMesh = new THREE.InstancedMesh(baubleGeo, baubleMat, baubleCount);
  const palette = [
    new THREE.Color(0xe0b948),
    new THREE.Color(0xb8191e),
    new THREE.Color(0x1f5382),
    new THREE.Color(0xedf2fa),
  ];

  for (let i = 0; i < baubleCount; i++) {
    const t = (i + 0.5) / baubleCount;
    const y = 0.96 + t * 4.68;
    const r = THREE.MathUtils.lerp(2.18, 0.32, t) * (0.93 + (i % 3) * 0.045);
    const angle = i * 2.39996;
    dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(0.84 + (i % 4) * 0.11);
    dummy.updateMatrix();
    baublesMesh.setMatrixAt(i, dummy.matrix);
    baublesMesh.setColorAt(i, palette[i % palette.length]);
  }
  baublesMesh.instanceMatrix.needsUpdate = true;
  if (baublesMesh.instanceColor) baublesMesh.instanceColor.needsUpdate = true;
  baublesMesh.computeBoundingSphere();
  group.add(baublesMesh);

  // 144 instanced warm twinkling fairy lights + soft additive bokeh halos
  const lightCount = 144;
  const lightGeo = new THREE.SphereGeometry(0.044, 8, 6);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const fairyLightsMesh = new THREE.InstancedMesh(lightGeo, lightMat, lightCount);

  const glowGeo = new THREE.PlaneGeometry(0.32, 0.32);
  const glowMat = new THREE.MeshBasicMaterial({
    map: sparkleMap,
    color: 0xffe49c,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const fairyGlowsMesh = new THREE.InstancedMesh(glowGeo, glowMat, lightCount);

  const fairyBaseColors: THREE.Color[] = [];
  const fairyPhases: number[] = [];
  const warmTones = [
    new THREE.Color(0xffe9a6),
    new THREE.Color(0xffd06e),
    new THREE.Color(0xfff8e2),
    new THREE.Color(0x9bd2ff),
  ];

  for (let i = 0; i < lightCount; i++) {
    const t = (i + 0.3) / lightCount;
    const y = 0.92 + t * 4.86;
    const r = THREE.MathUtils.lerp(2.26, 0.28, t);
    const angle = i * 1.92 + 0.7;
    const lx = Math.cos(angle) * r;
    const lz = Math.sin(angle) * r;

    dummy.position.set(lx, y, lz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    fairyLightsMesh.setMatrixAt(i, dummy.matrix);

    dummy.lookAt(lx * 2, y, lz * 2);
    dummy.scale.setScalar(0.85 + (i % 3) * 0.2);
    dummy.updateMatrix();
    fairyGlowsMesh.setMatrixAt(i, dummy.matrix);

    const col = warmTones[i % warmTones.length].clone();
    fairyBaseColors.push(col);
    fairyPhases.push(i * 0.67);
    fairyLightsMesh.setColorAt(i, col);
    fairyGlowsMesh.setColorAt(i, col);
  }
  fairyLightsMesh.instanceMatrix.needsUpdate = true;
  if (fairyLightsMesh.instanceColor) fairyLightsMesh.instanceColor.needsUpdate = true;
  fairyLightsMesh.computeBoundingSphere();
  group.add(fairyLightsMesh);

  fairyGlowsMesh.instanceMatrix.needsUpdate = true;
  if (fairyGlowsMesh.instanceColor) fairyGlowsMesh.instanceColor.needsUpdate = true;
  fairyGlowsMesh.computeBoundingSphere();
  group.add(fairyGlowsMesh);

  return { group, fairyLightsMesh, fairyGlowsMesh, fairyBaseColors, fairyPhases };
}

export interface TractStarRig {
  group: THREE.Group;
  haloSprite: THREE.Sprite;
  updateLogoTexture: (logoCanvas: HTMLCanvasElement, aspect: number, anisotropy: number) => void;
}

function buildStarShape(outerR: number, innerR: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / 5 + Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/**
 * 8. Hero TRACT Institutional 3D Star Topper — organic integration directly on the 5-pointed star
 * (NO circular medallion or circular ring!) with steady, serene celestial illumination (NO blinking).
 */
export function createTractStarGroup(
  materials: SharedHolidayMaterials,
  sparkleMap: THREE.CanvasTexture,
): TractStarRig {
  const group = new THREE.Group();

  // Regal, well-proportioned 5-pointed star with a generous pentagonal heart for organic logo inlay
  const outerR = 0.98;
  const innerR = 0.52;
  const starShape = buildStarShape(outerR, innerR);

  const starGeo = new THREE.ExtrudeGeometry(starShape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 4,
  });
  starGeo.center();

  // Rich deep institutional TRACT royal cobalt enamel finish (never washes out under studio IBL!)
  const starMat = new THREE.MeshPhysicalMaterial({
    color: 0x0e2d57,
    emissive: 0x061730,
    emissiveIntensity: 0.24,
    metalness: 0.14,
    roughness: 0.56,
    clearcoat: 0.16,
    clearcoatRoughness: 0.42,
    envMapIntensity: 0.22,
  });
  const starMesh = new THREE.Mesh(starGeo, starMat);
  group.add(starMesh);

  // Gleaming 24k brushed-gold beveled outer star frame tracing all 5 points
  const rimShape = buildStarShape(outerR * 1.075, innerR * 1.085);
  const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
    depth: 0.105,
    bevelEnabled: true,
    bevelThickness: 0.036,
    bevelSize: 0.032,
    bevelSegments: 3,
  });
  rimGeo.center();

  const rimMat = new THREE.MeshPhysicalMaterial({
    color: 0xeac556,
    emissive: 0x916f18,
    emissiveIntensity: 0.3,
    metalness: 0.88,
    roughness: 0.22,
    roughnessMap: materials.goldRoughnessBase,
    bumpMap: materials.goldBumpBase,
    bumpScale: 0.012,
    clearcoat: 0.42,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.0,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.z = -0.024;
  group.add(rimMesh);

  // Delicate organic 5-pointed star hairline gold inlay following the star contour (ZERO circles!)
  const inlayOuter = buildStarShape(outerR * 0.9, innerR * 0.91);
  const inlayHole = new THREE.Path();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR * 0.872 : innerR * 0.88;
    const angle = (i * Math.PI) / 5 + Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) inlayHole.moveTo(x, y);
    else inlayHole.lineTo(x, y);
  }
  inlayHole.closePath();
  inlayOuter.holes.push(inlayHole);

  const inlayGeo = new THREE.ShapeGeometry(inlayOuter);
  const inlayMesh = new THREE.Mesh(inlayGeo, rimMat);
  inlayMesh.position.z = 0.144;
  group.add(inlayMesh);

  // Brushed-gold spiral topper mount seating the star cleanly onto the tree crown
  const mountCoil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.098, 0.56, 12),
    materials.goldMetal,
  );
  mountCoil.position.y = -0.76;
  group.add(mountCoil);

  // Organic TRACT logo sculpted/embossed in 3D relief directly onto the royal cobalt star surface
  // Uses a physical PBR material with transparent alpha channel + carved relief bumpMap (zero circle/box!)
  const logoPlaneMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: 0xdceeff,
    emissiveIntensity: 0.36,
    metalness: 0.52,
    roughness: 0.22,
    clearcoat: 0.72,
    clearcoatRoughness: 0.14,
    bumpScale: 0.068,
    envMapIntensity: 0.82,
    transparent: true,
    alphaTest: 0.02,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const logoPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.38), logoPlaneMat);
  logoPlane.position.set(0, -0.015, 0.152);
  logoPlane.renderOrder = 5;
  group.add(logoPlane);

  const haloMat = new THREE.SpriteMaterial({
    map: sparkleMap,
    color: 0x5ca6f5,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const haloSprite = new THREE.Sprite(haloMat);
  haloSprite.scale.set(3.65, 3.65, 1);
  haloSprite.position.z = -0.48;
  group.add(haloSprite);

  const goldHaloMat = new THREE.SpriteMaterial({
    map: sparkleMap,
    color: 0xecc85c,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const goldHalo = new THREE.Sprite(goldHaloMat);
  goldHalo.scale.set(2.65, 2.65, 1);
  goldHalo.position.z = -0.42;
  group.add(goldHalo);

  let currentLogoTex: THREE.CanvasTexture | null = null;
  let currentReliefBumpTex: THREE.CanvasTexture | null = null;
  const updateLogoTexture = (
    logoCanvas: HTMLCanvasElement,
    aspect: number,
    anisotropy: number,
  ) => {
    if (currentLogoTex) currentLogoTex.dispose();
    if (currentReliefBumpTex) currentReliefBumpTex.dispose();

    // Build BOTH an RGBA alpha-transparent color map AND a matching grayscale embossed relief bumpMap
    // so the TRACT mark looks physically sculpted / engraved directly into the 3D star face!
    const pad = 32;
    const outW = logoCanvas.width + pad * 2;
    const outH = logoCanvas.height + pad * 2;

    const tinted = document.createElement('canvas');
    tinted.width = logoCanvas.width;
    tinted.height = logoCanvas.height;
    const tCtx = tinted.getContext('2d', { willReadFrequently: true });

    const heightSource = document.createElement('canvas');
    heightSource.width = logoCanvas.width;
    heightSource.height = logoCanvas.height;
    const hSrcCtx = heightSource.getContext('2d');

    if (tCtx && hSrcCtx) {
      tCtx.drawImage(logoCanvas, 0, 0);
      const imgData = tCtx.getImageData(0, 0, tinted.width, tinted.height);
      const px = imgData.data;
      const bumpImg = hSrcCtx.createImageData(tinted.width, tinted.height);
      const bpx = bumpImg.data;

      for (let i = 0; i < px.length; i += 4) {
        const a = px[i + 3];
        if (a < 18) {
          bpx[i] = 0;
          bpx[i + 1] = 0;
          bpx[i + 2] = 0;
          bpx[i + 3] = 255;
          continue;
        }
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];

        // Lift the iconic TRACT blue "A" into gleaming sapphire-silver relief & polish letters to sculpted platinum
        if (b > r + 24 && b > g + 8) {
          px[i] = Math.min(255, Math.round(r * 0.72 + 70));
          px[i + 1] = Math.min(255, Math.round(g * 0.92 + 110));
          px[i + 2] = Math.min(255, Math.round(b * 0.72 + 138));
        } else if (r > 125 && g > 125 && b > 125) {
          px[i] = Math.min(255, Math.round(r * 1.15));
          px[i + 1] = Math.min(255, Math.round(g * 1.15));
          px[i + 2] = Math.min(255, Math.round(b * 1.15));
        }

        // Sculpted relief height proportional to pixel opacity (raises lettering physically out of the star!)
        const hVal = Math.min(255, Math.round((a / 255) * 245));
        bpx[i] = hVal;
        bpx[i + 1] = hVal;
        bpx[i + 2] = hVal;
        bpx[i + 3] = 255;
      }
      tCtx.putImageData(imgData, 0, 0);
      hSrcCtx.putImageData(bumpImg, 0, 0);
    }

    // 1. Alpha-transparent RGBA color map with crisp carved bevel rim-light & dark recessed under-shadow
    const starLogoCanvas = document.createElement('canvas');
    starLogoCanvas.width = outW;
    starLogoCanvas.height = outH;
    const sCtx = starLogoCanvas.getContext('2d');
    if (sCtx) {
      sCtx.clearRect(0, 0, outW, outH);
      // Lower carved shadow grounding the embossed letters into the cobalt surface
      sCtx.shadowColor = 'rgba(3, 10, 24, 0.88)';
      sCtx.shadowBlur = 10;
      sCtx.shadowOffsetX = 0;
      sCtx.shadowOffsetY = 5;
      sCtx.drawImage(tinted, pad, pad);

      // Subtle upper sculpted bevel catchlight
      sCtx.shadowColor = 'rgba(185, 224, 255, 0.55)';
      sCtx.shadowBlur = 4;
      sCtx.shadowOffsetX = 0;
      sCtx.shadowOffsetY = -2;
      sCtx.drawImage(tinted, pad, pad);
    }

    // 2. Smoothly beveled grayscale heightmap for real PBR bumpMap relief lighting
    const reliefBumpCanvas = document.createElement('canvas');
    reliefBumpCanvas.width = outW;
    reliefBumpCanvas.height = outH;
    const bCtx = reliefBumpCanvas.getContext('2d');
    if (bCtx) {
      bCtx.fillStyle = '#000000';
      bCtx.fillRect(0, 0, outW, outH);
      bCtx.filter = 'blur(2.5px)';
      bCtx.drawImage(heightSource, pad, pad);
      bCtx.filter = 'none';
      bCtx.globalAlpha = 0.72;
      bCtx.drawImage(heightSource, pad, pad);
    }

    const tex = new THREE.CanvasTexture(starLogoCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    tex.needsUpdate = true;
    currentLogoTex = tex;

    const bumpTex = new THREE.CanvasTexture(reliefBumpCanvas);
    bumpTex.anisotropy = anisotropy;
    bumpTex.needsUpdate = true;
    currentReliefBumpTex = bumpTex;

    logoPlaneMat.map = tex;
    logoPlaneMat.emissiveMap = tex;
    logoPlaneMat.bumpMap = bumpTex;
    logoPlaneMat.needsUpdate = true;

    const paddedAspect = outW / Math.max(1, outH);
    const maxW = 0.8;
    const maxH = 0.46;
    let planeW = maxW;
    let planeH = planeW / Math.max(0.5, paddedAspect || aspect);
    if (planeH > maxH) {
      planeH = maxH;
      planeW = planeH * Math.max(0.5, paddedAspect || aspect);
    }
    logoPlane.geometry.dispose();
    logoPlane.geometry = new THREE.PlaneGeometry(planeW, planeH);
  };

  return { group, haloSprite, updateLogoTexture };
}

export interface InstancedVortexGeometrySet {
  baubleBody: THREE.BufferGeometry;
  baubleTrim: THREE.BufferGeometry;
  bell: THREE.BufferGeometry;
  snowflake: THREE.BufferGeometry;
  giftBody: THREE.BufferGeometry;
  giftRibbon: THREE.BufferGeometry;
  candyCane: THREE.BufferGeometry;
  dispose: () => void;
}

function normalizeForMerge(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo.clone();
  if (!nonIndexed.attributes.normal) {
    nonIndexed.computeVertexNormals();
  }
  // Ensure consistent attribute set (position, normal, uv) so mergeGeometries never fails
  if (!nonIndexed.attributes.uv) {
    const count = nonIndexed.attributes.position.count;
    nonIndexed.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  for (const key of Object.keys(nonIndexed.attributes)) {
    if (key !== 'position' && key !== 'normal' && key !== 'uv') {
      nonIndexed.deleteAttribute(key);
    }
  }
  return nonIndexed;
}

function mergeNormalized(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const prepared = parts.map((p) => {
    const n = normalizeForMerge(p);
    p.dispose();
    return n;
  });
  const merged = mergeGeometries(prepared, false);
  prepared.forEach((p) => p.dispose());
  if (!merged) {
    throw new Error('Failed to merge instanced vortex ornament geometries');
  }
  merged.computeBoundingSphere();
  return merged;
}

/**
 * 9. Merged BufferGeometries for GPU-Instanced Vortex Christmas Ornaments:
 * Renders 56+ high-craft 3D ornaments along the roller-coaster vortex in just 7 draw calls!
 */
export function createInstancedVortexGeometries(): InstancedVortexGeometrySet {
  // 1. Blown-glass bauble sphere + merged brushed-gold crown/equator band/loop
  const r = 0.42;
  const baubleBody = new THREE.SphereGeometry(r, 22, 16);

  const band = new THREE.TorusGeometry(r * 0.996, r * 0.045, 8, 24);
  band.rotateX(Math.PI / 2);
  const cap = new THREE.CylinderGeometry(r * 0.22, r * 0.3, r * 0.24, 14);
  cap.translate(0, r * 0.96, 0);
  const ring = new THREE.TorusGeometry(r * 0.16, r * 0.032, 8, 16);
  ring.translate(0, r * 1.18, 0);
  const baubleTrim = mergeNormalized([band, cap, ring]);

  // 2. Sculpted brushed-gold Christmas bell (lathe body + rim lip + clapper + loop)
  const bellProfile = [
    new THREE.Vector2(0.0, 0.56),
    new THREE.Vector2(0.14, 0.54),
    new THREE.Vector2(0.24, 0.38),
    new THREE.Vector2(0.32, 0.12),
    new THREE.Vector2(0.45, -0.22),
    new THREE.Vector2(0.52, -0.34),
    new THREE.Vector2(0.46, -0.36),
  ];
  const bellBody = new THREE.LatheGeometry(bellProfile, 24);
  const bellLip = new THREE.TorusGeometry(0.48, 0.036, 8, 24);
  bellLip.rotateX(Math.PI / 2);
  bellLip.translate(0, -0.34, 0);
  const clapper = new THREE.SphereGeometry(0.11, 12, 10);
  clapper.translate(0, -0.36, 0);
  const topLoop = new THREE.TorusGeometry(0.11, 0.03, 8, 14);
  topLoop.translate(0, 0.63, 0);
  const bell = mergeNormalized([bellBody, bellLip, clapper, topLoop]);
  bell.scale(0.72, 0.72, 0.72);

  // 3. Faceted 6-armed crystal 3D snowflake (all arms & barbs merged into 1 draw call!)
  const sfParts: THREE.BufferGeometry[] = [new THREE.OctahedronGeometry(0.17, 1)];
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI) / 3;
    const arm = new THREE.CylinderGeometry(0.026, 0.036, 1.16, 6);
    arm.rotateZ(angle);
    sfParts.push(arm);
    for (const dir of [-1, 1]) {
      const bx = -Math.sin(angle) * dir * 0.34;
      const by = Math.cos(angle) * dir * 0.34;
      const barbA = new THREE.CylinderGeometry(0.018, 0.026, 0.34, 6);
      barbA.rotateZ(angle + Math.PI / 4);
      barbA.translate(bx, by, 0);
      sfParts.push(barbA);

      const barbB = new THREE.CylinderGeometry(0.018, 0.026, 0.34, 6);
      barbB.rotateZ(angle - Math.PI / 4);
      barbB.translate(bx, by, 0);
      sfParts.push(barbB);
    }
  }
  const snowflake = mergeNormalized(sfParts);
  snowflake.scale(0.78, 0.78, 0.78);

  // 4. Satin-wrapped holiday gift box (merged body + lid) + merged gold crossed ribbon & bow
  const gw = 0.6;
  const gh = 0.54;
  const gd = 0.6;
  const boxMain = new THREE.BoxGeometry(gw, gh * 0.84, gd);
  boxMain.translate(0, -gh * 0.08, 0);
  const boxLid = new THREE.BoxGeometry(gw * 1.07, gh * 0.2, gd * 1.07);
  boxLid.translate(0, gh * 0.4, 0);
  const giftBody = mergeNormalized([boxMain, boxLid]);

  const ribX = new THREE.BoxGeometry(gw * 1.09, gh * 1.02, gw * 0.16);
  const ribZ = new THREE.BoxGeometry(gd * 0.16, gh * 1.02, gd * 1.09);
  const bowL = new THREE.TorusGeometry(gw * 0.16, gw * 0.042, 8, 16);
  bowL.rotateX(0.25);
  bowL.rotateY(0.4);
  bowL.rotateZ(0.35);
  bowL.translate(-gw * 0.14, gh * 0.58, 0);
  const bowR = new THREE.TorusGeometry(gw * 0.16, gw * 0.042, 8, 16);
  bowR.rotateX(0.25);
  bowR.rotateY(-0.4);
  bowR.rotateZ(-0.35);
  bowR.translate(gw * 0.14, gh * 0.58, 0);
  const giftRibbon = mergeNormalized([ribX, ribZ, bowL, bowR]);

  // 5. Glossy porcelain candy cane
  const caneCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.68, 0),
    new THREE.Vector3(0, 0.18, 0),
    new THREE.Vector3(0.05, 0.46, 0),
    new THREE.Vector3(0.24, 0.56, 0),
    new THREE.Vector3(0.4, 0.42, 0),
    new THREE.Vector3(0.41, 0.22, 0),
  ]);
  const candyCane = new THREE.TubeGeometry(caneCurve, 26, 0.09, 12, false);
  candyCane.center();
  candyCane.scale(0.86, 0.86, 0.86);

  return {
    baubleBody,
    baubleTrim,
    bell,
    snowflake,
    giftBody,
    giftRibbon,
    candyCane,
    dispose: () => {
      baubleBody.dispose();
      baubleTrim.dispose();
      bell.dispose();
      snowflake.dispose();
      giftBody.dispose();
      giftRibbon.dispose();
      candyCane.dispose();
    },
  };
}

