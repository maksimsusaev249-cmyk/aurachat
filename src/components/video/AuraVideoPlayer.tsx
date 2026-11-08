import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  PictureInPicture, 
  RotateCcw, 
  RotateCw, 
  X, 
  Check, 
  Clock, 
  Edit3,
  Maximize2
} from 'lucide-react';
import { CommunityVideo } from '../../types';

interface AuraVideoPlayerProps {
  video: CommunityVideo;
  onClose: () => void;
  onSaveWatchPosition?: (videoId: string, positionSec: number) => void;
  initialWatchPositionSec?: number;
  onEditVideo?: (video: CommunityVideo) => void;
}

export const AuraVideoPlayer: React.FC<AuraVideoPlayerProps> = ({
  video,
  onClose,
  onSaveWatchPosition,
  initialWatchPositionSec = 0,
  onEditVideo
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);

  // Settings menus
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeMenuTab, setActiveMenuTab] = useState<'main' | 'speed' | 'quality'>('main');
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto');
  const [qualityLevels, setQualityLevels] = useState<{ id: number; name: string }[]>([]);

  // Resume watching prompt state
  const [resumePromptTime, setResumePromptTime] = useState<number | null>(null);

  // Hover time preview state
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  // Controls auto-hide timer
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize HLS / Video engine
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const mediaUrl = video.mediaUrl;
    const isHls = mediaUrl.endsWith('.m3u8') || mediaUrl.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        autoStartLoad: true,
        capLevelToPlayerSize: true
      });
      hlsRef.current = hls;
      hls.loadSource(mediaUrl);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const levels = data.levels.map((lvl, index) => ({
          id: index,
          name: lvl.height ? `${lvl.height}p` : `Уровень ${index + 1}`
        }));
        setQualityLevels(levels);
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (isHls && videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = mediaUrl;
    } else {
      videoEl.src = mediaUrl;
    }
  }, [video.mediaUrl]);

  // Check saved watch position
  useEffect(() => {
    if (initialWatchPositionSec > 10) {
      setResumePromptTime(initialWatchPositionSec);
    }
  }, [initialWatchPositionSec]);

  // Periodic watch position saving (every 5 seconds)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (videoRef.current && onSaveWatchPosition) {
        onSaveWatchPosition(video.id, videoRef.current.currentTime);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, video.id, onSaveWatchPosition]);

  // Show controls when cursor moves over player; hide after 2s or immediately on mouse leave
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      setShowSettingsMenu(false);
    }, 2200);
  };

  const handleMouseLeavePlayer = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(false);
    setShowSettingsMenu(false);
  };

  // Video Event Handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    setCurrentTime(current);

    if (videoRef.current.buffered.length > 0) {
      setBufferedEnd(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      if (onSaveWatchPosition) {
        onSaveWatchPosition(video.id, videoRef.current.currentTime);
      }
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    setVolume(newVol);
    videoRef.current.volume = newVol;
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.volume = volume || 1;
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handleSeek = (timeSec: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = timeSec;
    setCurrentTime(timeSec);
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettingsMenu(false);
  };

  const handleQualityChange = (levelId: number, levelName: string) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
    }
    setSelectedQuality(levelName);
    setShowSettingsMenu(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (isMiniPlayer) {
      setIsMiniPlayer(false);
      return;
    }
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // VK-style "Окно в окне" (Picture-in-Picture): supports both native browser PiP and in-app floating mini-player
  const togglePictureInPicture = async () => {
    if (isMiniPlayer) {
      setIsMiniPlayer(false);
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }

    // Switch into floating VK Mini-Player ("Окно в окне") so it always works even inside iframes
    setIsMiniPlayer(true);

    // Also attempt native browser Picture-in-Picture if supported & allowed by policy
    if (videoRef.current && document.pictureInPictureEnabled && videoRef.current.requestPictureInPicture) {
      try {
        if (!document.pictureInPictureElement) {
          await videoRef.current.requestPictureInPicture();
        }
      } catch {
        // Iframe policy blocked native PiP — our floating VK Mini-Player is already active!
      }
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'i':
        case 'p':
          e.preventDefault();
          togglePictureInPicture();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          if (videoRef.current) handleSeek(Math.max(0, videoRef.current.currentTime - 5));
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          if (videoRef.current) handleSeek(Math.min(duration, videoRef.current.currentTime + 5));
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, duration, isMiniPlayer]);

  // Format Seconds to MM:SS or HH:MM:SS
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleUserActivity}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      onMouseLeave={handleMouseLeavePlayer}
      className={
        isMiniPlayer
          ? 'fixed bottom-4 right-4 z-[110] w-80 sm:w-96 aspect-video bg-[#141414] rounded-2xl shadow-2xl border border-[#2e2e2e] flex items-center justify-center select-none overflow-hidden font-sans transition-all duration-200'
          : 'fixed inset-0 z-[100] bg-black flex items-center justify-center select-none overflow-hidden font-sans'
      }
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        poster={video.coverUrl}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          setShowControls(true);
        }}
        playsInline
        className="w-full h-full object-contain max-h-screen cursor-pointer"
      />

      {/* Resume Watching Prompt Overlay */}
      {resumePromptTime !== null && !isMiniPlayer && (
        <div className="absolute top-16 z-30 bg-[#222222]/95 border border-[#3a3b3c] backdrop-blur-md rounded-xl p-3.5 text-white shadow-2xl flex items-center gap-3.5 animate-in fade-in slide-in-from-top-4">
          <Clock className="w-5 h-5 text-[#0077FF] shrink-0" />
          <div className="text-xs">
            <span className="font-bold block">Продолжить просмотр?</span>
            <span className="text-[#939393] tabular-nums">Вы остановились на {formatTime(resumePromptTime)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                handleSeek(resumePromptTime);
                setResumePromptTime(null);
                if (videoRef.current) videoRef.current.play().catch(() => {});
                setIsPlaying(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              Продолжить
            </button>
            <button
              onClick={() => setResumePromptTime(null)}
              className="px-3 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] text-xs font-medium cursor-pointer whitespace-nowrap"
            >
              Сначала
            </button>
          </div>
        </div>
      )}

      {/* Top Header Controls Bar (Title, Channel Name, PiP / Expand, Edit, Close) */}
      <div
        className={`absolute top-0 inset-x-0 ${
          isMiniPlayer ? 'p-2.5' : 'p-4'
        } bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between text-white transition-opacity duration-200 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {!isMiniPlayer && (
            <img
              src={video.userAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aura'}
              alt=""
              className="w-9 h-9 rounded-full object-cover border border-white/20 shrink-0"
            />
          )}
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold truncate text-white">{video.title}</h2>
            {!isMiniPlayer && <p className="text-[11px] text-[#939393] truncate">{video.userName}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onEditVideo && !isMiniPlayer && (
            <button
              type="button"
              onClick={() => onEditVideo(video)}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-[#0077FF] text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              title="Редактировать видео"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Редактировать</span>
            </button>
          )}
          <button
            type="button"
            onClick={togglePictureInPicture}
            className={`px-2.5 py-1.5 rounded-lg ${
              isMiniPlayer ? 'bg-[#0077FF] text-white' : 'bg-white/10 hover:bg-white/20 text-white'
            } text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap`}
            title={isMiniPlayer ? 'Развернуть из окна в окне' : 'Окно в окне (Picture-in-Picture)'}
          >
            {isMiniPlayer ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Развернуть</span>
              </>
            ) : (
              <>
                <PictureInPicture className="w-4 h-4" />
                <span className="hidden sm:inline">Окно в окне</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              if (videoRef.current && onSaveWatchPosition) {
                onSaveWatchPosition(video.id, videoRef.current.currentTime);
              }
              if (document.pictureInPictureElement) {
                document.exitPictureInPicture().catch(() => {});
              }
              onClose();
            }}
            className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-rose-600 text-white transition cursor-pointer"
            title="Закрыть плеер"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Center Play/Pause Button Overlay — Appears ONLY when cursor is inside player (showControls = true), disappears immediately when cursor leaves */}
      <button
        type="button"
        onClick={togglePlay}
        className={`absolute z-20 ${
          isMiniPlayer ? 'p-3' : 'p-4 sm:p-5'
        } rounded-full bg-black/65 hover:bg-[#0077FF] text-white backdrop-blur-md shadow-2xl transition-all duration-200 cursor-pointer ${
          showControls ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
        }`}
        title={isPlaying ? 'Пауза' : 'Воспроизвести'}
      >
        {isPlaying ? (
          <Pause className={isMiniPlayer ? 'w-6 h-6' : 'w-9 h-9'} />
        ) : (
          <Play className={`${isMiniPlayer ? 'w-6 h-6' : 'w-9 h-9'} fill-current ml-0.5`} />
        )}
      </button>

      {/* Settings Dropdown Menu Overlay */}
      {showSettingsMenu && !isMiniPlayer && (
        <div className="absolute right-4 bottom-20 z-30 w-56 bg-[#222222]/95 border border-[#3a3b3c] backdrop-blur-md rounded-xl p-2 text-white shadow-2xl space-y-1 animate-in fade-in slide-in-from-bottom-2 text-xs">
          {activeMenuTab === 'main' && (
            <>
              <button
                onClick={() => setActiveMenuTab('speed')}
                className="w-full p-2.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-[#e1e3e6] transition cursor-pointer"
              >
                <span>Скорость</span>
                <span className="font-bold text-[#71aaeb] tabular-nums">{playbackRate}x</span>
              </button>
              {qualityLevels.length > 0 && (
                <button
                  onClick={() => setActiveMenuTab('quality')}
                  className="w-full p-2.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-[#e1e3e6] transition cursor-pointer"
                >
                  <span>Качество</span>
                  <span className="font-bold text-[#71aaeb]">{selectedQuality}</span>
                </button>
              )}
            </>
          )}

          {activeMenuTab === 'speed' && (
            <div className="space-y-1">
              <div
                onClick={() => setActiveMenuTab('main')}
                className="p-2 text-[#939393] font-bold border-b border-[#2e2e2e] cursor-pointer hover:text-white"
              >
                ← Скорость воспроизведения
              </div>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handlePlaybackRateChange(rate)}
                  className={`w-full p-2 rounded-lg flex items-center justify-between cursor-pointer transition ${
                    playbackRate === rate ? 'bg-[#0077FF] font-bold text-white' : 'hover:bg-white/10 text-[#e1e3e6]'
                  }`}
                >
                  <span>{rate === 1 ? 'Обычная (1x)' : `${rate}x`}</span>
                  {playbackRate === rate && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          )}

          {activeMenuTab === 'quality' && (
            <div className="space-y-1">
              <div
                onClick={() => setActiveMenuTab('main')}
                className="p-2 text-[#939393] font-bold border-b border-[#2e2e2e] cursor-pointer hover:text-white"
              >
                ← Качество
              </div>
              <button
                onClick={() => handleQualityChange(-1, 'Auto')}
                className={`w-full p-2 rounded-lg flex items-center justify-between cursor-pointer transition ${
                  selectedQuality === 'Auto' ? 'bg-[#0077FF] font-bold text-white' : 'hover:bg-white/10 text-[#e1e3e6]'
                }`}
              >
                <span>Авто (Адаптивно)</span>
                {selectedQuality === 'Auto' && <Check className="w-4 h-4" />}
              </button>
              {qualityLevels.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => handleQualityChange(lvl.id, lvl.name)}
                  className={`w-full p-2 rounded-lg flex items-center justify-between cursor-pointer transition ${
                    selectedQuality === lvl.name ? 'bg-[#0077FF] font-bold text-white' : 'hover:bg-white/10 text-[#e1e3e6]'
                  }`}
                >
                  <span>{lvl.name}</span>
                  {selectedQuality === lvl.name && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Controls Bar (Timeline + Play Buttons + Volume + PiP + Settings + Fullscreen) */}
      <div
        className={`absolute bottom-0 inset-x-0 ${
          isMiniPlayer ? 'p-2' : 'p-4'
        } bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-200 z-20 space-y-2 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Interactive Seek Bar */}
        <div className="relative group cursor-pointer py-1">
          {hoverTime !== null && !isMiniPlayer && (
            <div
              className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 text-white text-[10px] font-mono tabular-nums border border-white/20 pointer-events-none shadow"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          <div
            className="w-full h-1.5 group-hover:h-2 bg-white/30 rounded-full overflow-hidden transition-all relative"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const posPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
              setHoverPosition(posPercent);
              setHoverTime((posPercent / 100) * (duration || 0));
            }}
            onMouseLeave={() => setHoverTime(null)}
            onClick={(e) => {
              if (!duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const posPercent = (e.clientX - rect.left) / rect.width;
              handleSeek(posPercent * duration);
            }}
          >
            <div
              className="absolute inset-y-0 left-0 bg-white/40 transition-all"
              style={{ width: `${duration ? (bufferedEnd / duration) * 100 : 0}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-[#0077FF] transition-all"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Bottom Action Controls Row */}
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-2.5">
            <button onClick={togglePlay} className="p-1 hover:text-[#0077FF] transition cursor-pointer">
              {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />}
            </button>

            {!isMiniPlayer && (
              <>
                <button
                  onClick={() => handleSeek(Math.max(0, currentTime - 5))}
                  className="p-1 hover:text-[#0077FF] transition cursor-pointer"
                  title="Назад на 5 сек (←)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSeek(Math.min(duration, currentTime + 5))}
                  className="p-1 hover:text-[#0077FF] transition cursor-pointer"
                  title="Вперед на 5 сек (→)"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 group relative">
                  <button onClick={toggleMute} className="p-1 hover:text-[#0077FF] transition cursor-pointer">
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 h-1 accent-[#0077FF] cursor-pointer hidden sm:block"
                  />
                </div>
              </>
            )}

            <div className="text-[#e1e3e6] font-mono tabular-nums text-[11px]">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-[#828282]">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5">
            {!isMiniPlayer && (
              <button
                onClick={() => {
                  setShowSettingsMenu(!showSettingsMenu);
                  setActiveMenuTab('main');
                }}
                className="p-1.5 hover:text-[#0077FF] transition cursor-pointer"
                title="Настройки качества и скорости"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            <button
              onClick={togglePictureInPicture}
              className={`p-1.5 hover:text-[#0077FF] transition cursor-pointer ${
                isMiniPlayer ? 'text-[#0077FF]' : ''
              }`}
              title={isMiniPlayer ? 'Развернуть плеер' : 'Окно в окне (I)'}
            >
              <PictureInPicture className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:text-[#0077FF] transition cursor-pointer"
              title="Полноэкранный режим (F)"
            >
              {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

