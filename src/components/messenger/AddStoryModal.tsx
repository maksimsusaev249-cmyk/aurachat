import React, { useState } from 'react';
import { Story, User } from '../../types';
import { X, Sparkles, Clock, Upload, Check } from 'lucide-react';

interface AddStoryModalProps {
  currentUser: User;
  onClose: () => void;
  onAddStory: (newStory: Story) => void;
}

const sampleStoryImages = [
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80'
];

export const AddStoryModal: React.FC<AddStoryModalProps> = ({
  currentUser,
  onClose,
  onAddStory
}) => {
  const [selectedImage, setSelectedImage] = useState(sampleStoryImages[0]);
  const [caption, setCaption] = useState('');

  const handlePublish = () => {
    const story: Story = {
      id: 'story_' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.displayName,
      userAvatar: currentUser.avatarUrl,
      mediaUrl: selectedImage,
      mediaType: 'image',
      caption: caption.trim() || undefined,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      viewsCount: 0
    };

    onAddStory(story);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="bg-[#17212b] border border-[#243344] rounded-3xl p-6 w-full max-w-sm text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-[#202b36]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">Новая история (Story)</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-300" />
          Автоматически удалится ровно через 24 часа (S3 Lifecycle)
        </p>

        {/* Selected Image Preview */}
        <div className="relative w-full h-56 rounded-2xl overflow-hidden mb-4 border border-[#243344]">
          <img src={selectedImage} alt="Story preview" className="w-full h-full object-cover" />
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-amber-300 font-mono">
            TTL: 24:00:00
          </div>
        </div>

        {/* Preset Photos Selection */}
        <div className="mb-4">
          <label className="text-[11px] text-slate-400 block mb-1.5">Выберите кадр:</label>
          <div className="flex gap-2">
            {sampleStoryImages.map((img, i) => (
              <img
                key={i}
                src={img}
                alt=""
                onClick={() => setSelectedImage(img)}
                className={`w-16 h-12 rounded-lg object-cover cursor-pointer border-2 transition ${
                  selectedImage === img ? 'border-[#5288c1] scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Caption */}
        <div className="mb-6">
          <label className="text-[11px] text-slate-400 block mb-1">Подпись к истории:</label>
          <input
            type="text"
            placeholder="Что нового сегодня?..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full bg-[#242f3d] border border-[#243344] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-[#5288c1]"
          />
        </div>

        <button
          onClick={handlePublish}
          className="w-full py-3 bg-[#5288c1] hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" /> Опубликовать на 24 часа
        </button>
      </div>
    </div>
  );
};
