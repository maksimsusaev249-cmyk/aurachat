import React, { useState, useRef, useEffect } from 'react';
import { Post, Story, User } from '../../types';
import { 
  X, 
  Camera, 
  Video, 
  RotateCcw, 
  Check, 
  Upload, 
  Image as ImageIcon,
  Play,
  Pause,
  ArrowRight,
  Music,
  Plus,
  Layers,
  Flame,
  Link2,
  FileText,
  ExternalLink,
  Trash2,
  SkipForward,
  Scan,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Zap,
  ZapOff,
  Grid,
  Sun,
  Timer
} from 'lucide-react';
import { 
  playSentSound, 
  playReactionSound, 
  playPostMusicTrack, 
  stopPostMusicTrack 
} from '../../utils/audioUtils';
import {
  isVideoMedia,
  fileToPersistentUrl,
  captureVideoFrameToDataUrl
} from '../../utils/mediaUtils';

export type CaptureMode = 'reel' | 'post' | 'story';

interface CameraStudioModalProps {
  isOpen: boolean;
  currentUser: User;
  initialMode?: CaptureMode;
  onClose: () => void;
  onPublishReel: (newReel: Post) => void;
  onPublishPost: (newPost: Post) => void;
  onPublishStory: (newStory: Story) => void;
}

type VideoQuality = '720p HD' | '1080p FHD' | '4K UHD';
type SpeedOption = '0.5x' | '1x' | '2x' | '3x';

const filters = [
  { id: 'normal', name: 'Оригинал', css: 'none' },
  { id: 'cinema', name: 'Кино', css: 'contrast(1.2) saturate(1.3) brightness(1.05)' },
  { id: 'cyber', name: 'Киберпанк', css: 'hue-rotate(290deg) contrast(1.25)' },
  { id: 'vintage', name: 'Винтаж', css: 'sepia(0.55) contrast(1.1) brightness(0.95)' },
  { id: 'noir', name: 'Ч/Б Нуар', css: 'grayscale(1) contrast(1.4)' }
];

const musicTracks = [
  { id: 'm1', title: 'Synthwave Nights', artist: 'Kavinsky', genre: 'synthwave', duration: '3:24' },
  { id: 'm2', title: 'Lo-Fi Chill Sessions', artist: 'ChillHop Beats', genre: 'lofi', duration: '2:48' },
  { id: 'm3', title: 'Cyberpunk Skyline', artist: 'NeoTokyo', genre: 'synthwave', duration: '3:15' },
  { id: 'm4', title: 'Acoustic Sunset', artist: 'Indie Vibe', genre: 'chill', duration: '2:30' },
  { id: 'm5', title: 'Deep Tech Groove', artist: 'Architect', genre: 'synthwave', duration: '3:40' }
];

const sampleMediaAssets = [
  {
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'Технологии & Серверы'
  },
  {
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    title: 'Кодинг & Архитектура'
  },
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
    title: 'Команда & Дизайн'
  }
];

const sampleGalleryImages = [
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80'
];

