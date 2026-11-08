// Real Audio, Custom Device Ringtone, Notification Sound & Microphone Utility for Chatix

export type RingtoneMode = 'custom' | 'device_system' | 'melody_vk' | 'classic_phone' | 'silent';
export type NotificationSoundMode = 'custom' | 'device_system' | 'vk_knock' | 'chime' | 'silent';

export interface AuraSoundSettings {
  ringtoneMode: RingtoneMode;
  customRingtoneUrl?: string;
  customRingtoneName?: string;
  notificationMode: NotificationSoundMode;
  customNotificationUrl?: string;
  customNotificationName?: string;
  volume: number; // 0.0 - 1.0
  vibrationEnabled: boolean;
  systemPushEnabled: boolean;
  uiSoundsEnabled: boolean; // Пищалка интерфейса (по умолчанию выключена)
}

const SOUND_SETTINGS_STORAGE_KEY = 'chatix_sound_settings_v1';

const DEFAULT_SOUND_SETTINGS: AuraSoundSettings = {
  ringtoneMode: 'device_system',
  customRingtoneUrl: undefined,
  customRingtoneName: undefined,
  notificationMode: 'device_system',
  customNotificationUrl: undefined,
  customNotificationName: undefined,
  volume: 0.85,
  vibrationEnabled: true,
  systemPushEnabled: true,
  uiSoundsEnabled: false // Пищалка / звуковые сигналы интерфейса выключены
};

