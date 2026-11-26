import * as THREE from 'three';
import type { ProceduralTextureSet } from '../utils/proceduralTextures';
import { createFireplacePortalGroup, type FireplacePortalRig, type SharedHolidayMaterials } from './buildProps';
import { SCENE_ANCHORS } from '../utils/timeline';
import { SnowParticleSystem } from './SnowParticleSystem';

export interface ArchitecturalLivingRoomRig {
  group: THREE.Group;
  fireplaceRig: FireplacePortalRig;
  candleFlames: THREE.Mesh[];
  exteriorSnow: SnowParticleSystem;
  warmLampLights: THREE.PointLight[];
  dispose: () => void;
}

/**
 * Procedural starry winter night sky & distant snow-capped mountain horizon visible
 * behind the recessed living room windows (never a flat solid blue color!).
 */
function createExteriorWinterSkyTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Rich twilight arctic sky gradient: deep indigo zenith -> moonlit frosty horizon
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, '#040b18');
  skyGrad.addColorStop(0.32, '#0a1c38');
  skyGrad.addColorStop(0.62, '#17365e');
  skyGrad.addColorStop(0.84, '#2d5682');
  skyGrad.addColorStop(1, '#4b739c');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle aurora / moonlit winter mist ribbon across upper sky
  const aurora = ctx.createRadialGradient(710, 140, 12, 710, 140, 290);
  aurora.addColorStop(0, 'rgba(215, 236, 255, 0.36)');
  aurora.addColorStop(0.45, 'rgba(115, 175, 235, 0.14)');
  aurora.addColorStop(1, 'rgba(30, 68, 120, 0)');
  ctx.fillStyle = aurora;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Crisp pinpoint winter stars across upper sky
  let seed = 9187;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 260; i++) {
    const sx = rand() * canvas.width;
    const sy = rand() * canvas.height * 0.62;
    const r = 0.6 + rand() * 1.5;
    const alpha = 0.35 + rand() * 0.65;
    ctx.fillStyle = `rgba(235, 245, 255, ${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant moonlit snow-capped mountain range along the lower horizon
  const drawRidge = (baseY: number, amp: number, freq: number, phase: number, fill: string) => {
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x <= canvas.width; x += 8) {
      const t = x / canvas.width;
      const y =
        baseY -
        Math.sin(t * Math.PI * freq + phase) * amp -
        Math.cos(t * Math.PI * (freq * 2.3) + phase * 1.7) * (amp * 0.38) -
        Math.sin(t * Math.PI * (freq * 5.1)) * (amp * 0.14);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };

  drawRidge(355, 48, 2.4, 0.4, '#1b3554');
  drawRidge(388, 36, 3.1, 1.9, '#24466b');
  drawRidge(418, 24, 4.2, 0.8, '#375c82');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Cozy framed oil-painted winter landscape canvas for interior wall art.
 */
function createFramedPaintingTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, 192);
  bg.addColorStop(0, '#0f2340');
  bg.addColorStop(0.55, '#3b5878');
  bg.addColorStop(0.74, '#d99a5b');
  bg.addColorStop(1, '#dce6f2');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 192);

  // Soft snow hills & distant pines
  ctx.fillStyle = '#c8d6e8';
  ctx.beginPath();
  ctx.moveTo(0, 192);
  ctx.quadraticCurveTo(90, 128, 256, 154);
  ctx.lineTo(256, 192);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#18362a';
  for (const [px, py, ph] of [
    [54, 148, 38],
    [76, 152, 28],
    [186, 152, 42],
    [210, 156, 32],
  ]) {
    ctx.beginPath();
    ctx.moveTo(px, py - ph);
    ctx.lineTo(px - ph * 0.34, py);
    ctx.lineTo(px + ph * 0.34, py);
    ctx.closePath();
    ctx.fill();
  }

  // Warm cabin silhouette with golden window
  ctx.fillStyle = '#3a2216';
  ctx.fillRect(114, 134, 30, 20);
  ctx.beginPath();
  ctx.moveTo(108, 136);
  ctx.lineTo(129, 120);
  ctx.lineTo(150, 136);
  ctx.closePath();
  ctx.fillStyle = '#e7eff8';
  ctx.fill();
  ctx.fillStyle = '#ffcf6b';
  ctx.fillRect(123, 141, 8, 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Helper to create a sculpted multi-panel architectural door leaf with recessed beveled panels
 * and brushed-brass lever handle.
 */
function buildArchitecturalDoorLeaf(
  width: number,
  height: number,
  woodMat: THREE.Material,
  panelMat: THREE.Material,
  brassMat: THREE.Material,
  handleSide: 1 | -1,
): THREE.Group {
  const leaf = new THREE.Group();
  const thickness = 0.11;

  // Main solid hardwood door slab
  const slab = new THREE.Mesh(new THREE.BoxGeometry(width, height, thickness), woodMat);
  slab.position.y = height / 2;
  slab.castShadow = true;
  slab.receiveShadow = true;
  leaf.add(slab);

  // Sculpted upper & lower recessed beveled panels (raised molding frame around recessed inset)
  const panelW = width * 0.66;
  const upperH = height * 0.36;
  const lowerH = height * 0.28;
  const panelSpecs = [
    { y: height * 0.72, h: upperH },
    { y: height * 0.28, h: lowerH },
  ];

  for (const spec of panelSpecs) {
    const moldingOuter = new THREE.Mesh(
      new THREE.BoxGeometry(panelW + 0.08, spec.h + 0.08, thickness + 0.03),
      woodMat,
    );
    moldingOuter.position.set(0, spec.y, 0);
    leaf.add(moldingOuter);

    const insetPanel = new THREE.Mesh(
      new THREE.BoxGeometry(panelW, spec.h, thickness + 0.045),
      panelMat,
    );
    insetPanel.position.set(0, spec.y, 0);
    leaf.add(insetPanel);
  }

  // Brushed-brass bottom kickplate
  const kickplate = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.92, 0.2, thickness + 0.025),
    brassMat,
  );
  kickplate.position.set(0, 0.11, 0);
  leaf.add(kickplate);

  // Brass backplate + lever handle on interior face (+Z in local door space)
  const hx = handleSide * (width * 0.38);
  const hy = height * 0.46;
  const backplate = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.28, 0.02),
    brassMat,
  );
  backplate.position.set(hx, hy, thickness * 0.5 + 0.015);
  leaf.add(backplate);

  const knobPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.08, 10),
    brassMat,
  );
  knobPost.rotation.x = Math.PI / 2;
  knobPost.position.set(hx, hy + 0.03, thickness * 0.5 + 0.055);
  leaf.add(knobPost);

  const lever = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.018, 0.13, 4, 8),
    brassMat,
  );
  lever.rotation.z = Math.PI / 2;
  lever.position.set(hx - handleSide * 0.06, hy + 0.03, thickness * 0.5 + 0.095);
  leaf.add(lever);

  return leaf;
}

/**
 * Helper to create a lush sculpted pine wreath with velvet double bow & gold/crimson berries.
 */
function buildFestiveWreath(materials: SharedHolidayMaterials, radius = 0.48): THREE.Group {
  const wreathGroup = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, radius * 0.25, 12, 28),
    materials.pineGreen,
  );
  wreathGroup.add(ring);

  const bowL = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.24, radius * 0.085, 8, 16),
    materials.velvetRed,
  );
  bowL.position.set(-radius * 0.22, radius * 1.02, radius * 0.18);
  bowL.rotation.set(0.1, 0.3, 0.45);
  const bowR = bowL.clone();
  bowR.position.x = radius * 0.22;
  bowR.rotation.set(0.1, -0.3, -0.45);
  const bowKnot = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.14, 10, 8),
    materials.velvetRed,
  );
  bowKnot.position.set(0, radius * 0.98, radius * 0.22);
  wreathGroup.add(bowL, bowR, bowKnot);

  for (let b = 0; b < 10; b++) {
    const ang = (b / 10) * Math.PI * 2;
    const berry = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.1, 8, 6),
      b % 2 === 0 ? materials.goldMetal : materials.velvetRed,
    );
    berry.position.set(Math.cos(ang) * radius, Math.sin(ang) * radius, radius * 0.24);
    wreathGroup.add(berry);
  }
  return wreathGroup;
}

/**
 * Helper to build a warm brass wall sconce with glowing glass shade.
 */
function buildWallSconce(brassMat: THREE.Material, shadeMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16), brassMat);
  plate.rotation.x = Math.PI / 2;
  g.add(plate);

  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 8), brassMat);
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0, -0.02, 0.12);
  g.add(arm);

  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.035, 0.08, 12), brassMat);
  cup.position.set(0, 0.02, 0.23);
  g.add(cup);

  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.115, 0.26, 14), shadeMat);
  shade.position.set(0, 0.18, 0.23);
  g.add(shade);

  return g;
}

/**
 * Builds the grand, realistic architectural 3D Christmas house living room:
 * - Real cut-out recessed windows revealing a true 3D snowy winter forest, glowing cottage, fence,
 *   full moon, twilight mountain sky, and live falling exterior snow (ZERO flat blue stickers!)
 * - Real 3D architectural double mahogany entry doors (left wall) & interior passage door (right wall)
 *   with recessed panels, casings, pediments, brass levers, glowing transom & holiday wreath
 * - Rich well-arranged luxury furniture: tufted cream Chesterfield sofa with pillows, cognac leather
 *   wingback armchair + ottoman + brass tripod floor lamp, carved walnut coffee table with flickering
 *   holiday pillar candles, tall mahogany library bookcase filled with instanced books, side console,
 *   coffered mahogany ceiling beams, brass crystal chandelier, and brick fireplace portal!
 */
export function buildArchitecturalLivingRoom(
  materials: SharedHolidayMaterials,
  textures: ProceduralTextureSet,
  anisotropy: number,
  isMobileViewport: boolean,
): ArchitecturalLivingRoomRig {
  const group = new THREE.Group();
  const disposableTextures: THREE.Texture[] = [];
  const disposableMaterials: THREE.Material[] = [];
  const disposableGeos: THREE.BufferGeometry[] = [];
  const candleFlames: THREE.Mesh[] = [];
  const warmLampLights: THREE.PointLight[] = [];

  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMaterials.push(m);
    return m;
  };
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };

  // Architectural & furniture PBR material palette calibrated for rich warm candlelit evening depth
  // (low envMapIntensity on matte walls/wood/fabrics prevents RoomEnvironment from washing out shadows!)
  const floorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd8c3b0,
      map: textures.woodFloorMap,
      bumpMap: textures.woodFloorBump,
      bumpScale: 0.032,
      roughnessMap: textures.woodFloorRoughness,
      metalness: 0.06,
      roughness: 0.48,
      envMapIntensity: 0.32,
    }),
  );

  const rugMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xddd4c8,
      map: textures.rugMap,
      roughness: 0.94,
      metalness: 0.01,
      envMapIntensity: 0.22,
    }),
  );

  const wallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0b172c,
      roughness: 0.9,
      metalness: 0.03,
      envMapIntensity: 0.18,
    }),
  );

  const wainscotPanelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f1f3a,
      roughness: 0.82,
      metalness: 0.04,
      envMapIntensity: 0.2,
    }),
  );

  const mahoganyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b1f12,
      roughness: 0.46,
      metalness: 0.08,
      bumpMap: textures.woodFloorBump,
      bumpScale: 0.02,
      envMapIntensity: 0.34,
    }),
  );

  const mahoganyDarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x26130a,
      roughness: 0.54,
      metalness: 0.06,
      bumpMap: textures.woodFloorBump,
      bumpScale: 0.016,
      envMapIntensity: 0.28,
    }),
  );

  const creamVelvetMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xd5c5ae,
      roughness: 0.88,
      metalness: 0.02,
      sheen: 0.55,
      sheenRoughness: 0.65,
      sheenColor: new THREE.Color(0xefe0c8),
      bumpMap: textures.giftBumpMap,
      bumpScale: 0.014,
      envMapIntensity: 0.22,
    }),
  );

  const cognacLeatherMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x703616,
      roughness: 0.44,
      metalness: 0.05,
      clearcoat: 0.26,
      clearcoatRoughness: 0.48,
      bumpMap: textures.giftBumpMap,
      bumpScale: 0.012,
      envMapIntensity: 0.42,
    }),
  );

  const curtainVelvetMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x6b1015,
      roughness: 0.86,
      metalness: 0.02,
      sheen: 0.85,
      sheenRoughness: 0.52,
      sheenColor: new THREE.Color(0xb82b30),
      envMapIntensity: 0.22,
    }),
  );

  const warmGlowShadeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfff0cc,
      emissive: 0xffbc58,
      emissiveIntensity: 1.55,
      roughness: 0.58,
      metalness: 0.02,
      envMapIntensity: 0.25,
    }),
  );

  const windowGlassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xa8c8ee,
      transparent: true,
      opacity: 0.11,
      roughness: 0.08,
      metalness: 0.15,
      depthWrite: false,
    }),
  );

  const ceilingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x091324,
      roughness: 0.94,
      metalness: 0.02,
      envMapIntensity: 0.16,
    }),
  );

  // =========================================================================
  // 1. SPACIOUS FLOOR, ORNATE RUG & COFFERED MAHOGANY CEILING
  // =========================================================================
  const roomW = 18.4;
  const roomD = 17.8; // z ∈ [-7.4, +10.4]
  const roomH = 9.0;
  const roomCenterZ = 1.5;

  const mainFloor = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(roomW, roomD)), floorMat);
  mainFloor.rotation.x = -Math.PI / 2;
  mainFloor.position.set(0, 0, roomCenterZ);
  mainFloor.receiveShadow = true;
  group.add(mainFloor);

  // Grand TRACT Persian-inspired woven holiday area rug (+0.02 Y offset -> zero Z-fighting)
  const rug = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(8.8, 7.6)), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.02, -0.4);
  rug.receiveShadow = true;
  group.add(rug);

  // Subtle gold rug fringe trim strips at front/back edges
  const fringeGeo = trackGeo(new THREE.BoxGeometry(8.8, 0.015, 0.14));
  for (const fz of [-4.25, 3.45]) {
    const fringe = new THREE.Mesh(fringeGeo, creamVelvetMat);
    fringe.position.set(0, 0.018, fz);
    group.add(fringe);
  }

  // Ceiling + dark mahogany architectural coffer beams
  const ceiling = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(roomW, roomD)), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, roomH, roomCenterZ);
  group.add(ceiling);

  const crossBeamGeo = trackGeo(new THREE.BoxGeometry(roomW, 0.34, 0.32));
  for (const bz of [-5.2, -1.6, 2.0, 5.6]) {
    const beam = new THREE.Mesh(crossBeamGeo, mahoganyMat);
    beam.position.set(0, roomH - 0.17, bz);
    group.add(beam);
  }
  const longBeamGeo = trackGeo(new THREE.BoxGeometry(0.3, 0.32, roomD));
  for (const bx of [-5.6, 0, 5.6]) {
    const beam = new THREE.Mesh(longBeamGeo, mahoganyMat);
    beam.position.set(bx, roomH - 0.16, roomCenterZ);
    group.add(beam);
  }

  // =========================================================================
  // 2. ARCHITECTURAL WALLS WITH REAL OPEN WINDOW BAYS (BACK WALL AT z = -7.2)
  // =========================================================================
  const backZ = -7.2;
  const wallThick = 0.56;

  // Back wall constructed around TWO REAL OPEN RECESSED WINDOW BAYS at x = -5.1 and x = +5.1
  // Each opening: width = 3.0m (x ∈ [-6.6, -3.6] and [+3.6, +6.6]), y ∈ [1.65, 6.15]
  const backWallPieces: Array<[number, number, number, number]> = [
    // [centerX, centerY, width, height]
    [0, 4.5, 7.2, 9.0], // Grand central pier behind the Christmas tree (x ∈ [-3.6, +3.6])
    [-7.9, 4.5, 2.6, 9.0], // Far left pier (x ∈ [-9.2, -6.6])
    [7.9, 4.5, 2.6, 9.0], // Far right pier (x ∈ [+6.6, +9.2])
    [-5.1, 0.825, 3.0, 1.65], // Left under-window wall
    [5.1, 0.825, 3.0, 1.65], // Right under-window wall
    [-5.1, 7.575, 3.0, 2.85], // Left window header
    [5.1, 7.575, 3.0, 2.85], // Right window header
  ];

  for (const [cx, cy, bw, bh] of backWallPieces) {
    const block = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bw, bh, wallThick)),
      wallMat,
    );
    block.position.set(cx, cy, backZ - wallThick * 0.5);
    block.receiveShadow = true;
    group.add(block);
  }

  // Subtle recessed architectural trim frame on lower central back wall (keeps upper dark navy serene behind TRACT Star!)
  const lowerWainscot = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.2, 1.12, 0.04)),
    wainscotPanelMat,
  );
  lowerWainscot.position.set(0, 0.84, backZ + 0.02);
  group.add(lowerWainscot);

  // Left & Right solid interior walls
  const leftWall = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(roomD, roomH)), wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-9.2, roomH / 2, roomCenterZ);
  leftWall.receiveShadow = true;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(roomD, roomH)), wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(9.2, roomH / 2, roomCenterZ);
  rightWall.receiveShadow = true;
  group.add(rightWall);

  // Front wall wings flanking the brick fireplace portal (x ∈ [-9.2, -3.2] & [+3.2, +9.2] at z = +9.8)
  const frontWingGeo = trackGeo(new THREE.BoxGeometry(6.0, roomH, 0.36));
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(frontWingGeo, wallMat);
    wing.position.set(side * 6.2, roomH / 2, 9.8);
    group.add(wing);
  }

  // Baseboards, chair rails & crown moldings around perimeter walls
  const trimConfigs: Array<[number, number, number, number, number, number]> = [
    // Back wall trim
    [0, 0.14, backZ + 0.05, roomW, 0.28, 0.1],
    [0, 1.48, backZ + 0.05, roomW, 0.12, 0.1],
    [0, roomH - 0.16, backZ + 0.08, roomW, 0.22, 0.16],
    // Left wall trim
    [-9.14, 0.14, roomCenterZ, 0.1, 0.28, roomD],
    [-9.14, 1.48, roomCenterZ, 0.1, 0.12, roomD],
    [-9.11, roomH - 0.16, roomCenterZ, 0.16, 0.22, roomD],
    // Right wall trim
    [9.14, 0.14, roomCenterZ, 0.1, 0.28, roomD],
    [9.14, 1.48, roomCenterZ, 0.1, 0.12, roomD],
    [9.11, roomH - 0.16, roomCenterZ, 0.16, 0.22, roomD],
  ];
  for (const [x, y, z, w, h, d] of trimConfigs) {
    const trim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), mahoganyMat);
    trim.position.set(x, y, z);
    group.add(trim);
  }

  // Decorative architectural pilasters flanking the tree & windows on the back wall
  const pilasterGeo = trackGeo(new THREE.BoxGeometry(0.32, roomH - 0.3, 0.16));
  for (const px of [-6.78, -3.42, 3.42, 6.78]) {
    const pilaster = new THREE.Mesh(pilasterGeo, mahoganyMat);
    pilaster.position.set(px, roomH / 2, backZ + 0.08);
    group.add(pilaster);
  }

  // =========================================================================
  // 3. RECESSED ARCHITECTURAL WINDOWS + VELVET CURTAINS + TRUE 3D SNOWY EXTERIOR
  // =========================================================================
  for (const wx of [-5.1, 5.1]) {
    const winGroup = new THREE.Group();
    const winW = 3.0;
    const winH = 4.5;

    // Deep wooden casing & recessed window jambs
    const sill = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(winW + 0.44, 0.16, 0.82)),
      mahoganyMat,
    );
    sill.position.set(0, -winH / 2 - 0.04, -0.1);
    winGroup.add(sill);

    const headerTrim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(winW + 0.48, 0.24, 0.34)),
      mahoganyMat,
    );
    headerTrim.position.set(0, winH / 2 + 0.1, 0.08);
    winGroup.add(headerTrim);

    // Subtle specular window glass pane (transparent so the true 3D winter landscape shines through!)
    const glass = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(winW - 0.08, winH - 0.08)),
      windowGlassMat,
    );
    glass.position.z = -0.22;
    winGroup.add(glass);

    // Crisp architectural wooden French-pane mullions (3 rows x 2 columns)
    const mulV = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.08, winH, 0.12)),
      mahoganyMat,
    );
    mulV.position.z = -0.18;
    winGroup.add(mulV);

    for (const hy of [-0.75, 0.75]) {
      const mulH = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(winW, 0.075, 0.12)),
        mahoganyMat,
      );
      mulH.position.set(0, hy, -0.18);
      winGroup.add(mulH);
    }

    // Brushed-brass curtain rod with sculpted end finials
    const rod = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.036, 0.036, winW + 1.05, 12)),
      materials.goldMetal,
    );
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, winH / 2 + 0.34, 0.28);
    winGroup.add(rod);

    for (const side of [-1, 1]) {
      const finial = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.075, 12, 10)),
        materials.goldMetal,
      );
      finial.position.set(side * (winW / 2 + 0.56), winH / 2 + 0.34, 0.28);
      winGroup.add(finial);

      // Draped crimson velvet curtain pleats framing each side of the window (leaving center 100% open to view!)
      for (let pleat = 0; pleat < 3; pleat++) {
        const px = side * (winW / 2 + 0.16 - pleat * 0.12);
        const curtainCol = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.11, 0.15, winH + 1.25, 10)),
          curtainVelvetMat,
        );
        curtainCol.position.set(px, -0.28, 0.24 + (pleat % 2) * 0.04);
        curtainCol.scale.set(0.95, 1, 0.65);
        winGroup.add(curtainCol);
      }

      // Golden tie-back band
      const tieBack = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.18, 0.025, 8, 16)),
        materials.goldMetal,
      );
      tieBack.rotation.x = Math.PI / 2;
      tieBack.position.set(side * (winW / 2 + 0.06), -0.65, 0.26);
      winGroup.add(tieBack);
    }

    // Festive pine wreath suspended neatly in the upper half of each window
    const wreath = buildFestiveWreath(materials, 0.44);
    wreath.position.set(0, 0.75, 0.02);
    winGroup.add(wreath);

    // Warm brass candlestick sitting on the deep window sill
    const candleBase = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.075, 0.095, 0.16, 12)),
      materials.goldMetal,
    );
    candleBase.position.set(wx < 0 ? 0.68 : -0.68, -winH / 2 + 0.12, 0.12);
    winGroup.add(candleBase);

    const candleWax = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.042, 0.045, 0.32, 10)),
      creamVelvetMat,
    );
    candleWax.position.set(wx < 0 ? 0.68 : -0.68, -winH / 2 + 0.35, 0.12);
    winGroup.add(candleWax);

    const flame = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.036, 0.11, 8)),
      materials.warmFlameInner,
    );
    flame.position.set(wx < 0 ? 0.68 : -0.68, -winH / 2 + 0.56, 0.12);
    winGroup.add(flame);
    candleFlames.push(flame);

    winGroup.position.set(wx, 3.9, backZ);
    group.add(winGroup);
  }

  // --- TRUE 3D EXTERIOR SNOWY WINTER LANDSCAPE BEYOND THE BACK WALL (z ∈ [-8, -35]) ---
  const exteriorGroup = new THREE.Group();

  // Starry winter night sky & snow-capped distant mountain horizon panorama
  const skyTex = createExteriorWinterSkyTexture(anisotropy);
  disposableTextures.push(skyTex);
  const skyPlane = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(52, 24)),
    trackMat(new THREE.MeshBasicMaterial({ map: skyTex, fog: false })),
  );
  skyPlane.position.set(0, 8.2, -33.0);
  exteriorGroup.add(skyPlane);

  // Luminous full winter moon shining through the right window bay
  const moonDisc = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(1.18, 28)),
    trackMat(new THREE.MeshBasicMaterial({ color: 0xf4f8ff, fog: false })),
  );
  moonDisc.position.set(6.4, 7.6, -27.5);
  exteriorGroup.add(moonDisc);

  const moonHalo = new THREE.Sprite(
    trackMat(
      new THREE.SpriteMaterial({
        map: textures.sparkleMap,
        color: 0xaad2ff,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    ),
  );
  moonHalo.scale.set(7.4, 7.4, 1);
  moonHalo.position.set(6.4, 7.6, -27.2);
  exteriorGroup.add(moonHalo);

  // Rolling snow-blanketed 3D terrain outside the house (glistening moonlight snow!)
  const snowTerrainGeo = trackGeo(new THREE.PlaneGeometry(46, 26, 28, 16));
  const terrainPos = snowTerrainGeo.attributes.position;
  for (let i = 0; i < terrainPos.count; i++) {
    const tx = terrainPos.getX(i);
    const ty = terrainPos.getY(i);
    const hill =
      Math.sin(tx * 0.16 + 0.5) * 0.72 +
      Math.cos(ty * 0.22 - 0.4) * 0.58 +
      Math.max(0, -ty * 0.12);
    terrainPos.setZ(i, hill);
  }
  snowTerrainGeo.computeVertexNormals();

  const exteriorSnowGroundMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x89a9ce,
      emissive: 0x10233d,
      emissiveIntensity: 0.45,
      roughness: 0.8,
      metalness: 0.02,
      envMapIntensity: 0.18,
    }),
  );
  const snowTerrain = new THREE.Mesh(snowTerrainGeo, exteriorSnowGroundMat);
  snowTerrain.rotation.x = -Math.PI / 2;
  snowTerrain.position.set(0, 0.2, -20.5);
  exteriorGroup.add(snowTerrain);

  // 3D Snow-covered outdoor pine forest (InstancedMesh trunks + moonlit dark alpine pine foliage + frosty snow caps!)
  const pinePositions: Array<[number, number, number]> = [
    // Left window vista trees (x ∈ [-13, -2.5])
    [-11.2, -12.8, 1.15],
    [-9.4, -15.4, 1.32],
    [-7.6, -11.4, 0.92],
    [-6.2, -14.2, 1.24],
    [-5.0, -18.2, 1.48],
    [-3.7, -12.2, 1.02],
    [-8.5, -20.8, 1.55],
    [-4.3, -23.0, 1.62],
    [-12.4, -18.5, 1.42],
    [-2.4, -16.5, 1.2],
    // Right window vista trees (x ∈ [+2.5, +13])
    [3.4, -12.4, 0.98],
    [4.8, -15.8, 1.28],
    [6.5, -12.0, 0.94],
    [7.8, -16.8, 1.38],
    [9.4, -13.6, 1.16],
    [11.0, -17.5, 1.46],
    [5.6, -21.2, 1.58],
    [8.8, -22.5, 1.62],
    [2.6, -19.2, 1.35],
    [12.4, -14.8, 1.24],
  ];

  const extTrunkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x2a180e, roughness: 0.92, envMapIntensity: 0.14 }),
  );
  const extPineMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f2b22,
      emissive: 0x061414,
      emissiveIntensity: 0.35,
      roughness: 0.9,
      envMapIntensity: 0.15,
    }),
  );
  const extSnowCapMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xa6c0de,
      emissive: 0x162d4b,
      emissiveIntensity: 0.38,
      roughness: 0.74,
      envMapIntensity: 0.18,
    }),
  );

  const extTrunkInst = new THREE.InstancedMesh(
    trackGeo(new THREE.CylinderGeometry(0.18, 0.28, 1.4, 8)),
    extTrunkMat,
    pinePositions.length,
  );
  const extFoliageInst = new THREE.InstancedMesh(
    trackGeo(new THREE.ConeGeometry(1.38, 3.6, 10)),
    extPineMat,
    pinePositions.length * 2,
  );
  const extSnowCapInst = new THREE.InstancedMesh(
    trackGeo(new THREE.ConeGeometry(1.16, 1.45, 10)),
    extSnowCapMat,
    pinePositions.length * 2,
  );

  const extDummy = new THREE.Object3D();
  pinePositions.forEach(([px, pz, sc], i) => {
    const baseY = 0.6 + Math.max(0, (-pz - 10) * 0.08);
    extDummy.position.set(px, baseY + 0.65 * sc, pz);
    extDummy.rotation.set(0, i * 0.7, 0);
    extDummy.scale.setScalar(sc);
    extDummy.updateMatrix();
    extTrunkInst.setMatrixAt(i, extDummy.matrix);

    // Lower foliage tier + snow cap
    extDummy.position.set(px, baseY + 2.4 * sc, pz);
    extDummy.scale.set(sc, sc, sc);
    extDummy.updateMatrix();
    extFoliageInst.setMatrixAt(i * 2, extDummy.matrix);

    extDummy.position.set(px, baseY + 3.15 * sc, pz);
    extDummy.scale.set(sc * 0.92, sc * 0.82, sc * 0.92);
    extDummy.updateMatrix();
    extSnowCapInst.setMatrixAt(i * 2, extDummy.matrix);

    // Upper foliage tier + snow cap
    extDummy.position.set(px, baseY + 4.15 * sc, pz);
    extDummy.scale.set(sc * 0.72, sc * 0.76, sc * 0.72);
    extDummy.updateMatrix();
    extFoliageInst.setMatrixAt(i * 2 + 1, extDummy.matrix);

    extDummy.position.set(px, baseY + 4.78 * sc, pz);
    extDummy.scale.set(sc * 0.64, sc * 0.66, sc * 0.64);
    extDummy.updateMatrix();
    extSnowCapInst.setMatrixAt(i * 2 + 1, extDummy.matrix);
  });
  extTrunkInst.instanceMatrix.needsUpdate = true;
  extFoliageInst.instanceMatrix.needsUpdate = true;
  extSnowCapInst.instanceMatrix.needsUpdate = true;
  exteriorGroup.add(extTrunkInst, extFoliageInst, extSnowCapInst);

  // Charming distant snowy winter cottage with warm glowing windows visible through the left window!
  const cottage = new THREE.Group();
  const cottageBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.8, 1.9, 2.2)),
    mahoganyDarkMat,
  );
  cottageBody.position.y = 0.95;
  cottage.add(cottageBody);

  const cottageRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(2.35, 1.45, 4)),
    extSnowCapMat,
  );
  cottageRoof.rotation.y = Math.PI / 4;
  cottageRoof.position.y = 2.58;
  cottage.add(cottageRoof);

  const cottageWinMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xffd17a, fog: false }),
  );
  for (const cwx of [-0.62, 0.62]) {
    const cw = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.55, 0.62)), cottageWinMat);
    cw.position.set(cwx, 1.05, 1.12);
    cottage.add(cw);
  }
  cottage.position.set(-5.7, 1.1, -16.8);
  cottage.rotation.y = 0.24;
  exteriorGroup.add(cottage);

  // Charming glowing Victorian garden lamp post outside the right window!
  const gardenLamp = new THREE.Group();
  const lampPost = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.06, 0.1, 3.6, 10)),
    materials.tractNavy,
  );
  lampPost.position.y = 1.8;
  const lampLantern = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.26, 0)),
    warmGlowShadeMat,
  );
  lampLantern.position.y = 3.72;
  const lampCap = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.32, 0.22, 6)),
    materials.tractNavy,
  );
  lampCap.position.y = 3.98;
  gardenLamp.add(lampPost, lampLantern, lampCap);
  gardenLamp.position.set(5.4, 0.8, -11.4);
  exteriorGroup.add(gardenLamp);

  // Snow-dusted wooden garden fence rail running gently behind the windows
  const fencePostGeo = trackGeo(new THREE.BoxGeometry(0.14, 1.15, 0.14));
  for (let fx = -10.5; fx <= 10.5; fx += 1.75) {
    const post = new THREE.Mesh(fencePostGeo, mahoganyDarkMat);
    post.position.set(fx, 1.22, -10.2);
    exteriorGroup.add(post);
  }
  const fenceRail = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(22.0, 0.1, 0.08)),
    mahoganyDarkMat,
  );
  fenceRail.position.set(0, 1.52, -10.2);
  const fenceSnowCap = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(22.0, 0.065, 0.11)),
    extSnowCapMat,
  );
  fenceSnowCap.position.set(0, 1.6, -10.2);
  exteriorGroup.add(fenceRail, fenceSnowCap);

  // Live drifting snowflakes falling outdoors right behind the windows!
  const exteriorSnow = new SnowParticleSystem({
    count: isMobileViewport ? 140 : 220,
    bounds: { minX: -12, maxX: 12, minY: 1.0, maxY: 9.2, minZ: -20, maxZ: -8.2 },
    color: 0xeef6ff,
    size: isMobileViewport ? 0.3 : 0.28,
    opacity: 0.9,
    minSpeed: 0.45,
    maxSpeed: 1.05,
    swayAmplitude: 0.28,
    map: textures.snowflakeMap,
    seed: 9421,
  });
  exteriorGroup.add(exteriorSnow.points);

  group.add(exteriorGroup);

  // =========================================================================
  // 4. REAL ARCHITECTURAL DOORS (LEFT GRAND DOUBLE DOORS + RIGHT PASSAGE DOOR)
  // =========================================================================
  // 4A. Left Wall Grand Mahogany Double Entry Doors with Glowing Transom & Holiday Wreath
  const doubleDoorGroup = new THREE.Group();
  const ddW = 2.7;
  const ddH = 4.35;

  // Solid architectural jambs & pediment header
  const jambL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, ddH + 0.95, 0.26)), mahoganyMat);
  jambL.position.set(-ddW / 2 - 0.11, (ddH + 0.95) / 2, 0.06);
  const jambR = jambL.clone();
  jambR.position.x = ddW / 2 + 0.11;
  const header = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(ddW + 0.72, 0.28, 0.34)), mahoganyMat);
  header.position.set(0, ddH + 0.98, 0.1);
  const transomBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(ddW + 0.2, 0.14, 0.24)), mahoganyMat);
  transomBar.position.set(0, ddH + 0.05, 0.06);
  doubleDoorGroup.add(jambL, jambR, header, transomBar);

  // Warm illuminated hallway transom window above the double doors
  const transomGlass = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(ddW, 0.78)),
    warmGlowShadeMat,
  );
  transomGlass.position.set(0, ddH + 0.5, 0.05);
  doubleDoorGroup.add(transomGlass);

  for (const tx of [-0.65, 0, 0.65]) {
    const bar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.8, 0.12)), mahoganyMat);
    bar.position.set(tx, ddH + 0.5, 0.08);
    doubleDoorGroup.add(bar);
  }

  const leafLeft = buildArchitecturalDoorLeaf(
    ddW / 2 - 0.02,
    ddH,
    mahoganyMat,
    mahoganyDarkMat,
    materials.goldMetal,
    1,
  );
  leafLeft.position.set(-ddW / 4 - 0.01, 0, 0.04);
  const leafRight = buildArchitecturalDoorLeaf(
    ddW / 2 - 0.02,
    ddH,
    mahoganyMat,
    mahoganyDarkMat,
    materials.goldMetal,
    -1,
  );
  leafRight.position.set(ddW / 4 + 0.01, 0, 0.04);
  doubleDoorGroup.add(leafLeft, leafRight);

  const doorWreath = buildFestiveWreath(materials, 0.42);
  doorWreath.position.set(0, 3.05, 0.16);
  doubleDoorGroup.add(doorWreath);

  // Flanking warm brass wall sconces beside the grand double entry doors
  for (const sx of [-1.92, 1.92]) {
    const sconce = buildWallSconce(materials.goldMetal, warmGlowShadeMat);
    sconce.position.set(sx, 3.25, 0.04);
    doubleDoorGroup.add(sconce);
  }

  doubleDoorGroup.position.set(-9.14, 0, 2.2);
  doubleDoorGroup.rotation.y = Math.PI / 2;
  group.add(doubleDoorGroup);

  // 4B. Right Wall Paneled Interior Passage Door (leading to dining room / foyer)
  const sideDoorGroup = new THREE.Group();
  const sdW = 1.56;
  const sdH = 4.05;
  const sdJambL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, sdH + 0.16, 0.24)), mahoganyMat);
  sdJambL.position.set(-sdW / 2 - 0.09, (sdH + 0.16) / 2, 0.05);
  const sdJambR = sdJambL.clone();
  sdJambR.position.x = sdW / 2 + 0.09;
  const sdHeader = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(sdW + 0.56, 0.24, 0.3)), mahoganyMat);
  sdHeader.position.set(0, sdH + 0.14, 0.08);
  sideDoorGroup.add(sdJambL, sdJambR, sdHeader);

  const singleLeaf = buildArchitecturalDoorLeaf(
    sdW,
    sdH,
    mahoganyMat,
    mahoganyDarkMat,
    materials.goldMetal,
    -1,
  );
  singleLeaf.position.set(0, 0, 0.04);
  sideDoorGroup.add(singleLeaf);

  const rightSconce = buildWallSconce(materials.goldMetal, warmGlowShadeMat);
  rightSconce.position.set(-1.35, 3.15, 0.04);
  sideDoorGroup.add(rightSconce);

  sideDoorGroup.position.set(9.14, 0, 4.1);
  sideDoorGroup.rotation.y = -Math.PI / 2;
  group.add(sideDoorGroup);

  // =========================================================================
  // 5. LUXURY FURNISHINGS & WELL-ARRANGED LIVING ROOM DECOR
  // =========================================================================

  // 5A. Tufted Cream Velvet Chesterfield Sofa (Left side, angled warmly toward tree & table)
  const sofa = new THREE.Group();
  // Turned walnut legs
  const legGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.04, 0.26, 10));
  for (const [lx, lz] of [
    [-1.78, -0.62],
    [1.78, -0.62],
    [-1.78, 0.62],
    [1.78, 0.62],
  ]) {
    const leg = new THREE.Mesh(legGeo, mahoganyDarkMat);
    leg.position.set(lx, 0.13, lz);
    sofa.add(leg);
  }
  // Upholstered base deck
  const sofaBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.92, 0.36, 1.56)), creamVelvetMat);
  sofaBase.position.set(0, 0.42, 0);
  sofaBase.castShadow = true;
  sofaBase.receiveShadow = true;
  sofa.add(sofaBase);

  // 3 plump tailored seat cushions
  for (const cx of [-1.06, 0, 1.06]) {
    const cushion = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.02, 0.24, 1.24)), creamVelvetMat);
    cushion.position.set(cx, 0.72, 0.12);
    cushion.castShadow = true;
    sofa.add(cushion);
  }

  // Sculpted Chesterfield high backrest + rolled top crest
  const sofaBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.86, 1.02, 0.38)), creamVelvetMat);
  sofaBack.position.set(0, 1.06, -0.58);
  sofaBack.castShadow = true;
  sofa.add(sofaBack);

  const backRoll = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.22, 0.22, 3.86, 14)),
    creamVelvetMat,
  );
  backRoll.rotation.z = Math.PI / 2;
  backRoll.position.set(0, 1.56, -0.58);
  sofa.add(backRoll);

  // Rolled Chesterfield armrests
  for (const side of [-1, 1]) {
    const armBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.86, 1.54)), creamVelvetMat);
    armBody.position.set(side * 1.8, 0.96, 0);
    armBody.castShadow = true;
    const armRoll = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.21, 0.21, 1.56, 14)),
      creamVelvetMat,
    );
    armRoll.rotation.x = Math.PI / 2;
    armRoll.position.set(side * 1.82, 1.38, 0);
    sofa.add(armBody, armRoll);
  }

  // Festive crimson velvet & TRACT-cobalt decorative throw pillows
  const pillowSpecs: Array<[number, number, number, number, THREE.Material]> = [
    [-1.32, 1.05, -0.22, 0.32, materials.velvetRed],
    [-0.95, 1.02, -0.26, 0.12, materials.tractCobalt],
    [1.32, 1.05, -0.22, -0.34, materials.velvetRed],
    [0.94, 1.01, -0.26, -0.15, materials.goldMetal],
  ];
  const pillowGeo = trackGeo(new THREE.BoxGeometry(0.52, 0.48, 0.18));
  for (const [px, py, pz, ry, mat] of pillowSpecs) {
    const p = new THREE.Mesh(pillowGeo, mat);
    p.position.set(px, py, pz);
    p.rotation.set(-0.22, ry, 0.08 * Math.sign(px));
    sofa.add(p);
  }

  sofa.position.set(-5.0, 0, 1.35);
  sofa.rotation.y = 0.62;
  group.add(sofa);

  // 5B. Warm Cognac Leather Wingback Armchair + Ottoman (Right side, angled warmly toward tree)
  const armchair = new THREE.Group();
  for (const [lx, lz] of [
    [-0.58, -0.52],
    [0.58, -0.52],
    [-0.58, 0.52],
    [0.58, 0.52],
  ]) {
    const leg = new THREE.Mesh(legGeo, mahoganyDarkMat);
    leg.position.set(lx, 0.13, lz);
    armchair.add(leg);
  }
  const chairBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.44, 0.36, 1.36)), cognacLeatherMat);
  chairBase.position.set(0, 0.42, 0);
  chairBase.castShadow = true;
  const chairCushion = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.06, 0.24, 1.12)), cognacLeatherMat);
  chairCushion.position.set(0, 0.72, 0.08);
  const chairBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.32, 1.34, 0.3)), cognacLeatherMat);
  chairBack.position.set(0, 1.24, -0.52);
  chairBack.castShadow = true;
  armchair.add(chairBase, chairCushion, chairBack);

  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.88, 0.58)), cognacLeatherMat);
    wing.position.set(side * 0.64, 1.44, -0.26);
    const arm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.62, 1.26)), cognacLeatherMat);
    arm.position.set(side * 0.64, 0.88, 0.02);
    const armCap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 1.28, 12)),
      cognacLeatherMat,
    );
    armCap.rotation.x = Math.PI / 2;
    armCap.position.set(side * 0.64, 1.18, 0.02);
    armchair.add(wing, arm, armCap);
  }
  // Cozy cream lumbar pillow on leather chair
  const chairPillow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.62, 0.38, 0.16)), creamVelvetMat);
  chairPillow.position.set(0, 1.0, -0.24);
  chairPillow.rotation.x = -0.22;
  armchair.add(chairPillow);

  // Matching leather footstool ottoman
  const ottoman = new THREE.Group();
  const ottTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.88, 0.24, 0.68)), cognacLeatherMat);
  ottTop.position.y = 0.44;
  ottoman.add(ottTop);
  for (const [ox, oz] of [
    [-0.34, -0.24],
    [0.34, -0.24],
    [-0.34, 0.24],
    [0.34, 0.24],
  ]) {
    const oLeg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.03, 0.34, 8)), mahoganyDarkMat);
    oLeg.position.set(ox, 0.17, oz);
    ottoman.add(oLeg);
  }
  ottoman.position.set(0, 0, 1.38);
  armchair.add(ottoman);

  armchair.position.set(5.15, 0, 1.05);
  armchair.rotation.y = -0.78;
  group.add(armchair);

  // 5C. Brushed-Brass Tripod Floor Lamp beside the Cognac Armchair
  const floorLamp = new THREE.Group();
  const pole = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.032, 0.045, 2.55, 12)),
    materials.goldMetal,
  );
  pole.position.y = 1.28;
  const lampBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.32, 0.38, 0.08, 20)),
    materials.goldMetal,
  );
  lampBase.position.y = 0.04;
  const lampShade = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.28, 0.44, 0.56, 20, 1, false)),
    warmGlowShadeMat,
  );
  lampShade.position.y = 2.66;
  floorLamp.add(pole, lampBase, lampShade);
  floorLamp.position.set(6.85, 0, -0.65);
  group.add(floorLamp);

  const lampGlowLight = new THREE.PointLight(0xffcb78, 4.2, 11, 1.5);
  lampGlowLight.position.set(6.85, 2.6, -0.65);
  group.add(lampGlowLight);
  warmLampLights.push(lampGlowLight);

  // 5D. Carved Walnut Coffee Table with Festive Evergreen Runner & 3 Flickering Pillar Candles
  // Positioned smoothly at z = +2.35, height = 0.72m -> camera glides cleanly over/past it!
  const coffeeTable = new THREE.Group();
  const tableTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.35, 0.11, 1.28)), mahoganyMat);
  tableTop.position.y = 0.72;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  const lowerShelf = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.05, 0.06, 1.02)), mahoganyDarkMat);
  lowerShelf.position.y = 0.24;
  coffeeTable.add(tableTop, lowerShelf);

  const tableLegGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.04, 0.7, 10));
  for (const [tx, tz] of [
    [-1.02, -0.5],
    [1.02, -0.5],
    [-1.02, 0.5],
    [1.02, 0.5],
  ]) {
    const tLeg = new THREE.Mesh(tableLegGeo, mahoganyDarkMat);
    tLeg.position.set(tx, 0.35, tz);
    coffeeTable.add(tLeg);
  }

  // Evergreen pine garland centerpiece tray + 3 warm glowing ivory pillar candles
  const centerpieceTray = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.46, 0.42, 0.04, 24)),
    materials.goldMetal,
  );
  centerpieceTray.position.set(0, 0.795, 0);
  coffeeTable.add(centerpieceTray);

  const pineCenter = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.32, 0.095, 10, 22)),
    materials.pineGreen,
  );
  pineCenter.rotation.x = Math.PI / 2;
  pineCenter.position.set(0, 0.86, 0);
  coffeeTable.add(pineCenter);

  const candlePositions: Array<[number, number, number]> = [
    [-0.14, 0.36, -0.04],
    [0.02, 0.48, 0.06],
    [0.18, 0.3, -0.05],
  ];
  for (const [cx, ch, cz] of candlePositions) {
    const wax = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.055, 0.058, ch, 12)),
      creamVelvetMat,
    );
    wax.position.set(cx, 0.81 + ch / 2, cz);
    coffeeTable.add(wax);

    const flame = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.038, 0.12, 8)),
      materials.warmFlameInner,
    );
    flame.position.set(cx, 0.81 + ch + 0.07, cz);
    coffeeTable.add(flame);
    candleFlames.push(flame);
  }

  // Stacked decorative holiday books on coffee table side
  const tableBook1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.44, 0.07, 0.32)), materials.tractNavy);
  tableBook1.position.set(-0.78, 0.81, 0.12);
  tableBook1.rotation.y = 0.14;
  const tableBook2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.06, 0.28)), materials.velvetRed);
  tableBook2.position.set(-0.77, 0.875, 0.11);
  tableBook2.rotation.y = 0.24;
  coffeeTable.add(tableBook1, tableBook2);

  coffeeTable.position.set(-0.45, 0, 2.35);
  group.add(coffeeTable);

  // 5E. Floor-to-Ceiling Built-In Mahogany Library Bookcase (Right Wall, z = -2.2) with 90 Instanced Books!
  const bookcase = new THREE.Group();
  const bcW = 3.4;
  const bcH = 6.2;
  const bcD = 0.62;

  const bcBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(bcW, bcH, 0.08)), mahoganyDarkMat);
  bcBack.position.set(0, bcH / 2, -bcD / 2 + 0.04);
  bookcase.add(bcBack);

  // Outer sides & crown top
  for (const sx of [-bcW / 2 + 0.08, -0.02, bcW / 2 - 0.08]) {
    const side = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, bcH, bcD)), mahoganyMat);
    side.position.set(sx, bcH / 2, 0);
    bookcase.add(side);
  }
  const bcCrown = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(bcW + 0.28, 0.26, bcD + 0.16)), mahoganyMat);
  bcCrown.position.set(0, bcH + 0.12, 0.04);
  bookcase.add(bcCrown);

  // 6 horizontal shelves
  const shelfYs = [0.22, 1.25, 2.25, 3.25, 4.25, 5.25];
  for (const sy of shelfYs) {
    const shelf = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(bcW - 0.16, 0.08, bcD - 0.06)), mahoganyMat);
    shelf.position.set(0, sy, 0.02);
    bookcase.add(shelf);
  }

  // 84 Instanced hardcover books filling the mahogany library shelves (1 draw call!)
  const bookCount = 84;
  const bookGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.56, 0.38));
  const bookMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.08 }));
  const booksInst = new THREE.InstancedMesh(bookGeo, bookMat, bookCount);
  const bookColors = [
    new THREE.Color(0x8e181d),
    new THREE.Color(0x183c63),
    new THREE.Color(0x1b4732),
    new THREE.Color(0xb88b2e),
    new THREE.Color(0x523120),
    new THREE.Color(0xd9cdb8),
  ];
  const bDummy = new THREE.Object3D();
  let bIdx = 0;
  for (let s = 0; s < shelfYs.length - 1; s++) {
    const sy = shelfYs[s];
    for (let slot = 0; slot < 17 && bIdx < bookCount; slot++) {
      const bx = -bcW / 2 + 0.34 + slot * 0.168;
      if (Math.abs(bx) < 0.16) continue; // skip center divider
      const bh = 0.78 + ((bIdx * 17) % 5) * 0.085;
      bDummy.position.set(bx, sy + 0.04 + bh * 0.28, 0.04);
      bDummy.rotation.set(0, 0, slot % 11 === 0 ? 0.12 : 0);
      bDummy.scale.set(0.85 + (bIdx % 3) * 0.14, bh, 0.9 + (bIdx % 2) * 0.12);
      bDummy.updateMatrix();
      booksInst.setMatrixAt(bIdx, bDummy.matrix);
      booksInst.setColorAt(bIdx, bookColors[bIdx % bookColors.length]);
      bIdx++;
    }
  }
  booksInst.count = bIdx;
  booksInst.instanceMatrix.needsUpdate = true;
  if (booksInst.instanceColor) booksInst.instanceColor.needsUpdate = true;
  booksInst.computeBoundingSphere();
  bookcase.add(booksInst);

  bookcase.position.set(8.84, 0, -2.55);
  bookcase.rotation.y = -Math.PI / 2;
  group.add(bookcase);

  // 5F. Left-Wall Mahogany Console Sideboard + Table Lamp + Framed Winter Painting
  const consoleGroup = new THREE.Group();
  const cTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 0.12, 0.78)), mahoganyMat);
  cTop.position.y = 1.18;
  const cBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.44, 0.78, 0.68)), mahoganyDarkMat);
  cBody.position.y = 0.72;
  consoleGroup.add(cTop, cBody);
  for (const [cx, cz] of [
    [-1.12, -0.28],
    [1.12, -0.28],
    [-1.12, 0.28],
    [1.12, 0.28],
  ]) {
    const cLeg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.035, 0.36, 8)), mahoganyDarkMat);
    cLeg.position.set(cx, 0.18, cz);
    consoleGroup.add(cLeg);
  }
  // Brass drawer pulls on console cabinet
  for (const dx of [-0.6, 0.6]) {
    const pull = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.04, 10, 8)), materials.goldMetal);
    pull.position.set(dx, 0.88, 0.36);
    consoleGroup.add(pull);
  }
  // Warm ceramic & gold table lamp on sideboard
  const tLampBase = new THREE.Mesh(
    trackGeo(new THREE.LatheGeometry([
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.14, 0.02),
      new THREE.Vector2(0.18, 0.22),
      new THREE.Vector2(0.11, 0.44),
      new THREE.Vector2(0.05, 0.56),
    ], 18)),
    materials.tractCobalt,
  );
  tLampBase.position.set(-0.72, 1.24, 0);
  const tLampShade = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.18, 0.3, 0.42, 18)),
    warmGlowShadeMat,
  );
  tLampShade.position.set(-0.72, 1.94, 0);
  consoleGroup.add(tLampBase, tLampShade);

  // Gilded framed winter oil painting hanging above the console sideboard
  const artTex = createFramedPaintingTexture(anisotropy);
  disposableTextures.push(artTex);
  const artFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.16, 1.62, 0.08)), materials.goldMetal);
  artFrame.position.set(0, 3.25, -0.3);
  const artCanvas = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(1.94, 1.4)),
    trackMat(new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.65 })),
  );
  artCanvas.position.set(0, 3.25, -0.25);
  consoleGroup.add(artFrame, artCanvas);

  consoleGroup.position.set(-8.76, 0, -3.25);
  consoleGroup.rotation.y = Math.PI / 2;
  group.add(consoleGroup);

  const leftLampLight = new THREE.PointLight(0xffcb78, 3.8, 11, 1.5);
  leftLampLight.position.set(-8.2, 2.35, -3.25);
  group.add(leftLampLight);
  warmLampLights.push(leftLampLight);

  // 5G. Grand Brass & Crystal Chandelier suspended from ceiling coffer intersection
  const chandelier = new THREE.Group();
  const chain = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.035, 0.035, 1.45, 8)),
    materials.goldMetal,
  );
  chain.position.y = 0.72;
  const hub = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.22, 16, 12)),
    materials.goldMetal,
  );
  hub.position.y = -0.1;
  const lowerFinial = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.16, 1)),
    materials.crystalSnowflake,
  );
  lowerFinial.position.y = -0.44;
  chandelier.add(chain, hub, lowerFinial);

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const arm = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.46, 0.024, 8, 18, Math.PI * 0.72)),
      materials.goldMetal,
    );
    arm.position.set(Math.cos(ang) * 0.44, -0.02, Math.sin(ang) * 0.44);
    arm.rotation.y = -ang;
    arm.rotation.z = Math.PI * 0.92;
    chandelier.add(arm);

    const bulbX = Math.cos(ang) * 0.86;
    const bulbZ = Math.sin(ang) * 0.86;
    const sleeve = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.22, 8)),
      creamVelvetMat,
    );
    sleeve.position.set(bulbX, 0.14, bulbZ);
    const bulb = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.068, 10, 8)),
      warmGlowShadeMat,
    );
    bulb.position.set(bulbX, 0.3, bulbZ);
    chandelier.add(sleeve, bulb);
  }
  chandelier.position.set(0, 7.62, 1.9);
  group.add(chandelier);

  const chandelierLight = new THREE.PointLight(0xffe0a3, 4.8, 18, 1.4);
  chandelierLight.position.set(0, 7.25, 1.9);
  group.add(chandelierLight);
  warmLampLights.push(chandelierLight);

  // =========================================================================
  // 6. OPEN-PASSAGE COZY BRICK FIREPLACE PORTAL (FRONT WALL AT z = +9.8)
  // =========================================================================
  const fireplaceRig = createFireplacePortalGroup(materials);
  fireplaceRig.group.position.set(
    SCENE_ANCHORS.fireplacePortal.x,
    SCENE_ANCHORS.fireplacePortal.y,
    SCENE_ANCHORS.fireplacePortal.z,
  );
  group.add(fireplaceRig.group);

  const dispose = () => {
    exteriorSnow.dispose();
    disposableTextures.forEach((t) => t.dispose());
    disposableMaterials.forEach((m) => m.dispose());
    disposableGeos.forEach((g) => g.dispose());
  };

  return {
    group,
    fireplaceRig,
    candleFlames,
    exteriorSnow,
    warmLampLights,
    dispose,
  };
}
