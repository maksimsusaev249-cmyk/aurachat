import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Music, 
  Play, 
  Pause, 
  Scissors, 
  Check, 
  Clock, 
  FileAudio,
  Volume2,
  Sliders,
  Sparkles
} from 'lucide-react';

export interface TrimmedAudioData {
  audioUrl: string;
  fileName: string;
  title: string;
  artist: string;
  originalDurationSec: number;
  trimmedStartSec: number;
  trimmedLengthSec: number; // 15, 30, 60, or full duration
  sizeBytes: number;
}

interface AudioTrimmerModalProps {
  isOpen: boolean;
  file: File | null;
  onClose: () => void;
  onConfirm: (data: TrimmedAudioData) => void;
}

export type TrimPreset = '15' | '30' | '60' | 'full';

export const AudioTrimmerModal: React.FC<AudioTrimmerModalProps> = ({
  isOpen,
  file,
  onClose,
  onConfirm
}) => {
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [durationSec, setDurationSec] = useState<number>(0);
  const [title, setTitle] = useState<string>('');
  const [artist, setArtist] = useState<string>('');
  const [preset, setPreset] = useState<TrimPreset>('30');
  const [startSec, setStartSec] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize file metadata and audio URL
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);

      // Clean file name for default title / artist
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      if (nameWithoutExt.includes(' - ')) {
        const [a, t] = nameWithoutExt.split(' - ');
        setArtist(a.trim());
        setTitle(t.trim());
      } else {
        setArtist('Исполнитель');
        setTitle(nameWithoutExt);
      }

      // Load duration via temporary Audio object
      const tempAudio = new Audio(url);
      tempAudio.onloadedmetadata = () => {
        const dur = Math.round(tempAudio.duration) || 180;
        setDurationSec(dur);
        // Default preset selection based on total duration
        if (dur <= 30) {
          setPreset('full');
        } else {
          setPreset('30');
        }
        setStartSec(0);
      };

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioUrl('');
      setDurationSec(0);
      setIsPlaying(false);
    }
  }, [file]);

  // Calculate effective clip duration
  const getClipLength = (): number => {
    if (preset === '15') return Math.min(15, durationSec);
    if (preset === '30') return Math.min(30, durationSec);
    if (preset === '60') return Math.min(60, durationSec);
    return durationSec; // full
  };

  const clipLength = getClipLength();
  const maxStart = Math.max(0, durationSec - clipLength);

  // Adjust startSec if maxStart changes
  useEffect(() => {
    if (startSec > maxStart) {
      setStartSec(maxStart);
    }
  }, [preset, maxStart, startSec]);

  // Handle Play/Pause preview
  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = startSec;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error('Audio play error:', err));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const curr = audioRef.current.currentTime;
    setCurrentTime(curr);

    const endBoundary = preset === 'full' ? durationSec : startSec + clipLength;
    if (curr >= endBoundary) {
      audioRef.current.currentTime = startSec;
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setStartSec(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleConfirm = () => {
    if (!file || !audioUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);

    onConfirm({
      audioUrl,
      fileName: file.name,
      title: title.trim() || 'Музыкальный трек',
      artist: artist.trim() || 'Исполнитель',
      originalDurationSec: durationSec,
      trimmedStartSec: preset === 'full' ? 0 : Math.round(startSec),
      trimmedLengthSec: preset === 'full' ? durationSec : Math.round(clipLength),
      sizeBytes: file.size
    });

    onClose();
  };

  if (!isOpen || !file) return null;

  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
  const endSec = preset === 'full' ? durationSec : Math.min(durationSec, startSec + clipLength);

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-[#17212b] border border-[#243344] rounded-3xl p-4 sm:p-6 w-full max-w-md text-white shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin"
      >
        {/* Hidden Audio element for preview playback */}
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#243344]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-md">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                Обрезать & Прикрепить музыку
              </h3>
              <p className="text-[11px] text-slate-400">
                Загружено с устройства • {fileSizeMB} МБ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-[#202b36] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Track Title & Artist editable inputs */}
        <div className="bg-[#1e2a38] p-3 rounded-2xl border border-[#283748] space-y-2">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-300">Данные о треке:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Название песни</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название трека"
                className="w-full bg-[#17212b] border border-[#243344] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500 font-semibold"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Исполнитель</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Исполнитель"
                className="w-full bg-[#17212b] border border-[#243344] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Preset selector: 15s | 30s | 60s | Full */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" /> Выбор длины обрезки:
            </span>
            <span className="text-[11px] font-mono font-bold text-indigo-300">
              {preset === 'full' ? 'Полный трек' : `${preset} сек`}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => setPreset('15')}
              className={`py-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                preset === '15'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg scale-105'
                  : 'bg-[#1e2a38] text-slate-400 hover:text-white border border-[#283748]'
              }`}
            >
              <span>15 сек</span>
              <span className="text-[9px] font-sans font-normal opacity-75">Stories / Reel</span>
            </button>

            <button
              type="button"
              onClick={() => setPreset('30')}
              className={`py-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                preset === '30'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg scale-105'
                  : 'bg-[#1e2a38] text-slate-400 hover:text-white border border-[#283748]'
              }`}
            >
              <span>30 сек</span>
              <span className="text-[9px] font-sans font-normal opacity-75">Стандарт</span>
            </button>

            <button
              type="button"
              onClick={() => setPreset('60')}
              className={`py-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                preset === '60'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg scale-105'
                  : 'bg-[#1e2a38] text-slate-400 hover:text-white border border-[#283748]'
              }`}
            >
              <span>60 сек</span>
              <span className="text-[9px] font-sans font-normal opacity-75">Минута</span>
            </button>

            <button
              type="button"
              onClick={() => setPreset('full')}
              className={`py-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                preset === 'full'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg scale-105'
                  : 'bg-[#1e2a38] text-slate-400 hover:text-white border border-[#283748]'
              }`}
            >
              <span>Вся песня</span>
              <span className="text-[9px] font-sans font-normal opacity-75">{formatTime(durationSec)}</span>
            </button>
          </div>
        </div>

        {/* Waveform Visualization & Range Selector */}
        <div className="bg-[#1e2a38] p-3.5 rounded-2xl border border-[#283748] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="text-slate-400">
              Отрезок: <span className="text-purple-300 font-bold">{formatTime(startSec)} — {formatTime(endSec)}</span>
            </div>
            <div className="text-slate-400">
              Всего: <span className="text-slate-200">{formatTime(durationSec)}</span>
            </div>
          </div>

          {/* Visual Audio Bars with Segment Highlight */}
          <div className="h-12 bg-[#17212b] rounded-xl p-2 flex items-center justify-between gap-0.5 overflow-hidden border border-[#243344] relative">
            {Array.from({ length: 32 }).map((_, i) => {
              const barPosPct = (i / 32) * 100;
              const startPct = durationSec ? (startSec / durationSec) * 100 : 0;
              const endPct = durationSec ? (endSec / durationSec) * 100 : 100;
              const inRange = barPosPct >= startPct && barPosPct <= endPct;
              
              // Animated height simulation for waveform
              const heightPct = Math.sin(i * 0.7) * 40 + 50;

              return (
                <div
                  key={i}
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-full transition-all duration-300 ${
                    inRange
                      ? 'bg-gradient-to-t from-purple-500 to-indigo-400 shadow-sm shadow-purple-500/50'
                      : 'bg-slate-700/50 opacity-40'
                  }`}
                />
              );
            })}
          </div>

          {/* Slider for start position if trimming */}
          {preset !== 'full' && maxStart > 0 && (
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Передвиньте ползунок для выбора начала:</span>
                <span className="font-mono text-purple-300 font-bold">{formatTime(startSec)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={maxStart}
                step={1}
                value={startSec}
                onChange={handleSliderChange}
                className="w-full accent-purple-500 cursor-pointer h-1.5 bg-[#17212b] rounded-lg"
              />
            </div>
          )}

          {/* Play/Pause Preview Button */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={togglePlay}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'Пауза прослушивания' : 'Прослушать отрезок'}</span>
            </button>

            {isPlaying && (
              <span className="text-[11px] font-mono text-purple-300 animate-pulse">
                ► {formatTime(currentTime)}
              </span>
            )}
          </div>
        </div>

        {/* Action Button: Attach Track */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Check className="w-4 h-4" />
          <span>
            Прикрепить {preset === 'full' ? 'всю песню' : `отрезок (${preset} сек)`}
          </span>
        </button>
      </div>
    </div>
  );
};