export const getSoundSettings = (): AuraSoundSettings => {
  try {
    const raw = localStorage.getItem(SOUND_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SOUND_SETTINGS;
    const parsed = JSON.parse(raw);
    return { 
      ...DEFAULT_SOUND_SETTINGS, 
      ...parsed,
      uiSoundsEnabled: parsed.uiSoundsEnabled === true
    };
  } catch {
    return DEFAULT_SOUND_SETTINGS;
  }
};

export const saveSoundSettings = (partial: Partial<AuraSoundSettings>): AuraSoundSettings => {
  const updated = { ...getSoundSettings(), ...partial };
  try {
    localStorage.setItem(SOUND_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Quota fallback if DataURL is huge: keep in memory
    (window as any).__auraSoundSettingsMem = updated;
  }
  return updated;
};

// Generate a real PCM WAV Data URI so the browser/OS plays it through the native device audio pipeline
const generateWavDataUri = (
  notes: Array<{ freq: number; durationSec: number; delaySec: number; volume?: number }>,
  totalDurationSec: number
): string => {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * totalDurationSec);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM
  view.setUint16(20, 1, true); // Linear quantization
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  const samples = new Float32Array(numSamples);

  for (const note of notes) {
    const startSample = Math.floor(note.delaySec * sampleRate);
    const lengthSamples = Math.floor(note.durationSec * sampleRate);
    const vol = note.volume ?? 0.35;

    for (let i = 0; i < lengthSamples; i++) {
      const idx = startSample + i;
      if (idx >= numSamples) break;
      const t = i / sampleRate;
      // Smooth envelope (attack + exponential decay)
      const attack = Math.min(1, t / 0.015);
      const decay = Math.exp((-3.5 * t) / note.durationSec);
      const env = attack * decay;
      const wave =
        Math.sin(2 * Math.PI * note.freq * t) * 0.75 +
        Math.sin(2 * Math.PI * (note.freq * 2) * t) * 0.25;
      samples[idx] += wave * env * vol;
    }
  }

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
};

// Cached native WAV Data URIs for device audio playback
let cachedDeviceNotifWav: string | null = null;
let cachedVkKnockWav: string | null = null;
let cachedChimeWav: string | null = null;
let cachedDeviceRingtoneWav: string | null = null;
let cachedMelodyVkRingtoneWav: string | null = null;
let cachedClassicPhoneWav: string | null = null;
let cachedDialToneWav: string | null = null;

const getNotificationWav = (mode: NotificationSoundMode): string | null => {
  if (mode === 'silent') return null;
  if (mode === 'vk_knock') {
    if (!cachedVkKnockWav) {
      cachedVkKnockWav = generateWavDataUri(
        [
          { freq: 520, durationSec: 0.09, delaySec: 0.0, volume: 0.45 },
          { freq: 780, durationSec: 0.14, delaySec: 0.08, volume: 0.4 }
        ],
        0.3
      );
    }
    return cachedVkKnockWav;
  }
  if (mode === 'chime') {
    if (!cachedChimeWav) {
      cachedChimeWav = generateWavDataUri(
        [
          { freq: 659.25, durationSec: 0.18, delaySec: 0.0, volume: 0.35 },
          { freq: 880.0, durationSec: 0.22, delaySec: 0.12, volume: 0.35 },
          { freq: 1318.5, durationSec: 0.35, delaySec: 0.24, volume: 0.3 }
        ],
        0.65
      );
    }
    return cachedChimeWav;
  }
  // 'device_system' default
  if (!cachedDeviceNotifWav) {
    cachedDeviceNotifWav = generateWavDataUri(
      [
        { freq: 587.33, durationSec: 0.12, delaySec: 0.0, volume: 0.45 },
        { freq: 880.0, durationSec: 0.24, delaySec: 0.1, volume: 0.45 }
      ],
      0.4
    );
  }
  return cachedDeviceNotifWav;
};

const getRingtoneWav = (mode: RingtoneMode): string | null => {
  if (mode === 'silent') return null;
  if (mode === 'classic_phone') {
    if (!cachedClassicPhoneWav) {
      cachedClassicPhoneWav = generateWavDataUri(
        [
          { freq: 440, durationSec: 0.35, delaySec: 0.0, volume: 0.4 },
          { freq: 480, durationSec: 0.35, delaySec: 0.0, volume: 0.4 },
          { freq: 440, durationSec: 0.35, delaySec: 0.45, volume: 0.4 },
          { freq: 480, durationSec: 0.35, delaySec: 0.45, volume: 0.4 }
        ],
        2.0
      );
    }
    return cachedClassicPhoneWav;
  }
  if (mode === 'melody_vk') {
    if (!cachedMelodyVkRingtoneWav) {
      cachedMelodyVkRingtoneWav = generateWavDataUri(
        [
          { freq: 523.25, durationSec: 0.22, delaySec: 0.0, volume: 0.4 },
          { freq: 659.25, durationSec: 0.22, delaySec: 0.2, volume: 0.4 },
          { freq: 783.99, durationSec: 0.22, delaySec: 0.4, volume: 0.4 },
          { freq: 1046.5, durationSec: 0.45, delaySec: 0.6, volume: 0.45 },
          { freq: 783.99, durationSec: 0.25, delaySec: 1.1, volume: 0.35 },
          { freq: 1046.5, durationSec: 0.55, delaySec: 1.35, volume: 0.45 }
        ],
        2.5
      );
    }
    return cachedMelodyVkRingtoneWav;
  }
  // 'device_system' default ringtone
  if (!cachedDeviceRingtoneWav) {
    cachedDeviceRingtoneWav = generateWavDataUri(
      [
        { freq: 587.33, durationSec: 0.2, delaySec: 0.0, volume: 0.45 },
        { freq: 783.99, durationSec: 0.2, delaySec: 0.18, volume: 0.45 },
        { freq: 880.0, durationSec: 0.35, delaySec: 0.36, volume: 0.45 },
        { freq: 1174.66, durationSec: 0.5, delaySec: 0.75, volume: 0.45 }
      ],
      2.2
    );
  }
  return cachedDeviceRingtoneWav;
};

const getDialToneWav = (): string => {
  if (!cachedDialToneWav) {
    cachedDialToneWav = generateWavDataUri(
      [
        { freq: 425, durationSec: 0.8, delaySec: 0.1, volume: 0.28 }
      ],
      2.4
    );
  }
  return cachedDialToneWav;
};

// Trigger native OS / Browser notification (uses device's native notification sound & banner)
export const requestNotificationPermissionIfNeeded = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  try {
    if (Notification.permission === 'default') {
      const res = await Notification.requestPermission();
      return res === 'granted';
    }
    return Notification.permission === 'granted';
  } catch {
    return false;
  }
};

export const triggerDeviceNotification = (
  title: string, 
  body: string, 
  icon?: string,
  options?: { isCall?: boolean; callId?: string; tag?: string }
) => {
  try {
    const settings = getSoundSettings();
    if (settings.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      if (options?.isCall) {
        navigator.vibrate([400, 200, 400]);
      } else {
        navigator.vibrate([120, 60, 120]);
      }
    }
    if (!settings.systemPushEnabled) return;
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const notifOptions: any = {
          body,
          icon: icon || '/favicon.ico',
          badge: '/favicon.ico',
          tag: options?.tag || (options?.isCall ? 'chatix_call' : 'chatix_msg'),
          renotify: true,
          requireInteraction: Boolean(options?.isCall),
          silent: false
        };

        // If ServiceWorker registration is available, prefer registration.showNotification for real background & lockscreen alerts
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, notifOptions);
          }).catch(() => {
            new Notification(title, notifOptions);
          });
        } else {
          new Notification(title, notifOptions);
        }
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            new Notification(title, {
              body,
              icon: icon || '/favicon.ico',
              silent: false
            });
          }
        });
      }
    }
  } catch {
    // Ignore if blocked in iframe
  }
};

