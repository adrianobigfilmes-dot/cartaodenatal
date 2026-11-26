import * as THREE from 'three';

export interface ProceduralTextureSet {
  brickMap: THREE.CanvasTexture;
  brickBump: THREE.CanvasTexture;
  woodFloorMap: THREE.CanvasTexture;
  woodFloorBump: THREE.CanvasTexture;
  woodFloorRoughness: THREE.CanvasTexture;
  rugMap: THREE.CanvasTexture;
  pineColorMap: THREE.CanvasTexture;
  pineBumpMap: THREE.CanvasTexture;
  goldRoughnessMap: THREE.CanvasTexture;
  goldBumpMap: THREE.CanvasTexture;
  giftWrapMap: THREE.CanvasTexture;
  giftBumpMap: THREE.CanvasTexture;
  candyStripeMap: THREE.CanvasTexture;
  sparkleMap: THREE.CanvasTexture;
  snowflakeMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makePrng(seedInit: number): () => number {
  let seed = seedInit % 2147483647;
  if (seed <= 0) seed += 2147483646;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function configureColorTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
  clamp = false,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function configureDataTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

/** Photorealistic aged terracotta/hearth brick masonry with recessed mortar & tactile grain. */
function createBrickCanvases(): { color: HTMLCanvasElement; bump: HTMLCanvasElement } {
  const size = 512;
  const color = document.createElement('canvas');
  color.width = size;
  color.height = size;
  const cCtx = color.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  cCtx.fillStyle = '#332721';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#1e1e1e';
  bCtx.fillRect(0, 0, size, size);

  const rows = 8;
  const cols = 4;
  const brickH = size / rows;
  const brickW = size / cols;
  const mortar = 7;
  const rand = makePrng(42);

  for (let row = 0; row < rows; row++) {
    const offsetX = (row % 2) * (brickW * 0.5);
    for (let col = -1; col <= cols; col++) {
      const bx = col * brickW + offsetX + mortar * 0.5;
      const by = row * brickH + mortar * 0.5;
      const bw = brickW - mortar;
      const bh = brickH - mortar;

      const r = Math.round(118 + rand() * 38);
      const g = Math.round(46 + rand() * 20);
      const b = Math.round(34 + rand() * 14);
      cCtx.fillStyle = `rgb(${r},${g},${b})`;
      cCtx.fillRect(bx, by, bw, bh);

      // Subtle mineral & fireplace soot variation inside each brick
      for (let s = 0; s < 14; s++) {
        const sx = bx + rand() * bw;
        const sy = by + rand() * bh;
        cCtx.fillStyle =
          rand() > 0.5
            ? `rgba(24, 12, 8, ${0.12 + rand() * 0.16})`
            : `rgba(235, 188, 152, ${0.06 + rand() * 0.08})`;
        cCtx.fillRect(sx, sy, 4 + rand() * 12, 3 + rand() * 8);
      }

      // Top highlight bevel & lower mortar shadow
      cCtx.fillStyle = 'rgba(255,214,185,0.08)';
      cCtx.fillRect(bx, by, bw, bh * 0.18);
      cCtx.fillStyle = 'rgba(18,8,6,0.22)';
      cCtx.fillRect(bx, by + bh * 0.8, bw, bh * 0.2);

      const bumpVal = Math.round(192 + rand() * 52);
      bCtx.fillStyle = `rgb(${bumpVal},${bumpVal},${bumpVal})`;
      bCtx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);
    }
  }

  return { color, bump };
}

/** Photorealistic warm oiled oak hardwood planks with fine wood grain, bevel seams & satin roughness. */
function createWoodCanvases(): {
  color: HTMLCanvasElement;
  bump: HTMLCanvasElement;
  roughness: HTMLCanvasElement;
} {
  const size = 512;
  const color = document.createElement('canvas');
  color.width = size;
  color.height = size;
  const cCtx = color.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  const roughness = document.createElement('canvas');
  roughness.width = size;
  roughness.height = size;
  const rCtx = roughness.getContext('2d')!;

  cCtx.fillStyle = '#4a2d1c';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#909090';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#6c6c6c';
  rCtx.fillRect(0, 0, size, size);

  const planks = 8;
  const plankH = size / planks;
  const rand = makePrng(109);

  for (let i = 0; i < planks; i++) {
    const y = i * plankH;
    const baseR = Math.round(72 + rand() * 24);
    const baseG = Math.round(44 + rand() * 14);
    const baseB = Math.round(26 + rand() * 10);
    cCtx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
    cCtx.fillRect(0, y + 1, size, plankH - 2);

    const plankRough = Math.round(82 + rand() * 38);
    rCtx.fillStyle = `rgb(${plankRough},${plankRough},${plankRough})`;
    rCtx.fillRect(0, y + 1, size, plankH - 2);

    // Organic fine wood grain striations
    for (let g = 0; g < 26; g++) {
      const gy = y + 2 + rand() * (plankH - 4);
      cCtx.fillStyle = `rgba(26, 13, 6, ${0.09 + rand() * 0.16})`;
      cCtx.fillRect(0, gy, size, 1.3);
      bCtx.fillStyle = `rgba(112,112,112,${0.28 + rand() * 0.2})`;
      bCtx.fillRect(0, gy, size, 1.1);
    }

    // Crisp recessed plank seams & staggered end joints
    cCtx.fillStyle = '#1e1008';
    cCtx.fillRect(0, y, size, 2.5);
    bCtx.fillStyle = '#1d1d1d';
    bCtx.fillRect(0, y, size, 2.5);
    rCtx.fillStyle = '#e0e0e0';
    rCtx.fillRect(0, y, size, 2.5);

    const jointX = Math.round(rand() * size);
    cCtx.fillRect(jointX, y, 2, plankH);
    bCtx.fillRect(jointX, y, 2, plankH);
    rCtx.fillRect(jointX, y, 2, plankH);
  }

  return { color, bump, roughness };
}

/** Luxury deep TRACT navy & velvet-crimson woven area rug with gold filigree border. */
function createRugCanvas(): HTMLCanvasElement {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#122645';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let i = 0; i < size; i += 4) {
    ctx.fillRect(i, 0, 1, size);
    ctx.fillRect(0, i, size, 1);
  }

