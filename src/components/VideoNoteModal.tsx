import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Disc,
  Check,
  Camera,
  RefreshCw,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Upload
} from 'lucide-react';
import { playSentSound } from '../utils/audioUtils';

interface VideoNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVideoNote: (mediaUrl: string, durationSec: number) => void;
}

export const VideoNoteModal: React.FC<VideoNoteModalProps> = ({
  isOpen,
  onClose,
  onSendVideoNote
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [liveMicLevel, setLiveMicLevel] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [isPreviewMuted, setIsPreviewMuted] = useState(false);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const finalDataUrlRef = useRef<string | null>(null);
  const timerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meterIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setRecordedBlobUrl(null);
      finalDataUrlRef.current = null;
      setRecordSeconds(0);
      setIsRecording(false);
      setIsMicMuted(false);
      startCamera(facingMode);
    } else {
      stopAllMedia();
      setIsRecording(false);
      setRecordSeconds(0);
      setRecordedBlobUrl(null);
      finalDataUrlRef.current = null;
    }
    return () => stopAllMedia();
  }, [isOpen]);

  // Attach live stream to <video> element whenever cameraActive or stream changes
  useEffect(() => {
    if (cameraActive && streamRef.current && liveVideoRef.current && !recordedBlobUrl) {
      liveVideoRef.current.srcObject = streamRef.current;
      liveVideoRef.current.play().catch(() => {});
    }
  }, [cameraActive, recordedBlobUrl, facingMode]);

  const stopAllMedia = () => {
    clearInterval(timerRef.current);
    clearInterval(meterIntervalRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }

    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setCameraActive(false);
    setLiveMicLevel(0);
  };

  const startCamera = async (targetFacing: 'user' | 'environment' = facingMode) => {
    stopAllMedia();
    setCameraError(null);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: targetFacing,
            width: { ideal: 480 },
            height: { ideal: 480 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch {
        // Fallback if specific resolution/facingMode constraint fails
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
      }

      streamRef.current = stream;
      setCameraActive(true);

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(() => {});
      }

      // Connect microphone track to Web Audio API AnalyserNode so user sees live mic level
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass && stream.getAudioTracks().length > 0) {
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        analyserRef.current = analyser;

        meterIntervalRef.current = setInterval(() => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          const level = Math.min(100, Math.round((avg / 120) * 100));
          setLiveMicLevel(level);
        }, 80);
      }
    } catch (err: any) {
      setCameraActive(false);
      setCameraError(
        'Не удалось получить доступ к камере и микрофону. Разрешите доступ в браузере или загрузите видео с устройства.'
      );
    }
  };

  const handleFlipCamera = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const handleToggleMic = () => {
    const nextMuted = !isMicMuted;
    setIsMicMuted(nextMuted);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
    if (nextMuted) setLiveMicLevel(0);
  };

  const handleStartRecord = async () => {
    // Ensure stream is active before recording
    if (!streamRef.current) {
      await startCamera(facingMode);
    }
    const stream = streamRef.current;
    if (!stream) return;

    recordedChunksRef.current = [];
    finalDataUrlRef.current = null;
    setIsRecording(true);
    setRecordSeconds(0);

    try {
      const mimeTypes = [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm',
        'video/mp4'
      ];
      const supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        setRecordedBlobUrl(blobUrl);
        setIsPreviewPlaying(true);
        setIsPreviewMuted(false);

        // Also convert to DataURL for persistence in chat
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            finalDataUrlRef.current = reader.result;
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(150);
    } catch {
      // Fallback if MediaRecorder fails
    }

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRecordSeconds((s) => {
        if (s >= 59) {
          handleStopRecord();
          return 60;
        }
        return s + 1;
      });
    }, 1000);
  };

  const handleStopRecord = () => {
    setIsRecording(false);
    clearInterval(timerRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    // Stop live camera tracks after recording finishes so preview plays cleanly with sound
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    clearInterval(meterIntervalRef.current);
    setCameraActive(false);
  };

  const handleRetake = () => {
    setRecordedBlobUrl(null);
    finalDataUrlRef.current = null;
    setRecordSeconds(0);
    setIsRecording(false);
    startCamera(facingMode);
  };

  const handleDeviceVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopAllMedia();
    const objUrl = URL.createObjectURL(file);
    setRecordedBlobUrl(objUrl);
    setRecordSeconds(10);
    setIsPreviewPlaying(true);
    setIsPreviewMuted(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        finalDataUrlRef.current = reader.result;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSend = () => {
    const urlToSend = finalDataUrlRef.current || recordedBlobUrl;
    if (!urlToSend) return;
    playSentSound();
    onSendVideoNote(urlToSend, Math.max(1, recordSeconds));
    stopAllMedia();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none">
      <div className="bg-[#17212b] border border-[#243344] rounded-3xl p-5 sm:p-6 w-full max-w-sm flex flex-col items-center relative shadow-2xl text-white">
        <button
          onClick={() => {
            stopAllMedia();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-[#202b36] cursor-pointer transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Flip Camera & Mic Toggle Buttons */}
        {!recordedBlobUrl && (
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleFlipCamera}
              className="p-2 text-slate-200 hover:text-white rounded-full bg-[#202b36] hover:bg-[#2b3947] transition cursor-pointer"
              title="Перевернуть камеру (фронтальная / основная)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToggleMic}
              className={`p-2 rounded-full transition cursor-pointer ${
                isMicMuted
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-600/30 border border-emerald-500/40 text-emerald-300'
              }`}
              title={isMicMuted ? 'Включить микрофон' : 'Микрофон включён (записывает звук)'}
            >
              {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
        )}

        <h3 className="text-base font-bold text-white mb-3 mt-4">Видеосообщение («Кружочек»)</h3>
        {recordedBlobUrl && (
          <p className="text-[11px] text-slate-400 mb-4 text-center">
            Прослушайте кружочек со звуком перед отправкой
          </p>
        )}

        {/* Circular Viewport */}
        <div
          style={{
            boxShadow: isRecording
              ? `0 0 ${16 + liveMicLevel * 0.35}px rgba(244, 63, 94, 0.7)`
              : undefined
          }}
          className={`relative w-60 h-60 sm:w-64 sm:h-64 rounded-full overflow-hidden border-4 bg-black flex items-center justify-center shadow-2xl transition-all ${
            isRecording
              ? 'border-rose-500'
              : recordedBlobUrl
              ? 'border-emerald-500'
              : 'border-[#0077FF]'
          }`}
        >
          {/* 1. LIVE CAMERA VIDEO ELEMENT (Always rendered when not in preview so ref is always attached) */}
          {!recordedBlobUrl && (
            <video
              ref={liveVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${
                facingMode === 'user' ? '-scale-x-100' : ''
              } ${cameraActive ? 'block' : 'hidden'}`}
            />
          )}

          {/* 2. RECORDED VIDEO NOTE PREVIEW PLAYER WITH REAL SOUND */}
          {recordedBlobUrl && (
            <div className="relative w-full h-full">
              <video
                ref={previewVideoRef}
                src={recordedBlobUrl}
                autoPlay
                loop
                playsInline
                muted={isPreviewMuted}
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? '-scale-x-100' : ''
                }`}
              />
              {/* Play/Pause & Mute controls over preview */}
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 z-20">
                <button
                  type="button"
                  onClick={() => {
                    if (!previewVideoRef.current) return;
                    if (previewVideoRef.current.paused) {
                      previewVideoRef.current.play();
                      setIsPreviewPlaying(true);
                    } else {
                      previewVideoRef.current.pause();
                      setIsPreviewPlaying(false);
                    }
                  }}
                  className="p-2 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
                >
                  {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isPreviewMuted;
                    setIsPreviewMuted(next);
                    if (previewVideoRef.current) {
                      previewVideoRef.current.muted = next;
                    }
                  }}
                  className="p-2 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
                  title={isPreviewMuted ? 'Включить звук' : 'Выключить звук'}
                >
                  {isPreviewMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>
            </div>
          )}

          {/* Fallback if camera permission denied or not yet active */}
          {!cameraActive && !recordedBlobUrl && (
            <div className="flex flex-col items-center justify-center p-5 text-center">
              <Camera className="w-10 h-10 text-[#64b5f6] mb-2 animate-pulse" />
              <div className="text-xs text-slate-200 font-semibold">
                {cameraError ? 'Камера недоступна' : 'Запуск камеры и микрофона...'}
              </div>
              {cameraError && (
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">{cameraError}</p>
              )}
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="mt-3 px-3 py-1.5 rounded-xl bg-[#0077FF] hover:bg-blue-600 text-white text-[11px] font-bold cursor-pointer"
              >
                Включить камеру и микрофон
              </button>
            </div>
          )}

          {/* Recording timer */}
          {isRecording && (
            <div className="absolute top-3 px-3 py-1 bg-rose-600/90 text-white rounded-full text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg z-20">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>00:{recordSeconds.toString().padStart(2, '0')}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-5 flex flex-col items-center gap-2.5 w-full">
          {!isRecording && !recordedBlobUrl && (
            <div className="flex items-center gap-2.5 w-full justify-center">
              <button
                type="button"
                onClick={handleStartRecord}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg transition cursor-pointer"
              >
                <Disc className="w-5 h-5" />
                <span>Записать кружочек со звуком</span>
              </button>

              <label
                className="p-3 rounded-2xl bg-[#202b36] hover:bg-[#2b3947] text-slate-200 cursor-pointer transition shrink-0"
                title="Загрузить видео для кружочка с устройства"
              >
                <Upload className="w-5 h-5" />
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleDeviceVideoUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {isRecording && (
            <button
              type="button"
              onClick={handleStopRecord}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg transition cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Остановить запись ({recordSeconds} сек)</span>
            </button>
          )}

          {recordedBlobUrl && (
            <div className="flex items-center gap-2.5 w-full">
              <button
                type="button"
                onClick={handleRetake}
                className="py-3 px-4 rounded-2xl bg-[#202b36] hover:bg-[#2b3947] text-slate-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition"
                title="Перезаписать кружочек"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Переснять</span>
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#0077FF] hover:bg-[#0066DD] text-white font-bold text-xs sm:text-sm shadow-lg transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Отправить кружочек</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