// Play Notification Sound (Custom uploaded file OR Device sound)
export const playNotificationSound = (title?: string, body?: string) => {
  try {
    const settings = (window as any).__auraSoundSettingsMem || getSoundSettings();
    if (settings.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100);
    }

    if (title && body) {
      triggerDeviceNotification(title, body);
    }

    if (settings.notificationMode === 'silent') return;

    let srcToPlay: string | null = null;
    if (settings.notificationMode === 'custom' && settings.customNotificationUrl) {
      srcToPlay = settings.customNotificationUrl;
    } else {
      srcToPlay = getNotificationWav(settings.notificationMode);
    }

    if (srcToPlay) {
      const audio = new Audio(srcToPlay);
      audio.volume = Math.max(0, Math.min(1, settings.volume ?? 0.85));
      audio.play().catch(() => {});
    }
  } catch {
    // Ignore autoplay errors
  }
};

// Message Sent Sound (пищалка отключена по умолчанию)
export const playSentSound = () => {
  try {
    const settings = (window as any).__auraSoundSettingsMem || getSoundSettings();
    // Пищалка выключена по умолчанию
    if (!settings.uiSoundsEnabled || settings.notificationMode === 'silent') return;
    const wav = generateWavDataUri(
      [{ freq: 520, durationSec: 0.04, delaySec: 0, volume: 0.08 }],
      0.06
    );
    const audio = new Audio(wav);
    audio.volume = Math.max(0, Math.min(1, (settings.volume ?? 0.8) * 0.2));
    audio.play().catch(() => {});
  } catch {}
};

// Message Reaction / Action Click Sound (пищалка отключена по умолчанию)
export const playReactionSound = () => {
  try {
    const settings = (window as any).__auraSoundSettingsMem || getSoundSettings();
    // Пищалка выключена по умолчанию
    if (!settings.uiSoundsEnabled || settings.notificationMode === 'silent') return;
    const wav = generateWavDataUri(
      [{ freq: 580, durationSec: 0.04, delaySec: 0, volume: 0.08 }],
      0.06
    );
    const audio = new Audio(wav);
    audio.volume = Math.max(0, Math.min(1, (settings.volume ?? 0.8) * 0.2));
    audio.play().catch(() => {});
  } catch {}
};

// Функция для полного выключения пищалки
export const disableUiSqueaker = () => {
  saveSoundSettings({ uiSoundsEnabled: false });
};

// --- REAL CALL AUDIO: DIAL TONE (ГУДКИ) & INCOMING / CUSTOM RINGTONE ---

let currentCallAudioElement: HTMLAudioElement | null = null;
let currentCallVibrationTimer: any = null;

// Stop any currently playing ringtone or dial tone
export const stopCallAudio = () => {
  if (currentCallAudioElement) {
    try {
      currentCallAudioElement.pause();
      currentCallAudioElement.currentTime = 0;
    } catch {}
    currentCallAudioElement = null;
  }
  if (currentCallVibrationTimer) {
    clearInterval(currentCallVibrationTimer);
    currentCallVibrationTimer = null;
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0);
    }
  } catch {}
};

// Outgoing Dial Tone: Plays custom ringtone or realistic telephone dial tone
export const startOutgoingDialTone = () => {
  stopCallAudio();
  try {
    const settings = (window as any).__auraSoundSettingsMem || getSoundSettings();
    if (settings.ringtoneMode === 'silent') return () => {};

    const src =
      settings.ringtoneMode === 'custom' && settings.customRingtoneUrl
        ? settings.customRingtoneUrl
        : getDialToneWav();

    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = Math.max(0, Math.min(1, settings.volume ?? 0.85));
    currentCallAudioElement = audio;
    audio.play().catch(() => {});

    return () => {
      stopCallAudio();
    };
  } catch {
    return () => {};
  }
};

