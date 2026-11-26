import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AudioToggle } from './components/AudioToggle';
import { EnvelopeCover, type EnvelopeCoverHandle } from './components/EnvelopeCover';
import { FinalOverlay } from './components/FinalOverlay';
import type { EssentialAssetStatus } from './components/LoadingScreen';
import { ChristmasExperience } from './three/ChristmasExperience';
import type { ExperiencePhase, ProcessedLogoAssets } from './types/experience';
import { HolidayAudioEngine } from './utils/audioEngine';
import { loadProcessedTractLogo } from './utils/logoProcessor';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const envelopeCoverRef = useRef<EnvelopeCoverHandle | null>(null);
  const experienceRef = useRef<ChristmasExperience | null>(null);
  const audioRef = useRef<HolidayAudioEngine | null>(null);
  const logoRef = useRef<ProcessedLogoAssets | null>(null);

  const [phase, setPhase] = useState<ExperiencePhase>('cover');
  const [showEndActions, setShowEndActions] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [logo, setLogo] = useState<ProcessedLogoAssets | null>(null);
  const [webglLost, setWebglLost] = useState(false);
  const [assetStatus, setAssetStatus] = useState<EssentialAssetStatus>({
    logo: false,
    scene: false,
    audio: false,
  });
  const endActionsTimerRef = useRef<number | null>(null);

  const clearEndActionsTimer = useCallback(() => {
    if (endActionsTimerRef.current !== null) {
      clearTimeout(endActionsTimerRef.current);
      endActionsTimerRef.current = null;
    }
  }, []);

  // Optional deterministic inspection flag (?loading=1) so the loading bar below the envelope can be inspected
  const [forceLoadingPreview] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('loading') === '1';
  });

  const allAssetsReady = assetStatus.logo && assetStatus.scene && assetStatus.audio;
  const isExperienceReady = allAssetsReady && !forceLoadingPreview;

  // Keep latest callbacks in refs so Three.js canvas mounts once and NEVER triggers React re-renders during 3D flight
  const callbacksRef = useRef({
    onPhaseChange: (nextPhase: ExperiencePhase) => {
      setPhase(nextPhase);
      if (nextPhase !== 'star' && nextPhase !== 'farewell') {
        clearEndActionsTimer();
        setShowEndActions(false);
      }
    },
    onOpeningProgress: (progress: number) => {
      envelopeCoverRef.current?.setOpeningProgress(progress);
    },
    onStarArrival: () => {
      clearEndActionsTimer();
      const forceActions =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('actions') === '1';
      if (forceActions) {
        setShowEndActions(true);
        return;
      }

      setShowEndActions(false);
      audioRef.current?.playStarArrivalAndSantaVoice(() => {
        clearEndActionsTimer();
        endActionsTimerRef.current = window.setTimeout(() => {
          setShowEndActions(true);
          endActionsTimerRef.current = null;
        }, 2000);
      });
    },
    onContextLost: (lost: boolean) => setWebglLost(lost),
  });

  // Coordinate essential assets (Logo, 3D Scene + GPU Prewarm, Audio) through THREE.DefaultLoadingManager
  // so @react-three/drei's useProgress() drives the progress bar below the envelope accurately.
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    let cancelled = false;
    const pendingItems = new Set<string>();

    const startTrackedItem = (id: string) => {
      pendingItems.add(id);
      THREE.DefaultLoadingManager.itemStart(id);
    };

    const endTrackedItem = (id: string) => {
      if (!pendingItems.has(id)) return;
      pendingItems.delete(id);
      THREE.DefaultLoadingManager.itemEnd(id);
    };

    const LOGO_ITEM = 'tract://logo';
    const VORTEX_BUFFERS_ITEM = 'tract://vortex-buffers';
    const ROOM_BUFFERS_ITEM = 'tract://room-buffers';
    const AUDIO_ITEM = 'tract://audio';
    startTrackedItem(LOGO_ITEM);
    startTrackedItem(VORTEX_BUFFERS_ITEM);
    startTrackedItem(ROOM_BUFFERS_ITEM);
    startTrackedItem(AUDIO_ITEM);

    const audio = new HolidayAudioEngine();
    audioRef.current = audio;

    const experience = new ChristmasExperience(mountEl, {
      onPhaseChange: (p) => callbacksRef.current.onPhaseChange(p),
      onOpeningProgress: (progress) => callbacksRef.current.onOpeningProgress(progress),
      onStarArrival: () => callbacksRef.current.onStarArrival(),
      onContextLost: (lost) => callbacksRef.current.onContextLost(lost),
    });
    experienceRef.current = experience;

    if (logoRef.current) {
      experience.setProcessedLogo(logoRef.current);
    }

    // 1. Load & key out TRACT logo asynchronously
    const logoPromise = loadProcessedTractLogo().then((processed) => {
      if (cancelled) return;
      logoRef.current = processed;
      setLogo(processed);
      experience.setProcessedLogo(processed);
      endTrackedItem(LOGO_ITEM);
      setAssetStatus((prev) => ({ ...prev, logo: true }));
    });

    // 2. Asynchronously preload Vortex & Architectural Living Room geometry buffers + GPU shader compilation
    void experience
      .preloadSceneBuffersAsync((stage) => {
        if (cancelled) return;
        if (stage === 'vortex') {
          endTrackedItem(VORTEX_BUFFERS_ITEM);
        }
      })
      .then(() => logoPromise)
      .then(() => {
        if (cancelled) return;
        experience.prewarmGpu();
        endTrackedItem(ROOM_BUFFERS_ITEM);
        setAssetStatus((prev) => ({ ...prev, scene: true }));
      });

    // 3. Preload official MP3 soundtrack & Santa voice, then start cover music until envelope opens
    const initialParams = new URLSearchParams(window.location.search);
    const skipsCover =
      Boolean(initialParams.get('scene')) || initialParams.get('autostart') === '1';

    audio.prepare().then(() => {
      if (cancelled) return;
      if (!skipsCover) {
        audio.startCoverMusic();
      }
      endTrackedItem(AUDIO_ITEM);
      setAssetStatus((prev) => ({ ...prev, audio: true }));
    });

    return () => {
      cancelled = true;
      clearEndActionsTimer();
      for (const item of Array.from(pendingItems)) {
        endTrackedItem(item);
      }
      experience.dispose();
      experienceRef.current = null;
      audio.dispose();
      audioRef.current = null;
    };
  }, [clearEndActionsTimer]);

  // Optional deterministic URL hooks (?autostart=1 or ?scene=opening|vortex|room|tree|star) after assets finish loading
  const urlHookAppliedRef = useRef(false);
  useEffect(() => {
    if (!isExperienceReady || urlHookAppliedRef.current || !experienceRef.current) {
      return;
    }
    urlHookAppliedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const sceneParam = params.get('scene');
    const freeze = params.get('freeze') === '1';
    if (
      sceneParam === 'opening' ||
      sceneParam === 'vortex' ||
      sceneParam === 'room' ||
      sceneParam === 'tree' ||
      sceneParam === 'star'
    ) {
      const target = sceneParam === 'tree' ? 'room' : sceneParam;
      experienceRef.current.seekToScene(target, freeze);
    } else if (params.get('autostart') === '1') {
      experienceRef.current.startOpening();
    }
  }, [isExperienceReady]);

  const handleOpenEnvelope = useCallback(() => {
    if (!isExperienceReady) return;
    clearEndActionsTimer();
    setShowEndActions(false);
    audioRef.current?.unlockAndStart();
    experienceRef.current?.startOpening();
  }, [clearEndActionsTimer, isExperienceReady]);

  const handleReplay = useCallback(() => {
    clearEndActionsTimer();
    setShowEndActions(false);
    audioRef.current?.returnToCoverMusic();
    experienceRef.current?.resetToCover();
  }, [clearEndActionsTimer]);

  const handleExit = useCallback(() => {
    experienceRef.current?.setFarewell(true);
  }, []);

  const handleReturnToStart = useCallback(() => {
    clearEndActionsTimer();
    setShowEndActions(false);
    audioRef.current?.returnToCoverMusic();
    experienceRef.current?.resetToCover();
  }, [clearEndActionsTimer]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      audioRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const handleReplayVoice = useCallback(() => {
    audioRef.current?.speakSantaGreeting();
  }, []);

  return (
    <main
      data-phase={phase}
      data-loading={String(!isExperienceReady)}
      className="relative w-full h-full overflow-hidden bg-[#0C1B33]"
    >
      {/* Dedicated isolated WebGL canvas container (never re-mounted on HUD updates) */}
      <div
        ref={canvasMountRef}
        data-testid="christmas-canvas"
        aria-label="Cena natalina 3D da TRACT Contabilidade"
        className="fixed inset-0 z-0 w-full h-full"
      />

      {/* Graceful WebGL fallback overlay if context is lost */}
      {webglLost && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center bg-[#0C1B33]">
          <h1 className="font-editorial text-3xl text-white">
            A Tract Contabilidade te deseja um feliz natal!
          </h1>
          <p className="mt-3 text-sm text-[#DCE6F5]/85 max-w-md">
            O contexto gráfico 3D foi pausado pelo navegador. Recarregue a página para continuar a experiência.
          </p>
        </div>
      )}

      {/* Discreet audio controls */}
      {isExperienceReady && (
        <AudioToggle
          isMuted={isMuted}
          phase={phase}
          onToggleMute={handleToggleMute}
          onReplayVoice={handleReplayVoice}
        />
      )}

      {/* Scene 1: Ultra-Realistic 4-Flap Crimson Envelope Cover opening directly into the live 3D vortex */}
      <EnvelopeCover
        ref={envelopeCoverRef}
        phase={phase}
        logo={logo}
        ready={isExperienceReady}
        assetStatus={assetStatus}
        allAssetsReady={allAssetsReady}
        forceLoadingPreview={forceLoadingPreview}
        onOpen={handleOpenEnvelope}
      />

      {/* Scene 3: Final Star Close-up Greeting & Farewell Card */}
      <FinalOverlay
        phase={phase}
        logo={logo}
        showActions={showEndActions}
        onReplay={handleReplay}
        onExit={handleExit}
        onReturnToStart={handleReturnToStart}
      />
    </main>
  );
}
