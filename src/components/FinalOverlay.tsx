import { RotateCcw, LogOut, ArrowLeft } from 'lucide-react';
import type { ExperiencePhase, ProcessedLogoAssets } from '../types/experience';

interface FinalOverlayProps {
  phase: ExperiencePhase;
  logo: ProcessedLogoAssets | null;
  showActions: boolean;
  onReplay: () => void;
  onExit: () => void;
  onReturnToStart: () => void;
}

export function FinalOverlay({
  phase,
  logo,
  showActions,
  onReplay,
  onExit,
  onReturnToStart,
}: FinalOverlayProps) {
  if (phase !== 'star' && phase !== 'farewell') {
    return null;
  }

  if (phase === 'farewell') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="farewell-heading"
        className="fixed inset-0 z-30 flex items-center justify-center px-5 py-8 bg-[#0B192E]/88"
      >
        <div className="w-full max-w-[440px] rounded-2xl bg-[#112542] border border-[#D4AF37]/45 px-7 py-9 sm:px-9 sm:py-10 text-center shadow-[0_24px_70px_rgba(0,0,0,0.62)]">
          <div className="flex justify-center mb-6">
            {logo ? (
              <img
                src={logo.dataUrl}
                alt="TRACT Contabilidade"
                referrerPolicy="no-referrer"
                className="h-14 sm:h-16 w-auto object-contain"
              />
            ) : (
              <span className="font-editorial text-2xl font-semibold tracking-widest text-white">
                TRACT Contabilidade
              </span>
            )}
          </div>

          <div
            aria-hidden="true"
            className="w-16 h-px mx-auto mb-6 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
          />

          <h1
            id="farewell-heading"
            className="font-editorial text-3xl sm:text-[34px] font-semibold leading-tight text-white [text-wrap:balance]"
          >
            Obrigado pela sua parceria neste ano
          </h1>

          <p className="mt-4 text-sm sm:text-[15px] leading-relaxed text-[#DCE6F5]/90 font-ui">
            A equipe da TRACT Contabilidade deseja a você, sua família e sua
            empresa um Natal iluminado e um Ano Novo repleto de realizações e
            prosperidade.
          </p>

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={onReturnToStart}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-7 py-2.5 rounded-lg bg-[#D4AF37] text-[#0E1E36] font-ui text-sm font-semibold hover:bg-[#E7C65B] transition-colors duration-200 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3D678] focus-visible:ring-offset-2 focus-visible:ring-offset-[#112542]"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Voltar ao início</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Scene 3: Cinematic Star Close-up Greeting — preserves 100% original screen luminosity
  // until 2 seconds after Santa finishes speaking, when the subtle scrim & action buttons fade in.
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none flex flex-col items-center justify-end px-5 pb-8 sm:pb-11 pt-24">
      {/* Bottom contrast scrim stays completely invisible (0 dimming!) until showActions activates */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-gradient-to-t from-[#081326]/90 via-[#081326]/52 to-transparent transition-opacity duration-700 ease-out pointer-events-none ${
          showActions ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="relative z-10 w-full max-w-[780px] flex flex-col items-center text-center pointer-events-auto">
        <h1
          className="font-editorial text-[28px] sm:text-[42px] md:text-[48px] font-semibold leading-[1.14] tracking-[0.01em] text-white [text-wrap:balance]"
          style={{
            textShadow:
              '0 4px 24px rgba(4, 12, 28, 0.94), 0 1px 8px rgba(4, 12, 28, 0.85)',
          }}
        >
          A Tract Contabilidade te deseja um feliz natal!
        </h1>

        <div
          aria-hidden="true"
          className={`w-20 h-[1.5px] mt-4 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent transition-all duration-700 ease-out ${
            showActions ? 'mb-6 opacity-100' : 'mb-0 opacity-0'
          }`}
        />

        {showActions && (
          <div className="flex flex-wrap items-center justify-center gap-3.5 w-full sm:w-auto animate-[fadeIn_650ms_ease-out_forwards]">
            <button
              type="button"
              onClick={onReplay}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-lg bg-[#D4AF37] text-[#0D1E36] font-ui text-sm sm:text-[15px] font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.42)] hover:bg-[#E7C65B] transition-colors duration-200 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3D678] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1E36]"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Assistir novamente</span>
            </button>

            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-lg bg-[#112542]/92 text-white border border-white/30 font-ui text-sm sm:text-[15px] font-medium shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:bg-[#1F4E79] hover:border-[#D4AF37]/60 transition-colors duration-200 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3D678] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1E36]"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
