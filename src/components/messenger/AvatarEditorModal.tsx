import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Camera, 
  Link as LinkIcon, 
  Sparkles, 
  Trash2, 
  Check, 
  Image as ImageIcon,
  RotateCcw,
  Zap
} from 'lucide-react';

interface AvatarEditorModalProps {
  isOpen: boolean;
  currentAvatarUrl: string;
  displayName: string;
  onClose: () => void;
  onSaveAvatar: (newAvatarUrl: string) => void;
}

const sampleAvatars = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b',
  'https://api.dicebear.com/7.x/bottts/svg?seed=DanilCyber&backgroundColor=1f2937',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberMecha&backgroundColor=0284c7',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=PixelHero&backgroundColor=15803d',
  'https://api.dicebear.com/7.x/big-smile/svg?seed=NeonFox&backgroundColor=d97706'
];

export const AvatarEditorModal: React.FC<AvatarEditorModalProps> = ({
  isOpen,
  currentAvatarUrl,
  displayName,
  onClose,
  onSaveAvatar
}) => {
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl);
  const [urlInput, setUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'presets'>('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  if (!isOpen) return null;

  // 1. File Upload from PC or Mobile device
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите файл изображения (JPEG, PNG, WEBP)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreviewUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 2. Camera Snapshot - Full Device Camera Feed
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 1280, max: 1920 }, 
          height: { ideal: 1280, max: 1920 } 
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch {
      setCameraError('Камера недоступна или нет разрешения в браузере.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Crop center square
        const sx = ((video.videoWidth || 480) - size) / 2;
        const sy = ((video.videoHeight || 480) - size) / 2;
        ctx.drawImage(video, sx, sy, size, size, 0, 0, 400, 400);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPreviewUrl(dataUrl);
        stopCamera();
      }
    }
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      setPreviewUrl(urlInput.trim());
    }
  };

  const handleResetToDefault = () => {
    // Generate initials avatar
    const initial = displayName.charAt(0).toUpperCase() || 'U';
    const svgAvatar = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%235288c1"/><text x="50%" y="54%" font-size="90" font-family="sans-serif" font-weight="bold" fill="white" dominant-baseline="middle" text-anchor="middle">${initial}</text></svg>`;
    setPreviewUrl(svgAvatar);
  };

  const handleSave = () => {
    stopCamera();
    onSaveAvatar(previewUrl);
    onClose();
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none">
      <div onClick={handleClose} className="fixed inset-0" />

      <div className="relative w-full max-w-md bg-[#17212b] border border-[#243344] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 text-white animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#17212b] via-[#1c2937] to-[#17212b] border-b border-[#243344] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#5288c1]/20 text-[#64b5f6]">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Выбрать свою аватарку</h2>
              <p className="text-xs text-slate-400">Прикрепить фото с устройства, камеры или из готовых</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-[#243344] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center Live Preview */}
        <div className="p-5 bg-[#121b24] border-b border-[#202d3a] flex flex-col items-center justify-center">
          <div className="relative group">
            <img
              src={previewUrl}
              alt="Avatar Preview"
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-[#5288c1] shadow-2xl"
            />
            <span className="absolute bottom-1 right-1 p-2 rounded-full bg-emerald-500 text-white shadow-md">
              <Check className="w-4 h-4 stroke-[3]" />
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-2">Предпросмотр профиля</span>
        </div>

        {/* Tabs Bar (3 Tabs: File, Camera, Presets) */}
        <div className="p-2.5 bg-[#141e29] border-b border-[#202d3a] grid grid-cols-3 gap-1.5 text-xs">
          <button
            onClick={() => {
              stopCamera();
              setActiveTab('upload');
            }}
            className={`py-2 px-1 rounded-xl font-semibold transition flex flex-col items-center gap-1 cursor-pointer ${
              activeTab === 'upload' ? 'bg-[#5288c1] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span className="text-[10px]">Файл / Фото</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('camera');
              startCamera();
            }}
            className={`py-2 px-1 rounded-xl font-semibold transition flex flex-col items-center gap-1 cursor-pointer ${
              activeTab === 'camera' ? 'bg-[#5288c1] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span className="text-[10px]">Камера</span>
          </button>

          <button
            onClick={() => {
              stopCamera();
              setActiveTab('presets');
            }}
            className={`py-2 px-1 rounded-xl font-semibold transition flex flex-col items-center gap-1 cursor-pointer ${
              activeTab === 'presets' ? 'bg-[#5288c1] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px]">Готовые</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 space-y-4 min-h-[170px] flex flex-col justify-center">
          
          {/* TAB 1: UPLOAD FROM DEVICE */}
          {activeTab === 'upload' && (
            <div className="space-y-3 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-[#5288c1]/50 hover:border-[#5288c1] bg-[#1a2533]/50 hover:bg-[#1a2533] transition cursor-pointer flex flex-col items-center gap-2 group"
              >
                <div className="p-3 rounded-full bg-[#5288c1]/20 text-[#64b5f6] group-hover:scale-110 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-bold text-sm text-white">Выбрать фото на устройстве</div>
                <p className="text-xs text-slate-400 max-w-xs">
                  Нажмите, чтобы загрузить картинку с компьютера или галереи смартфона (JPG, PNG, WEBP)
                </p>
              </div>

              <button
                onClick={handleResetToDefault}
                className="text-xs text-slate-400 hover:text-rose-400 transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Сбросить на начальную аватарку</span>
              </button>
            </div>
          )}

          {/* TAB 2: WEBCAM / SELFIE - FULL RESOLUTION CAMERA */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 text-center space-y-2">
                  <p>{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium cursor-pointer"
                  >
                    Попробовать снова
                  </button>
                </div>
              ) : (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="relative w-full aspect-square max-w-[260px] rounded-3xl overflow-hidden bg-black ring-4 ring-[#5288c1] shadow-2xl">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                  </div>

                  <button
                    onClick={capturePhoto}
                    className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Сделать снимок сейчас</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-2">
              <span className="text-xs text-slate-400 block">Выберите готовый стильный аватар:</span>
              <div className="grid grid-cols-4 gap-2.5">
                {sampleAvatars.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPreviewUrl(url)}
                    className={`relative rounded-full overflow-hidden p-0.5 border-2 transition cursor-pointer group ${
                      previewUrl === url ? 'border-emerald-400 scale-105' : 'border-transparent hover:border-[#5288c1]'
                    }`}
                  >
                    <img
                      src={url}
                      alt="Preset"
                      className="w-14 h-14 rounded-full object-cover group-hover:scale-105 transition"
                    />
                    {previewUrl === url && (
                      <span className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#121b24] border-t border-[#202d3a] flex items-center justify-end gap-2.5 shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-[#243344] hover:bg-[#30445a] text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Отмена
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#5288c1] to-blue-600 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Сохранить аватарку</span>
          </button>
        </div>

      </div>
    </div>
  );
};
