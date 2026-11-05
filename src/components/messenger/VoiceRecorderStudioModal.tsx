import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  Scissors, 
  Send, 
  Volume2, 
  VolumeX,
  X
} from 'lucide-react';
import { playSentSound, playVoiceMemoAudio } from '../../utils/audioUtils';

interface VoiceRecorderStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVoice: (durationSec: number, waveform: number[], audioUrl?: string) => void;
}

export const VoiceRecorderStudioModal: React.FC<VoiceRecorderStudioModalProps> = ({
  isOpen,
  onClose,
  onSendVoice
}) => {
  const [phase, setPhase] = useState<'recording' | 'preview_and_trim'>('recording');
  
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([]);
  const [liveMicLevel, setLiveMicLevel] = useState<number>(0);
  const [micStatus, setMicStatus] = useState<'recording' | 'dictaphone_mode'>('recording');
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [monitorMic, setMonitorMic] = useState<boolean>(false);

  const recordTimerRef = useRef<any>(null);
  const waveIntervalRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedAudioUrlRef = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgressSec, setPlayProgressSec] = useState(0);
  const [trimStartSec, setTrimStartSec] = useState(0);
  const [trimEndSec, setTrimEndSec] = useState(6);
  
  const stopAudioFnRef = useRef<(() => void) | null>(null);
  const playbackAudioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          const mics = devices.filter((d) => d.kind === 'audioinput');
          setAudioInputs(mics);
        }).catch(() => {});
      }
      startRecording(selectedMicId);
    } else {
      stopAll();
    }
    return () => stopAll();
  }, [isOpen]);

  const stopAll = () => {
    clearInterval(recordTimerRef.current);
    clearInterval(waveIntervalRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    monitorGainRef.current = null;

    if (stopAudioFnRef.current) {
      stopAudioFnRef.current();
      stopAudioFnRef.current = null;
    }
    if (playbackAudioElementRef.current) {
      playbackAudioElementRef.current.pause();
      playbackAudioElementRef.current = null;
    }
    setIsPlaying(false);
    setLiveMicLevel(0);
  };

  const toggleMicMonitoring = () => {
    const next = !monitorMic;
    setMonitorMic(next);
    if (monitorGainRef.current && audioCtxRef.current) {
      monitorGainRef.current.gain.setValueAtTime(next ? 0.85 : 0, audioCtxRef.current.currentTime);
    }
  };

  const startRecording = async (micDeviceId?: string) => {
    stopAll();
    setPhase('recording');
    setRecordSeconds(0);
    setLiveWaveform([18, 25, 20]);
    audioChunksRef.current = [];
    recordedAudioUrlRef.current = null;

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const constraints: MediaStreamConstraints = {
          audio: micDeviceId
            ? { deviceId: { exact: micDeviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            : { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        mediaStreamRef.current = stream;

        // Refresh device labels once permission is granted
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          setAudioInputs(devices.filter((d) => d.kind === 'audioinput'));
        }).catch(() => {});

        // Set up Web Audio API AnalyserNode for real-time microphone volume & waveform
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.6;
          source.connect(analyser);
          analyserRef.current = analyser;

          // Optional live mic loopback (Слышать себя)
          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(monitorMic ? 0.85 : 0, ctx.currentTime);
          source.connect(gainNode);
          gainNode.connect(ctx.destination);
          monitorGainRef.current = gainNode;
        }

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

        const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
          const objUrl = URL.createObjectURL(blob);
          recordedAudioUrlRef.current = objUrl;

          // Also convert to DataURL so it persists cleanly
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              recordedAudioUrlRef.current = reader.result;
            }
          };
          reader.readAsDataURL(blob);

          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start(150);
        setMicStatus('recording');
      } else {
        setMicStatus('dictaphone_mode');
      }
    } catch {
      setMicStatus('dictaphone_mode');
    }

    // Live seconds timer
    recordTimerRef.current = setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);

    // Live frequency wave bars from real microphone AnalyserNode
    waveIntervalRef.current = setInterval(() => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.max(12, Math.round((avg / 140) * 100)));
        setLiveMicLevel(normalized);
        setLiveWaveform((prev) => {
          const next = [...prev, normalized];
          return next.length > 36 ? next.slice(next.length - 36) : next;
        });
      } else {
        const randomFreq = Math.floor(Math.random() * 65) + 20;
        setLiveMicLevel(randomFreq);
        setLiveWaveform((prev) => {
          const next = [...prev, randomFreq];
          return next.length > 36 ? next.slice(next.length - 36) : next;
        });
      }
    }, 100);
  };

  const handleStopRecording = () => {
    clearInterval(recordTimerRef.current);
    clearInterval(waveIntervalRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }

    const finalDuration = Math.max(1, recordSeconds || 3);
    setTrimStartSec(0);
    setTrimEndSec(finalDuration);
    setPlayProgressSec(0);

    const padded = [...liveWaveform];
    while (padded.length < 32) {
      padded.push(Math.floor(Math.random() * 50) + 20);
    }
    setLiveWaveform(padded.slice(0, 32));

    setPhase('preview_and_trim');
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      if (playbackAudioElementRef.current) {
        playbackAudioElementRef.current.pause();
        playbackAudioElementRef.current = null;
      }
      if (stopAudioFnRef.current) {
        stopAudioFnRef.current();
        stopAudioFnRef.current = null;
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const totalTrimmed = Math.max(1, trimEndSec - trimStartSec);
      setPlayProgressSec(trimStartSec);

      if (recordedAudioUrlRef.current) {
        const audio = new Audio(recordedAudioUrlRef.current);
        playbackAudioElementRef.current = audio;
        audio.currentTime = trimStartSec;
        audio.play().catch(() => {});

        const startTime = Date.now();
        const interval = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          const currentSec = trimStartSec + elapsed;
          setPlayProgressSec(currentSec);
          if (currentSec >= trimEndSec || audio.ended) {
            clearInterval(interval);
            audio.pause();
            setIsPlaying(false);
            setPlayProgressSec(trimStartSec);
          }
        }, 80);

        stopAudioFnRef.current = () => {
          clearInterval(interval);
          audio.pause();
        };
      } else {
        const stopFn = playVoiceMemoAudio(
          totalTrimmed,
          (pct) => {
            const currentSec = trimStartSec + (pct / 100) * totalTrimmed;
            setPlayProgressSec(currentSec);
          },
          () => {
            setIsPlaying(false);
            setPlayProgressSec(trimStartSec);
          }
        );
        stopAudioFnRef.current = stopFn;
      }
    }
  };

  const handleSend = () => {
    const audioUrlToSend = recordedAudioUrlRef.current || undefined;
    stopAll();
    playSentSound();
    const finalDuration = Math.max(1, Math.round(trimEndSec - trimStartSec));

    const totalBars = liveWaveform.length || 32;
    const startIdx = Math.floor((trimStartSec / Math.max(1, recordSeconds || trimEndSec)) * totalBars);
    const endIdx = Math.ceil((trimEndSec / Math.max(1, recordSeconds || trimEndSec)) * totalBars);
    const sliced = liveWaveform.slice(startIdx, Math.max(startIdx + 6, endIdx));

    onSendVoice(finalDuration, sliced, audioUrlToSend);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 select-none">
      <div className="bg-[#17212b] border border-[#243344] rounded-3xl p-5 sm:p-6 w-full max-w-md text-white shadow-2xl relative space-y-4">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#243344]">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${phase === 'recording' ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-[#5288c1]/20 text-[#64b5f6]'}`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {phase === 'recording' ? 'Запись голосового сообщения' : 'Предпросмотр и отправка'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {phase === 'recording' 
                  ? (micStatus === 'recording' ? '🎙️ Идет запись голоса' : '🎙️ Режим диктофона') 
                  : 'Прослушайте свою запись перед отправкой в чат'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopAll();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-[#202b36] text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Microphone Selector & Live Loopback Toggle */}
        {phase === 'recording' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[#131c26] p-2.5 rounded-2xl border border-[#243344] text-xs">
            {audioInputs.length > 0 ? (
              <select
                value={selectedMicId}
                onChange={(e) => {
                  setSelectedMicId(e.target.value);
                  startRecording(e.target.value);
                }}
                className="flex-1 bg-[#1e2a38] text-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] outline-none border border-[#283748] truncate"
              >
                <option value="">Микрофон по умолчанию</option>
                {audioInputs.map((mic, idx) => (
                  <option key={mic.deviceId || idx} value={mic.deviceId}>
                    {mic.label || `Микрофон #${idx + 1}`}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] text-emerald-400 font-medium px-1">
                ✓ Системный микрофон подключён
              </span>
            )}

            <button
              type="button"
              onClick={toggleMicMonitoring}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 border ${
                monitorMic
                  ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                  : 'bg-[#1e2a38] border-[#283748] text-slate-300 hover:text-white'
              }`}
              title="Слышать свой голос из микрофона в реальном времени"
            >
              {monitorMic ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
              <span>{monitorMic ? 'Слышу себя: ВКЛ' : 'Слышать себя'}</span>
            </button>
          </div>
        )}

        {/* PHASE 1: RECORDING IN PROGRESS */}
        {phase === 'recording' && (
          <div className="py-4 flex flex-col items-center text-center space-y-5">
            <div className="relative">
              <span
                style={{ transform: `scale(${1 + (liveMicLevel / 100) * 0.45})` }}
                className="w-24 h-24 rounded-full bg-rose-600/25 absolute -inset-2 transition-transform duration-75"
              />
              <div className="w-20 h-20 rounded-full bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-600/40 relative">
                <Mic className="w-10 h-10 text-white" />
              </div>
            </div>

            <div>
              <div className="text-3xl font-mono font-bold text-white tracking-wider">
                00:{recordSeconds < 10 ? '0' + recordSeconds : recordSeconds}
              </div>
              <div className="text-xs text-rose-400 font-medium flex items-center justify-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Говорите в микрофон — идёт запись голоса</span>
              </div>
            </div>

            <div className="h-14 w-full flex items-center justify-center gap-1 bg-[#131c26] p-3 rounded-2xl border border-[#243344] overflow-hidden">
              {liveWaveform.map((height, i) => (
                <span
                  key={i}
                  style={{ height: `${Math.min(100, Math.max(14, height))}%` }}
                  className="w-1 bg-gradient-to-t from-rose-500 to-amber-400 rounded-full transition-all duration-75 shrink-0"
                />
              ))}
            </div>

            <div className="flex items-center gap-3 w-full pt-1">
              <button
                onClick={() => {
                  stopAll();
                  onClose();
                }}
                className="py-3 px-4 rounded-2xl bg-[#202b36] hover:bg-[#283748] text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Отмена
              </button>

              <button
                onClick={handleStopRecording}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 hover:opacity-90 text-white font-bold text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Стоп / Прослушать</span>
              </button>
            </div>
          </div>
        )}

        {/* PHASE 2: PREVIEW & TRIM */}
        {phase === 'preview_and_trim' && (
          <div className="py-3 space-y-4">
            <div className="p-4 bg-[#131c26] rounded-2xl border border-[#243344] flex items-center gap-4">
              <button
                onClick={handleTogglePlay}
                className="p-3.5 rounded-full bg-[#5288c1] hover:bg-blue-500 text-white transition shadow cursor-pointer shrink-0"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-1.5 font-mono text-slate-300">
                  <span>Прослушать запись с микрофона</span>
                  <span className="text-[#64b5f6] font-bold">
                    0:{Math.floor(playProgressSec).toString().padStart(2, '0')} / 0:{Math.round(trimEndSec).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="h-8 flex items-center gap-0.5 bg-[#17212b] px-2 rounded-xl overflow-hidden">
                  {liveWaveform.map((h, i) => {
                    const isPlayed = (playProgressSec / Math.max(1, trimEndSec)) * liveWaveform.length >= i;
                    return (
                      <span
                        key={i}
                        style={{ height: `${Math.max(4, h * 0.22)}px` }}
                        className={`w-1 rounded-full ${isPlayed ? 'bg-[#64b5f6]' : 'bg-slate-600'}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Trim controls */}
            <div className="space-y-2 p-3 bg-[#131c26] rounded-2xl border border-[#243344]">
              <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-amber-400" /> Обрезка записи
                </span>
                <span className="text-amber-400 font-mono text-[11px]">
                  Длительность: {Math.max(1, Math.round(trimEndSec - trimStartSec))} сек
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="text-[11px] text-slate-400 shrink-0 font-mono">Конец:</label>
                <input
                  type="range"
                  min="1"
                  max={Math.max(1, recordSeconds || 15)}
                  step="1"
                  value={trimEndSec}
                  onChange={(e) => setTrimEndSec(parseFloat(e.target.value))}
                  className="flex-1 accent-[#5288c1] cursor-pointer"
                />
                <span className="text-xs font-mono w-8 text-right text-slate-200">{Math.round(trimEndSec)}с</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => startRecording(selectedMicId)}
                className="py-3 px-4 rounded-2xl bg-[#202b36] hover:bg-[#283748] text-slate-300 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Заново</span>
              </button>

              <button
                onClick={handleSend}
                className="flex-1 py-3 rounded-2xl bg-[#5288c1] hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Отправить голосовое</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
