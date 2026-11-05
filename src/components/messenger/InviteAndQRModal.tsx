import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Chat } from '../../types';
import { 
  X, 
  Copy, 
  Check, 
  QrCode, 
  Link2, 
  ShieldCheck, 
  Lock, 
  Share2, 
  UserPlus, 
  Clock,
  Sparkles,
  Download,
  Scan,
  Globe
} from 'lucide-react';
import { playSentSound, playReactionSound } from '../../utils/audioUtils';

interface InviteAndQRModalProps {
  isOpen: boolean;
  chat: Chat;
  onClose: () => void;
  onRequestJoin: (chatId: string, guestUser: { userName: string; username: string; avatarUrl: string }) => void;
  onInstantJoinPublic?: (chatId: string) => void;
}

export const InviteAndQRModal: React.FC<InviteAndQRModalProps> = ({
  isOpen,
  chat,
  onClose,
  onRequestJoin,
  onInstantJoinPublic
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [guestRequested, setGuestRequested] = useState(false);
  const [guestJoined, setGuestJoined] = useState(false);

  const inviteLink = `https://aurachat.app/join/${chat.inviteCode || 'invite_code'}`;

  // Generate genuine scannable QR Code
  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(inviteLink, {
        width: 360,
        margin: 2,
        color: {
          dark: '#0e1621',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [isOpen, inviteLink]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_${chat.title.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  // Simulates another user scanning the real QR-code:
  // If private -> submit application (подать заявку)
  // If public -> instant join (вступить в группу/канал)
  const handleSimulateGuestScan = () => {
    playReactionSound();
    if (chat.isPrivate && chat.requiresApproval) {
      setGuestRequested(true);
      onRequestJoin(chat.id, {
        userName: 'Иван (Новый участник)',
        username: 'ivan_guest',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=DanilCyber&backgroundColor=1f2937'
      });
    } else {
      setGuestJoined(true);
      if (onInstantJoinPublic) {
        onInstantJoinPublic(chat.id);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 select-none">
      <div className="bg-[#17212b] border border-[#243344] rounded-3xl w-full max-w-sm sm:max-w-md p-5 sm:p-6 text-white shadow-2xl relative text-center max-h-[92vh] overflow-y-auto scrollbar-thin animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-[#202b36] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-4">
          <img
            src={chat.avatarUrl}
            alt={chat.title}
            className="w-16 h-16 rounded-full object-cover border-2 border-[#5288c1] mb-2 shadow-lg"
          />
          <h3 className="font-bold text-base text-white truncate max-w-[280px]">{chat.title}</h3>
          
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
            {chat.isPrivate ? (
              <span className="text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                <Lock className="w-3 h-3" /> Приватный (Вход по заявке)
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <Globe className="w-3 h-3" /> Публичный (Свободный вход)
              </span>
            )}
            <span>• {chat.membersCount} участников</span>
          </div>
        </div>

        {/* Real Authentic QR Code Display */}
        <div className="p-3 bg-white rounded-2xl mx-auto w-52 h-52 flex flex-col items-center justify-center shadow-2xl relative mb-4">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Real Scannable QR Code"
              className="w-full h-full object-contain rounded-xl"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-800 text-xs">
              <QrCode className="w-10 h-10 animate-spin text-[#5288c1]" />
              <span className="mt-2 font-semibold">Генерация QR-кода...</span>
            </div>
          )}
        </div>

        <div className="text-[11px] text-slate-400 mb-3">
          💡 Настоящий QR-код. Собеседник может отсканировать его камерой телефона или встроенным сканером.
        </div>

        {/* Invite link with copy button */}
        <div className="p-2.5 bg-[#1e2a38] rounded-xl flex items-center justify-between border border-[#283748] mb-3">
          <span className="font-mono text-xs text-[#64b5f6] truncate mr-2 text-left">
            {inviteLink}
          </span>
          <button
            onClick={handleCopy}
            className="px-3 py-1 bg-[#5288c1] hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Скопировано' : 'Копия'}</span>
          </button>
        </div>

        {/* Download QR & Simulate Scan Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleDownloadQR}
            disabled={!qrDataUrl}
            className="w-full py-2 bg-[#202b36] hover:bg-[#283748] text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border border-[#2b3c4f]"
          >
            <Download className="w-4 h-4 text-[#64b5f6]" />
            <span>Скачать настоящий QR-код (PNG)</span>
          </button>

          {/* Interactive Guest Scanner Simulation Button */}
          {chat.isPrivate ? (
            guestRequested ? (
              <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold">
                ✓ Собеседник отсканировал QR и подал заявку на вступление! Вы (владелец) можете одобрить её в шапке чата.
              </div>
            ) : (
              <button
                onClick={handleSimulateGuestScan}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Scan className="w-4 h-4" />
                <span>Симуляция: Гость сканирует QR и подает заявку</span>
              </button>
            )
          ) : (
            guestJoined ? (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                ✓ Собеседник отсканировал QR и сразу вступил в публичный чат!
              </div>
            ) : (
              <button
                onClick={handleSimulateGuestScan}
                className="w-full py-2.5 bg-[#5288c1] hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Scan className="w-4 h-4" />
                <span>Симуляция: Гость сканирует QR и вступает</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