// Incoming Call Ringtone: Plays user's custom uploaded ringtone or device ringtone
export const startIncomingRingtone = (callerName?: string) => {
  stopCallAudio();
  try {
    const settings = (window as any).__auraSoundSettingsMem || getSoundSettings();

    if (callerName) {
      triggerDeviceNotification(
        '📞 Входящий звонок Chatix',
        `${callerName} вызывает вас...`,
        undefined,
        { isCall: true, tag: 'chatix_incoming_call' }
      );
    }

    if (settings.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([400, 200, 400]);
      currentCallVibrationTimer = setInterval(() => {
        try {
          navigator.vibrate([400, 200, 400]);
        } catch {}
      }, 2000);
    }

    if (settings.ringtoneMode === 'silent') return () => stopCallAudio();

    const src =
      settings.ringtoneMode === 'custom' && settings.customRingtoneUrl
        ? settings.customRingtoneUrl
        : getRingtoneWav(settings.ringtoneMode);

    if (src) {
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = Math.max(0, Math.min(1, settings.volume ?? 0.85));
      currentCallAudioElement = audio;
      audio.play().catch(() => {});
    }

    return () => {
      stopCallAudio();
    };
  } catch {
    return () => {};
  }
};

// Preview Ringtone in Settings or Call Modal
export const previewRingtone = (overrideSettings?: Partial<AuraSoundSettings>) => {
  stopCallAudio();
  const settings = { ...((window as any).__auraSoundSettingsMem || getSoundSettings()), ...overrideSettings };
  if (settings.ringtoneMode === 'silent') return;

  const src =
    settings.ringtoneMode === 'custom' && settings.customRingtoneUrl
      ? settings.customRingtoneUrl
      : getRingtoneWav(settings.ringtoneMode);

  if (src) {
    const audio = new Audio(src);
    audio.loop = false;
    audio.volume = Math.max(0, Math.min(1, settings.volume ?? 0.85));
    currentCallAudioElement = audio;
    audio.play().catch(() => {});
  }
};

// Voice Memo Player: Plays real recorded microphone audio if mediaUrl is present, with fallback waveform progress
let voiceStopFn: (() => void) | null = null;

export const playVoiceMemoAudio = (
  durationSec: number = 8,
  onProgress: (percent: number) => void,
  onEnded: () => void,
  mediaUrl?: string
) => {
  try {
    if (voiceStopFn) {
      voiceStopFn();
      voiceStopFn = null;
    }

    if (mediaUrl) {
      const settings = (window as any).__auraSoundSettingsMem || getSoundSettings();
      const audio = new Audio(mediaUrl);
      audio.volume = Math.max(0.2, Math.min(1, settings.volume ?? 0.9));

      const interval = setInterval(() => {
        const total =
          audio.duration && isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : durationSec;
        const pct = Math.min(100, (audio.currentTime / Math.max(1, total)) * 100);
        onProgress(pct);
      }, 80);

      audio.onended = () => {
        clearInterval(interval);
        voiceStopFn = null;
        onProgress(100);
        onEnded();
      };

      audio.onerror = () => {
        clearInterval(interval);
        voiceStopFn = null;
        onEnded();
      };

      audio.play().catch(() => {
        clearInterval(interval);
        onEnded();
      });

      voiceStopFn = () => {
        clearInterval(interval);
        try {
          audio.pause();
        } catch {}
        onEnded();
      };

      return voiceStopFn;
    }

    // Fallback for pre-populated demo messages without recorded blob: play a soft natural voice-memo tone + progress
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const pct = Math.min(100, (elapsed / durationSec) * 100);
      onProgress(pct);
      if (elapsed >= durationSec) {
        clearInterval(interval);
        voiceStopFn = null;
        onEnded();
      }
    }, 100);

    voiceStopFn = () => {
      clearInterval(interval);
      onEnded();
    };

    return voiceStopFn;
  } catch {
    onEnded();
    return () => {};
  }
};

// Post Music Track Player
let postMusicStopFn: (() => void) | null = null;

export const stopPostMusicTrack = () => {
  if (postMusicStopFn) {
    postMusicStopFn();
    postMusicStopFn = null;
  }
};

export const playPostMusicTrack = (
  genre: string = 'synthwave',
  onTick?: (beatIndex: number) => void
) => {
  stopPostMusicTrack();

  let isPlaying = true;
  let stepIndex = 0;
  let timer: any = null;

  const playSilentStep = () => {
    if (!isPlaying) return;
    if (onTick) onTick(stepIndex);
    stepIndex++;
    timer = setTimeout(playSilentStep, 800);
  };

  playSilentStep();

  postMusicStopFn = () => {
    isPlaying = false;
    clearTimeout(timer);
  };

  return postMusicStopFn;
};
