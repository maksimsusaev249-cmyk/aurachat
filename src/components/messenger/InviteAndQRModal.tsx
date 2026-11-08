import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Chat, User } from '../../types';
import { 
  X, 
  Copy, 
  Check, 
  QrCode, 
  Link2, 
  Lock, 
  UserPlus, 
  Download,
  Globe,
  Search,
  UserCheck,
  Send
} from 'lucide-react';
import { playSentSound, playReactionSound } from '../../utils/audioUtils';

interface InviteAndQRModalProps {
  isOpen: boolean;
  chat: Chat;
  onClose: () => void;
  allUsers?: User[];
  currentUserId?: string;
  onAddMemberToChat?: (chatId: string, targetUser: User) => void;
  onRequestJoin?: (chatId: string, guestUser: { userName: string; username: string; avatarUrl: string }) => void;
  onInstantJoinPublic?: (chatId: string) => void;
}

export const InviteAndQRModal: React.FC<InviteAndQRModalProps> = ({
  isOpen,
  chat,
  onClose,
  allUsers = [],
  currentUserId,
  onAddMemberToChat
}) => {
  const [activeTab, setActiveTab] = useState<'add_person' | 'link' | 'qr'>('add_person');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedUserIds, setAddedUserIds] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const inviteCode = chat.inviteCode || chat.id.replace(/[^a-zA-Z0-9_]/g, '').slice(-8) || 'invite';
  const inviteLink = chat.isPrivate
    ? `https://chatix.app/join/private_${inviteCode}`
    : `https://chatix.app/join/${inviteCode}`;

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
    playReactionSound();
    setCopied(true);
    setStatusMessage('✅ Ссылка скопирована в буфер обмена');
    setTimeout(() => {
      setCopied(false);
      setStatusMessage(null);
    }, 2500);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    playSentSound();
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_${chat.title.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  const existingMemberIds = new Set(
    (chat.members || []).map((m) => m.userId)
  );
  const existingUsernames = new Set(
    (chat.members || []).map((m) => (m.username || '').toLowerCase())
  );

  const filteredUsers = allUsers.filter((u) => {
    if (!u || u.id === currentUserId) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase().replace(/^@/, '');
    return (
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  });

  const handleAddUser = (targetUser: User) => {
    playSentSound();
    setAddedUserIds((prev) => ({ ...prev, [targetUser.id]: true }));
    onAddMemberToChat?.(chat.id, targetUser);
    setStatusMessage(`✅ ${targetUser.displayName} (@${targetUser.username}) добавлен(а) в «${chat.title}»`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleAddByCustomUsername = () => {
    const clean = searchQuery.trim().replace(/^@/, '');
    if (!clean) return;
    const matched = allUsers.find(
      (u) =>
        (u.username || '').toLowerCase() === clean.toLowerCase() ||
        (u.displayName || '').toLowerCase() === clean.toLowerCase()
    );
    if (matched) {
      handleAddUser(matched);
      setSearchQuery('');
      return;
    }
    const newCustomUser: User = {
      id: 'u_invited_' + Date.now(),
      displayName: clean,
      username: clean.toLowerCase().replace(/\s+/g, '_'),
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(clean)}&backgroundColor=182533`,
      bio: '',
      isOnline: true,
      lastSeen: 'в сети'
    };
    handleAddUser(newCustomUser);
    setSearchQuery('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#1c1c20] border border-[#2e2e34] rounded-3xl w-full max-w-md p-4 sm:p-5 text-white shadow-2xl relative max-h-[92vh] overflow-y-auto scrollbar-thin animate-in fade-in zoom-in-95 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#2e2e34]">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={chat.avatarUrl}
              alt={chat.title}
              className="w-10 h-10 rounded-full object-cover border border-[#0077FF] shrink-0"
            />
            <div className="min-w-0 text-left">
              <h3 className="font-bold text-sm text-white truncate">{chat.title}</h3>
              <div className="text-[11px] text-[#939393] flex items-center gap-1.5 mt-0.5">
                {chat.isPrivate ? (
                  <span className="text-amber-400 flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3 shrink-0" /> Приватный (по ссылке или QR)
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <Globe className="w-3 h-3 shrink-0" /> Публичный
                  </span>
                )}
                <span>• {chat.membersCount || (chat.members?.length || 1)} уч.</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#939393] hover:text-white rounded-full bg-[#25252a] hover:bg-[#303036] transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Mode Tabs: Добавить человека | Ссылка | QR-код */}
        <div className="grid grid-cols-3 gap-1.5 bg-[#141417] p-1 rounded-2xl border border-[#2a2a30]">
          <button
            type="button"
            onClick={() => setActiveTab('add_person')}
            className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'add_person'
                ? 'bg-[#0077FF] text-white shadow'
                : 'text-[#939393] hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Добавить</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'link'
                ? 'bg-[#0077FF] text-white shadow'
                : 'text-[#939393] hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Ссылка</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-[#0077FF] text-white shadow'
                : 'text-[#939393] hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">QR-код</span>
          </button>
        </div>

        {statusMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold text-center">
            {statusMessage}
          </div>
        )}

        {/* TAB 1: ДОБАВИТЬ ЧЕЛОВЕКА */}
        {activeTab === 'add_person' && (
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#828282] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Имя или @username человека..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddByCustomUsername()}
                  className="w-full bg-[#141417] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 border border-[#2e2e34] outline-none focus:border-[#0077FF]"
                />
              </div>
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={handleAddByCustomUsername}
                  className="px-3 py-2.5 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-bold shrink-0 cursor-pointer transition flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Добавить</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin pr-0.5">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isAlreadyIn =
                    existingMemberIds.has(u.id) ||
                    existingUsernames.has((u.username || '').toLowerCase()) ||
                    Boolean(addedUserIds[u.id]);

                  return (
                    <div
                      key={u.id}
                      className="p-2.5 rounded-xl bg-[#25252a] border border-[#303036] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <img
                          src={u.avatarUrl}
                          alt={u.displayName}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">{u.displayName}</div>
                          <div className="text-[11px] text-[#71aaeb] truncate">@{u.username}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isAlreadyIn}
                        onClick={() => handleAddUser(u)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 transition cursor-pointer ${
                          isAlreadyIn
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                            : 'bg-[#0077FF] hover:bg-[#0066DD] text-white'
                        }`}
                      >
                        {isAlreadyIn ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Добавлен</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Добавить</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl bg-[#141417] border border-[#2a2a30] text-center space-y-2">
                  <p className="text-xs text-[#939393]">
                    Введите @username выше и нажмите «Добавить», либо отправьте человеку приватную ссылку или QR-код.
                  </p>
                </div>
              )}
            </div>

            {/* Quick switch to Link or QR at the bottom of Add Person tab */}
            <div className="pt-2 border-t border-[#2e2e34] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2 px-3 rounded-xl bg-[#25252a] hover:bg-[#303036] text-xs font-semibold text-[#71aaeb] flex items-center justify-center gap-1.5 cursor-pointer transition border border-[#33333a]"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Ссылка скопирована!' : 'Скопировать ссылку'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className="py-2 px-3 rounded-xl bg-[#25252a] hover:bg-[#303036] text-xs font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer transition border border-[#33333a]"
              >
                <QrCode className="w-3.5 h-3.5 text-[#71aaeb]" />
                <span>Показать QR-код</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ПРИГЛАСИТЕЛЬНАЯ ССЫЛКА */}
        {activeTab === 'link' && (
          <div className="space-y-3.5 text-left">
            <div className="p-3.5 rounded-2xl bg-[#141417] border border-[#2a2a30] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                {chat.isPrivate ? (
                  <>
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Приватная ссылка для приглашения</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Прямая ссылка на канал / чат</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-[#939393] leading-relaxed">
                {chat.isPrivate
                  ? 'Канал приватный — отправьте эту закрытую ссылку человеку, чтобы он сразу присоединился без ожидания.'
                  : 'Отправьте эту ссылку любому человеку для мгновенного входа.'}
              </p>

              <div className="p-2.5 bg-[#1f1f24] rounded-xl flex items-center justify-between border border-[#32323a] gap-2">
                <span className="font-mono text-xs text-[#71aaeb] truncate">
                  {inviteLink}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-[#0077FF] hover:bg-[#0066DD] text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Скопировано' : 'Копировать'}</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="w-full py-2.5 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition shadow-lg"
            >
              <Send className="w-4 h-4" />
              <span>Скопировать и отправить ссылку человеку</span>
            </button>
          </div>
        )}

        {/* TAB 3: QR-КОД */}
        {activeTab === 'qr' && (
          <div className="space-y-3 text-center">
            <div className="p-3 bg-white rounded-2xl mx-auto w-52 h-52 flex flex-col items-center justify-center shadow-2xl">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-800 text-xs">
                  <QrCode className="w-10 h-10 animate-spin text-[#0077FF]" />
                  <span className="mt-2 font-semibold">Генерация QR-кода...</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#939393]">
              Покажите этот QR-код человеку или отправьте ему картинку для мгновенного входа в «{chat.title}».
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadQR}
                disabled={!qrDataUrl}
                className="flex-1 py-2.5 bg-[#0077FF] hover:bg-[#0066DD] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Скачать QR (PNG)</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2.5 bg-[#25252a] hover:bg-[#303036] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-[#33333a]"
              >
                <Copy className="w-4 h-4 text-[#71aaeb]" />
                <span>{copied ? 'Скопировано' : 'Ссылка'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

