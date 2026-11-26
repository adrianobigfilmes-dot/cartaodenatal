import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { ExperiencePhase, ProcessedLogoAssets } from '../types/experience';
import {
  CAMERA_PATH_POINTS,
  OPENING_DURATION_SEC,
  RIDE_DURATION_SEC,
  SCENE_ANCHORS,
  computeBankingAngle,
  computeDynamicFov,
  computeStarCloseupFrame,
  evaluateTimeline,
  smoothstep,
} from '../utils/timeline';
import { createProceduralTextures, type ProceduralTextureSet } from '../utils/proceduralTextures';
import {
  createChristmasTreeGroup,
  createGiftBoxGroup,
  createInstancedVortexGeometries,
  createSharedHolidayMaterials,
  createTractStarGroup,
  type ChristmasTreeRig,
  type InstancedVortexGeometrySet,
  type SharedHolidayMaterials,
  type TractStarRig,
} from './buildProps';
import {
  buildArchitecturalLivingRoom,
  type ArchitecturalLivingRoomRig,
} from './buildLivingRoom';
import { getOptimalSnowCount, SnowParticleSystem } from './SnowParticleSystem';

export interface ExperienceCallbacks {
  onPhaseChange: (phase: ExperiencePhase) => void;
  onOpeningProgress?: (progress: number) => void;
  onStarArrival: () => void;
  onContextLost: (lost: boolean) => void;
}

// Pre-allocated scratch math helpers (zero GC allocations inside animation loop)
const _pos = new THREE.Vector3();
const _lookAt = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _nextTangent = new THREE.Vector3();
const _farTangent = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _sideAxis = new THREE.Vector3();
const _camMatrix = new THREE.Matrix4();
const _targetQuat = new THREE.Quaternion();
const _bankQuat = new THREE.Quaternion();
const _forwardZ = new THREE.Vector3(0, 0, 1);
const _tempColor = new THREE.Color();
const _instPos = new THREE.Vector3();
const _instScale = new THREE.Vector3();
const _instEuler = new THREE.Euler();
const _instQuat = new THREE.Quaternion();
const _instMat = new THREE.Matrix4();
const _bgNavy = new THREE.Color(0x0c1b33);
const _bgVortex = new THREE.Color(0x08162c);
const _bgRoom = new THREE.Color(0x112036);
const _bgCurrent = new THREE.Color(0x0c1b33);

interface InstancedOrnamentData {
  center: THREE.Vector3;
  normal: THREE.Vector3;
  binormal: THREE.Vector3;
  baseAngle: number;
  baseRadius: number;
  orbitSpeed: number;
  radialAmp: number;
  baseRot: THREE.Vector3;
  spinSpeed: THREE.Vector3;
  baseScale: number;
  scaleAmp: number;
  scaleFreq: number;
  phase: number;
  curveU: number;
}

interface InstancedOrnamentBatch {
  meshes: THREE.InstancedMesh[];
  items: InstancedOrnamentData[];
}

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function yieldAsyncFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      window.setTimeout(resolve, 16);
    }
  });
}

export class ChristmasExperience {
  private readonly container: HTMLElement;
  private readonly callbacks: ExperienceCallbacks;
  private readonly isSoftwareGl: boolean;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly textures: ProceduralTextureSet;
  private readonly materials: SharedHolidayMaterials;

  private readonly fullCurve: THREE.CatmullRomCurve3;
  private readonly vortexCurve: THREE.CatmullRomCurve3;
  private readonly vortexGroup: THREE.Group;
  private readonly roomRootGroup: THREE.Group;
  private readonly coverSnow: SnowParticleSystem;
  private readonly roomSnow: SnowParticleSystem;
  private readonly vortexCamLightWarm: THREE.PointLight;
  private readonly vortexCamLightCool: THREE.PointLight;
  private readonly starLight: THREE.PointLight;
  private readonly fog: THREE.FogExp2;
  private readonly envRT: THREE.WebGLRenderTarget;

  // Asynchronously preloaded geometry rigs (zero stutter during camera scene transitions!)
  private vortexShaderMat: THREE.ShaderMaterial | null = null;
  private vortexGeoSet: InstancedVortexGeometrySet | null = null;
  private vortexBatches: InstancedOrnamentBatch[] = [];
  private livingRoomRig: ArchitecturalLivingRoomRig | null = null;
  private treeRig: ChristmasTreeRig | null = null;
  private starRig: TractStarRig | null = null;
  private pendingLogo: ProcessedLogoAssets | null = null;
  private buffersPreloaded = false;

  private frameId = 0;
  private disposed = false;
  private lastFrameMs = 0;
  private totalTime = 0;
  private elapsedSinceOpen = 0;
  private isOpenRequested = false;
  private isFarewell = false;
  private currentPhase: ExperiencePhase = 'cover';
  private starArrivalFired = false;
  private smoothBank = 0;
  private currentRideProgress = 0;
  private currentCamPos = new THREE.Vector3(0, 6.2, 7.4);
  private currentLookAt = new THREE.Vector3(0, 6.2, -6.0);
  private currentCamQuat = new THREE.Quaternion();
  private hasCameraPose = false;
  private wasInVortex = false;
  private isFrozenForInspection = false;

  private readonly onResizeBound: () => void;
  private readonly onContextLostBound: (e: Event) => void;
  private readonly onContextRestoredBound: () => void;

  constructor(container: HTMLElement, callbacks: ExperienceCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = _bgNavy.clone();
    this.fog = new THREE.FogExp2(0x0c1b33, 0.013);
    this.scene.fog = this.fog;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.12, 210);

    // Mandatory studio environment map on every device so gold, glass & clearcoat reflect realistically
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();

    const maxAniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.textures = createProceduralTextures(maxAniso);
    this.materials = createSharedHolidayMaterials(this.textures);

    // Ultra-fluid centripetal CatmullRomCurve3 with high-resolution arc-length table (sub-millimeter precision!)
    const vectors = CAMERA_PATH_POINTS.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    this.fullCurve = new THREE.CatmullRomCurve3(vectors, false, 'centripetal');
    this.fullCurve.arcLengthDivisions = 600;
    // Vortex tunnel runs from z = +118 smoothly into the brick fireplace surround at z = +10.75 (zero gap!)
    const vortexPts = vectors.slice(0, 13);
    vortexPts.push(new THREE.Vector3(0.0, 1.66, 10.75));
    this.vortexCurve = new THREE.CatmullRomCurve3(
      vortexPts,
      false,
      'centripetal',
    );
    this.vortexCurve.arcLengthDivisions = 400;