  ctx.strokeStyle = '#7e171b';
  ctx.lineWidth = 36;
  ctx.strokeRect(28, 28, size - 56, size - 56);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 5;
  ctx.strokeRect(54, 54, size - 108, size - 108);
  ctx.lineWidth = 2;
  ctx.strokeRect(66, 66, size - 132, size - 132);

  ctx.fillStyle = '#d4af37';
  const corners = [
    [92, 92],
    [size - 92, 92],
    [92, size - 92],
    [size - 92, size - 92],
  ];
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx + 12, cy);
    ctx.lineTo(cx, cy + 12);
    ctx.lineTo(cx - 12, cy);
    ctx.closePath();
    ctx.fill();
  }

  return canvas;
}

/** Photorealistic evergreen spruce/fir needle texture + micro-relief bump map. */
function createPineCanvases(): { color: HTMLCanvasElement; bump: HTMLCanvasElement } {
  const size = 512;
  const color = document.createElement('canvas');
  color.width = size;
  color.height = size;
  const cCtx = color.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  cCtx.fillStyle = '#082013';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#1b1b1b';
  bCtx.fillRect(0, 0, size, size);

  const rand = makePrng(4099);

  const layers = [
    { count: 1600, lenMin: 18, lenMax: 34, width: 2.8, rBase: 10, gBase: 44, bBase: 25, bumpBase: 75 },
    { count: 1900, lenMin: 15, lenMax: 28, width: 2.2, rBase: 17, gBase: 72, bBase: 40, bumpBase: 145 },
    { count: 1400, lenMin: 12, lenMax: 24, width: 1.7, rBase: 30, gBase: 100, bBase: 56, bumpBase: 215 },
  ];

  for (const layer of layers) {
    cCtx.lineCap = 'round';
    bCtx.lineCap = 'round';
    cCtx.lineWidth = layer.width;
    bCtx.lineWidth = layer.width;

    for (let i = 0; i < layer.count; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const len = layer.lenMin + rand() * (layer.lenMax - layer.lenMin);
      const angle = Math.PI * 0.5 + (rand() - 0.5) * 1.35;
      const dx = Math.cos(angle) * len;
      const dy = Math.sin(angle) * len;

      const shade = 0.78 + rand() * 0.44;
      const r = Math.min(255, Math.round(layer.rBase * shade));
      const g = Math.min(255, Math.round(layer.gBase * shade));
      const b = Math.min(255, Math.round(layer.bBase * shade));
      const bv = Math.min(255, Math.round(layer.bumpBase * (0.85 + rand() * 0.25)));

      cCtx.strokeStyle = `rgb(${r},${g},${b})`;
      bCtx.strokeStyle = `rgb(${bv},${bv},${bv})`;

      for (const ox of [-size, 0, size]) {
        if (x + ox + dx < -40 || x + ox > size + 40) continue;
        cCtx.beginPath();
        cCtx.moveTo(x + ox, y);
        cCtx.lineTo(x + ox + dx, y + dy);
        cCtx.stroke();

        bCtx.beginPath();
        bCtx.moveTo(x + ox, y);
        bCtx.lineTo(x + ox + dx, y + dy);
        bCtx.stroke();
      }
    }
  }

  return { color, bump };
}

