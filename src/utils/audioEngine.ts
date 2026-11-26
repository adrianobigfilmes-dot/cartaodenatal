/**
 * Official Holiday Soundtrack & Voice Audio Engine for TRACT Contabilidade:
 * 1. Before envelope opens (Cover): `/assets/aistudio/Before_The_Ribbon_Breaks_16657981.mp3`
 * 2. Immediately upon opening the envelope: IMMEDIATELY interrupts `Before_The_Ribbon_Breaks`
 *    and starts `/assets/aistudio/The_Solstice_Sprint_b7609118.mp3` from 0:00!
 * 3. Upon arriving at the TRACT Star: Gently ducks `The_Solstice_Sprint` while playing the
 *    official Santa Claus MP3 `/assets/aistudio/Papai_Noel_desejando_feliz_natal_02c82635_e3f07bcd.mp3`.
 *
 * Zero procedural synths and zero synthetic speechSynthesis voices!
 */

const COVER_MUSIC_URL = '/assets/aistudio/Before_The_Ribbon_Breaks_16657981.mp3';
const RIDE_MUSIC_URL = '/assets/aistudio/The_Solstice_Sprint_b7609118.mp3';
const SANTA_AUDIO_URL =
  '/assets/aistudio/Papai_Noel_desejando_feliz_natal_d33e3cce_6999cdbc.mp3';

const RIDE_WEB_AUDIO_FULL_GAIN = 0.85;
const RIDE_WEB_AUDIO_DUCK_GAIN = 0.24;
const RIDE_HTML_FULL_VOLUME = 0.76;
const RIDE_HTML_DUCK_VOLUME = 0.22;

type MusicMode = 'idle' | 'cover' | 'ride';

