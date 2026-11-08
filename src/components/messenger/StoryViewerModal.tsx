import React, { useState, useEffect } from 'react';
import { Story } from '../../types';
import { X, Clock, Eye, ChevronLeft, ChevronRight, Send, Download } from 'lucide-react';
import { downloadMediaFile } from '../../utils/downloadUtils';
import { isVideoMedia } from '../../utils/mediaUtils';

interface StoryViewerModalProps {
  stories: Story[];
  initialStoryId: string;
  onClose: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialStoryId,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = stories.findIndex((s) => s.id === initialStoryId);
    return idx !== -1 ? idx : 0;
  });
  const [progress, setProgress] = useState(0);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((i) => i + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, stories.length, onClose]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onClose();
    }
  };

  if (!currentStory) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4 select-none"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm h-[680px] bg-black rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between"
      >
        {/* Top Progress Bars */}
        <div className="absolute top-3 inset-x-3 z-30 flex gap-1.5">
          {stories.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                style={{
                  width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%'
                }}
                className="h-full bg-white transition-all duration-100 ease-linear"
              />
            </div>
          ))}
        </div>

        {/* Top Header: Author + 24h Expiry indicator */}
        <div className="relative z-30 pt-7 px-4 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent pb-4">
          <div className="flex items-center gap-2.5">
            <img
              src={currentStory.userAvatar}
              alt={currentStory.userName}
              className="w-9 h-9 rounded-full object-cover border border-white"
            />
            <div>
              <div className="font-bold text-xs">{currentStory.userName}</div>
              <div className="text-[10px] text-amber-300 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                <span>24ч История</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                downloadMediaFile(
                  currentStory.mediaUrl,
                  `chatix_story_${currentStory.id}`,
                  currentStory.mediaType === 'video' ? 'video' : 'image'
                )
              }
              className="px-2.5 py-1 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
              title="Скачать историю"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать</span>
            </button>
            <span className="text-[11px] text-slate-300 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> {currentStory.viewsCount}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-full bg-black/40 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Background */}
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
          {isVideoMedia(currentStory.mediaUrl, currentStory.mediaType) ? (
            <video
              src={currentStory.mediaUrl}
              autoPlay
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt="Story media"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Left / Right Click Nav Zones */}
        <div className="absolute inset-y-16 inset-x-0 z-20 flex justify-between pointer-events-auto">
          <button
            onClick={handlePrev}
            className="w-1/3 h-full opacity-0 hover:opacity-100 flex items-center justify-start pl-2 transition"
          >
            {currentIndex > 0 && (
              <span className="p-2 rounded-full bg-black/40 text-white">
                <ChevronLeft className="w-5 h-5" />
              </span>
            )}
          </button>
          <button
            onClick={handleNext}
            className="w-1/3 h-full opacity-0 hover:opacity-100 flex items-center justify-end pr-2 transition"
          >
            <span className="p-2 rounded-full bg-black/40 text-white">
              <ChevronRight className="w-5 h-5" />
            </span>
          </button>
        </div>

        {/* Bottom Caption & Reply Bar */}
        <div className="relative z-30 p-4 bg-gradient-to-t from-black via-black/80 to-transparent text-white space-y-3">
          {currentStory.caption && (
            <p className="text-xs leading-relaxed text-slate-100 px-1">
              {currentStory.caption}
            </p>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ответить на историю..."
              className="flex-1 bg-white/20 placeholder-white/70 text-white text-xs rounded-full px-4 py-2.5 outline-none backdrop-blur-md"
            />
            <button className="p-2.5 bg-[#5288c1] rounded-full text-white">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