/** Brushed 24k metallic gold roughness + fine micro-grain bump maps. */
function createBrushedGoldCanvases(): { roughness: HTMLCanvasElement; bump: HTMLCanvasElement } {
  const size = 256;
  const roughness = document.createElement('canvas');
  roughness.width = size;
  roughness.height = size;
  const rCtx = roughness.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  rCtx.fillStyle = '#424242';
  rCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  const rand = makePrng(8821);
  for (let i = 0; i < 460; i++) {
    const y = rand() * size;
    const rv = Math.round(32 + rand() * 58);
    const bv = Math.round(108 + rand() * 44);
    rCtx.fillStyle = `rgba(${rv},${rv},${rv},0.45)`;
    rCtx.fillRect(0, y, size, 1 + rand() * 1.6);
    bCtx.fillStyle = `rgba(${bv},${bv},${bv},0.35)`;
    bCtx.fillRect(0, y, size, 1);
  }

  return { roughness, bump };
}

/** Luxury satin damask weave for wrapped holiday gift boxes & velvet surfaces. */
function createGiftWrapCanvases(): { color: HTMLCanvasElement; bump: HTMLCanvasElement } {
  const size = 256;
  const color = document.createElement('canvas');
  color.width = size;
  color.height = size;
  const cCtx = color.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  cCtx.fillStyle = '#eaeaea';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#787878';
  bCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < size; i += 3) {
    cCtx.fillStyle = 'rgba(255,255,255,0.06)';
    cCtx.fillRect(i, 0, 1, size);
    cCtx.fillStyle = 'rgba(0,0,0,0.04)';
    cCtx.fillRect(0, i, size, 1);
    bCtx.fillStyle = 'rgba(155,155,155,0.35)';
    bCtx.fillRect(i, 0, 1, size);
    bCtx.fillRect(0, i, size, 1);
  }

  cCtx.strokeStyle = 'rgba(255,255,255,0.16)';
  cCtx.lineWidth = 10;
  bCtx.strokeStyle = 'rgba(205,205,205,0.45)';
  bCtx.lineWidth = 10;
  for (let i = -size; i < size * 2; i += 32) {
    cCtx.beginPath();
    cCtx.moveTo(i, 0);
    cCtx.lineTo(i + size, size);
    cCtx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(i, 0);
    bCtx.lineTo(i + size, size);
    bCtx.stroke();
  }

  return { color, bump };
}

