import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { Chat, User } from '../../types';
import { 
  X, 
  Camera, 
  QrCode, 
  Scan, 
  Lock, 
  Globe, 
  Users, 
  Check, 
  Clock, 
  AlertCircle,
  Sparkles,
  ChevronRight,
  Upload
} from 'lucide-react';
import { playReactionSound, playSentSound } from '../../utils/audioUtils';

interface QRScannerModalProps {
  isOpen: boolean;
  currentUser: User;
  allChats: Chat[];
  onClose: () => void;
  onJoinPublicChat: (chatId: string) => void;
  onRequestJoinPrivateChat: (chatId: string, guestUser: { userName: string; username: string; avatarUrl: string }) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  currentUser,
  allChats,
  onClose,
  onJoinPublicChat,
  onRequestJoinPrivateChat
}) => {
  const [step, setStep] = useState<'scanning' | 'scanned_preview'>('scanning');
  const [scannedChat, setScannedChat] = useState<Chat | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [joinedSuccess, setJoinedSuccess] = useState(false);

  // Store pre-generated QR code data URLs for chat list items
  const [chatQrMap, setChatQrMap] = useState<Record<string, string>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate real QR code image URLs for all chats
  useEffect(() => {
    if (isOpen) {
      allChats.forEach((chat) => {
        const link = `https://aurachat.app/join/${chat.inviteCode || chat.id}`;
        QRCode.toDataURL(link, { width: 160, margin: 1, color: { dark: '#0e1621', light: '#ffffff' } })
          .then((url) => {
            setChatQrMap((prev) => ({ ...prev, [chat.id]: url }));
          })
          .catch(() => {});
      });
    }
  }, [isOpen, allChats]);

  // Handle camera start/stop
  useEffect(() => {
    if (isOpen && step === 'scanning') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, step]);

  // Continuous QR Scanning loop on camera video feed
  useEffect(() => {
    if (isCameraActive && step === 'scanning') {
      scanIntervalRef.current = setInterval(() => {
        processVideoFrame();
      }, 300);
    } else {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    }
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [isCameraActive, step]);

  const processVideoFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) return;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        handleDecodeQRText(code.data);
      }
    } catch (e) {
      // Ignore scan frame exceptions
    }
  };

  const handleDecodeQRText = (qrText: string) => {
    const cleanText = qrText.trim().toLowerCase();
    const matched = allChats.find(
      (c) =>
        c.id.toLowerCase() === cleanText ||
        (c.inviteCode && cleanText.includes(c.inviteCode.toLowerCase())) ||
        cleanText.includes(c.id.toLowerCase()) ||
        c.title.toLowerCase().includes(cleanText)
    ) || allChats[0];

    playReactionSound();
    stopCamera();
    setScannedChat(matched);
    setRequestSent(false);
    setJoinedSuccess(false);
    setStep('scanned_preview');
  };

  // Upload and decode QR Code from Image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          handleDecodeQRText(code.data);
        } else {
          handleDecodeQRText(file.name);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      setCameraError(false);
    } catch {
      setIsCameraActive(false);
      setCameraError(true);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  if (!isOpen) return null;

  const handleSelectScannedChat = (chat: Chat) => {
    playReactionSound();
    stopCamera();
    setScannedChat(chat);
    setRequestSent(false);
    setJoinedSuccess(false);
    setStep('scanned_preview');
  };

  const handleJoinOrRequest = () => {
    if (!scannedChat) return;

    if (scannedChat.isPrivate && scannedChat.requiresApproval) {
      playSentSound();
      onRequestJoinPrivateChat(scannedChat.id, {
        userName: currentUser.displayName,
        username: currentUser.username,
        avatarUrl: currentUser.avatarUrl
      });
      setRequestSent(true);
    } else {
      playSentSound();
      onJoinPublicChat(scannedChat.id);
      setJoinedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4 select-none">
      <div className="bg-[#17212b] border border-[#243344] rounded-3xl w-full max-w-sm sm:max-w-md h-[600px] max-h-[92vh] flex flex-col text-white shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 bg-[#17212b] border-b border-[#0e1621] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#5288c1]/20 flex items-center justify-center text-[#64b5f6]">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {step === 'scanning' ? 'Сканер QR-кода' : 'Вступление по QR-коду'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {step === 'scanning' ? 'Наведите камеру или загрузите фото с QR-кодом' : 'Проверьте данные группы или канала'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-[#202b36] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: SCANNING VIEWFINDER */}
        {step === 'scanning' && (
          <div className="flex-1 flex flex-col justify-between p-4 relative overflow-y-auto scrollbar-thin">
            {/* Camera Viewfinder */}
            <div className="relative w-full h-56 bg-black rounded-2xl overflow-hidden border-2 border-[#2b3c4f] flex items-center justify-center shadow-inner shrink-0">
              {isCameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-4 text-slate-400">
                  <Scan className="w-10 h-10 text-[#5288c1] mb-2 animate-pulse" />
                  <p className="text-xs font-semibold text-slate-300">
                    {cameraError ? 'Камера недоступна (разрешите доступ)' : 'Подключение к камере...'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Используйте кнопку «Загрузить фото с QR» или быстрый выбор ниже
                  </p>
                </div>
              )}

              {/* QR Targeting Frame with Red Laser Sweep */}
              <div className="absolute inset-6 border-2 border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-1">
                <div className="flex justify-between">
                  <span className="w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                  <span className="w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                </div>
                {/* Sweeping laser line */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#10b981] animate-bounce" />
                <div className="flex justify-between">
                  <span className="w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                  <span className="w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
                </div>
              </div>
            </div>

            {/* Upload QR File Button */}
            <div className="mt-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 rounded-xl bg-[#202b36] hover:bg-[#283748] border border-[#283748] text-[#64b5f6] hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Загрузить фото / скриншот с QR-кодом</span>
              </button>
            </div>

            {/* Quick QR codes list with genuine scannable QR images */}
            <div className="mt-3 space-y-2 flex-1 min-h-0">
              <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Доступные QR-коды для сканирования:</span>
              </div>

              <div className="space-y-1.5 overflow-y-auto max-h-48 scrollbar-thin pr-1">
                {allChats.filter((c) => c.type !== 'saved').map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectScannedChat(chat)}
                    className="p-2 rounded-xl bg-[#1e2a38] hover:bg-[#283748] border border-[#283748] flex items-center justify-between text-left transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {chatQrMap[chat.id] ? (
                        <img
                          src={chatQrMap[chat.id]}
                          alt="QR"
                          className="w-10 h-10 rounded bg-white p-0.5 shrink-0 object-contain shadow"
                        />
                      ) : (
                        <img
                          src={chat.avatarUrl}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-[#5288c1] shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate group-hover:text-[#64b5f6]">
                          {chat.title}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          {chat.isPrivate ? (
                            <span className="text-amber-400 flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> Приватный</span>
                          ) : (
                            <span className="text-emerald-400 flex items-center gap-0.5"><Globe className="w-2.5 h-2.5" /> Публичный</span>
                          )}
                          <span>• {chat.membersCount} участн.</span>
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-[#5288c1]/20 text-[#64b5f6] group-hover:bg-[#5288c1] group-hover:text-white text-[10px] font-bold transition shrink-0">
                      Отсканировать
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: SCANNED GROUP/CHANNEL PREVIEW & JOIN / APPLY FLOW */}
        {step === 'scanned_preview' && scannedChat && (
          <div className="flex-1 flex flex-col justify-between p-5 text-center">
            <div className="flex flex-col items-center">
              <div className="relative mb-3">
                <img
                  src={scannedChat.avatarUrl}
                  alt={scannedChat.title}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-[#5288c1]/40 shadow-xl"
                />
                <span className={`absolute bottom-1 right-1 p-1 rounded-full text-white text-[10px] shadow ${
                  scannedChat.isPrivate ? 'bg-amber-600' : 'bg-emerald-600'
                }`}>
                  {scannedChat.isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                </span>
              </div>

              <h3 className="font-bold text-base text-white">{scannedChat.title}</h3>
              <p className="text-xs text-[#64b5f6] font-mono mt-0.5">
                aurachat.app/join/{scannedChat.inviteCode || 'group_invite'}
              </p>

              {/* Status Pill: Private vs Public */}
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-[#1e2a38] border-[#2b3c4f]">
                {scannedChat.isPrivate ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300">Приватный чат (Вход по заявкам)</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Публичный чат (Свободный вход)</span>
                  </>
                )}
              </div>

              <div className="mt-4 p-3 rounded-2xl bg-[#1e2a38] border border-[#283748] w-full text-left text-xs space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Тип сообщества:</span>
                  <span className="font-semibold text-white capitalize">{scannedChat.type === 'channel' ? 'Канал' : 'Группа'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Участников:</span>
                  <span className="font-semibold text-white">{scannedChat.membersCount} человек</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Владелец:</span>
                  <span className="font-semibold text-white">Павел Дуров (@durov)</span>
                </div>
              </div>
            </div>

            {/* Actions: Join or Request Join */}
            <div className="space-y-2 pt-4">
              {scannedChat.isPrivate && scannedChat.requiresApproval ? (
                requestSent ? (
                  <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold text-xs space-y-1">
                    <div className="flex items-center justify-center gap-1.5 font-bold">
                      <Clock className="w-4 h-4" />
                      <span>Заявка отправлена на рассмотрение!</span>
                    </div>
                    <p className="text-[11px] text-amber-200/80 font-normal">
                      Ожидайте, пока владелец или модератор проверит и одобрит вашу заявку.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleJoinOrRequest}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Подать заявку на вступление</span>
                  </button>
                )
              ) : (
                joinedSuccess ? (
                  <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>Вы успешно вступили в публичный чат!</span>
                  </div>
                ) : (
                  <button
                    onClick={handleJoinOrRequest}
                    className="w-full py-3 bg-[#5288c1] hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Вступить в {scannedChat.type === 'channel' ? 'канал' : 'группу'}</span>
                  </button>
                )
              )}

              <button
                onClick={() => {
                  setStep('scanning');
                  startCamera();
                }}
                className="w-full py-2 bg-[#202b36] hover:bg-[#283748] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Сканировать другой QR-код
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