export class HolidayAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private rideMusicBus: GainNode | null = null;
  private voiceBus: GainNode | null = null;

  // Dedicated HTMLAudioElements for reliable instant start & fallback
  private coverHtmlAudio: HTMLAudioElement | null = null;
  private rideHtmlAudio: HTMLAudioElement | null = null;
  private santaHtmlAudio: HTMLAudioElement | null = null;

  // Preloaded raw bytes + decoded Web Audio buffers for zero-latency envelope & star triggers
  private rideRawBytes: ArrayBuffer | null = null;
  private rideDecodedBuffer: AudioBuffer | null = null;
  private rideDecodePromise: Promise<AudioBuffer | null> | null = null;
  private activeRideSource: AudioBufferSourceNode | null = null;

  private santaRawBytes: ArrayBuffer | null = null;
  private santaDecodedBuffer: AudioBuffer | null = null;
  private santaDecodePromise: Promise<AudioBuffer | null> | null = null;
  private activeSantaSource: AudioBufferSourceNode | null = null;

  private duckRestoreTimer: number | null = null;
  private voiceEndedTimer: number | null = null;
  private pendingVoiceEndedCb: (() => void) | null = null;
  private htmlFadeRafId: number | null = null;
  private isMusicDucked = false;
  private mode: MusicMode = 'idle';
  private isMuted = false;
  private isPrepared = false;
  private coverUnlockCleanup: (() => void) | null = null;

  /**
   * Asynchronously preloads all three official MP3 tracks during the envelope loading bar
   * so switching tracks when the envelope opens is instantaneous with zero gap.
   */
  public async prepare(): Promise<void> {
    if (this.isPrepared || typeof window === 'undefined') {
      this.isPrepared = true;
      return;
    }

    try {
      const coverEl = new Audio(COVER_MUSIC_URL);
      coverEl.preload = 'auto';
      coverEl.loop = true;
      coverEl.volume = 0.72;
      coverEl.muted = this.isMuted;
      this.coverHtmlAudio = coverEl;

      const rideEl = new Audio(RIDE_MUSIC_URL);
      rideEl.preload = 'auto';
      rideEl.loop = true;
      rideEl.volume = 0.76;
      rideEl.muted = this.isMuted;
      this.rideHtmlAudio = rideEl;

      const santaEl = new Audio(SANTA_AUDIO_URL);
      santaEl.preload = 'auto';
      santaEl.volume = 1.0;
      santaEl.muted = this.isMuted;
      this.santaHtmlAudio = santaEl;

      // Pre-fetch raw MP3 bytes for ride soundtrack & Santa voice so Web Audio decoding is instant
      const [rideResp, santaResp] = await Promise.all([
        fetch(RIDE_MUSIC_URL).catch(() => null),
        fetch(SANTA_AUDIO_URL).catch(() => null),
      ]);

      if (rideResp?.ok) {
        this.rideRawBytes = await rideResp.arrayBuffer();
      }
      if (santaResp?.ok) {
        this.santaRawBytes = await santaResp.arrayBuffer();
      }
    } catch {
      // Graceful fallback to HTMLAudioElement streaming if fetch fails
    } finally {
      this.isPrepared = true;
    }
  }

  private ensureAudioGraph(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.ctx && this.masterGain && this.rideMusicBus && this.voiceBus) return true;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return false;

    const ctx = new AudioCtx();
    this.ctx = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = this.isMuted ? 0 : 0.82;
    this.masterGain = masterGain;

    const rideMusicBus = ctx.createGain();
    rideMusicBus.gain.value = 0.85;
    this.rideMusicBus = rideMusicBus;

    const voiceBus = ctx.createGain();
    voiceBus.gain.value = 1.15;
    this.voiceBus = voiceBus;

    rideMusicBus.connect(masterGain);
    voiceBus.connect(masterGain);
    masterGain.connect(ctx.destination);
    return true;
  }

  private decodeBuffer(
    url: string,
    getBytes: () => ArrayBuffer | null,
    setBytes: (b: ArrayBuffer) => void,
    getDecoded: () => AudioBuffer | null,
    setDecoded: (b: AudioBuffer) => void,
    getPromise: () => Promise<AudioBuffer | null> | null,
    setPromise: (p: Promise<AudioBuffer | null>) => void,
  ): Promise<AudioBuffer | null> {
    const existing = getDecoded();
    if (existing) return Promise.resolve(existing);
    const inFlight = getPromise();
    if (inFlight) return inFlight;
    if (!this.ctx) return Promise.resolve(null);

    const ctx = this.ctx;
    const promise = (async () => {
      try {
        let bytes = getBytes();
        if (!bytes) {
          const resp = await fetch(url);
          if (!resp.ok) return null;
          bytes = await resp.arrayBuffer();
          setBytes(bytes);
        }
        const decoded = await ctx.decodeAudioData(bytes.slice(0));
        setDecoded(decoded);
        return decoded;
      } catch {
        return null;
      }
    })();

    setPromise(promise);
    return promise;
  }

  private decodeRideBufferIfNeeded(): Promise<AudioBuffer | null> {
    return this.decodeBuffer(
      RIDE_MUSIC_URL,
      () => this.rideRawBytes,
      (b) => {
        this.rideRawBytes = b;
      },
      () => this.rideDecodedBuffer,
      (b) => {
        this.rideDecodedBuffer = b;
      },
      () => this.rideDecodePromise,
      (p) => {
        this.rideDecodePromise = p;
      },
    );
  }

  private decodeSantaBufferIfNeeded(): Promise<AudioBuffer | null> {
    return this.decodeBuffer(
      SANTA_AUDIO_URL,
      () => this.santaRawBytes,
      (b) => {
        this.santaRawBytes = b;
      },
      () => this.santaDecodedBuffer,
      (b) => {
        this.santaDecodedBuffer = b;
      },
      () => this.santaDecodePromise,
      (p) => {
        this.santaDecodePromise = p;
      },
    );
  }

  private clearCoverUnlockListeners(): void {
    if (this.coverUnlockCleanup) {
      this.coverUnlockCleanup();
      this.coverUnlockCleanup = null;
    }
  }

  private stopCoverMusicImmediately(): void {
    this.clearCoverUnlockListeners();
    if (this.coverHtmlAudio) {
      try {
        this.coverHtmlAudio.pause();
        this.coverHtmlAudio.currentTime = 0;
      } catch {
        // Ignore media state errors
      }
    }
  }

  private cancelHtmlVolumeFade(): void {
    if (this.htmlFadeRafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.htmlFadeRafId);
      this.htmlFadeRafId = null;
    }
  }

  private fadeRideHtmlVolume(targetVolume: number, durationMs: number): void {
    this.cancelHtmlVolumeFade();
    const audio = this.rideHtmlAudio;
    if (!audio || typeof requestAnimationFrame !== 'function') {
      if (audio) audio.volume = targetVolume;
      return;
    }

    const startVolume = audio.volume;
    const startTime = performance.now();
    const step = (now: number) => {
      if (!this.rideHtmlAudio || this.mode !== 'ride') {
        this.htmlFadeRafId = null;
        return;
      }
      const p = Math.min(1, Math.max(0, (now - startTime) / Math.max(1, durationMs)));
      // Smooth ease-in-out curve for musical volume fade
      const eased = p * p * (3 - 2 * p);
      this.rideHtmlAudio.volume = Math.max(
        0,
        Math.min(1, startVolume + (targetVolume - startVolume) * eased),
      );
      if (p < 1) {
        this.htmlFadeRafId = requestAnimationFrame(step);
      } else {
        this.htmlFadeRafId = null;
      }
    };
    this.htmlFadeRafId = requestAnimationFrame(step);
  }

  private stopRideMusicImmediately(): void {
    if (this.duckRestoreTimer !== null) {
      clearTimeout(this.duckRestoreTimer);
      this.duckRestoreTimer = null;
    }
    this.cancelHtmlVolumeFade();
    this.isMusicDucked = false;
    if (this.activeRideSource) {
      try {
        this.activeRideSource.stop();
        this.activeRideSource.disconnect();
      } catch {
        // Ignore already stopped source
      }
      this.activeRideSource = null;
    }
    if (this.rideHtmlAudio) {
      try {
        this.rideHtmlAudio.pause();
        this.rideHtmlAudio.currentTime = 0;
      } catch {
        // Ignore
      }
    }
  }

  private clearVoiceEndedTracking(firePending = false): void {
    if (this.voiceEndedTimer !== null) {
      clearTimeout(this.voiceEndedTimer);
      this.voiceEndedTimer = null;
    }
    const cb = this.pendingVoiceEndedCb;
    this.pendingVoiceEndedCb = null;
    if (firePending && cb) {
      cb();
    }
  }

  private getSantaDurationSec(): number {
    if (this.santaDecodedBuffer && this.santaDecodedBuffer.duration > 0) {
      return this.santaDecodedBuffer.duration;
    }
    if (
      this.santaHtmlAudio &&
      Number.isFinite(this.santaHtmlAudio.duration) &&
      this.santaHtmlAudio.duration > 0
    ) {
      return this.santaHtmlAudio.duration;
    }
    return 6.0;
  }

  private stopSantaVoice(firePendingEnded = false): void {
    this.clearVoiceEndedTracking(firePendingEnded);
    if (this.activeSantaSource) {
      try {
        this.activeSantaSource.onended = null;
        this.activeSantaSource.stop();
        this.activeSantaSource.disconnect();
      } catch {
        // Ignore already stopped source
      }
      this.activeSantaSource = null;
    }
    if (this.santaHtmlAudio) {
      try {
        this.santaHtmlAudio.onended = null;
        this.santaHtmlAudio.pause();
        this.santaHtmlAudio.currentTime = 0;
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Plays `Before_The_Ribbon_Breaks_16657981.mp3` on the cover screen until the envelope opens.
   * Attempts immediate playback and installs a non-intrusive browser autoplay unlock fallback
   * (automatically skipped if the user's first click is directly opening the envelope!).
   */
  public startCoverMusic(): void {
    if (typeof window === 'undefined') return;
    this.mode = 'cover';
    this.stopRideMusicImmediately();
    this.stopSantaVoice();

    if (!this.coverHtmlAudio) {
      const el = new Audio(COVER_MUSIC_URL);
      el.preload = 'auto';
      el.loop = true;
      el.volume = 0.72;
      this.coverHtmlAudio = el;
    }

    const coverEl = this.coverHtmlAudio;
    coverEl.loop = true;
    coverEl.volume = 0.72;
    coverEl.muted = this.isMuted;

    if (this.isMuted) return;

    const tryPlayCover = () => {
      if (this.mode !== 'cover' || this.isMuted) return;
      try {
        const playResult = coverEl.play();
        if (playResult && typeof playResult.then === 'function') {
          playResult
            .then(() => {
              this.clearCoverUnlockListeners();
            })
            .catch(() => {
              this.installCoverAutoplayFallback();
            });
        }
      } catch {
        this.installCoverAutoplayFallback();
      }
    };

    tryPlayCover();
  }

  private installCoverAutoplayFallback(): void {
    if (this.coverUnlockCleanup || this.mode !== 'cover' || typeof window === 'undefined') {
      return;
    }

    const onFirstGesture = (ev: Event) => {
      // If the user's very first interaction is clicking the envelope itself,
      // DO NOT start Before_The_Ribbon_Breaks — let unlockAndStart launch The_Solstice_Sprint!
      const target = ev.target as HTMLElement | null;
      if (target && typeof target.closest === 'function') {
        if (target.closest('[data-envelope-trigger="true"]')) {
          this.clearCoverUnlockListeners();
          return;
        }
      }

      if (this.mode !== 'cover' || this.isMuted) {
        this.clearCoverUnlockListeners();
        return;
      }

      this.clearCoverUnlockListeners();
      if (this.coverHtmlAudio) {
        this.coverHtmlAudio.muted = false;
        this.coverHtmlAudio.volume = 0.72;
        void this.coverHtmlAudio.play().catch(() => {
          // Still blocked; will transition directly to ride music upon envelope open
        });
      }
    };

    window.addEventListener('pointerdown', onFirstGesture, { capture: true });
    window.addEventListener('keydown', onFirstGesture, { capture: true });
    window.addEventListener('touchstart', onFirstGesture, { capture: true });

    this.coverUnlockCleanup = () => {
      window.removeEventListener('pointerdown', onFirstGesture, { capture: true });
      window.removeEventListener('keydown', onFirstGesture, { capture: true });
      window.removeEventListener('touchstart', onFirstGesture, { capture: true });
    };
  }

  /**
   * Called the exact instant the envelope is opened:
   * - IMMEDIATELY interrupts & stops `Before_The_Ribbon_Breaks_16657981.mp3`
   * - IMMEDIATELY starts `The_Solstice_Sprint_b7609118.mp3` from 0:00!
   */
  public unlockAndStart(): void {
    this.mode = 'ride';
    this.stopCoverMusicImmediately();
    this.stopRideMusicImmediately();
    this.stopSantaVoice();

    try {
      const hasGraph = this.ensureAudioGraph();
      if (hasGraph && this.ctx && this.rideMusicBus) {
        if (this.ctx.state === 'suspended') {
          void this.ctx.resume();
        }
        const now = this.ctx.currentTime;
        this.rideMusicBus.gain.cancelScheduledValues(now);
        this.rideMusicBus.gain.setValueAtTime(0.85, now);

        // Pre-decode Santa MP3 in background so it fires instantaneously upon reaching the Star
        void this.decodeSantaBufferIfNeeded();

        // If `The_Solstice_Sprint` is already decoded in Web Audio, start with 0ms precision
        if (this.rideDecodedBuffer) {
          this.startRideBufferSource(this.rideDecodedBuffer);
          return;
        }
      }

      // Start `The_Solstice_Sprint` immediately via preloaded HTMLAudioElement (zero delay!)
      if (!this.rideHtmlAudio) {
        const el = new Audio(RIDE_MUSIC_URL);
        el.preload = 'auto';
        el.loop = true;
        this.rideHtmlAudio = el;
      }

      this.rideHtmlAudio.loop = true;
      this.rideHtmlAudio.currentTime = 0;
      this.rideHtmlAudio.volume = 0.76;
      this.rideHtmlAudio.muted = this.isMuted;

      if (!this.isMuted) {
        void this.rideHtmlAudio.play().catch(() => {
          // Fallback to Web Audio decode if HTMLAudioElement playback fails
          void this.decodeRideBufferIfNeeded().then((decoded) => {
            if (decoded && this.mode === 'ride' && !this.isMuted && !this.activeRideSource) {
              this.startRideBufferSource(decoded);
            }
          });
        });
      }

      // Decode Web Audio buffer quietly for subsequent replays
      void this.decodeRideBufferIfNeeded();
    } catch {
      // Graceful fallback
    }
  }

  private startRideBufferSource(buffer: AudioBuffer): void {
    if (!this.ctx || !this.rideMusicBus || this.mode !== 'ride') return;
    this.stopRideMusicImmediately();

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(this.rideMusicBus);
    src.start(0);
    this.activeRideSource = src;
  }

  /**
   * Returns cleanly to the cover soundtrack (`Before_The_Ribbon_Breaks`) on Replay / Return to Start.
   */
  public returnToCoverMusic(): void {
    this.stopRideMusicImmediately();
    this.stopSantaVoice();
    if (this.coverHtmlAudio) {
      try {
        this.coverHtmlAudio.currentTime = 0;
      } catch {
        // Ignore
      }
    }
    this.startCoverMusic();
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.82, now, 0.05);
    }

    if (this.coverHtmlAudio) {
      this.coverHtmlAudio.muted = muted;
      if (muted) {
        this.coverHtmlAudio.pause();
      } else if (this.mode === 'cover') {
        void this.coverHtmlAudio.play().catch(() => {});
      }
    }

    if (this.rideHtmlAudio) {
      this.rideHtmlAudio.muted = muted;
      if (muted) {
        this.rideHtmlAudio.pause();
      } else if (this.mode === 'ride' && !this.activeRideSource) {
        void this.rideHtmlAudio.play().catch(() => {});
      }
    }

    if (this.santaHtmlAudio) {
      this.santaHtmlAudio.muted = muted;
      if (muted) {
        this.santaHtmlAudio.pause();
      }
    }

    if (muted) {
      // If user mutes mid-speech, still notify voice completion so post-speech buttons appear cleanly
      this.stopSantaVoice(true);
      this.isMusicDucked = false;
      this.cancelHtmlVolumeFade();
      if (this.duckRestoreTimer !== null) {
        clearTimeout(this.duckRestoreTimer);
        this.duckRestoreTimer = null;
      }
      if (this.ctx && this.rideMusicBus) {
        const now = this.ctx.currentTime;
        this.rideMusicBus.gain.cancelScheduledValues(now);
        this.rideMusicBus.gain.setValueAtTime(RIDE_WEB_AUDIO_FULL_GAIN, now);
      }
      if (this.rideHtmlAudio) {
        this.rideHtmlAudio.volume = RIDE_HTML_FULL_VOLUME;
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private duckRideMusicForVoice(safetyDurationSec: number): void {
    if (this.duckRestoreTimer !== null) {
      clearTimeout(this.duckRestoreTimer);
      this.duckRestoreTimer = null;
    }
    this.isMusicDucked = true;

    // Smoothly lower Web Audio ride bus while Santa speaks
    if (this.ctx && this.rideMusicBus) {
      const now = this.ctx.currentTime;
      this.rideMusicBus.gain.cancelScheduledValues(now);
      this.rideMusicBus.gain.setValueAtTime(this.rideMusicBus.gain.value, now);
      this.rideMusicBus.gain.linearRampToValueAtTime(RIDE_WEB_AUDIO_DUCK_GAIN, now + 0.22);
    }

    // Smoothly lower HTMLAudioElement ride soundtrack while Santa speaks
    if (this.rideHtmlAudio && !this.rideHtmlAudio.paused) {
      this.fadeRideHtmlVolume(RIDE_HTML_DUCK_VOLUME, 240);
    }

    // Safety fallback in case an audio ended event is ever suppressed by the browser
    this.duckRestoreTimer = window.setTimeout(() => {
      this.restoreRideMusicVolume();
    }, Math.round((safetyDurationSec + 0.6) * 1000));
  }

  /**
   * Immediately swells `The_Solstice_Sprint` smoothly back up to full volume
   * the moment Santa's voice finishes speaking.
   */
  private restoreRideMusicVolume(): void {
    if (this.duckRestoreTimer !== null) {
      clearTimeout(this.duckRestoreTimer);
      this.duckRestoreTimer = null;
    }
    if (!this.isMusicDucked) return;
    this.isMusicDucked = false;

    if (this.mode !== 'ride') return;

    if (this.ctx && this.rideMusicBus) {
      const now = this.ctx.currentTime;
      this.rideMusicBus.gain.cancelScheduledValues(now);
      this.rideMusicBus.gain.setValueAtTime(this.rideMusicBus.gain.value, now);
      this.rideMusicBus.gain.linearRampToValueAtTime(RIDE_WEB_AUDIO_FULL_GAIN, now + 0.85);
    }

    if (this.rideHtmlAudio && !this.rideHtmlAudio.paused) {
      this.fadeRideHtmlVolume(RIDE_HTML_FULL_VOLUME, 850);
    }
  }

  /**
   * Ducks `The_Solstice_Sprint` gracefully, plays the official Santa Claus MP3 greeting,
   * and invokes `onVoiceEnded` right when the voice finishes (even if audio is muted).
   */
  public playStarArrivalAndSantaVoice(onVoiceEnded?: () => void): void {
    if (this.isMuted) {
      this.clearVoiceEndedTracking(false);
      if (onVoiceEnded && typeof window !== 'undefined') {
        this.pendingVoiceEndedCb = onVoiceEnded;
        this.voiceEndedTimer = window.setTimeout(() => {
          this.clearVoiceEndedTracking(true);
        }, Math.round(this.getSantaDurationSec() * 1000));
      }
      return;
    }
    this.speakSantaGreeting(onVoiceEnded);
  }

  /**
   * Plays exclusively the attached official Santa Claus MP3 recording (zero synthetic voices),
   * restores music volume immediately as soon as the voice finishes, and fires `onVoiceEnded`.
   */
  public speakSantaGreeting(onVoiceEnded?: () => void): void {
    if (typeof window === 'undefined') {
      return;
    }
    if (this.isMuted) {
      if (onVoiceEnded) {
        this.clearVoiceEndedTracking(false);
        this.pendingVoiceEndedCb = onVoiceEnded;
        this.voiceEndedTimer = window.setTimeout(() => {
          this.clearVoiceEndedTracking(true);
        }, Math.round(this.getSantaDurationSec() * 1000));
      }
      return;
    }

    this.stopSantaVoice(false);

    let settled = false;
    const notifyEndedOnce = () => {
      if (settled) return;
      settled = true;
      this.clearVoiceEndedTracking(false);
      this.restoreRideMusicVolume();
      onVoiceEnded?.();
    };

    this.pendingVoiceEndedCb = () => {
      if (settled) return;
      settled = true;
      onVoiceEnded?.();
    };

    const armFallbackEndTimer = (durationSec: number) => {
      if (this.voiceEndedTimer !== null) {
        clearTimeout(this.voiceEndedTimer);
      }
      this.voiceEndedTimer = window.setTimeout(() => {
        notifyEndedOnce();
      }, Math.round((durationSec + 0.45) * 1000));
    };

    this.ensureAudioGraph();
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    const playViaBuffer = (buffer: AudioBuffer) => {
      if (this.isMuted || !this.ctx || !this.voiceBus) {
        armFallbackEndTimer(buffer.duration);
        return;
      }
      if (this.activeSantaSource) {
        try {
          this.activeSantaSource.onended = null;
          this.activeSantaSource.stop();
          this.activeSantaSource.disconnect();
        } catch {
          // Ignore
        }
        this.activeSantaSource = null;
      }

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.voiceBus);
      src.onended = () => {
        if (this.activeSantaSource === src) {
          this.activeSantaSource = null;
          notifyEndedOnce();
        }
      };
      this.activeSantaSource = src;
      this.duckRideMusicForVoice(buffer.duration);
      armFallbackEndTimer(buffer.duration);
      src.start(0);
    };

    if (this.santaDecodedBuffer) {
      playViaBuffer(this.santaDecodedBuffer);
      return;
    }

    // Arm initial safety timer in case decoding or autoplay stalls
    armFallbackEndTimer(this.getSantaDurationSec());

    void this.decodeSantaBufferIfNeeded().then((decoded) => {
      if (settled) return;
      if (this.isMuted) {
        return;
      }
      if (decoded) {
        playViaBuffer(decoded);
      } else if (this.santaHtmlAudio) {
        try {
          const santaEl = this.santaHtmlAudio;
          santaEl.muted = false;
          santaEl.volume = 1.0;
          santaEl.currentTime = 0;
          const dur = this.getSantaDurationSec();
          santaEl.onended = () => {
            santaEl.onended = null;
            notifyEndedOnce();
          };
          this.duckRideMusicForVoice(dur);
          armFallbackEndTimer(dur);
          void santaEl.play().catch(() => {
            this.restoreRideMusicVolume();
            // Keep natural duration timer armed so buttons still reveal cleanly after voice window + 2s
          });
        } catch {
          this.restoreRideMusicVolume();
        }
      }
    });
  }

  public stopAll(): void {
    this.mode = 'idle';
    this.stopCoverMusicImmediately();
    this.stopRideMusicImmediately();
    this.stopSantaVoice();
  }

  public dispose(): void {
    this.stopAll();
    this.coverHtmlAudio = null;
    this.rideHtmlAudio = null;
    this.santaHtmlAudio = null;
    this.rideRawBytes = null;
    this.rideDecodedBuffer = null;
    this.rideDecodePromise = null;
    this.santaRawBytes = null;
    this.santaDecodedBuffer = null;
    this.santaDecodePromise = null;
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
      this.rideMusicBus = null;
      this.voiceBus = null;
    }
  }
}
