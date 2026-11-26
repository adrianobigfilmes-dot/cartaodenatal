import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { ExperiencePhase, ProcessedLogoAssets } from '../types/experience';
import { clamp01, smoothstep } from '../utils/timeline';
import { LoadingScreen, type EssentialAssetStatus } from './LoadingScreen';

export interface EnvelopeCoverHandle {
  /** Frame-synchronized direct DOM update (zero React re-renders, 100% locked to 3D vortex frames). */
  setOpeningProgress: (progress: number) => void;
}

interface EnvelopeCoverProps {
  phase: ExperiencePhase;
  logo: ProcessedLogoAssets | null;
  ready: boolean;
  assetStatus: EssentialAssetStatus;
  allAssetsReady: boolean;
  forceLoadingPreview?: boolean;
  onOpen: () => void;
}

export const EnvelopeCover = forwardRef<EnvelopeCoverHandle, EnvelopeCoverProps>(
  function EnvelopeCover(
    {
      phase,
      logo,
      ready,
      assetStatus,
      allAssetsReady,
      forceLoadingPreview = false,
      onOpen,
    },
    ref,
  ) {
    const isCover = phase === 'cover';
    const isOpening = phase === 'opening';
    const canOpen = isCover && ready;

    const outerRef = useRef<HTMLDivElement | null>(null);
    const zoomRef = useRef<HTMLDivElement | null>(null);
    const sealRef = useRef<HTMLDivElement | null>(null);
    const topFlapRef = useRef<HTMLDivElement | null>(null);
    const bottomFlapRef = useRef<HTMLDivElement | null>(null);
    const leftFlapRef = useRef<HTMLDivElement | null>(null);
    const rightFlapRef = useRef<HTMLDivElement | null>(null);
    const lastProgressRef = useRef(0);

    const applyProgressToDom = (rawProgress: number) => {
      const p = clamp01(rawProgress);
      lastProgressRef.current = p;

      // 1. Gold wax seal vanishes crisply on click (p: 0 -> 0.12)
      if (sealRef.current) {
        const sealFade = smoothstep(0.0, 0.12, p);
        const sealScale = 1 - sealFade * 0.32;
        sealRef.current.style.opacity = String(1 - sealFade);
        sealRef.current.style.transform = `translate(-50%, -50%) scale(${sealScale.toFixed(3)})`;
      }

      // 2. All 4 heavyweight crimson velvet triangular flaps swing wide open swiftly in 3D (p: 0.0 -> 0.44)
      const topDeg = smoothstep(0.0, 0.36, p) * 168;
      const sideDeg = smoothstep(0.04, 0.41, p) * 168;
      const bottomDeg = smoothstep(0.06, 0.44, p) * 168;

      if (topFlapRef.current) {
        topFlapRef.current.style.transform =
          topDeg > 0.05 ? `rotateX(${topDeg.toFixed(2)}deg)` : 'none';
      }
      if (leftFlapRef.current) {
        leftFlapRef.current.style.transform =
          sideDeg > 0.05 ? `rotateY(${(-sideDeg).toFixed(2)}deg)` : 'none';
      }
      if (rightFlapRef.current) {
        rightFlapRef.current.style.transform =
          sideDeg > 0.05 ? `rotateY(${sideDeg.toFixed(2)}deg)` : 'none';
      }
      if (bottomFlapRef.current) {
        bottomFlapRef.current.style.transform =
          bottomDeg > 0.05 ? `rotateX(${(-bottomDeg).toFixed(2)}deg)` : 'none';
      }

      // 3. Continuous, unbroken forward acceleration RIGHT as the flaps unfold (zero pause/stop!)
      if (zoomRef.current) {
        const earlyGlide = smoothstep(0.0, 0.38, p) * 0.22;
        const diveRaw = smoothstep(0.16, 0.94, p);
        const diveCurve = Math.pow(diveRaw, 1.75);
        const scale = 1 + earlyGlide + diveCurve * 3.75;
        zoomRef.current.style.transform = `scale(${scale.toFixed(4)})`;
      }

      // 4. Outer overlay clears effortlessly right as the opened flaps sweep past the viewport edges (p: 0.78 -> 0.98)
      if (outerRef.current) {
        const fadeOut = smoothstep(0.78, 0.98, p);
        outerRef.current.style.opacity = String(1 - fadeOut);
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        setOpeningProgress: applyProgressToDom,
      }),
      [],
    );

    // Ensure DOM reflects current openingProgress immediately on mount/phase transition
    useEffect(() => {
      if (isCover) {
        applyProgressToDom(0);
      } else if (isOpening) {
        applyProgressToDom(lastProgressRef.current);
      }
    }, [isCover, isOpening]);

    if (!isCover && !isOpening) {
      return null;
    }

    return (
      <div
        ref={outerRef}
        className="fixed inset-0 z-20 flex flex-col items-center justify-center px-5 py-8 pointer-events-none select-none overflow-hidden"
      >
        <div
          ref={zoomRef}
          className="w-full max-w-[470px] flex flex-col items-center pointer-events-auto"
          style={{ transformOrigin: '50% 44%' }}
        >
          {/* Ultra-Realistic 4-Flap Heavyweight Velvet-Cotton Crimson Envelope */}
          <div className="relative w-full aspect-[1.44/1] overflow-visible">
            <button
              type="button"
              data-envelope-trigger="true"
              onClick={canOpen ? onOpen : undefined}
              disabled={!canOpen}
              aria-label="Abrir o Cartão de Natal da TRACT Contabilidade"
              className="group relative w-full h-full block text-left rounded-[12px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3D678] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0C1B33] disabled:cursor-default overflow-visible"
            >
              {/*
                4 lightweight solid midnight-navy exterior matte panels (z-0, GPU-safe!):
                Active ONLY during `opening` so:
                - On `cover`, live falling golden snow shines all around the closed envelope.
                - On `opening`, the exterior outside the envelope stays deep navy while the
                  TRANSPARENT interior between the 4 unfolding flaps directly reveals the live 3D vortex!
              */}
              {isOpening && (
                <>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute z-0 bg-[#0C1B33]"
                    style={{ bottom: '100%', left: '-720px', right: '-720px', height: '620px' }}
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute z-0 bg-[#0C1B33]"
                    style={{ top: '100%', left: '-720px', right: '-720px', height: '620px' }}
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute z-0 bg-[#0C1B33]"
                    style={{ top: '-2px', bottom: '-2px', right: '100%', width: '720px' }}
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute z-0 bg-[#0C1B33]"
                    style={{ top: '-2px', bottom: '-2px', left: '100%', width: '720px' }}
                  />
                </>
              )}

              {/* Deep realistic ambient occlusion & tabletop contact shadow beneath the closed envelope */}
              <div
                aria-hidden="true"
                className="absolute -inset-x-4 -bottom-7 top-7 z-[1] rounded-[22px] bg-[#030812]/80 blur-2xl pointer-events-none transition-opacity duration-200"
                style={{ opacity: isOpening ? 0 : 1 }}
              />
              <div
                aria-hidden="true"
                className="absolute -inset-x-1 -bottom-2 top-3 z-[2] rounded-[16px] bg-black/45 blur-md pointer-events-none transition-opacity duration-200"
                style={{ opacity: isOpening ? 0 : 1 }}
              />

              {/*
                Transparent Envelope Aperture Frame (NO yellow interior, NO solid backing!).
                All 4 heavyweight crimson cotton-velvet triangular flaps hinge outward in 3D
                from the 4 perimeter edges, directly uncovering the live 3D nebula vortex underneath.
              */}
              <div className="envelope-stage relative z-10 w-full h-full rounded-[12px] overflow-visible bg-transparent">
                {/* FLAP 1 — Bottom Triangular Velvet Flap (hinged along bottom edge) */}
                <div
                  ref={bottomFlapRef}
                  aria-hidden="true"
                  data-testid="envelope-flap-bottom"
                  className="envelope-flap-base absolute inset-0 z-[12] pointer-events-none"
                  style={{
                    transformOrigin: '50% 100%',
                    filter: isOpening
                      ? 'drop-shadow(0 8px 18px rgba(4, 10, 22, 0.5))'
                      : 'drop-shadow(0 -6px 12px rgba(0, 0, 0, 0.38))',
                  }}
                >
                  <div
                    className="w-full h-full envelope-paper-grain rounded-b-[12px]"
                    style={{
                      clipPath: 'polygon(0 100%, 50% 45.5%, 100% 100%)',
                      background:
                        'linear-gradient(180deg, #B32227 0%, #8D161A 40%, #610C0F 100%)',
                    }}
                  />
                  <svg
                    viewBox="0 0 100 70"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    <polyline
                      points="0.6,69.6 50,32.1 99.4,69.6"
                      fill="none"
                      stroke="rgba(255, 224, 185, 0.22)"
                      strokeWidth="0.6"
                    />
                    <polyline
                      points="0.6,69.9 50,32.5 99.4,69.9"
                      fill="none"
                      stroke="rgba(218, 178, 62, 0.56)"
                      strokeWidth="0.38"
                    />
                  </svg>
                </div>

                {/* FLAP 2 — Left Triangular Velvet Flap (hinged along left edge) */}
                <div
                  ref={leftFlapRef}
                  aria-hidden="true"
                  data-testid="envelope-flap-left"
                  className="envelope-flap-base absolute inset-0 z-[14] pointer-events-none"
                  style={{
                    transformOrigin: '0% 50%',
                    filter: isOpening
                      ? 'drop-shadow(-8px 4px 18px rgba(4, 10, 22, 0.48))'
                      : 'drop-shadow(3px 0 8px rgba(0, 0, 0, 0.34))',
                  }}
                >
                  <div
                    className="w-full h-full envelope-paper-grain rounded-l-[12px]"
                    style={{
                      clipPath: 'polygon(0 0, 52.5% 50%, 0 100%)',
                      background:
                        'linear-gradient(132deg, #A71F24 0%, #831418 58%, #5B0B0E 100%)',
                    }}
                  />
                  <svg
                    viewBox="0 0 100 70"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    <polyline
                      points="0.4,0.6 52.2,35 0.4,69.4"
                      fill="none"
                      stroke="rgba(218, 178, 62, 0.44)"
                      strokeWidth="0.38"
                    />
                  </svg>
                </div>

                {/* FLAP 3 — Right Triangular Velvet Flap (hinged along right edge) */}
                <div
                  ref={rightFlapRef}
                  aria-hidden="true"
                  data-testid="envelope-flap-right"
                  className="envelope-flap-base absolute inset-0 z-[16] pointer-events-none"
                  style={{
                    transformOrigin: '100% 50%',
                    filter: isOpening
                      ? 'drop-shadow(8px 4px 18px rgba(4, 10, 22, 0.48))'
                      : 'drop-shadow(-3px 0 8px rgba(0, 0, 0, 0.36))',
                  }}
                >
                  <div
                    className="w-full h-full envelope-paper-grain rounded-r-[12px]"
                    style={{
                      clipPath: 'polygon(100% 0, 47.5% 50%, 100% 100%)',
                      background:
                        'linear-gradient(228deg, #9C1B20 0%, #781216 62%, #520A0D 100%)',
                    }}
                  />
                  <svg
                    viewBox="0 0 100 70"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    <polyline
                      points="99.6,0.6 47.8,35 99.6,69.4"
                      fill="none"
                      stroke="rgba(218, 178, 62, 0.44)"
                      strokeWidth="0.38"
                    />
                  </svg>
                </div>

                {/* FLAP 4 — Top Triangular Velvet Flap (hinged along top edge, embossed gold filigree) */}
                <div
                  ref={topFlapRef}
                  aria-hidden="true"
                  data-testid="envelope-flap-top"
                  className="envelope-flap-base absolute inset-0 z-[20] pointer-events-none"
                  style={{
                    transformOrigin: '50% 0%',
                    filter: isOpening
                      ? 'drop-shadow(0 -8px 18px rgba(4, 10, 22, 0.48))'
                      : 'drop-shadow(0 10px 16px rgba(10, 2, 4, 0.54))',
                  }}
                >
                  <div
                    className="w-full h-full envelope-paper-grain rounded-t-[12px]"
                    style={{
                      clipPath: 'polygon(0 0, 100% 0, 50% 57.5%)',
                      background:
                        'linear-gradient(180deg, #BE252A 0%, #9A191E 48%, #721014 100%)',
                    }}
                  />
                  <svg
                    viewBox="0 0 100 70"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    <polyline
                      points="0.8,0.5 50,39.8 99.2,0.5"
                      fill="none"
                      stroke="rgba(242, 206, 102, 0.8)"
                      strokeWidth="0.58"
                    />
                    <polyline
                      points="3.8,0.5 50,36.4 96.2,0.5"
                      fill="none"
                      stroke="rgba(212, 175, 55, 0.36)"
                      strokeWidth="0.3"
                    />
                  </svg>
                </div>

                {/* Delicate 24k brushed-gold stationery perimeter rim */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 z-[24] rounded-[12px] border border-[#E5C158]/50 pointer-events-none"
                  style={{
                    boxShadow: isOpening
                      ? 'inset 0 0 28px rgba(24, 72, 136, 0.52)'
                      : 'inset 0 1px 1px rgba(255, 226, 210, 0.24), inset 0 -2px 6px rgba(32, 3, 5, 0.52)',
                  }}
                />

                {/* Centered Photorealistic Brushed-Gold & Midnight-Navy Enamel Wax Seal — disappears cleanly on click */}
                <div
                  ref={sealRef}
                  className="absolute left-1/2 top-[51.5%] z-30 flex flex-col items-center pointer-events-none"
                  style={{
                    transform: 'translate(-50%, -50%) scale(1)',
                  }}
                >
                  {/* Sculpted metallic 24k gold circular seal ring — gently pulses when loading finishes */}
                  <div
                    data-testid="tract-gold-seal-ring"
                    data-ready={String(ready)}
                    className={`relative w-[118px] h-[118px] sm:w-[132px] sm:h-[132px] rounded-full flex items-center justify-center transition-transform duration-300 ${
                      ready ? 'seal-gold-gentle-pulse group-hover:scale-[1.045]' : ''
                    }`}
                    style={{
                      background:
                        'conic-gradient(from 35deg at 50% 50%, #F7E194 0deg, #C79A28 58deg, #FCEBB0 118deg, #987016 196deg, #E8C456 268deg, #F7E194 360deg)',
                      boxShadow: ready
                        ? undefined
                        : '0 10px 24px rgba(4, 10, 22, 0.6), inset 0 2px 4px rgba(255, 248, 215, 0.5)',
                    }}
                  >
                    {/* Fine inner milled bevel ring */}
                    <div
                      className="w-[106px] h-[106px] sm:w-[118px] sm:h-[118px] rounded-full flex items-center justify-center p-[5px]"
                      style={{
                        background:
                          'radial-gradient(circle at 30% 25%, #B88B1F 0%, #6F510D 100%)',
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.55)',
                      }}
                    >
                      {/* Recessed deep midnight-navy glossy enamel medallion */}
                      <div
                        className="w-full h-full rounded-full flex flex-col items-center justify-center px-2.5 border border-[#F5DE93]/55 relative overflow-hidden"
                        style={{
                          background:
                            'radial-gradient(circle at 48% 28%, #1F477A 0%, #112542 68%, #091528 100%)',
                          boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.62)',
                        }}
                      >
                        {/* Subtle glass-enamel top specular curve */}
                        <div
                          aria-hidden="true"
                          className="absolute inset-x-2 top-1 h-[36%] rounded-full pointer-events-none"
                          style={{
                            background:
                              'linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 100%)',
                          }}
                        />

                        {logo ? (
                          <img
                            src={logo.dataUrl}
                            alt="Logo TRACT Contabilidade"
                            referrerPolicy="no-referrer"
                            className="relative z-10 w-full max-w-[74px] sm:max-w-[82px] h-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]"
                          />
                        ) : (
                          <span className="relative z-10 font-editorial font-semibold text-base tracking-widest text-white">
                            TRACT
                          </span>
                        )}

                        {/* Crisp "CLIQUE" engraving directly below the TRACT mark once loading finishes */}
                        <span
                          data-testid="seal-click-prompt"
                          className="relative z-10 mt-1.5 font-ui text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.24em] text-[#F6DF92] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
                          style={{
                            opacity: ready ? 1 : 0,
                            maxHeight: ready ? '18px' : '0px',
                            transform: ready ? 'translateY(0)' : 'translateY(4px)',
                            transition:
                              'opacity 420ms ease, max-height 420ms ease, transform 420ms cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                        >
                          CLIQUE
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Branded TRACT Progress Bar positioned directly beneath the envelope (fades cleanly when complete) */}
          <div className="min-h-[54px] w-full flex justify-center">
            {isCover && (
              <LoadingScreen
                assetStatus={assetStatus}
                allAssetsReady={allAssetsReady}
                forceVisible={forceLoadingPreview}
              />
            )}
          </div>
        </div>
      </div>
    );
  },
);
