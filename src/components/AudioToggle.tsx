import { Volume2, VolumeX, MessageCircleHeart } from 'lucide-react';
import type { ExperiencePhase } from '../types/experience';

interface AudioToggleProps {
  isMuted: boolean;
  phase: ExperiencePhase;
  onToggleMute: () => void;
  onReplayVoice: () => void;
}

export function AudioToggle({
  isMuted,
  phase,
  onToggleMute,
  onReplayVoice,
}: AudioToggleProps) {
  return (
    <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
      {phase === 'star' && !isMuted && (
        <button
          type="button"
          onClick={onReplayVoice}
          aria-label="Ouvir saudação de Natal novamente"
          title="Ouvir saudação novamente"
          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-3 rounded-lg bg-[#112542]/90 border border-[#D4AF37]/40 text-[#F3D678] hover:bg-[#1F4E79] transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3D678]"
        >
          <MessageCircleHeart className="w-4 h-4" aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        onClick={onToggleMute}
        aria-pressed={isMuted}
        aria-label={isMuted ? 'Ativar áudio' : 'Silenciar áudio'}
        title={isMuted ? 'Ativar áudio' : 'Silenciar áudio'}
        className="inline-flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-3.5 rounded-lg bg-[#112542]/90 border border-white/20 text-white hover:bg-[#1F4E79] hover:border-[#D4AF37]/50 transition-colors duration-200 cursor-pointer font-ui text-xs font-medium whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3D678]"
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4 text-[#DCE6F5]" aria-hidden="true" />
        ) : (
          <Volume2 className="w-4 h-4 text-[#F3D678]" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">{isMuted ? 'Som desligado' : 'Som ativo'}</span>
      </button>
    </div>
  );
}
