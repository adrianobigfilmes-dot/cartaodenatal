import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

export interface EssentialAssetStatus {
  logo: boolean;
  scene: boolean;
  audio: boolean;
}

interface LoadingScreenProps {
  assetStatus: EssentialAssetStatus;
  allAssetsReady: boolean;
  forceVisible?: boolean;
}

/**
 * Compact, brand-aligned TRACT Contabilidade loading progress bar positioned directly
 * below the realistic crimson envelope on the first screen.
 * Powered by @react-three/drei's useProgress hook reading THREE.DefaultLoadingManager.
 */
export function LoadingScreen({
  assetStatus,
  allAssetsReady,
  forceVisible = false,
}: LoadingScreenProps) {
  const { active, progress, loaded, total } = useProgress();
  const [dismissed, setDismissed] = useState(false);

  const completedCount =
    (assetStatus.logo ? 1 : 0) +
    (assetStatus.scene ? 1 : 0) +
    (assetStatus.audio ? 1 : 0);

  const managerPercent = total > 0 ? Math.min(100, Math.round(progress)) : 0;
  const essentialPercent = Math.round((completedCount / 3) * 100);
  const rawPercent =
    allAssetsReady && !active
      ? 100
      : Math.min(99, Math.max(managerPercent, essentialPercent));
  const displayPercent = forceVisible ? Math.min(72, Math.max(48, rawPercent)) : rawPercent;

  const isFullyLoaded = !forceVisible && allAssetsReady && !active && loaded >= total;

  useEffect(() => {
    if (!isFullyLoaded) {
      setDismissed(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setDismissed(true);
    }, 380);
    return () => window.clearTimeout(timer);
  }, [isFullyLoaded]);

  if (dismissed && !forceVisible) {
    return null;
  }

  return (
    <div
      data-testid="tract-loading-bar"
      aria-busy={!isFullyLoaded}
      aria-live="polite"
      className="w-full max-w-[300px] sm:max-w-[330px] mt-7 px-2 select-none"
      style={{
        opacity: isFullyLoaded ? 0 : 1,
        transform: isFullyLoaded ? 'translateY(4px)' : 'translateY(0)',
        transition: 'opacity 340ms cubic-bezier(0.16, 1, 0.3, 1), transform 340ms ease',
      }}
    >
      <div className="flex items-center justify-between text-[11px] font-ui mb-2">
        <span className="text-[#DCE6F5]/80 tracking-wide">
          {isFullyLoaded ? 'Pronto' : 'Carregando...'}
        </span>
        <span
          data-testid="loading-percentage"
          className="font-semibold text-[#F3D678] tabular-nums"
        >
          {displayPercent}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Progresso de carregamento do cartão 3D"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={displayPercent}
        className="w-full h-2 rounded-full overflow-hidden bg-[#081326]/90 border border-[#1F4E79]/75 p-[1px] shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${displayPercent}%`,
            background:
              'linear-gradient(90deg, #1F4E79 0%, #3E7CB8 42%, #D4AF37 82%, #F6DF92 100%)',
            boxShadow: '0 0 12px rgba(212, 175, 55, 0.45)',
            transition: 'width 240ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  );
}