export const CameraStudioModal: React.FC<CameraStudioModalProps> = ({
  isOpen,
  currentUser,
  initialMode = 'post',
  onClose,
  onPublishReel,
  onPublishPost,
  onPublishStory
}) => {
  // Capture step: 'camera' | 'preview'
  const [step, setStep] = useState<'camera' | 'preview'>('camera');

  // Mode initialized from initialMode ('post' | 'reel' | 'story')
  const [mode, setMode] = useState<CaptureMode>(initialMode);

  // Multi-photo settings for Post:
  const [limitMode, setLimitMode] = useState<'standard' | 'ultra'>('standard');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [activePreviewImageIdx, setActivePreviewImageIdx] = useState(0);

  // Aspect ratio / format selection: 9:16, 1:1, 4:5, 16:9
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16' | '16:9'>('1:1');

  // Link attachment for Post ("там можно прикрепить ссылку и всё такое")
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  // Music attachment
  const [customTracks, setCustomTracks] = useState<typeof musicTracks>([]);
  const allMusicTracks = [...musicTracks, ...customTracks];
  const [selectedMusic, setSelectedMusic] = useState<typeof musicTracks[0] | null>(null);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const [previewingMusicId, setPreviewingMusicId] = useState<string | null>(null);

  // Privacy & advanced settings
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowShare, setAllowShare] = useState(true);
  const [privacyAudience, setPrivacyAudience] = useState<'everyone' | 'subscribers' | 'friends' | 'only_me'>('everyone');

  // Camera settings
  const [speed, setSpeed] = useState<SpeedOption>('1x');
  const [quality, setQuality] = useState<VideoQuality>('1080p FHD');
  const [selectedFilter, setSelectedFilter] = useState(filters[0]);
  const [timerDelay, setTimerDelay] = useState<0 | 3 | 10>(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isFlipping, setIsFlipping] = useState(false);

  // Smartphone Framing & Aspect Ratio: '3:4' (Standard Phone Photo) | '16:9' | '1:1' | 'full'
  const [cameraAspect, setCameraAspect] = useState<'3:4' | '16:9' | '1:1' | 'full'>(
    initialMode === 'reel' || initialMode === 'story' ? 'full' : '3:4'
  );
  const [showGrid, setShowGrid] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [isRetinaFlash, setIsRetinaFlash] = useState(false);

  // Zoom Levels: 0.5x (ultra-wide), 1x (standard), 2x (telephoto), 5x (super zoom)
  const [zoomLevel, setZoomLevel] = useState<0.5 | 1 | 2 | 5>(1);

  // Scale guarantees video always fills the frame and produces distinct zoom levels
  const getCameraScale = () => {
    switch (zoomLevel) {
      case 0.5:
        return 1.0; // Widest possible view, full sensor
      case 1:
        return 1.35; // Standard 1.0x native view
      case 2:
        return 2.0; // 2x magnification
      case 5:
        return 3.8; // 5x super zoom magnification
      default:
        return 1.35;
    }
  };

  useEffect(() => {
    if (streamRef.current) {
      try {
        const track = streamRef.current.getVideoTracks()[0];
        const capabilities = (track as any)?.getCapabilities?.();
        if (capabilities && 'zoom' in capabilities) {
          const min = capabilities.zoom.min || 1;
          const max = capabilities.zoom.max || 5;
          const targetZoom =
            zoomLevel === 0.5
              ? min
              : zoomLevel === 1
              ? min + (max - min) * 0.15
              : zoomLevel === 2
              ? min + (max - min) * 0.45
              : max;
          (track as any).applyConstraints?.({
            advanced: [{ zoom: targetZoom }]
          }).catch(() => {});
        }
      } catch {}
    }
  }, [zoomLevel]);

  // Live stream & recording state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const focusTimeoutRef = useRef<any>(null);
  const lastTapRef = useRef<number>(0);

  // QuickTake Shutter Pointer Refs (tap = photo, hold = quick video)
  const shutterPressTimeoutRef = useRef<any>(null);
  const isQuickTakeRef = useRef(false);

  const handleCycleAspect = () => {
    playReactionSound();
    setCameraAspect((prev) => {
      if (prev === '3:4') return '16:9';
      if (prev === '16:9') return '1:1';
      if (prev === '1:1') return 'full';
      return '3:4';
    });
  };

  const handleCycleFlash = () => {
    playReactionSound();
    setFlashMode((prev) => (prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off'));
  };

  const handleCycleTimer = () => {
    playReactionSound();
    setTimerDelay((prev) => (prev === 0 ? 3 : prev === 3 ? 10 : 0));
  };

  const handleViewfinderTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('label') || target.closest('input')) {
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      // Double tap to flip front/rear camera (standard mobile gesture like Telegram / Instagram!)
      handleFlipCamera();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusPoint({ x, y });
    playReactionSound();
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = setTimeout(() => {
      setFocusPoint(null);
    }, 1800);
  };

  // Captured media result
  const [capturedMediaUrl, setCapturedMediaUrl] = useState<string>('');
  const [capturedMediaType, setCapturedMediaType] = useState<'image' | 'video' | 'text'>('image');
  const [caption, setCaption] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordIntervalRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const maxPhotosLimit = limitMode === 'standard' ? 10 : 35;

  const cancelCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    playReactionSound();
  };

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('camera');
      setMode(initialMode);
      setCameraAspect(initialMode === 'reel' || initialMode === 'story' ? 'full' : '3:4');
      setIsRecording(false);
      setRecordSeconds(0);
      setCountdown(null);
      setCaption('');
      setLinkUrl('');
      setLinkTitle('');
      setShowLinkInput(false);
      setPostImages([]);
      setCapturedMediaUrl('');
      setCapturedMediaType(initialMode === 'reel' ? 'video' : 'image');
      setActivePreviewImageIdx(0);
      setSelectedMusic(null);
      startCamera();
    } else {
      stopCamera();
      stopPostMusicTrack();
    }
    return () => {
      stopCamera();
      stopPostMusicTrack();
    };
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (isOpen && step === 'camera') {
      startCamera();
    }
  }, [facingMode]);

  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive, step]);

  const startCamera = async (overrideFacing?: 'user' | 'environment') => {
    const targetFacing = overrideFacing || facingMode;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      let stream: MediaStream | null = null;
      const needAudio = mode === 'reel';

      // 3-Tier ultra resilient camera start with exact physical facing mode priority
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: needAudio
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: targetFacing } },
            audio: needAudio
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } catch {}
        }
      }

      if (stream) {
        streamRef.current = stream;
        setIsCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } else {
        setIsCameraActive(false);
      }
    } catch {
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setIsCameraActive(false);
    clearInterval(recordIntervalRef.current);
  };

  const handleFlipCamera = () => {
    setIsFlipping(true);
    playReactionSound();
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
    setTimeout(() => {
      setIsFlipping(false);
    }, 350);
  };

  // Skip button handler
  const handleSkipToComposer = () => {
    playReactionSound();
    stopCamera();
    if (postImages.length === 0 && !capturedMediaUrl) {
      setCapturedMediaType('text');
    }
    setStep('preview');
  };

  // Trigger Capture or Start Recording
  const handleShutterClick = () => {
    // If currently recording video, tap shutter to STOP immediately!
    if (isRecording) {
      handleStopRecording();
      return;
    }

    // If countdown is active, tap to CANCEL!
    if (countdown !== null) {
      cancelCountdown();
      return;
    }

    if (timerDelay > 0) {
      setCountdown(timerDelay);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c === null || c <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            setCountdown(null);
            executeShutter();
            return null;
          }
          return c - 1;
        });
      }, 1000);
      return;
    }

    executeShutter();
  };

  const executeShutter = () => {
    if (mode === 'post' || mode === 'story') {
      playSentSound();
      if (flashMode !== 'off') {
        if (facingMode === 'user') {
          setIsRetinaFlash(true);
          setTimeout(() => setIsRetinaFlash(false), 240);
        } else {
          setIsFlashing(true);
          setTimeout(() => setIsFlashing(false), 140);
        }
      } else {
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 140);
      }
      setCapturedMediaType('image');
      const liveFrame = isCameraActive
        ? captureVideoFrameToDataUrl(videoRef.current, facingMode === 'user')
        : null;
      const snapUrl = liveFrame || sampleGalleryImages[postImages.length % sampleGalleryImages.length];
      setCapturedMediaUrl(snapUrl);
      setPostImages((prev) => [...prev, snapUrl].slice(0, maxPhotosLimit));
      setActivePreviewImageIdx(0);
      stopCamera();
      setStep('preview');
    } else {
      if (!isRecording) {
        setIsRecording(true);
        setRecordSeconds(0);
        recordedChunksRef.current = [];

        if (streamRef.current && typeof MediaRecorder !== 'undefined') {
          try {
            const recorder = new MediaRecorder(streamRef.current);
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (ev) => {
              if (ev.data && ev.data.size > 0) {
                recordedChunksRef.current.push(ev.data);
              }
            };
            recorder.start(200);
          } catch {}
        }

        recordIntervalRef.current = setInterval(() => {
          setRecordSeconds((s) => s + 1);
        }, 1000);
      } else {
        handleStopRecording();
      }
    }
  };

  const handleShutterPointerDown = () => {
    if (mode === 'post' || mode === 'story') {
      shutterPressTimeoutRef.current = setTimeout(() => {
        // QuickTake: long press shutter in photo mode to record video like iPhone/Telegram
        isQuickTakeRef.current = true;
        setMode('reel');
        playReactionSound();
        executeShutter();
      }, 450);
    }
  };

  const handleShutterPointerUp = () => {
    if (shutterPressTimeoutRef.current) {
      clearTimeout(shutterPressTimeoutRef.current);
      shutterPressTimeoutRef.current = null;
    }
    if (isQuickTakeRef.current) {
      isQuickTakeRef.current = false;
      handleStopRecording();
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    clearInterval(recordIntervalRef.current);
    playReactionSound();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        const rec = mediaRecorderRef.current;
        rec.onstop = () => {
          if (recordedChunksRef.current.length > 0) {
            const blob = new Blob(recordedChunksRef.current, { type: rec.mimeType || 'video/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = typeof reader.result === 'string' ? reader.result : URL.createObjectURL(blob);
              setCapturedMediaType('video');
              setCapturedMediaUrl(dataUrl);
              stopCamera();
              setStep('preview');
            };
            reader.readAsDataURL(blob);
            return;
          }
          const fallbackUrl = mode === 'reel' ? sampleMediaAssets[0].url : sampleMediaAssets[1].url;
          setCapturedMediaType('video');
          setCapturedMediaUrl(fallbackUrl);
          stopCamera();
          setStep('preview');
        };
        rec.stop();
        return;
      } catch {}
    }

    setCapturedMediaType('video');
    const url = mode === 'reel' ? sampleMediaAssets[0].url : sampleMediaAssets[1].url;
    setCapturedMediaUrl(url);
    stopCamera();
    setStep('preview');
  };

  // File upload from user's device (Works both on Step 1 and Step 2, persists as Data URL)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    e.target.value = '';
    playReactionSound();

    if (mode === 'post') {
      const limit = maxPhotosLimit;
      const selectedFiles = files.slice(0, limit);
      const converted = await Promise.all(selectedFiles.map((f) => fileToPersistentUrl(f)));
      const hasVideo = converted.some((item) => item.mediaType === 'video');

      if (hasVideo) {
        const firstVideo = converted.find((item) => item.mediaType === 'video')!;
        setCapturedMediaType('video');
        setCapturedMediaUrl(firstVideo.url);
        setPostImages([firstVideo.url]);
      } else {
        const urls = converted.map((item) => item.url);
        setCapturedMediaType('image');
        setPostImages((prev) => {
          const combined = [...prev, ...urls].slice(0, limit);
          setCapturedMediaUrl(combined[0] || '');
          return combined;
        });
      }
      setActivePreviewImageIdx(0);
      stopCamera();
      setStep('preview');
    } else {
      const firstFile = files[0];
      const converted = await fileToPersistentUrl(firstFile);
      setCapturedMediaType(converted.mediaType);
      setCapturedMediaUrl(converted.url);
      if (converted.mediaType === 'image') {
        setPostImages([converted.url]);
      }
      stopCamera();
      setStep('preview');
    }
  };

  // Quick fill demo photos (for testing adding photos before or after writing post)
  const handleFillDemoPhotos = (count: number) => {
    playReactionSound();
    const newItems: string[] = [];
    for (let i = 0; i < count; i++) {
      newItems.push(sampleGalleryImages[i % sampleGalleryImages.length]);
    }
    setCapturedMediaType('image');
    setPostImages(newItems);
    setCapturedMediaUrl(newItems[0]);
    setActivePreviewImageIdx(0);
  };

  // Remove photo from post images (Allows removing down to 0 photos for a pure text post!)
  const handleRemovePhoto = (idx: number) => {
    playReactionSound();
    setPostImages((prev) => {
      const filtered = prev.filter((_, i) => i !== idx);
      setCapturedMediaUrl(filtered[0] || '');
      if (filtered.length === 0) {
        setCapturedMediaType('text');
      }
      setActivePreviewImageIdx(0);
      return filtered;
    });
  };

  // Toggle music preview playback
  const handlePreviewMusic = (track: typeof musicTracks[0]) => {
    if (previewingMusicId === track.id) {
      stopPostMusicTrack();
      setPreviewingMusicId(null);
    } else {
      setPreviewingMusicId(track.id);
      playPostMusicTrack(track.genre);
    }
  };

  const handleSelectMusic = (track: typeof musicTracks[0]) => {
    setSelectedMusic(track);
    stopPostMusicTrack();
    setPreviewingMusicId(null);
    setIsMusicModalOpen(false);
  };

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const newTrack = {
        id: 'custom_' + Date.now(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: currentUser.displayName || 'Моя музыка',
        genre: 'custom',
        duration: '3:00'
      };
      setCustomTracks((prev) => [newTrack, ...prev]);
      setSelectedMusic(newTrack);
      playReactionSound();
      setIsMusicModalOpen(false);
    }
  };

  // Final Publish Handler
  const handlePublish = () => {
    playSentSound();
    stopPostMusicTrack();

    const cleanCaption = caption.trim();
    const cleanLink = linkUrl.trim();
    const cleanLinkTitle = linkTitle.trim();

    if (mode === 'reel') {
      const finalReelUrl = capturedMediaUrl || postImages[0] || sampleMediaAssets[0].url;
      const isActualVideo = isVideoMedia(finalReelUrl, capturedMediaType);
      const newReel: Post = {
        id: 'reel_' + Date.now(),
        userId: currentUser.id,
        userName: currentUser.displayName,
        userAvatar: currentUser.avatarUrl,
        type: 'reel',
        mediaUrl: finalReelUrl,
        mediaType: isActualVideo ? 'video' : 'image',
        caption: cleanCaption || 'Новый клип',
        linkUrl: cleanLink || undefined,
        linkTitle: cleanLinkTitle || undefined,
        likesCount: 0,
        isLiked: false,
        viewsCount: 0,
        commentsCount: 0,
        comments: [],
        createdAt: 'Только что',
        quality: quality,
        speed: speed,
        filter: selectedFilter.name,
        aspectRatio: cameraAspect,
        music: selectedMusic
          ? {
              id: selectedMusic.id,
              title: selectedMusic.title,
              artist: selectedMusic.artist,
              duration: selectedMusic.duration,
              genre: selectedMusic.genre
            }
          : undefined,
        privacy: privacyAudience,
        allowComments,
        allowDuet,
        allowDownload,
        allowShare
      };
      onPublishReel(newReel);
    } else if (mode === 'post') {
      const hasPhotos = postImages.length > 0;
      const primaryMediaUrl = hasPhotos ? postImages[0] : capturedMediaUrl;
      const hasAnyMedia = Boolean(primaryMediaUrl);
      const isActualVideo = hasAnyMedia && isVideoMedia(primaryMediaUrl, capturedMediaType);

      const newPost: Post = {
        id: 'post_' + Date.now(),
        userId: currentUser.id,
        userName: currentUser.displayName,
        userAvatar: currentUser.avatarUrl,
        type: 'post',
        mediaUrl: primaryMediaUrl || '',
        images: hasPhotos ? postImages : primaryMediaUrl ? [primaryMediaUrl] : [],
        linkUrl: cleanLink || undefined,
        linkTitle: cleanLinkTitle || undefined,
        music: selectedMusic
          ? {
              id: selectedMusic.id,
              title: selectedMusic.title,
              artist: selectedMusic.artist,
              duration: selectedMusic.duration,
              genre: selectedMusic.genre
            }
          : undefined,
        isUltraLimit: limitMode === 'ultra',
        mediaType: isActualVideo ? 'video' : hasAnyMedia ? 'image' : 'text',
        caption: cleanCaption || (cleanLink ? `Ссылка: ${cleanLink}` : 'Новая публикация'),
        likesCount: 0,
        isLiked: false,
        viewsCount: 0,
        commentsCount: 0,
        comments: [],
        createdAt: 'Только что',
        filter: selectedFilter.name,
        aspectRatio: cameraAspect || aspectRatio,
        privacy: privacyAudience,
        allowComments,
        allowDuet,
        allowDownload,
        allowShare
      };
      onPublishPost(newPost);
    } else if (mode === 'story') {
      const finalStoryUrl = capturedMediaUrl || postImages[0] || sampleMediaAssets[2].url;
      const isActualVideo = isVideoMedia(finalStoryUrl, capturedMediaType);
      const newStory: Story = {
        id: 'story_' + Date.now(),
        userId: currentUser.id,
        userName: currentUser.displayName,
        userAvatar: currentUser.avatarUrl,
        mediaUrl: finalStoryUrl,
        mediaType: isActualVideo ? 'video' : 'image',
        caption: cleanCaption || undefined,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        viewsCount: 0
      };
      onPublishStory(newStory);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 select-none">
      <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg h-[92vh] max-h-[860px] bg-black rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border border-[#243344]">
        
        {/* =================================================================== */}
        {/* STEP 1: SMARTPHONE CAMERA INTERFACE (ASPECT RATIO, CONTROLS, ZOOM) */}
        {/* =================================================================== */}
        {step === 'camera' && (
          <div className="w-full h-full flex flex-col justify-between bg-black relative overflow-hidden">
            {/* Top Bar: Smartphone Camera Header Controls */}
            <div className="relative z-30 px-3.5 py-2.5 flex items-center justify-between text-white bg-black/80 backdrop-blur-md shrink-0 border-b border-white/10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition active:scale-90"
                  title="Закрыть"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCycleFlash}
                  className={`p-2 rounded-full transition cursor-pointer active:scale-90 ${
                    flashMode !== 'off'
                      ? 'bg-[#f1c40f] text-black font-bold shadow-lg shadow-yellow-500/30'
                      : 'bg-white/10 hover:bg-white/20 text-white/80'
                  }`}
                  title={`Вспышка: ${flashMode.toUpperCase()}`}
                >
                  {flashMode !== 'off' ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleCycleAspect}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/90 text-[11px] font-bold font-mono tracking-wider cursor-pointer transition active:scale-95"
                  title="Формат кадра (3:4 / 16:9 / 1:1 / FULL)"
                >
                  {cameraAspect.toUpperCase()}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playReactionSound();
                    setShowGrid((prev) => !prev);
                  }}
                  className={`p-2 rounded-full transition cursor-pointer active:scale-90 ${
                    showGrid ? 'bg-white/30 text-white' : 'bg-white/10 hover:bg-white/20 text-white/70'
                  }`}
                  title="Сетка 3х3 (Правило третей)"
                >
                  <Grid className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleCycleTimer}
                  className={`px-2 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition cursor-pointer active:scale-95 ${
                    timerDelay > 0 ? 'bg-amber-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white/70'
                  }`}
                  title="Таймер съемки"
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>{timerDelay > 0 ? `${timerDelay}s` : 'Выкл'}</span>
                </button>

                {!isRecording && (
                  <button
                    type="button"
                    onClick={handleSkipToComposer}
                    className="px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-lg cursor-pointer transition active:scale-95"
                    title="Пропустить камеру и написать пост"
                  >
                    <span>Пропустить</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Center: Camera Viewfinder with Native Framing */}
            <div
              onClick={handleViewfinderTap}
              className="flex-1 w-full bg-black flex items-center justify-center relative overflow-hidden cursor-crosshair select-none"
            >
              {isCameraActive ? (
                <div
                  className={`relative overflow-hidden bg-black transition-all duration-300 ease-out flex items-center justify-center ${
                    cameraAspect === '3:4'
                      ? 'w-full max-w-full aspect-[3/4] rounded-2xl border border-white/10 shadow-2xl'
                      : cameraAspect === '1:1'
                      ? 'w-full max-w-[340px] aspect-square rounded-2xl border border-white/10 shadow-2xl'
                      : 'w-full h-full'
                  }`}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      filter: selectedFilter.css,
                      transform: `scale(${getCameraScale()}) ${facingMode === 'user' ? 'scaleX(-1)' : ''} ${
                        isFlipping ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }`,
                      transformOrigin: 'center center'
                    }}
                    className="w-full h-full object-cover transition-transform duration-300 ease-out"
                  />

                  {/* Grid Lines 3x3 Overlay */}
                  {showGrid && (
                    <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3">
                      <div className="border-r border-b border-white/25" />
                      <div className="border-r border-b border-white/25" />
                      <div className="border-b border-white/25" />
                      <div className="border-r border-b border-white/25" />
                      <div className="border-r border-b border-white/25" />
                      <div className="border-b border-white/25" />
                      <div className="border-r border-b border-white/25" />
                      <div className="border-r border-b border-white/25" />
                      <div />
                      {/* Center horizon level indicator */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center gap-1 opacity-75">
                        <div className="w-5 h-0.5 bg-[#f1c40f]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#f1c40f]" />
                        <div className="w-5 h-0.5 bg-[#f1c40f]" />
                      </div>
                    </div>
                  )}

                  {/* Tap-to-Focus Yellow Reticle with Exposure Sun Icon */}
                  {focusPoint && (
                    <div
                      className="absolute pointer-events-none z-30 transition-transform duration-200 animate-in zoom-in-75"
                      style={{
                        left: `${focusPoint.x}px`,
                        top: `${focusPoint.y}px`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <div className="w-16 h-16 border-2 border-[#f1c40f] relative flex items-center justify-center shadow-lg">
                        <div className="w-1.5 h-1.5 bg-[#f1c40f] rounded-full" />
                        <div className="absolute -top-1 w-2.5 h-0.5 bg-[#f1c40f]" />
                        <div className="absolute -bottom-1 w-2.5 h-0.5 bg-[#f1c40f]" />
                        <div className="absolute -left-1 h-2.5 w-0.5 bg-[#f1c40f]" />
                        <div className="absolute -right-1 h-2.5 w-0.5 bg-[#f1c40f]" />
                      </div>
                      <div className="absolute -right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 text-[#f1c40f]">
                        <Sun className="w-3.5 h-3.5" />
                        <div className="w-0.5 h-5 bg-[#f1c40f]/80 rounded-full" />
                      </div>
                    </div>
                  )}

                  {/* Shutter Blink */}
                  {isFlashing && (
                    <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-150 pointer-events-none" />
                  )}

                  {/* Selfie Retina Screen Flash */}
                  {isRetinaFlash && (
                    <div className="absolute inset-0 bg-[#fff5ea] z-40 animate-out fade-out duration-300 pointer-events-none border-8 border-amber-200" />
                  )}

                  {/* Double tap hint */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none z-20 px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-xs text-[10px] text-white/60 tracking-wider">
                    2x тап — сменить камеру
                  </div>
                </div>
              ) : (
                /* Fallback / Camera Off UI with Device Upload & Skip */
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#131c26] to-[#0e1621] p-6 text-center">
                  <div className="w-18 h-18 rounded-full bg-[#1e2a38] border border-[#283748] flex items-center justify-center mb-3">
                    {mode === 'reel' ? (
                      <Video className="w-9 h-9 text-rose-500 animate-pulse" />
                    ) : (
                      <Camera className="w-9 h-9 text-blue-400" />
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">
                    {mode === 'reel'
                      ? 'Создание Reels (Видео)'
                      : mode === 'post'
                      ? 'Создание Поста'
                      : 'Создание Истории (24ч)'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mb-4">
                    Выберите фото/видео с устройства, включите камеру или нажмите <strong>«Пропустить»</strong>, чтобы сразу написать текстовый пост со ссылкой!
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs mb-4">
                    <label className="w-full py-2.5 px-4 rounded-2xl bg-[#5288c1] hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg transition">
                      <Upload className="w-4 h-4" />
                      <span>Выбрать с устройства</span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple={mode === 'post'}
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="w-full py-2.5 px-4 rounded-2xl bg-[#1e2a38] hover:bg-[#283748] border border-[#2b3c4f] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Camera className="w-4 h-4 text-cyan-400" />
                      <span>Включить камеру</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSkipToComposer}
                    className="w-full max-w-xs py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xl transition"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Пропустить → Написать пост</span>
                  </button>
                </div>
              )}

              {/* Countdown Overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
                  <span className="text-7xl font-extrabold text-[#f1c40f] animate-ping">
                    {countdown}
                  </span>
                </div>
              )}

              {/* Active Recording Pill in Viewfinder */}
              {isRecording && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/90 text-white text-xs font-mono font-bold shadow-xl animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                  <span>REC 00:{recordSeconds < 10 ? '0' + recordSeconds : recordSeconds}</span>
                </div>
              )}
            </div>

            {/* Bottom Controls: Zoom Pill, Modes Carousel, Shutter & Flip */}
            <div className="relative z-30 px-4 pt-2 pb-5 flex flex-col items-center bg-black shrink-0 border-t border-white/5">
              {/* Zoom Controls Pill: 0.5 | 1x | 2 | 3 */}
              {isCameraActive && (
                <div className="flex items-center gap-2 mb-2 z-20">
                  <div className="flex items-center bg-white/10 backdrop-blur-md px-2 py-1 rounded-full border border-white/15 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        playReactionSound();
                        setZoomLevel(0.5);
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition cursor-pointer ${
                        zoomLevel === 0.5
                          ? 'bg-white/25 text-[#f1c40f] font-extrabold scale-105'
                          : 'text-white/80 hover:text-white'
                      }`}
                      title="0.5x (Широкий угол)"
                    >
                      0.5
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playReactionSound();
                        setZoomLevel(1);
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition cursor-pointer ${
                        zoomLevel === 1
                          ? 'bg-white/25 text-[#f1c40f] font-extrabold scale-105'
                          : 'text-white/80 hover:text-white'
                      }`}
                      title="1x (Стандартный масштаб 100%)"
                    >
                      1x
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playReactionSound();
                        setZoomLevel(2);
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition cursor-pointer ${
                        zoomLevel === 2
                          ? 'bg-white/25 text-[#f1c40f] font-extrabold scale-105'
                          : 'text-white/80 hover:text-white'
                      }`}
                      title="2x (Приближение)"
                    >
                      2
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playReactionSound();
                        setZoomLevel(5);
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition cursor-pointer ${
                        zoomLevel === 5
                          ? 'bg-white/25 text-[#f1c40f] font-extrabold scale-105'
                          : 'text-white/80 hover:text-white'
                      }`}
                      title="5x (Супер-зум)"
                    >
                      5
                    </button>
                  </div>
                </div>
              )}

              {/* Mode Selector Carousel (ВИДЕО | ФОТО | ИСТОРИЯ) */}
              <div className="flex items-center justify-center gap-7 mb-3 z-20">
                <button
                  type="button"
                  onClick={() => {
                    playReactionSound();
                    setMode('reel');
                    setCameraAspect('full');
                  }}
                  className={`transition-all cursor-pointer font-bold tracking-wider uppercase text-xs ${
                    mode === 'reel'
                      ? 'text-[#f1c40f] text-sm scale-110 drop-shadow-md font-extrabold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  ВИДЕО
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playReactionSound();
                    setMode('post');
                    setCameraAspect('3:4');
                  }}
                  className={`transition-all cursor-pointer font-bold tracking-wider uppercase text-xs ${
                    mode === 'post'
                      ? 'text-[#f1c40f] text-sm scale-110 drop-shadow-md font-extrabold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  ФОТО
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playReactionSound();
                    setMode('story');
                    setCameraAspect('full');
                  }}
                  className={`transition-all cursor-pointer font-bold tracking-wider uppercase text-xs ${
                    mode === 'story'
                      ? 'text-[#f1c40f] text-sm scale-110 drop-shadow-md font-extrabold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  ИСТОРИЯ
                </button>
              </div>

              {/* Shutter Bar: Gallery (Left) - Big Shutter with QuickTake (Center) - Flip (Right) */}
              <div className="w-full flex items-center justify-between px-6 z-20 max-w-xs">
                {/* Left: Gallery Thumbnail */}
                <label
                  className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/60 bg-black/60 backdrop-blur-md flex items-center justify-center cursor-pointer shadow-lg active:scale-95 transition shrink-0"
                  title="Галерея / Загрузить с устройства"
                >
                  {postImages.length > 0 ? (
                    <img src={postImages[postImages.length - 1]} alt="Gallery" className="w-full h-full object-cover" />
                  ) : (
                    <img src={sampleGalleryImages[0]} alt="Gallery" className="w-full h-full object-cover brightness-90" />
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple={mode === 'post'}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>

                {/* Center: Big Phone Shutter Button (Tap = Photo, Hold = Video QuickTake) */}
                <div className="relative flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleShutterClick}
                    onPointerDown={handleShutterPointerDown}
                    onPointerUp={handleShutterPointerUp}
                    onPointerLeave={handleShutterPointerUp}
                    className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all cursor-pointer shadow-2xl ${
                      isRecording
                        ? 'border-rose-500 scale-105 shadow-rose-500/50'
                        : 'border-white hover:scale-105 active:scale-95'
                    }`}
                  >
                    <div
                      className={`transition-all ${
                        isRecording
                          ? 'w-8 h-8 bg-rose-600 rounded-lg animate-pulse'
                          : mode === 'reel'
                          ? 'w-16 h-16 bg-rose-600 rounded-full active:scale-90'
                          : 'w-16 h-16 bg-white rounded-full active:scale-90'
                      }`}
                    />
                  </button>
                </div>

                {/* Right: Flip Camera Button with rotation animation */}
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className={`w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center cursor-pointer shadow-lg shrink-0 transition-transform duration-300 ${
                    isFlipping ? 'rotate-180 scale-90' : 'active:scale-90'
                  }`}
                  title="Сменить камеру (Фронтальная / Основная)"
                >
                  <RotateCcw className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 2: WRITE MESSAGE AS POST, ATTACH LINK, AND ADD PHOTOS LATER    */}
        {/* ("Там просто будет написать сообщение как пост. И вот, там можно    */}
        {/* прикрепить ссылку и всё такое. И можно потом, когда ты написала     */}
        {/* пост, добавить фотку. Всё.")                                        */}
        {/* =================================================================== */}
        {step === 'preview' && (
          <div className="h-full flex flex-col justify-between p-4 bg-[#0e1621] text-white overflow-y-auto scrollbar-thin">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#243344] shrink-0">
              <button
                onClick={() => setStep('camera')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                ← К камере
              </button>
              <span className="text-xs font-bold text-white">
                {mode === 'post'
                  ? 'Создание поста'
                  : mode === 'reel'
                  ? 'Публикация Reels'
                  : 'Публикация Истории'}
              </span>
              <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Composer Body */}
            <div className="space-y-3.5 py-3 flex-1">
              {/* 1. НАПИСАТЬ СООБЩЕНИЕ КАК ПОСТ (PRIMARY TEXTAREA) */}
              <div className="bg-[#17212b] p-3.5 rounded-2xl border border-[#243344] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#64b5f6]" />
                    <span>Текст сообщения / поста:</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {postImages.length === 0 ? 'Текстовый пост' : `Пост с фото (${postImages.length})`}
                  </span>
                </div>

                <textarea
                  rows={4}
                  placeholder="Напишите сообщение как пост... Расскажите новости, мысли или добавьте описание!"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  autoFocus
                  className="w-full bg-[#1e2a38] border border-[#283748] rounded-xl p-3 text-xs text-white placeholder-slate-400 outline-none focus:border-[#5288c1] resize-none leading-relaxed"
                />
              </div>

              {/* 2. ПРИКРЕПИТЬ ССЫЛКУ ("И вот, там можно прикрепить ссылку и всё такое") */}
              <div className="bg-[#17212b] p-3.5 rounded-2xl border border-[#243344] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-300">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Прикрепить ссылку к посту</div>
                      <div className="text-[10px] text-slate-400">
                        {linkUrl ? linkUrl : 'Добавьте внешнюю ссылку, сайт или канал'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLinkInput(!showLinkInput)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      showLinkInput || linkUrl
                        ? 'bg-[#5288c1] text-white'
                        : 'bg-[#202b36] hover:bg-[#283748] text-cyan-300'
                    }`}
                  >
                    {linkUrl ? 'Изменить' : showLinkInput ? 'Скрыть' : '+ Ссылка'}
                  </button>
                </div>

                {(showLinkInput || linkUrl) && (
                  <div className="space-y-2 pt-2 border-t border-[#243344]">
                    <input
                      type="text"
                      placeholder="Вставьте ссылку (например: https://example.com или aurachat.app/channel)..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="w-full bg-[#1e2a38] border border-[#283748] rounded-xl px-3 py-2 text-xs text-cyan-300 placeholder-slate-400 outline-none focus:border-[#5288c1] font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Название кнопки/ссылки (необязательно, например: Перейти на сайт)..."
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      className="w-full bg-[#1e2a38] border border-[#283748] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-[#5288c1]"
                    />
                    {linkUrl && (
                      <div className="p-2.5 rounded-xl bg-[#131c26] border border-cyan-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <ExternalLink className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {linkTitle || 'Прикрепленная ссылка'}
                            </div>
                            <div className="text-[10px] text-cyan-400 font-mono truncate">{linkUrl}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setLinkUrl('');
                            setLinkTitle('');
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                          title="Удалить ссылку"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mode Switcher right on Step 2 so user can choose Post vs Reel vs Story */}
              <div className="grid grid-cols-3 gap-1.5 bg-[#17212b] p-1.5 rounded-2xl border border-[#243344]">
                <button
                  type="button"
                  onClick={() => setMode('post')}
                  className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    mode === 'post'
                      ? 'bg-[#0077FF] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📸 Пост
                </button>
                <button
                  type="button"
                  onClick={() => setMode('reel')}
                  className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    mode === 'reel'
                      ? 'bg-[#0077FF] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🎬 Клип
                </button>
                <button
                  type="button"
                  onClick={() => setMode('story')}
                  className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    mode === 'story'
                      ? 'bg-[#0077FF] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⏱️ История
                </button>
              </div>

              {/* 3. ДОБАВИТЬ ФОТО ИЛИ ВИДЕО С УСТРОЙСТВА (ДЛЯ ПОСТА, КЛИПА И ИСТОРИИ) */}
              <div className="bg-[#17212b] p-3.5 rounded-2xl border border-[#243344] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <ImageIcon className="w-4 h-4 text-[#64b5f6]" />
                    <span>
                      {mode === 'reel'
                        ? 'Видео или фото для клипа:'
                        : mode === 'story'
                        ? 'Медиа для истории:'
                        : 'Фотографии / видео к посту:'}
                    </span>
                    {mode === 'post' && (
                      <span className="font-mono text-[#64b5f6]">
                        {postImages.length === 0 && !capturedMediaUrl
                          ? 'Без медиа'
                          : `${Math.max(postImages.length, capturedMediaUrl ? 1 : 0)} / ${maxPhotosLimit}`}
                      </span>
                    )}
                  </div>

                  {mode === 'post' && (
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setLimitMode('standard')}
                        className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                          limitMode === 'standard'
                            ? 'bg-[#5288c1] text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        До 10
                      </button>
                      <button
                        type="button"
                        onClick={() => setLimitMode('ultra')}
                        className={`px-2 py-0.5 rounded-lg font-bold transition flex items-center gap-0.5 cursor-pointer ${
                          limitMode === 'ultra'
                            ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white'
                            : 'text-amber-400 hover:text-white'
                        }`}
                      >
                        <Flame className="w-3 h-3" />
                        <span>Ultra 35</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons to add photo or video from device or camera */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="py-2.5 px-3 rounded-xl bg-[#5288c1] hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow">
                    <Upload className="w-4 h-4" />
                    <span>+ Файл с устройства</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple={mode === 'post'}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setStep('camera')}
                    className="py-2.5 px-3 rounded-xl bg-[#202b36] hover:bg-[#283748] border border-[#2b3c4f] text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span>Снять на камеру</span>
                  </button>
                </div>

                {mode === 'post' && (
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#243344]/60">
                    <span className="text-slate-400">Быстро прикрепить фото:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleFillDemoPhotos(1)}
                        className="px-2 py-0.5 rounded bg-[#202b36] hover:bg-[#283748] text-cyan-300 font-bold cursor-pointer"
                      >
                        + 1 фото
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFillDemoPhotos(5)}
                        className="px-2 py-0.5 rounded bg-[#202b36] hover:bg-[#283748] text-slate-200 cursor-pointer"
                      >
                        + 5 фото
                      </button>
                      {(postImages.length > 0 || capturedMediaUrl) && (
                        <button
                          type="button"
                          onClick={() => {
                            setPostImages([]);
                            setCapturedMediaUrl('');
                            setCapturedMediaType('text');
                          }}
                          className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 cursor-pointer"
                        >
                          Убрать медиа
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Preview of attached media for Post */}
                {mode === 'post' && (postImages.length > 0 || capturedMediaUrl) && (
                  <div className="space-y-2.5 pt-2 border-t border-[#243344]">
                    <div
                      className="relative rounded-2xl overflow-hidden border border-[#243344] bg-black max-h-56 flex items-center justify-center mx-auto shadow-xl"
                      style={{
                        aspectRatio:
                          aspectRatio === '9:16'
                            ? '9/16'
                            : aspectRatio === '1:1'
                            ? '1/1'
                            : aspectRatio === '4:5'
                            ? '4/5'
                            : '16/9',
                        width:
                          aspectRatio === '9:16'
                            ? '150px'
                            : aspectRatio === '4:5'
                            ? '190px'
                            : '100%'
                      }}
                    >
                      {isVideoMedia(postImages[activePreviewImageIdx] || capturedMediaUrl, capturedMediaType) ? (
                        <video
                          src={postImages[activePreviewImageIdx] || capturedMediaUrl}
                          controls
                          autoPlay
                          muted
                          loop
                          playsInline
                          style={{ filter: selectedFilter.css }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={postImages[activePreviewImageIdx] || postImages[0] || capturedMediaUrl}
                          alt="Attached preview"
                          style={{ filter: selectedFilter.css }}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {postImages.length > 1 && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 text-[10px] font-mono font-bold text-white flex items-center gap-1">
                          <Layers className="w-3 h-3 text-[#64b5f6]" />
                          <span>
                            {activePreviewImageIdx + 1} / {postImages.length}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Thumbnails strip */}
                    {postImages.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                        {postImages.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            onClick={() => setActivePreviewImageIdx(idx)}
                            className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer transition ${
                              activePreviewImageIdx === idx
                                ? 'border-[#5288c1] scale-105'
                                : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePhoto(idx);
                              }}
                              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-white hover:text-rose-400"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Aspect Ratio Selector */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['1:1', '4:5', '16:9', '9:16'] as const).map((ratio) => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setAspectRatio(ratio)}
                          className={`py-1 px-1 rounded-xl text-[10px] font-mono font-bold transition cursor-pointer ${
                            aspectRatio === ratio
                              ? 'bg-[#5288c1] text-white'
                              : 'bg-[#1e2a38] text-slate-400 hover:text-white border border-[#283748]'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reel / Story Preview when not in Post mode */}
                {mode !== 'post' && (capturedMediaUrl || postImages[0]) && (
                  <div className="relative rounded-2xl overflow-hidden border border-[#243344] bg-black max-h-64 flex items-center justify-center mx-auto">
                    {isVideoMedia(capturedMediaUrl || postImages[0], capturedMediaType) ? (
                      <video
                        src={capturedMediaUrl || postImages[0]}
                        controls
                        autoPlay
                        muted
                        loop
                        playsInline
                        style={{ filter: selectedFilter.css }}
                        className="w-full h-full object-cover max-h-64"
                      />
                    ) : (
                      <img
                        src={capturedMediaUrl || postImages[0]}
                        alt="Preview"
                        style={{ filter: selectedFilter.css }}
                        className="w-full h-full object-cover max-h-64"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* 4. MUSIC ATTACHMENT BUTTON */}
              <div className="bg-[#17212b] p-3 rounded-2xl border border-[#243344] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300">
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      {selectedMusic ? `${selectedMusic.artist} — ${selectedMusic.title}` : 'Прикрепить музыку'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {selectedMusic ? `Жанр: ${selectedMusic.genre} • ${selectedMusic.duration}` : 'Выбрать саундтрек к посту'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {selectedMusic ? (
                    <button
                      type="button"
                      onClick={() => setSelectedMusic(null)}
                      className="px-2 py-1 rounded-lg text-rose-400 hover:bg-rose-500/20 text-xs cursor-pointer"
                    >
                      Удалить
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsMusicModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#202b36] hover:bg-[#5288c1] text-xs font-bold text-white transition cursor-pointer"
                    >
                      Выбрать
                    </button>
                  )}
                </div>
              </div>

              {/* 5. PRIVACY & ADVANCED SETTINGS COLLAPSIBLE */}
              <div className="bg-[#17212b] rounded-2xl border border-[#243344] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsPrivacyOpen(!isPrivacyOpen)}
                  className="w-full p-3 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-[#1e2a38] transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300">⚙️</span>
                    <span>Приватность и настройки</span>
                  </div>
                  <span className="text-slate-400 font-mono text-sm">{isPrivacyOpen ? '▲' : '▼'}</span>
                </button>

                {isPrivacyOpen && (
                  <div className="p-3 border-t border-[#243344] space-y-3 bg-[#131d2b]">
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'everyone', label: '🌍 Все' },
                        { id: 'subscribers', label: '👥 Подписчики' },
                        { id: 'friends', label: '🤝 Друзья' },
                        { id: 'only_me', label: '🔒 Только я' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPrivacyAudience(item.id as any)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                            privacyAudience === item.id
                              ? 'bg-[#5288c1] text-white shadow'
                              : 'bg-[#1e2a38] text-slate-300 hover:bg-[#253447] border border-[#283748]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2 pt-1 border-t border-[#243344]/60">
                      <label className="flex items-center justify-between cursor-pointer text-xs text-slate-200">
                        <span>Разрешить комментировать</span>
                        <input
                          type="checkbox"
                          checked={allowComments}
                          onChange={(e) => setAllowComments(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#5288c1] cursor-pointer"
                        />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer text-xs text-slate-200">
                        <span>Разрешить скачивание фото/видео</span>
                        <input
                          type="checkbox"
                          checked={allowDownload}
                          onChange={(e) => setAllowDownload(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#5288c1] cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Big Publish Button */}
            <button
              onClick={handlePublish}
              className="w-full py-3 bg-gradient-to-r from-[#5288c1] to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0 mt-2"
            >
              <Check className="w-4 h-4" />
              <span>
                Опубликовать {mode === 'reel' ? 'в Reels' : mode === 'post' ? 'пост в Ленту и Профиль' : 'в Истории'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* MUSIC PICKER MODAL */}
      {isMusicModalOpen && (
        <div
          onClick={() => setIsMusicModalOpen(false)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#17212b] border border-[#243344] rounded-3xl p-5 w-full max-w-sm text-white shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#243344]">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Music className="w-4 h-4 text-rose-400" />
                <span>Выбор музыки для поста</span>
              </div>
              <button
                onClick={() => {
                  stopPostMusicTrack();
                  setIsMusicModalOpen(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#202b36] border border-[#283748] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">Добавить свою музыку</span>
              </div>
              <label className="px-3 py-1.5 rounded-xl bg-[#5288c1] hover:bg-blue-500 text-xs font-bold text-white transition cursor-pointer">
                Загрузить файл
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleCustomAudioUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
              {allMusicTracks.map((track) => {
                const isPreviewing = previewingMusicId === track.id;
                return (
                  <div
                    key={track.id}
                    className="p-3 rounded-2xl bg-[#1e2a38] border border-[#283748] flex items-center justify-between hover:border-[#5288c1] transition"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handlePreviewMusic(track)}
                        className={`p-2 rounded-full cursor-pointer transition ${
                          isPreviewing ? 'bg-rose-500 text-white animate-pulse' : 'bg-[#283748] text-slate-300'
                        }`}
                      >
                        {isPreviewing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      </button>
                      <div>
                        <div className="font-bold text-xs text-white">{track.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {track.artist} • {track.duration}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectMusic(track)}
                      className="px-3 py-1.5 rounded-xl bg-[#5288c1] hover:bg-blue-500 text-xs font-bold text-white transition cursor-pointer"
                    >
                      Выбрать
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