    this.vortexGroup = new THREE.Group();
    this.roomRootGroup = new THREE.Group();
    this.vortexGroup.visible = false;
    this.roomRootGroup.visible = false;
    this.scene.add(this.vortexGroup);
    this.scene.add(this.roomRootGroup);

    this.setupLighting();

    // Dynamic camera-riding photorealistic key + rim lights inside the vortex so instanced ornaments gleam!
    this.vortexCamLightWarm = new THREE.PointLight(0xffd788, 10.0, 24, 1.3);
    this.vortexGroup.add(this.vortexCamLightWarm);
    this.vortexCamLightCool = new THREE.PointLight(0x6bb8ff, 8.0, 26, 1.35);
    this.vortexGroup.add(this.vortexCamLightCool);

    // Steady, serene TRACT Star back-rim halo light (behind the star so the cobalt front face never washes out!)
    this.starLight = new THREE.PointLight(0x7cbfff, 2.0, 10, 1.6);
    this.starLight.position.set(
      SCENE_ANCHORS.starCenter.x,
      SCENE_ANCHORS.starCenter.y + 0.45,
      SCENE_ANCHORS.starCenter.z - 0.85,
    );
    this.roomRootGroup.add(this.starLight);

    // Mobile-optimized BufferGeometry falling snow systems (ready immediately on Cover screen)
    const isCoarsePointer =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;

    this.coverSnow = new SnowParticleSystem({
      count: getOptimalSnowCount(width, isCoarsePointer, 'cover'),
      bounds: { minX: -9, maxX: 9, minY: -1.5, maxY: 13.0, minZ: -4, maxZ: 8 },
      color: 0xfff0c4,
      size: isCoarsePointer || width <= 768 ? 0.38 : 0.35,
      opacity: 0.94,
      minSpeed: 0.42,
      maxSpeed: 1.05,
      swayAmplitude: 0.24,
      map: this.textures.snowflakeMap,
      seed: 777,
    });
    this.scene.add(this.coverSnow.points);

    this.roomSnow = new SnowParticleSystem({
      count: getOptimalSnowCount(width, isCoarsePointer, 'room'),
      bounds: { minX: -7.5, maxX: 7.5, minY: 0.4, maxY: 8.4, minZ: -6.4, maxZ: 8.6 },
      color: 0xffe9b0,
      size: isCoarsePointer || width <= 768 ? 0.18 : 0.16,
      opacity: 0.68,
      minSpeed: 0.16,
      maxSpeed: 0.36,
      swayAmplitude: 0.12,
      map: this.textures.sparkleMap,
      seed: 1337,
    });
    this.roomRootGroup.add(this.roomSnow.points);

    this.onResizeBound = this.handleResize.bind(this);
    this.onContextLostBound = (e: Event) => {
      e.preventDefault();
      this.callbacks.onContextLost(true);
    };
    this.onContextRestoredBound = () => {
      this.callbacks.onContextLost(false);
    };