function createCandyStripeCanvas(): HTMLCanvasElement {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FAF8F5';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#B91C1C';
  ctx.lineWidth = 28;
  for (let i = -size; i < size * 2; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }

  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 5;
  for (let i = -size + 18; i < size * 2; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }

  return canvas;
}

function createSparkleCanvas(): HTMLCanvasElement {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;

  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.22, 'rgba(255, 246, 218, 0.88)');
  grad.addColorStop(0.55, 'rgba(220, 186, 86, 0.28)');
  grad.addColorStop(1, 'rgba(220, 186, 86, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

function createSnowflakeSpriteCanvas(): HTMLCanvasElement {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;

  const halo = ctx.createRadialGradient(half, half, 0, half, half, half);
  halo.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
  halo.addColorStop(0.32, 'rgba(248, 240, 215, 0.55)');
  halo.addColorStop(0.68, 'rgba(225, 200, 140, 0.14)');
  halo.addColorStop(1, 'rgba(225, 200, 140, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(half, half);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.6;
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -34);
    ctx.stroke();

    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(8, -26);
    ctx.moveTo(0, -18);
    ctx.lineTo(-8, -26);
    ctx.stroke();
    ctx.lineWidth = 2.6;
  }
  ctx.restore();

  return canvas;
}

export function createProceduralTextures(anisotropy: number): ProceduralTextureSet {
  const brick = createBrickCanvases();
  const wood = createWoodCanvases();
  const rug = createRugCanvas();
  const pine = createPineCanvases();
  const gold = createBrushedGoldCanvases();
  const gift = createGiftWrapCanvases();
  const candy = createCandyStripeCanvas();
  const sparkle = createSparkleCanvas();
  const snowflake = createSnowflakeSpriteCanvas();

  const brickMap = configureColorTexture(brick.color, anisotropy, 2.2, 2.2);
  const brickBump = configureDataTexture(brick.bump, anisotropy, 2.2, 2.2);
  const woodFloorMap = configureColorTexture(wood.color, anisotropy, 4.5, 4.5);
  const woodFloorBump = configureDataTexture(wood.bump, anisotropy, 4.5, 4.5);
  const woodFloorRoughness = configureDataTexture(wood.roughness, anisotropy, 4.5, 4.5);
  const rugMap = configureColorTexture(rug, anisotropy, 1, 1, true);
  const pineColorMap = configureColorTexture(pine.color, anisotropy, 3.5, 2.2);
  const pineBumpMap = configureDataTexture(pine.bump, anisotropy, 3.5, 2.2);
  const goldRoughnessMap = configureDataTexture(gold.roughness, anisotropy, 2, 2);
  const goldBumpMap = configureDataTexture(gold.bump, anisotropy, 2, 2);
  const giftWrapMap = configureColorTexture(gift.color, anisotropy, 1.5, 1.5);
  const giftBumpMap = configureDataTexture(gift.bump, anisotropy, 1.5, 1.5);
  const candyStripeMap = configureColorTexture(candy, anisotropy, 4, 1);
  const sparkleMap = configureColorTexture(sparkle, anisotropy, 1, 1, true);
  const snowflakeMap = configureColorTexture(snowflake, anisotropy, 1, 1, true);

  return {
    brickMap,
    brickBump,
    woodFloorMap,
    woodFloorBump,
    woodFloorRoughness,
    rugMap,
    pineColorMap,
    pineBumpMap,
    goldRoughnessMap,
    goldBumpMap,
    giftWrapMap,
    giftBumpMap,
    candyStripeMap,
    sparkleMap,
    snowflakeMap,
    dispose: () => {
      brickMap.dispose();
      brickBump.dispose();
      woodFloorMap.dispose();
      woodFloorBump.dispose();
      woodFloorRoughness.dispose();
      rugMap.dispose();
      pineColorMap.dispose();
      pineBumpMap.dispose();
      goldRoughnessMap.dispose();
      goldBumpMap.dispose();
      giftWrapMap.dispose();
      giftBumpMap.dispose();
      candyStripeMap.dispose();
      sparkleMap.dispose();
      snowflakeMap.dispose();
    },
  };
}
