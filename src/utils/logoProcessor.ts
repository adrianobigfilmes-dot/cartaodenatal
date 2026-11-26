import type { ProcessedLogoAssets } from '../types/experience';

export interface PixelProcessResult {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  backgroundType: 'white' | 'dark' | 'transparent';
}

/**
 * Pure RGBA pixel processor for the TRACT Contabilidade logo.
 * Automatically inspects corner pixels to detect whether the image has:
 *  - a white/near-white background (removes white smoothly while preserving crisp text & blue "A"),
 *  - a solid dark/navy background (like the uploaded brand card — keys out the navy backdrop smoothly
 *    while preserving the bright silver-white letters and cobalt-blue "A"), or
 *  - an already-transparent background.
 * Mutates `data` in-place and returns the tight non-transparent content bounding box.
 */
export function processLogoPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): PixelProcessResult {
  const sampleCoords = [
    [1, 1],
    [Math.max(0, width - 2), 1],
    [1, Math.max(0, height - 2)],
    [Math.max(0, width - 2), Math.max(0, height - 2)],
  ];

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let aSum = 0;
  for (const [sx, sy] of sampleCoords) {
    const idx = (sy * width + sx) * 4;
    rSum += data[idx];
    gSum += data[idx + 1];
    bSum += data[idx + 2];
    aSum += data[idx + 3];
  }

  const bgR = rSum / 4;
  const bgG = gSum / 4;
  const bgB = bSum / 4;
  const bgA = aSum / 4;
  const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;

  let backgroundType: 'white' | 'dark' | 'transparent' = 'transparent';
  if (bgA > 200) {
    backgroundType = bgLum >= 210 ? 'white' : 'dark';
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      let a = data[idx + 3];

      if (backgroundType === 'white') {
        // Compute distance from white background; keep blue "A" and darker letters crisp
        const dr = 255 - r;
        const dg = 255 - g;
        const db = 255 - b;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        const low = 24;
        const high = 72;
        if (dist <= low) {
          a = 0;
        } else if (dist < high) {
          const factor = (dist - low) / (high - low);
          a = Math.round(a * factor * factor);
        }
        data[idx + 3] = a;
      } else if (backgroundType === 'dark') {
        // Key out the solid navy/slate background smoothly while keeping bright letters & cobalt-blue "A"
        const dr = r - bgR;
        const dg = g - bgG;
        const db = b - bgB;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        const low = 22;
        const high = 68;
        if (dist <= low) {
          a = 0;
        } else if (dist < high) {
          const factor = (dist - low) / (high - low);
          a = Math.round(a * factor);
          // De-contaminate edge pixel toward foreground luminance to prevent dark halo on blue star
          const inv = 1 / Math.max(0.25, factor);
          data[idx] = Math.min(255, Math.max(0, Math.round(bgR + dr * inv)));
          data[idx + 1] = Math.min(255, Math.max(0, Math.round(bgG + dg * inv)));
          data[idx + 2] = Math.min(255, Math.max(0, Math.round(bgB + db * inv)));
        }
        data[idx + 3] = a;
      }

      if (a > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { cropX: 0, cropY: 0, cropW: width, cropH: height, backgroundType };
  }

  const pad = Math.round(Math.max(width, height) * 0.025);
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(width - cropX, maxX - minX + 1 + pad * 2);
  const cropH = Math.min(height - cropY, maxY - minY + 1 + pad * 2);

  return { cropX, cropY, cropW, cropH, backgroundType };
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

/**
 * Generates a high-craft fallback canvas logo for TRACT Contabilidade
 * in case external/static logo files are unavailable.
 */
export function buildFallbackTractLogoCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = 'alphabetic';

  // Draw serif "TR" + cobalt blue stylized "A" + serif "CT"
  ctx.font = '600 176px Georgia, "Times New Roman", serif';
  const leftText = 'TR';
  const rightText = 'CT';
  const leftW = ctx.measureText(leftText).width;
  const rightW = ctx.measureText(rightText).width;
  const aWidth = 128;
  const totalW = leftW + aWidth + rightW;
  const startX = (canvas.width - totalW) / 2;
  const baselineY = 205;

  ctx.fillStyle = '#E6E9EF';
  ctx.fillText(leftText, startX, baselineY);
  ctx.fillText(rightText, startX + leftW + aWidth, baselineY);

  // Stylized cobalt-blue geometric "A" (matching TRACT mark)
  const ax = startX + leftW + aWidth / 2;
  ctx.fillStyle = '#3B78C8';
  ctx.beginPath();
  ctx.moveTo(ax, 76);
  ctx.lineTo(ax + 54, baselineY);
  ctx.lineTo(ax + 30, baselineY);
  ctx.lineTo(ax - 2, 118);
  ctx.lineTo(ax - 42, baselineY - 12);
  ctx.lineTo(ax - 54, baselineY - 18);
  ctx.closePath();
  ctx.fill();

  // "Contabilidade" subtitle
  ctx.font = '400 72px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillStyle = '#DCE2EC';
  ctx.textAlign = 'center';
  ctx.fillText('Contabilidade', canvas.width / 2, 296);

  return canvas;
}

/**
 * Loads the attached TRACT logo (or /tract-logo.png), removes its solid background
 * automatically on an offscreen 2D canvas, tightly crops it, and returns both
 * a data URL and a reusable canvas for Three.js CanvasTexture.
 */
export async function loadProcessedTractLogo(): Promise<ProcessedLogoAssets> {
  const candidates = ['/assets/aistudio/foto_3faf9e85.png', '/tract-logo.png'];
  let loadedImg: HTMLImageElement | null = null;

  for (const url of candidates) {
    try {
      loadedImg = await loadImageElement(url);
      break;
    } catch {
      // Try next candidate
    }
  }

  if (!loadedImg) {
    const fallbackCanvas = buildFallbackTractLogoCanvas();
    return {
      canvas: fallbackCanvas,
      dataUrl: fallbackCanvas.toDataURL('image/png'),
      aspect: fallbackCanvas.width / fallbackCanvas.height,
      source: 'fallback',
    };
  }

  // Cap processing resolution at 1024px max side for fast startup on mobile phones
  const maxDim = 1024;
  const scale = Math.min(1, maxDim / Math.max(loadedImg.naturalWidth, loadedImg.naturalHeight));
  const w = Math.max(1, Math.round(loadedImg.naturalWidth * scale));
  const h = Math.max(1, Math.round(loadedImg.naturalHeight * scale));

  const workCanvas = document.createElement('canvas');
  workCanvas.width = w;
  workCanvas.height = h;
  const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
  if (!workCtx) {
    const fallbackCanvas = buildFallbackTractLogoCanvas();
    return {
      canvas: fallbackCanvas,
      dataUrl: fallbackCanvas.toDataURL('image/png'),
      aspect: fallbackCanvas.width / fallbackCanvas.height,
      source: 'fallback',
    };
  }

  workCtx.drawImage(loadedImg, 0, 0, w, h);
  const imgData = workCtx.getImageData(0, 0, w, h);
  const { cropX, cropY, cropW, cropH } = processLogoPixels(imgData.data, w, h);
  workCtx.putImageData(imgData, 0, 0);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = Math.max(1, cropW);
  outputCanvas.height = Math.max(1, cropH);
  const outCtx = outputCanvas.getContext('2d');
  if (outCtx) {
    outCtx.drawImage(
      workCanvas,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH,
    );
  }

  return {
    canvas: outputCanvas,
    dataUrl: outputCanvas.toDataURL('image/png'),
    aspect: outputCanvas.width / outputCanvas.height,
    source: 'uploaded',
  };
}