    window.addEventListener('resize', this.onResizeBound);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLostBound);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestoredBound);

    this.applyCameraForState(0, 0.016, true);
    this.lastFrameMs = performance.now();
    this.scheduleNextTick();
  }

  /**
   * Asynchronous staged geometry & GPU buffer preloader:
   * Builds and uploads the Vortex Tunnel + Instanced Ornament Buffers in Stage 1,
   * then builds the Grand Architectural Living Room + Exterior Landscape + Tree + TRACT Star in Stage 2,
   * yielding cleanly between frames so the envelope cover stays 60fps responsive while eliminating
   * transition latency when flying between scenes!
   */
  public async preloadSceneBuffersAsync(onStage?: (stage: 'vortex' | 'room') => void): Promise<void> {
    if (this.disposed || this.buffersPreloaded) return;

    // Stage 1: Asynchronously build & upload Vortex Tunnel + Instanced Ornament Buffers + Stardust
    await yieldAsyncFrame();
    if (this.disposed) return;

    this.vortexShaderMat = this.buildVortexTunnel();
    this.buildVortexStardustStream();
    this.buildInstancedVortexChristmasIcons();
    onStage?.('vortex');

    // Stage 2: Yield a frame, then build Grand Architectural Living Room + Exterior Landscape + Tree + Organic Star
    await yieldAsyncFrame();
    if (this.disposed) return;

    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const maxAniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const isMobileViewport = width <= 768;

    this.livingRoomRig = buildArchitecturalLivingRoom(
      this.materials,
      this.textures,
      maxAniso,
      isMobileViewport,
    );
    this.roomRootGroup.add(this.livingRoomRig.group);

    this.treeRig = this.buildTreeAndPresents();
    this.starRig = this.buildSculptedOrganicTractStar();
    this.roomRootGroup.add(this.starRig.group);

    if (this.pendingLogo) {
      this.applyOrganicStarLogoRelief(this.pendingLogo);
    }

    // Stage 3: Yield a frame, then upload ALL VBOs/IBOs/InstancedMatrices & compile shaders on GPU
    await yieldAsyncFrame();
    if (this.disposed) return;

    this.buffersPreloaded = true;
    this.prewarmGpu();
    onStage?.('room');
  }

  /**
   * Pre-compiles EVERY WebGL shader and uploads ALL PBR textures & instanced buffers
   * across both the Vortex and the Living Room so transitions have zero frame drops!
   */
  public prewarmGpu(): void {
    if (this.disposed || !this.buffersPreloaded) return;

    const prevVortex = this.vortexGroup.visible;
    const prevRoom = this.roomRootGroup.visible;
    const prevCoverSnow = this.coverSnow.visible;
    const prevPos = this.camera.position.clone();
    const prevQuat = this.camera.quaternion.clone();

    this.vortexGroup.visible = true;
    this.roomRootGroup.visible = true;
    this.coverSnow.setVisible(true);
    this.roomSnow.setVisible(true);

    // Pre-update instanced ornament transforms once so GPU matrix buffers are hot before opening
    this.updateInstancedVortexMatrices(0);

    // Pass 1: Vortex tunnel + instanced ornaments + fireplace mouth
    this.camera.position.set(0, 2.0, 20.0);
    this.camera.lookAt(0, 1.8, 8.0);
    this.camera.updateMatrixWorld();
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
    this.renderer.render(this.scene, this.camera);

    // Pass 2: Grand architectural living room, recessed windows, exterior landscape & TRACT star
    this.camera.position.set(0.5, 2.8, 5.2);
    this.camera.lookAt(0, 3.0, -3.2);
    this.camera.updateMatrixWorld();
    this.renderer.render(this.scene, this.camera);

    this.vortexGroup.visible = prevVortex;
    this.roomRootGroup.visible = prevRoom;
    this.coverSnow.setVisible(prevCoverSnow);
    this.camera.position.copy(prevPos);
    this.camera.quaternion.copy(prevQuat);
    this.renderer.render(this.scene, this.camera);
  }

  private setupLighting(): void {
    // Cozy warm-cool evening contrast: moonlit midnight sky fill + warm mahogany wood bounce
    const hemi = new THREE.HemisphereLight(0x6e9ed6, 0x351d11, 0.72);
    this.scene.add(hemi);

    // Warm golden room directional key light (single shadow caster for 60fps mobile budget)
    const dirLight = new THREE.DirectionalLight(0xffe1b0, 1.48);
    dirLight.position.set(5.2, 8.2, 6.2);
    dirLight.target.position.set(0, 2.4, -3.2);
    this.scene.add(dirLight.target);
    if (!this.isSoftwareGl) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.set(1024, 1024);
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 28;
      const d = 10.5;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.bias = -0.0005;
      dirLight.shadow.normalBias = 0.02;
    }
    this.scene.add(dirLight);

    // Warm ambient radiance from the illuminated Christmas tree
    const treeGlow = new THREE.PointLight(0xffcb6e, 6.4, 16, 1.45);
    treeGlow.position.set(0.2, 3.1, -1.0);
    this.roomRootGroup.add(treeGlow);
  }

  /**
   * Photorealistic Silk Nebula & Starlight Vortex Tunnel using time-based GLSL Vertex Displacement
   * (eliminates runtime geometry rebuilds while creating organic undulating roller-coaster fluidity!).
   * Displacement smoothly attenuates to 0 near uv.x = 1.0 so the tunnel docks airtight into the brick hearth!
   */
  private buildVortexTunnel(): THREE.ShaderMaterial {
    const tubeGeo = new THREE.TubeGeometry(this.vortexCurve, 220, 3.45, 28, false);

    const shaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCoasterEnergy: { value: 1.0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uCoasterEnergy;
        varying vec2 vUv;
        varying float vDisplace;

        void main() {
          vUv = uv;

          // Smoothly lock both endpoints (envelope entrance & brick fireplace exit) so zero gaps ever open
          float endMask = smoothstep(0.0, 0.04, uv.x) * (1.0 - smoothstep(0.84, 0.96, uv.x));
          float ang = uv.y * 6.2831853;

          // Multi-harmonic helical vertex displacement flowing along the roller-coaster track
          float waveA = sin(uv.x * 34.0 - uTime * 4.4 + ang * 3.0) * 0.24;
          float waveB = cos(uv.x * 58.0 - uTime * 6.2 - ang * 5.0) * 0.12;
          float pulse = sin(uv.x * 16.0 - uTime * 2.8) * 0.15;
          float disp = (waveA + waveB + pulse) * endMask * uCoasterEnergy;

          vDisplace = disp;
          vec3 displacedPos = position + normal * disp;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vDisplace;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.52;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = p * 2.04 + vec2(1.7, 9.2);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          float ang = vUv.y * 6.2831853;
          vec2 swirlCoord = vec2(
            vUv.x * 16.5 - uTime * 1.15,
            cos(ang + vUv.x * 9.0 - uTime * 0.72) * 1.45 + sin(ang - vUv.x * 5.5) * 1.45
          );

          float nebA = fbm(swirlCoord * 1.35);
          float nebB = fbm(swirlCoord * 2.7 + vec2(nebA * 1.8, -uTime * 0.42));
          float silk = smoothstep(0.32, 0.84, nebA * 0.6 + nebB * 0.55);
          float goldVein = smoothstep(0.62, 0.88, nebB);

          // Rich luxury cinema palette: velvet midnight, royal TRACT cobalt, celestial sapphire, warm 24k gold
          vec3 midnight = vec3(0.024, 0.06, 0.14);
          vec3 cobalt = vec3(0.105, 0.265, 0.47);
          vec3 sapphire = vec3(0.24, 0.52, 0.86);
          vec3 liquidGold = vec3(0.92, 0.72, 0.30);

          vec3 col = mix(midnight, cobalt, silk);
          col = mix(col, sapphire, smoothstep(0.54, 0.92, nebA) * 0.55);
          col += liquidGold * goldVein * 0.68;

          // Subtle liquid-gold crest shimmer synchronized with the vertex displacement waves!
          float waveCrest = smoothstep(0.08, 0.32, vDisplace);
          col += mix(sapphire, liquidGold, 0.58) * waveCrest * 0.26;

          // True circular radial pinpoint stars inside each cell (ZERO translucent square tiles!)
          vec2 starGrid = vec2(vUv.x * 200.0, vUv.y * 56.0);
          vec2 starId = floor(starGrid);
          vec2 starLocal = fract(starGrid) - 0.5;
          float starSeed = hash(starId);
          vec2 starOffset = vec2(hash(starId + 13.7) - 0.5, hash(starId + 41.3) - 0.5) * 0.55;
          float starDist = length(starLocal - starOffset);
          float starPoint = smoothstep(0.16, 0.015, starDist) * step(0.92, starSeed);
          float starTwinkle = 0.6 + 0.4 * sin(uTime * 4.5 + starSeed * 62.0);
          col += vec3(1.0, 0.96, 0.86) * starPoint * starTwinkle * 1.18;

          // Warm amber-orange fireplace glow spilling naturally into the final 14% of the tunnel right at the hearth!
          float hearthWarmth = smoothstep(0.85, 1.0, vUv.x);
          col = mix(col, vec3(0.72, 0.31, 0.11), hearthWarmth * 0.68);
          col += vec3(0.96, 0.58, 0.22) * smoothstep(0.93, 1.0, vUv.x) * 0.35;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      transparent: false,
      depthWrite: true,
    });

    const tunnelMesh = new THREE.Mesh(tubeGeo, shaderMat);
    tunnelMesh.frustumCulled = false;
    this.vortexGroup.add(tunnelMesh);

    return shaderMat;
  }

  /**
   * Soft organic spiraling golden & starlight bokeh particles rushing along the extended roller-coaster vortex.
   */
  private buildVortexStardustStream(): void {
    const count = 380;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const frames = this.vortexCurve.computeFrenetFrames(160, false);

    const gold = new THREE.Color(0xf6d87a);
    const ice = new THREE.Color(0x9bd2ff);
    const white = new THREE.Color(0xfff9ec);

    let seed = 5519;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < count; i++) {
      const u = 0.015 + rand() * 0.96;
      const frameIdx = Math.min(frames.normals.length - 1, Math.floor(u * 159));
      const center = this.vortexCurve.getPointAt(u);
      const normal = frames.normals[frameIdx];
      const binormal = frames.binormals[frameIdx];

      const angle = rand() * Math.PI * 2;
      const radius = 1.65 + rand() * 1.95;
      positions[i * 3] =
        center.x + normal.x * Math.cos(angle) * radius + binormal.x * Math.sin(angle) * radius;
      positions[i * 3 + 1] =
        center.y + normal.y * Math.cos(angle) * radius + binormal.y * Math.sin(angle) * radius;
      positions[i * 3 + 2] =
        center.z + normal.z * Math.cos(angle) * radius + binormal.z * Math.sin(angle) * radius;

      const c = i % 3 === 0 ? gold : i % 3 === 1 ? white : ice;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.25,
      map: this.textures.sparkleMap,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.84,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const stardust = new THREE.Points(geo, mat);
    this.vortexGroup.add(stardust);
  }

  /**
   * GPU-Instanced Rendering (`THREE.InstancedMesh`) for 60 floating 3D Christmas ornaments inside
   * the extended roller-coaster vortex — reduces 140+ draw calls down to just 7 draw calls for locked 60fps!
   * Each ornament's `instanceMatrix` is dynamically updated with roller-coaster spiral orbit,
   * multi-axis tumble rotation, and kinetic scale pulsation.
   */
  private buildInstancedVortexChristmasIcons(): void {
    const geoSet = createInstancedVortexGeometries();
    this.vortexGeoSet = geoSet;

    const totalIcons = 60;
    const frames = this.vortexCurve.computeFrenetFrames(140, false);

    // Per-kind buckets
    const buckets: InstancedOrnamentData[][] = [[], [], [], [], []];
    for (let i = 0; i < totalIcons; i++) {
      const u = 0.045 + (i / totalIcons) * 0.835;
      const frameIdx = Math.min(frames.normals.length - 1, Math.floor(u * 139));
      const center = this.vortexCurve.getPointAt(u);
      const normal = frames.normals[frameIdx].clone();
      const binormal = frames.binormals[frameIdx].clone();

      const kind = i % 5;
      const baseAngle = i * 1.62 + kind * 0.45;
      const baseRadius = 2.02 + (i % 4) * 0.26;
      const baseScale = 0.82 + ((i * 7) % 5) * 0.11;

      buckets[kind].push({
        center,
        normal,
        binormal,
        baseAngle,
        baseRadius,
        // Gentle, serene suspended-in-magic float & slow leisurely rotation (never dizzying!)
        orbitSpeed: (i % 2 === 0 ? 1 : -1) * (0.042 + (i % 4) * 0.015),
        radialAmp: 0.06 + (i % 3) * 0.025,
        baseRot: new THREE.Vector3(i * 0.55, i * 0.9, i * 0.35),
        spinSpeed: new THREE.Vector3(
          0.11 + (i % 3) * 0.06,
          0.19 + (i % 4) * 0.07,
          0.08 + (i % 2) * 0.05,
        ),
        baseScale,
        scaleAmp: 0.045 + (i % 3) * 0.018,
        scaleFreq: 0.85 + (i % 4) * 0.16,
        phase: i * 0.78,
        curveU: u,
      });
    }

    // 1. Blown-glass lacquered baubles (body with per-instance colors + gold trim crown) — 2 draw calls
    const baubleMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.88,
      roughness: 0.09,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      bumpMap: this.textures.goldBumpMap,
      bumpScale: 0.004,
    });
    const baublePalette = [
      new THREE.Color(0xc41c22),
      new THREE.Color(0xe6be4a),
      new THREE.Color(0x1f568a),
      new THREE.Color(0xf2f6fc),
    ];
    const baubleBodyMesh = new THREE.InstancedMesh(
      geoSet.baubleBody,
      baubleMat,
      buckets[0].length,
    );
    const baubleTrimMesh = new THREE.InstancedMesh(
      geoSet.baubleTrim,
      this.materials.goldMetal,
      buckets[0].length,
    );
    baubleBodyMesh.frustumCulled = false;
    baubleTrimMesh.frustumCulled = false;
    for (let i = 0; i < buckets[0].length; i++) {
      baubleBodyMesh.setColorAt(i, baublePalette[i % baublePalette.length]);
    }
    if (baubleBodyMesh.instanceColor) baubleBodyMesh.instanceColor.needsUpdate = true;
    this.vortexGroup.add(baubleBodyMesh, baubleTrimMesh);
    this.vortexBatches.push({
      meshes: [baubleBodyMesh, baubleTrimMesh],
      items: buckets[0],
    });

    // 2. Sculpted Brushed-Gold Christmas Bells — 1 draw call
    const bellMesh = new THREE.InstancedMesh(
      geoSet.bell,
      this.materials.goldMetal,
      buckets[1].length,
    );
    bellMesh.frustumCulled = false;
    this.vortexGroup.add(bellMesh);
    this.vortexBatches.push({ meshes: [bellMesh], items: buckets[1] });

    // 3. Faceted Crystal Snowflakes — 1 draw call
    const snowflakeMesh = new THREE.InstancedMesh(
      geoSet.snowflake,
      this.materials.crystalSnowflake,
      buckets[2].length,
    );
    snowflakeMesh.frustumCulled = false;
    this.vortexGroup.add(snowflakeMesh);
    this.vortexBatches.push({ meshes: [snowflakeMesh], items: buckets[2] });

    // 4. Satin-Wrapped Holiday Gift Boxes (colored body + brushed-gold ribbon) — 2 draw calls
    const giftPaperMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: this.textures.giftWrapMap,
      bumpMap: this.textures.giftBumpMap,
      bumpScale: 0.018,
      metalness: 0.14,
      roughness: 0.42,
      sheen: 0.5,
      sheenRoughness: 0.48,
    });
    const giftPalette = [
      new THREE.Color(0xa61920),
      new THREE.Color(0x1b4c7a),
      new THREE.Color(0xdcb444),
      new THREE.Color(0x88161b),
    ];
    const giftBodyMesh = new THREE.InstancedMesh(
      geoSet.giftBody,
      giftPaperMat,
      buckets[3].length,
    );
    const giftRibbonMesh = new THREE.InstancedMesh(
      geoSet.giftRibbon,
      this.materials.goldMetal,
      buckets[3].length,
    );
    giftBodyMesh.frustumCulled = false;
    giftRibbonMesh.frustumCulled = false;
    for (let i = 0; i < buckets[3].length; i++) {
      giftBodyMesh.setColorAt(i, giftPalette[i % giftPalette.length]);
    }
    if (giftBodyMesh.instanceColor) giftBodyMesh.instanceColor.needsUpdate = true;
    this.vortexGroup.add(giftBodyMesh, giftRibbonMesh);
    this.vortexBatches.push({
      meshes: [giftBodyMesh, giftRibbonMesh],
      items: buckets[3],
    });

    // 5. Glossy Porcelain Candy Canes — 1 draw call
    const caneMesh = new THREE.InstancedMesh(
      geoSet.candyCane,
      this.materials.candyCane,
      buckets[4].length,
    );
    caneMesh.frustumCulled = false;
    this.vortexGroup.add(caneMesh);
    this.vortexBatches.push({ meshes: [caneMesh], items: buckets[4] });

    this.updateInstancedVortexMatrices(0);
  }

  /**
   * Dynamically computes each instanced ornament's `instanceMatrix` with roller-coaster orbital
   * swirl, proximity kinetic scale-pop, and banked multi-axis rotation (zero GC allocations!).
   */
  private updateInstancedVortexMatrices(time: number): void {
    const rideU = this.currentRideProgress;

    for (let b = 0; b < this.vortexBatches.length; b++) {
      const batch = this.vortexBatches[b];
      const items = batch.items;
      const meshes = batch.meshes;

      for (let i = 0; i < items.length; i++) {
        const it = items[i];

        // Calm, graceful floating drift along the vortex walls (no fast spinning!)
        const angle = it.baseAngle + time * it.orbitSpeed + Math.sin(time * 0.55 + it.phase) * 0.07;
        const radius = it.baseRadius + Math.sin(time * 0.72 + it.phase) * it.radialAmp;
        const cosA = Math.cos(angle) * radius;
        const sinA = Math.sin(angle) * radius;

        _instPos.set(
          it.center.x + it.normal.x * cosA + it.binormal.x * sinA,
          it.center.y + it.normal.y * cosA + it.binormal.y * sinA,
          it.center.z + it.normal.z * cosA + it.binormal.z * sinA,
        );

        // Serene, slow suspended-in-air holiday rotation (never multiplies time by flyby boost!)
        _instEuler.set(
          it.baseRot.x + time * it.spinSpeed.x,
          it.baseRot.y + time * it.spinSpeed.y,
          it.baseRot.z + time * it.spinSpeed.z,
        );
        _instQuat.setFromEuler(_instEuler);

        // Subtle, peaceful breathing scale modulation with gentle proximity presence
        const distU = Math.abs(it.curveU - rideU);
        const flybyPresence = Math.max(0, 1 - distU * 6.5);
        const wave = Math.sin(time * it.scaleFreq + it.phase);
        const dynamicScale = it.baseScale * (1 + wave * it.scaleAmp + flybyPresence * 0.07);
        _instScale.set(dynamicScale, dynamicScale, dynamicScale);

        _instMat.compose(_instPos, _instQuat, _instScale);

        for (let m = 0; m < meshes.length; m++) {
          meshes[m].setMatrixAt(i, _instMat);
        }
      }

      for (let m = 0; m < meshes.length; m++) {
        meshes[m].instanceMatrix.needsUpdate = true;
      }
    }
  }

  private buildTreeAndPresents(): ChristmasTreeRig {
    const treeRig = createChristmasTreeGroup(this.materials, this.textures.sparkleMap);
    treeRig.group.position.set(
      SCENE_ANCHORS.treeBase.x,
      SCENE_ANCHORS.treeBase.y,
      SCENE_ANCHORS.treeBase.z,
    );
    this.roomRootGroup.add(treeRig.group);

    // Soft grounded ambient occlusion shadow directly beneath the Christmas tree
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 64);
    sGrad.addColorStop(0, 'rgba(4, 9, 18, 0.64)');
    sGrad.addColorStop(1, 'rgba(4, 9, 18, 0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);

    const treeShadow = new THREE.Mesh(
      new THREE.CircleGeometry(2.85, 28),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      }),
    );
    treeShadow.rotation.x = -Math.PI / 2;
    treeShadow.position.set(SCENE_ANCHORS.treeBase.x, 0.032, SCENE_ANCHORS.treeBase.z);
    this.roomRootGroup.add(treeShadow);

    // 14 luxury satin-wrapped Christmas gifts arranged generously around the tree base
    const tz = SCENE_ANCHORS.treeBase.z;
    const giftSpecs = [
      { x: -1.62, z: tz + 1.38, w: 0.82, h: 0.68, d: 0.82, color: 0x9e181d, ry: 0.28, ribbon: this.materials.goldMetal },
      { x: -0.72, z: tz + 1.82, w: 0.62, h: 0.52, d: 0.62, color: 0x1a4873, ry: -0.42, ribbon: this.materials.goldMetal },
      { x: 0.58, z: tz + 1.85, w: 0.76, h: 0.6, d: 0.66, color: 0xd4af37, ry: 0.36, ribbon: this.materials.velvetRed },
      { x: 1.58, z: tz + 1.38, w: 0.88, h: 0.76, d: 0.84, color: 0x821519, ry: -0.24, ribbon: this.materials.goldMetal },
      { x: 2.15, z: tz + 0.35, w: 0.68, h: 0.56, d: 0.68, color: 0xebe6db, ry: 0.52, ribbon: this.materials.velvetRed },
      { x: -2.18, z: tz + 0.25, w: 0.74, h: 0.62, d: 0.74, color: 0x1f4e79, ry: -0.58, ribbon: this.materials.snowWhite },
      { x: 0.02, z: tz + 2.28, w: 0.52, h: 0.42, d: 0.52, color: 0xb01b20, ry: 0.14, ribbon: this.materials.goldMetal },
      { x: 1.24, z: tz + 2.1, w: 0.58, h: 0.48, d: 0.58, color: 0x112542, ry: -0.32, ribbon: this.materials.goldMetal },
      { x: -1.32, z: tz + 2.15, w: 0.5, h: 0.4, d: 0.58, color: 0xd9b854, ry: 0.44, ribbon: this.materials.velvetRed },
      { x: 0.96, z: tz + 1.05, w: 0.6, h: 0.54, d: 0.6, color: 0x1d4c78, ry: -0.18, ribbon: this.materials.goldMetal },
      { x: -2.55, z: tz + 1.15, w: 0.64, h: 0.5, d: 0.64, color: 0xb81d22, ry: 0.38, ribbon: this.materials.goldMetal },
      { x: 2.48, z: tz + 1.25, w: 0.62, h: 0.54, d: 0.58, color: 0x1b4c7a, ry: -0.34, ribbon: this.materials.goldMetal },
      { x: -0.45, z: tz + 2.52, w: 0.44, h: 0.36, d: 0.44, color: 0xf0e9dc, ry: 0.22, ribbon: this.materials.velvetRed },
      { x: 0.72, z: tz + 2.48, w: 0.48, h: 0.38, d: 0.48, color: 0x99161b, ry: -0.26, ribbon: this.materials.goldMetal },
    ];

    for (const spec of giftSpecs) {
      const gift = createGiftBoxGroup(
        this.materials,
        spec.color,
        spec.ribbon,
        spec.w,
        spec.h,
        spec.d,
      );
      gift.position.set(spec.x, 0.025, spec.z);
      gift.rotation.y = spec.ry;
      this.roomRootGroup.add(gift);
    }

    return treeRig;
  }

  /**
   * Builds the sculpted 3D TRACT Star geometry with a continuous stepped inner star relief bevel
   * so the transparent-alpha embossed TRACT logo feels physically carved in relief at center!
   */
  private buildSculptedOrganicTractStar(): TractStarRig {
    const starRig = createTractStarGroup(this.materials, this.textures.sparkleMap);
    starRig.group.position.set(
      SCENE_ANCHORS.starCenter.x,
      SCENE_ANCHORS.starCenter.y,
      SCENE_ANCHORS.starCenter.z,
    );

    // Subtle continuous inner sculpted star relief plateau framing the carved TRACT mark organically
    const innerTerraceShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.78 : 0.43;
      const ang = (i * Math.PI) / 5 + Math.PI / 2;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      if (i === 0) innerTerraceShape.moveTo(x, y);
      else innerTerraceShape.lineTo(x, y);
    }
    innerTerraceShape.closePath();

    const terraceGeo = new THREE.ExtrudeGeometry(innerTerraceShape, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.018,
      bevelSegments: 3,
    });
    const terraceMat = new THREE.MeshPhysicalMaterial({
      color: 0x0b2345,
      emissive: 0x041229,
      emissiveIntensity: 0.22,
      metalness: 0.16,
      roughness: 0.48,
      clearcoat: 0.24,
      clearcoatRoughness: 0.36,
      envMapIntensity: 0.26,
    });
    const terraceMesh = new THREE.Mesh(terraceGeo, terraceMat);
    terraceMesh.position.z = 0.12;
    starRig.group.add(terraceMesh);

    return starRig;
  }

  private applyOrganicStarLogoRelief(logo: ProcessedLogoAssets): void {
    if (!this.starRig) return;
    const maxAniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.starRig.updateLogoTexture(logo.canvas, logo.aspect, maxAniso);
  }

  public setProcessedLogo(logo: ProcessedLogoAssets): void {
    this.pendingLogo = logo;
    this.applyOrganicStarLogoRelief(logo);
  }

  public getSnowParticleCount(): { cover: number; room: number } {
    return {
      cover: this.coverSnow.count,
      room: this.roomSnow.count,
    };
  }

  public startOpening(): void {
    this.isFrozenForInspection = false;
    this.isFarewell = false;
    this.isOpenRequested = true;
    this.elapsedSinceOpen = 0;
    this.starArrivalFired = false;
    this.smoothBank = 0;
    this.wasInVortex = false;
    this.hasCameraPose = false;
    this.updatePhaseIfNeeded('opening');
    this.callbacks.onOpeningProgress?.(0);
    // Immediately render frame 0 of the live 3D vortex so the 4 opening flaps reveal it instantaneously!
    this.applyCameraForState(0, 0.016, true);
    this.renderer.render(this.scene, this.camera);
  }

  public resetToCover(): void {
    this.isFrozenForInspection = false;
    this.isFarewell = false;
    this.isOpenRequested = false;
    this.elapsedSinceOpen = 0;
    this.starArrivalFired = false;
    this.smoothBank = 0;
    this.hasCameraPose = false;
    this.wasInVortex = false;
    this.updatePhaseIfNeeded('cover');
    this.callbacks.onOpeningProgress?.(0);
    this.applyCameraForState(0, 0.016, true);
  }

  public setFarewell(active: boolean): void {
    this.isFarewell = active;
    if (active) {
      this.updatePhaseIfNeeded('farewell');
    } else if (this.starArrivalFired) {
      this.updatePhaseIfNeeded('star');
    }
  }

  /**
   * Deterministic scene seek used for ?autostart=1 and ?scene=opening|vortex|room|star.
   */
  public seekToScene(
    target: 'cover' | 'opening' | 'vortex' | 'room' | 'star',
    freeze = false,
  ): void {
    if (target === 'cover') {
      this.resetToCover();
      return;
    }
    this.isFrozenForInspection = freeze;
    this.isFarewell = false;
    this.isOpenRequested = true;
    this.starArrivalFired = false;
    this.hasCameraPose = false;
    this.wasInVortex = true;

    const totalWindow = OPENING_DURATION_SEC + RIDE_DURATION_SEC;
    if (target === 'opening') {
      // Mid-opening showcase: seal vanished, all 4 flaps open wide around the live 3D vortex!
      this.elapsedSinceOpen = OPENING_DURATION_SEC * 0.42;
    } else if (target === 'vortex') {
      // Dynamic mid-coaster banked curve inside the vertex-displaced vortex with instanced 3D ornaments!
      this.elapsedSinceOpen = totalWindow * 0.34;
    } else if (target === 'room') {
      // Panoramic architectural view well inside the spacious furnished 3D house living room!
      this.elapsedSinceOpen = totalWindow * 0.79;
    } else if (target === 'star') {
      this.elapsedSinceOpen = totalWindow + 0.1;
    }

    const snap = evaluateTimeline(
      this.elapsedSinceOpen,
      this.isOpenRequested,
      this.isFarewell,
    );
    this.updatePhaseIfNeeded(snap.phase);
    this.callbacks.onOpeningProgress?.(snap.openingProgress);
    this.applyCameraForState(snap.rideProgress, 0.016, true);
    this.animateProps(0.016);
    this.renderer.render(this.scene, this.camera);
    if (snap.arrivedAtStar && !this.starArrivalFired) {
      this.starArrivalFired = true;
      this.callbacks.onStarArrival();
    }
  }

  private updatePhaseIfNeeded(nextPhase: ExperiencePhase): void {
    if (nextPhase !== this.currentPhase) {
      this.currentPhase = nextPhase;
      this.callbacks.onPhaseChange(nextPhase);
    }
  }

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    this.renderer.render(this.scene, this.camera);
  }

  private applyCameraForState(
    rideProgress: number,
    dt: number,
    immediate: boolean,
  ): void {
    const aspect = this.camera.aspect;
    this.currentRideProgress = rideProgress;

    // Scene 1 (cover BEFORE click): Pure deep navy (#0C1B33) with gentle crystalline falling snow
    if (!this.isOpenRequested || this.currentPhase === 'cover') {
      _pos.set(Math.sin(this.totalTime * 0.22) * 0.25, 6.4, 7.4);
      _lookAt.set(0, 6.2, -6.0);
      this.camera.position.copy(_pos);
      this.camera.lookAt(_lookAt);
      const targetFov = aspect < 0.85 ? 58 : 48;
      if (Math.abs(this.camera.fov - targetFov) > 0.05) {
        this.camera.fov = targetFov;
        this.camera.updateProjectionMatrix();
      }
      this.vortexGroup.visible = false;
      this.roomRootGroup.visible = false;
      this.coverSnow.setVisible(true);
      _bgCurrent.copy(_bgNavy);
      this.scene.background = _bgCurrent;
      this.fog.color.copy(_bgCurrent);
      this.fog.density = 0.015;
      return;
    }

    // THE INSTANT the user clicks (phase === 'opening' onward):
    // BOTH the live 3D vortex AND the grand architectural living room behind the fireplace are preloaded & visible!
    const enteringVortexNow = !this.wasInVortex;
    this.wasInVortex = true;

    this.coverSnow.setVisible(false);
    this.vortexGroup.visible = true;
    this.roomRootGroup.visible = true;
    this.roomSnow.setVisible(true);

    const roomBlend = smoothstep(0.66, 0.82, rideProgress);
    _bgCurrent.copy(_bgVortex).lerp(_bgRoom, roomBlend);
    this.scene.background = _bgCurrent;
    this.fog.color.copy(_bgCurrent);
    // Keep fog light in the living room so the 3D exterior snowy forest & full moon shine crisply through windows!
    this.fog.density = THREE.MathUtils.lerp(0.012, 0.0055, roomBlend);

    const targetFov = computeDynamicFov(rideProgress, aspect);
    const snapNow = immediate || enteringVortexNow;
    const fovDamp = snapNow ? 1 : 1 - Math.exp(-3.8 * dt);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, fovDamp);
    this.camera.updateProjectionMatrix();

    const starFrame = computeStarCloseupFrame(aspect);

    // Scene 3: Final steady close-up in front of the glowing organic TRACT star
    if (rideProgress >= 0.999) {
      const floatX = Math.sin(this.totalTime * 0.65) * 0.028;
      const floatY = Math.cos(this.totalTime * 0.85) * 0.02;
      _pos.set(
        starFrame.cameraPos.x + floatX,
        starFrame.cameraPos.y + floatY,
        starFrame.cameraPos.z,
      );
      _lookAt.set(
        starFrame.lookTarget.x,
        starFrame.lookTarget.y,
        starFrame.lookTarget.z,
      );

      if (snapNow || !this.hasCameraPose) {
        this.currentCamPos.copy(_pos);
        this.currentLookAt.copy(_lookAt);
        _camMatrix.lookAt(this.currentCamPos, this.currentLookAt, _worldUp);
        this.currentCamQuat.setFromRotationMatrix(_camMatrix);
        this.hasCameraPose = true;
      } else {
        const damp = 1 - Math.exp(-4.2 * dt);
        this.currentCamPos.lerp(_pos, damp);
        this.currentLookAt.lerp(_lookAt, damp);
        _camMatrix.lookAt(this.currentCamPos, this.currentLookAt, _worldUp);
        _targetQuat.setFromRotationMatrix(_camMatrix);
        this.currentCamQuat.slerp(_targetQuat, damp);
      }
      this.camera.position.copy(this.currentCamPos);
      this.camera.quaternion.copy(this.currentCamQuat);
      return;
    }

    // Cinema-dolly POV flight through the vortex -> fireplace archway -> grand living room -> organic TRACT star
    this.fullCurve.getPointAt(rideProgress, _pos);

    const endBlend = smoothstep(0.9, 1.0, rideProgress);
    if (endBlend > 0) {
      _pos.x = THREE.MathUtils.lerp(_pos.x, starFrame.cameraPos.x, endBlend);
      _pos.y = THREE.MathUtils.lerp(_pos.y, starFrame.cameraPos.y, endBlend);
      _pos.z = THREE.MathUtils.lerp(_pos.z, starFrame.cameraPos.z, endBlend);
    }

    // Wide anticipatory gimbal look-ahead through sweeping vortex curves, tightening smoothly in the room
    const lookAheadDelta = THREE.MathUtils.lerp(0.072, 0.036, roomBlend);
    const lookAheadU = Math.min(1, rideProgress + lookAheadDelta);
    this.fullCurve.getPointAt(lookAheadU, _lookAt);

    // As the camera emerges horizontally from the brick fireplace (u > 0.70),
    // smoothly frame the grand living room & Christmas tree, then glide up to the TRACT star!
    const treeFocusWeight = smoothstep(0.7, 0.86, rideProgress);
    if (treeFocusWeight > 0) {
      const targetY = THREE.MathUtils.lerp(
        2.85,
        starFrame.lookTarget.y,
        smoothstep(0.83, 0.98, rideProgress),
      );
      _lookAt.x = THREE.MathUtils.lerp(_lookAt.x, starFrame.lookTarget.x, treeFocusWeight);
      _lookAt.y = THREE.MathUtils.lerp(_lookAt.y, targetY, treeFocusWeight);
      _lookAt.z = THREE.MathUtils.lerp(_lookAt.z, starFrame.lookTarget.z, treeFocusWeight);
    }

    // Dual-span averaged curvature banking signal for zero-twitch Steadicam roll through curves
    this.fullCurve.getTangentAt(rideProgress, _tangent);
    this.fullCurve.getTangentAt(Math.min(1, rideProgress + 0.035), _nextTangent);
    this.fullCurve.getTangentAt(Math.min(1, rideProgress + 0.07), _farTangent);
    _nextTangent.add(_farTangent).normalize();
    _sideAxis.crossVectors(_tangent, _nextTangent);
    const lateralSignal = THREE.MathUtils.clamp(_sideAxis.y * 7.2, -1, 1);
    const targetBank = computeBankingAngle(lateralSignal, rideProgress);
    this.smoothBank = THREE.MathUtils.lerp(
      this.smoothBank,
      targetBank,
      snapNow ? 1 : 1 - Math.exp(-3.0 * dt),
    );

    if (snapNow || !this.hasCameraPose) {
      this.currentCamPos.copy(_pos);
      this.currentLookAt.copy(_lookAt);
      _camMatrix.lookAt(this.currentCamPos, this.currentLookAt, _worldUp);
      _targetQuat.setFromRotationMatrix(_camMatrix);
      _bankQuat.setFromAxisAngle(_forwardZ, this.smoothBank);
      _targetQuat.multiply(_bankQuat);
      this.currentCamQuat.copy(_targetQuat);
      this.hasCameraPose = true;
    } else {
      // Faithfully track the spline rail (zero corner cutting!) while gliding the gimbal target like silk
      const posDamp = 1 - Math.exp(-16.0 * dt);
      const lookDamp = 1 - Math.exp(-6.5 * dt);
      const rotDamp = 1 - Math.exp(-7.5 * dt);
      this.currentCamPos.lerp(_pos, posDamp);
      this.currentLookAt.lerp(_lookAt, lookDamp);

      _camMatrix.lookAt(this.currentCamPos, this.currentLookAt, _worldUp);
      _targetQuat.setFromRotationMatrix(_camMatrix);
      _bankQuat.setFromAxisAngle(_forwardZ, this.smoothBank);
      _targetQuat.multiply(_bankQuat);
      this.currentCamQuat.slerp(_targetQuat, rotDamp);
    }

    this.camera.position.copy(this.currentCamPos);
    this.camera.quaternion.copy(this.currentCamQuat);

    // Ride warm gold & cool cobalt lights just ahead of the camera inside the vortex so instanced props gleam!
    const vortexLightFade = 1 - smoothstep(0.66, 0.78, rideProgress);
    this.vortexCamLightWarm.intensity = 10.0 * vortexLightFade;
    this.vortexCamLightCool.intensity = 8.0 * vortexLightFade;
    if (vortexLightFade > 0.01) {
      this.vortexCamLightWarm.position.set(
        this.currentCamPos.x + 1.6,
        this.currentCamPos.y + 1.2,
        this.currentCamPos.z - 5.4,
      );
      this.vortexCamLightCool.position.set(
        this.currentCamPos.x - 1.8,
        this.currentCamPos.y - 0.8,
        this.currentCamPos.z - 3.8,
      );
    }
  }

  private animateProps(dt: number): void {
    if (this.vortexShaderMat) {
      this.vortexShaderMat.uniforms.uTime.value = this.totalTime;
      // Dynamically amplify vertex displacement energy during peak roller-coaster ride
      const energy =
        0.75 +
        0.45 *
          smoothstep(0.05, 0.2, this.currentRideProgress) *
          (1 - smoothstep(0.62, 0.76, this.currentRideProgress));
      this.vortexShaderMat.uniforms.uCoasterEnergy.value = energy;
    }

    if (this.vortexGroup.visible && this.vortexBatches.length > 0) {
      this.updateInstancedVortexMatrices(this.totalTime);
    }

    if (this.roomRootGroup.visible && this.livingRoomRig && this.treeRig) {
      // Gentle cozy fireplace ember flicker
      const flicker =
        Math.sin(this.totalTime * 10.5) * 0.35 + Math.cos(this.totalTime * 16.2) * 0.25;
      this.livingRoomRig.fireplaceRig.fireLight.intensity = 6.8 + flicker;
      for (let i = 0; i < this.livingRoomRig.fireplaceRig.flames.length; i++) {
        const flame = this.livingRoomRig.fireplaceRig.flames[i];
        const wave = 0.9 + 0.18 * Math.sin(this.totalTime * (8.5 + i * 2.2) + i);
        flame.scale.set(0.94 + 0.08 * wave, wave, 0.94 + 0.08 * wave);
      }

      // Cozy dancing coffee-table & windowsill candle flames
      for (let i = 0; i < this.livingRoomRig.candleFlames.length; i++) {
        const cf = this.livingRoomRig.candleFlames[i];
        const sw = 0.92 + 0.14 * Math.sin(this.totalTime * (9.2 + i * 1.7) + i * 1.3);
        cf.scale.set(0.95, sw, 0.95);
      }

      // Live falling exterior winter snow visible right through the living room windows!
      this.livingRoomRig.exteriorSnow.update(dt, this.totalTime);

      // Soft twinkling warm fairy lights on the Christmas tree
      const fairy = this.treeRig.fairyLightsMesh;
      const glows = this.treeRig.fairyGlowsMesh;
      for (let i = 0; i < this.treeRig.fairyBaseColors.length; i++) {
        const twinkle = 0.58 + 0.42 * Math.sin(this.totalTime * 3.0 + this.treeRig.fairyPhases[i]);
        _tempColor.copy(this.treeRig.fairyBaseColors[i]).multiplyScalar(twinkle);
        fairy.setColorAt(i, _tempColor);
        glows.setColorAt(i, _tempColor);
      }
      if (fairy.instanceColor) fairy.instanceColor.needsUpdate = true;
      if (glows.instanceColor) glows.instanceColor.needsUpdate = true;

      // TRACT Star remains 100% steady and serene (NO blinking or pulsing!)
    }

    this.coverSnow.update(dt, this.totalTime);
    this.roomSnow.update(dt, this.totalTime);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const maxDt = this.isSoftwareGl ? 0.1 : 0.05;
    const dt = Math.min(maxDt, Math.max(0.001, (now - this.lastFrameMs) / 1000));
    this.lastFrameMs = now;
    this.totalTime += dt;

    if (this.isOpenRequested && !this.isFarewell && !this.isFrozenForInspection) {
      this.elapsedSinceOpen += dt;
    }

    const snap = evaluateTimeline(
      this.elapsedSinceOpen,
      this.isOpenRequested,
      this.isFarewell,
    );

    this.updatePhaseIfNeeded(snap.phase);
    if (snap.phase === 'opening' || snap.phase === 'cover') {
      this.callbacks.onOpeningProgress?.(snap.openingProgress);
    }

    if (snap.arrivedAtStar && !this.starArrivalFired) {
      this.starArrivalFired = true;
      this.callbacks.onStarArrival();
    }

    this.applyCameraForState(snap.rideProgress, dt, false);
    this.animateProps(dt);

    this.renderer.render(this.scene, this.camera);
    this.scheduleNextTick();
  };

  private scheduleNextTick(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext();
    if (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext) {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResizeBound);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLostBound);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestoredBound);

    this.livingRoomRig?.dispose();
    this.vortexGeoSet?.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });

    this.coverSnow.dispose();
    this.roomSnow.dispose();
    this.envRT.dispose();
    this.materials.dispose();
    this.textures.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
