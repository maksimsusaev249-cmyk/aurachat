import React, { useState } from 'react';
import { Chat, ChatMember, AdminPermissions, BannedMember, AdminLogEntry, User, Message } from '../../types';
import {
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  UserPlus,
  UserMinus,
  Ban,
  Crown,
  Check,
  Search,
  ChevronRight,
  ArrowLeft,
  Lock,
  Globe,
  Link2,
  Edit3,
  Trash2,
  FileText,
  History,
  Settings,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Eye,
  Upload
} from 'lucide-react';
import { playReactionSound, playSentSound } from '../../utils/audioUtils';

interface ChannelManagementModalProps {
  isOpen: boolean;
  chat: Chat;
  messages: Message[];
  currentUser: User;
  userRole: 'owner' | 'admin' | 'member';
  onChangeUserRole: (role: 'owner' | 'admin' | 'member') => void;
  onUpdateChat: (updatedChat: Chat) => void;
  onClose: () => void;
}

type ModalTab = 'overview' | 'members' | 'admins' | 'blacklist' | 'settings';

const defaultAdminPermissions: AdminPermissions = {
  canChangeInfo: true,
  canPostMessages: true,
  canEditMessages: true,
  canDeleteMessages: true,
  canBanUsers: true,
  canInviteUsers: true,
  canPinMessages: true,
  canManageTopics: true,
  canAddAdmins: false
};

const permissionLabels: { key: keyof AdminPermissions; label: string; desc: string }[] = [
  { key: 'canChangeInfo', label: 'Изменение профиля канала/группы', desc: 'Название, описание и аватарка' },
  { key: 'canPostMessages', label: 'Публикация постов и сообщений', desc: 'Создание новых публикаций в канале' },
  { key: 'canEditMessages', label: 'Изменение чужих публикаций', desc: 'Редактирование постов других админов' },
  { key: 'canDeleteMessages', label: 'Удаление публикаций', desc: 'Удаление любых постов и сообщений' },
  { key: 'canBanUsers', label: 'Блокировка (Чёрный список)', desc: 'Удаление подписчиков и внесение в ЧС' },
  { key: 'canInviteUsers', label: 'Приглашение пользователей', desc: 'Добавление людей и управление ссылками' },
  { key: 'canPinMessages', label: 'Закрепление сообщений', desc: 'Закреп важных постов вверху' },
  { key: 'canManageTopics', label: 'Управление ветками (Topics)', desc: 'Создание и удаление тем обсуждения' },
  { key: 'canAddAdmins', label: 'Добавление администраторов', desc: 'Назначение новых админов и выдача прав' }
];

const candidatePool = [
  {
    userId: 'usr_dmitry',
    displayName: 'Дмитрий Соколов (Backend)',
    username: 'dmitry_go',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DmitryGo&backgroundColor=1e293b'
  },
  {
    userId: 'usr_anna',
    displayName: 'Анна Смирнова (Product)',
    username: 'anna_prod',
    avatarUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=AnnaProd&backgroundColor=4c1d95'
  },
  {
    userId: 'usr_igor',
    displayName: 'Игорь Верстка (Frontend)',
    username: 'igor_ui',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=IgorFrontend&backgroundColor=0284c7'
  },
  {
    userId: 'usr_kate',
    displayName: 'Екатерина (QA Lead)',
    username: 'kate_qa',
    avatarUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=KateQA&backgroundColor=312e81'
  }
];

export const ChannelManagementModal: React.FC<ChannelManagementModalProps> = ({
  isOpen,
  chat,
  messages,
  currentUser,
  userRole,
  onChangeUserRole,
  onUpdateChat,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteCopied, setShowInviteCopied] = useState(false);

  // Selected member for Admin Rights / Actions editor
  const [editingMember, setEditingMember] = useState<ChatMember | null>(null);
  const [editPermissions, setEditPermissions] = useState<AdminPermissions>(defaultAdminPermissions);
  const [editCustomTitle, setEditCustomTitle] = useState('');
  const [confirmTransferOwner, setConfirmTransferOwner] = useState(false);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [showBanConfirm, setShowBanConfirm] = useState(false);

  // Edit channel info state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);
  const [editAvatarUrl, setEditAvatarUrl] = useState(chat.avatarUrl || '');
  const [editDescription, setEditDescription] = useState(
    chat.description || 'Официальный канал. Публикации, архитектура, свежие новости и медиа.'
  );

  // Manual ban input in Blacklist tab
  const [manualBanUsername, setManualBanUsername] = useState('');
  const [manualBanReason, setManualBanReason] = useState('Спам / Нарушение правил');

  if (!isOpen) return null;

  const isChannel = chat.type === 'channel';
  const isOwner = userRole === 'owner';
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  const membersList = chat.members || [];
  const adminsList = membersList.filter((m) => m.role === 'owner' || m.role === 'admin');
  const bannedList = chat.bannedMembers || [];
  const adminLogs = chat.adminLog || [];

  const filteredMembers = membersList.filter(
    (m) =>
      m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.customTitle && m.customTitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const appendLog = (actionText: string, baseChat: Chat = chat): AdminLogEntry[] => {
    const newEntry: AdminLogEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      actorName: currentUser.displayName,
      action: actionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    return [newEntry, ...(baseChat.adminLog || [])];
  };

  // Open member editor when clicking on a person
  const handleSelectMember = (member: ChatMember) => {
    playReactionSound();
    setEditingMember(member);
    setEditPermissions(member.permissions || defaultAdminPermissions);
    setEditCustomTitle(
      member.customTitle || (member.role === 'owner' ? 'Создатель' : member.role === 'admin' ? 'Администратор' : '')
    );
    setConfirmTransferOwner(false);
    setShowBanConfirm(false);
    setBanReasonInput('Нарушение правил сообщества');
  };

  // Promote to Admin or Save Admin Permissions (ONLY OWNER)
  const handleSaveAdminRights = () => {
    if (!editingMember || !isOwner) return;
    playSentSound();

    const wasAdmin = editingMember.role === 'admin' || editingMember.role === 'owner';
    const newRole: 'owner' | 'admin' = editingMember.role === 'owner' ? 'owner' : 'admin';

    const updatedMembers = membersList.map((m) =>
      m.userId === editingMember.userId
        ? {
            ...m,
            role: newRole,
            customTitle: editCustomTitle.trim() || (newRole === 'owner' ? 'Создатель' : 'Модератор'),
            permissions: editPermissions,
            promotedBy: m.promotedBy || currentUser.displayName
          }
        : m
    );

    const activePermsCount = Object.values(editPermissions).filter(Boolean).length;
    const logText = wasAdmin
      ? `обновил(а) права админа ${editingMember.displayName} (${activePermsCount}/9 прав)`
      : `назначил(а) ${editingMember.displayName} администратором/модератором (${editCustomTitle.trim() || 'Модератор'})`;

    onUpdateChat({
      ...chat,
      members: updatedMembers,
      adminLog: appendLog(logText)
    });

    setEditingMember(null);
  };

  // Remove from Admins (Demote to regular subscriber/member) (ONLY OWNER)
  const handleRemoveFromAdmins = () => {
    if (!editingMember || !isOwner) return;
    playReactionSound();

    const updatedMembers = membersList.map((m) =>
      m.userId === editingMember.userId
        ? {
            ...m,
            role: 'member' as const,
            customTitle: undefined,
            permissions: undefined
          }
        : m
    );

    onUpdateChat({
      ...chat,
      members: updatedMembers,
      adminLog: appendLog(`снял(а) ${editingMember.displayName} с должности администратора`)
    });

    if (editingMember.userId === currentUser.id) {
      onChangeUserRole('member');
    }
    setEditingMember(null);
  };

  // Transfer Ownership to another person (ONLY OWNER)
  const handleTransferOwnership = () => {
    if (!editingMember || !isOwner) return;
    playSentSound();

    const fullPerms: AdminPermissions = {
      canChangeInfo: true,
      canPostMessages: true,
      canEditMessages: true,
      canDeleteMessages: true,
      canBanUsers: true,
      canInviteUsers: true,
      canPinMessages: true,
      canManageTopics: true,
      canAddAdmins: true
    };

    const updatedMembers = membersList.map((m) => {
      if (m.userId === editingMember.userId) {
        return {
          ...m,
          role: 'owner' as const,
          customTitle: editCustomTitle.trim() || 'Владелец',
          permissions: fullPerms,
          promotedBy: currentUser.displayName
        };
      }
      if (m.role === 'owner') {
        return {
          ...m,
          role: 'admin' as const,
          customTitle: 'Экс-владелец (Админ)',
          permissions: defaultAdminPermissions
        };
      }
      return m;
    });

    onUpdateChat({
      ...chat,
      members: updatedMembers,
      adminLog: appendLog(`👑 передал(а) права Владельца (Создателя) пользователю ${editingMember.displayName}`)
    });

    // If we transferred ownership away from currentUser, currentUser becomes admin
    if (editingMember.userId !== currentUser.id) {
      onChangeUserRole('admin');
    } else {
      onChangeUserRole('owner');
    }

    setConfirmTransferOwner(false);
    setEditingMember(null);
  };

  // Ban member (Move to Blacklist)
  const handleBanMember = () => {
    if (!editingMember) return;
    playReactionSound();

    const newBanned: BannedMember = {
      userId: editingMember.userId,
      displayName: editingMember.displayName,
      username: editingMember.username,
      avatarUrl: editingMember.avatarUrl,
      bannedBy: currentUser.displayName,
      bannedAt: 'Только что',
      reason: banReasonInput.trim() || 'Нарушение правил'
    };

    const remainingMembers = membersList.filter((m) => m.userId !== editingMember.userId);

    onUpdateChat({
      ...chat,
      members: remainingMembers,
      membersCount: Math.max(1, chat.membersCount - 1),
      bannedMembers: [newBanned, ...bannedList],
      adminLog: appendLog(`🚫 занёс(ла) в чёрный список ${editingMember.displayName} (${newBanned.reason})`)
    });

    setShowBanConfirm(false);
    setEditingMember(null);
  };

  // Unban user from Blacklist (optionally return to subscribers)
  const handleUnbanMember = (banned: BannedMember, returnToChat: boolean = true) => {
    playSentSound();
    const updatedBanned = bannedList.filter((b) => b.userId !== banned.userId);
    const restoredMember: ChatMember = {
      userId: banned.userId,
      displayName: banned.displayName,
      username: banned.username,
      avatarUrl: banned.avatarUrl,
      role: 'member'
    };

    const updatedMembers = returnToChat
      ? [...membersList.filter((m) => m.userId !== banned.userId), restoredMember]
      : membersList;

    onUpdateChat({
      ...chat,
      members: updatedMembers,
      membersCount: returnToChat ? chat.membersCount + 1 : chat.membersCount,
      bannedMembers: updatedBanned,
      adminLog: appendLog(`✅ убрал(а) из чёрного списка ${banned.displayName}`)
    });
  };

  // Add new subscriber from candidate pool
  const handleAddSubscriber = (candidate: typeof candidatePool[0]) => {
    if (membersList.some((m) => m.userId === candidate.userId)) return;
    playSentSound();

    const newMember: ChatMember = {
      userId: candidate.userId,
      displayName: candidate.displayName,
      username: candidate.username,
      avatarUrl: candidate.avatarUrl,
      role: 'member'
    };

    onUpdateChat({
      ...chat,
      members: [...membersList, newMember],
      membersCount: chat.membersCount + 1,
      adminLog: appendLog(`➕ добавил(а) подписчика ${candidate.displayName}`)
    });
  };

  // Manual ban by username
  const handleManualBan = () => {
    if (!manualBanUsername.trim()) return;
    playReactionSound();
    const cleanUsername = manualBanUsername.trim().replace(/^@/, '');

    // Check if user is in members list
    const existingMember = membersList.find(
      (m) => m.username.toLowerCase() === cleanUsername.toLowerCase() || m.displayName.toLowerCase().includes(cleanUsername.toLowerCase())
    );

    const newBanned: BannedMember = {
      userId: existingMember?.userId || 'usr_ban_' + Date.now(),
      displayName: existingMember?.displayName || cleanUsername,
      username: existingMember?.username || cleanUsername,
      avatarUrl:
        existingMember?.avatarUrl ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      bannedBy: currentUser.displayName,
      bannedAt: 'Только что',
      reason: manualBanReason.trim() || 'Заблокирован администратором'
    };

    const remainingMembers = existingMember
      ? membersList.filter((m) => m.userId !== existingMember.userId)
      : membersList;

    onUpdateChat({
      ...chat,
      members: remainingMembers,
      membersCount: existingMember ? Math.max(1, chat.membersCount - 1) : chat.membersCount,
      bannedMembers: [newBanned, ...bannedList],
      adminLog: appendLog(`🚫 занёс(ла) в чёрный список @${newBanned.username} (${newBanned.reason})`)
    });

    setManualBanUsername('');
  };

  const handleSaveChannelInfo = () => {
    if (!editTitle.trim()) return;
    playSentSound();
    onUpdateChat({
      ...chat,
      title: editTitle.trim(),
      avatarUrl: editAvatarUrl || chat.avatarUrl,
      description: editDescription.trim(),
      adminLog: appendLog(`✏️ обновил(а) аватар/название/описание ${isChannel ? 'канала' : 'группы'}`)
    });
    setIsEditingInfo(false);
  };

  const handleCopyInvite = () => {
    const code = chat.inviteCode || 'aurachat_invite';
    navigator.clipboard.writeText(`https://aurachat.app/join/${code}`);
    setShowInviteCopied(true);
    setTimeout(() => setShowInviteCopied(false), 2000);
  };

  const availableCandidates = candidatePool.filter(
    (cand) => !membersList.some((m) => m.userId === cand.userId) && !bannedList.some((b) => b.userId === cand.userId)
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#17212b] border border-[#243344] rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col text-white shadow-2xl overflow-hidden"
      >
        {/* =================================================================== */}
        {/* TOP HEADER                                                          */}
        {/* =================================================================== */}
        <div className="px-4 py-3 bg-[#0e1621] border-b border-[#243344] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {editingMember ? (
              <button
                onClick={() => setEditingMember(null)}
                className="p-1.5 rounded-full bg-[#1e2a38] text-slate-300 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <img
                src={chat.avatarUrl}
                alt={chat.title}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#5288c1]/50 shrink-0"
              />
            )}
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-white truncate">
                {editingMember
                  ? `Настройка прав: ${editingMember.displayName}`
                  : isChannel
                  ? 'Управление каналом'
                  : 'Управление группой'}
              </h3>
              <p className="text-[10px] text-slate-400 truncate">
                {editingMember
                  ? `@${editingMember.username} • Назначение админом, передача прав и ЧС`
                  : `${chat.title} • ${chat.membersCount} ${isChannel ? 'подписчиков' : 'участников'}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-[#202b36] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* =================================================================== */}
        {/* CURRENT USER ROLE BANNER (РЕАЛЬНЫЙ СТАТУС В ЧАТЕ)                   */}
        {/* =================================================================== */}
        {!editingMember && (
          <div className="px-4 py-2 bg-[#131c26] border-b border-[#243344] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-medium">Ваш статус:</span>
              {isOwner ? (
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  👑 Создатель (Владелец)
                </span>
              ) : isOwnerOrAdmin ? (
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                  🛡️ Модератор (Администратор)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-700/60 text-slate-300 border border-slate-600 flex items-center gap-1">
                  👤 Подписчик
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400">
              {isOwner ? '👑 Только вы можете менять роли' : isOwnerOrAdmin ? '🛡️ Модерация контента и ЧС' : '🔒 Режим чтения'}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* NAVIGATION TABS (HIDDEN WHEN EDITING SPECIFIC MEMBER)               */}
        {/* =================================================================== */}
        {!editingMember && (
          <div className="px-3 py-2 bg-[#17212b] border-b border-[#243344] flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#5288c1] text-white shadow'
                  : 'bg-[#1e2a38] text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Обзор & Посты</span>
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-[#5288c1] text-white shadow'
                  : 'bg-[#1e2a38] text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isChannel ? 'Подписчики' : 'Участники'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                {membersList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('admins')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'admins'
                  ? 'bg-[#5288c1] text-white shadow'
                  : 'bg-[#1e2a38] text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Админы</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                {adminsList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('blacklist')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'blacklist'
                  ? 'bg-rose-600 text-white shadow'
                  : 'bg-[#1e2a38] text-slate-400 hover:text-white'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Чёрный список</span>
              {bannedList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-200 text-[10px]">
                  {bannedList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#5288c1] text-white shadow'
                  : 'bg-[#1e2a38] text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Ещё / Журнал</span>
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* MODAL BODY CONTENT                                                  */}
        {/* =================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {/* ================================================================= */}
          {/* VIEW A: MEMBER ADMIN PROMOTION, PERMISSIONS, DEMOTE & TRANSFER    */}
          {/* ("нажимаешь на человека и назначаешь администратором...")          */}
          {/* ================================================================= */}
          {editingMember && (
            <div className="space-y-4">
              {/* Person Summary Card */}
              <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={editingMember.avatarUrl}
                    alt={editingMember.displayName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[#5288c1]"
                  />
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>{editingMember.displayName}</span>
                      {editingMember.role === 'owner' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">
                          👑 Создатель
                        </span>
                      )}
                      {editingMember.role === 'admin' && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px]">
                          🛡️ Админ
                        </span>
                      )}
                      {editingMember.role === 'member' && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 text-[10px]">
                          👤 Подписчик
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#64b5f6] font-mono">@{editingMember.username}</div>
                    {editingMember.promotedBy && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Назначил(а): {editingMember.promotedBy}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ROLE MANAGEMENT RESTRICTION: ONLY OWNER CAN CHANGE ROLES */}
              {!isOwner ? (
                <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5">
                    <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-amber-300">Только Создатель (Владелец) может менять роли</div>
                      <div className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                        Назначать модераторов, администраторов, выдавать права, снимать с должности и передавать владение каналом может <strong>исключительно Создатель (Владелец)</strong> канала.
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#131c26] border border-[#243344] text-xs text-slate-300 flex items-center justify-between">
                    <span className="text-slate-400">Текущая роль:</span>
                    <span className="font-bold text-[#64b5f6]">
                      {editingMember.role === 'owner' ? '👑 Создатель' : editingMember.role === 'admin' ? `🛡️ ${editingMember.customTitle || 'Модератор'}` : '👤 Подписчик'}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Custom Title Input (ONLY OWNER) */}
                  <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-2">
                    <label className="text-xs font-bold text-slate-200 block">
                      Должность / подпись администратора (Custom Title):
                    </label>
                    <input
                      type="text"
                      placeholder="Например: Главный редактор, Модератор, Админ..."
                      value={editCustomTitle}
                      onChange={(e) => setEditCustomTitle(e.target.value)}
                      className="w-full bg-[#131c26] border border-[#2b3c4f] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#5288c1]"
                    />
                    <p className="text-[10px] text-slate-400">
                      Эта должность будет отображаться рядом с именем в списке и под постами.
                    </p>
                  </div>

                  {/* Granular Permissions Toggles ("Назначил, выдаёшь ему какие-нибудь права") */}
                  <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-[#283748]">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#64b5f6]" />
                        <span>Что может делать этот администратор:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const allTrue = Object.values(editPermissions).every(Boolean);
                          const nextVal = !allTrue;
                          setEditPermissions({
                            canChangeInfo: nextVal,
                            canPostMessages: nextVal,
                            canEditMessages: nextVal,
                            canDeleteMessages: nextVal,
                            canBanUsers: nextVal,
                            canInviteUsers: nextVal,
                            canPinMessages: nextVal,
                            canManageTopics: nextVal,
                            canAddAdmins: nextVal
                          });
                        }}
                        className="text-[10px] text-[#64b5f6] hover:underline cursor-pointer"
                      >
                        Выбрать все / Сбросить
                      </button>
                    </div>

                    <div className="space-y-2">
                      {permissionLabels.map((perm) => {
                        const checked = !!editPermissions[perm.key];
                        return (
                          <label
                            key={perm.key}
                            className="flex items-center justify-between p-2 rounded-xl bg-[#131c26] hover:bg-[#172230] border border-[#243344] cursor-pointer transition"
                          >
                            <div className="pr-2">
                              <div className="text-xs font-semibold text-white">{perm.label}</div>
                              <div className="text-[10px] text-slate-400">{perm.desc}</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setEditPermissions((prev) => ({
                                  ...prev,
                                  [perm.key]: e.target.checked
                                }))
                              }
                              className="w-4 h-4 accent-[#5288c1] rounded cursor-pointer shrink-0"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Save / Promote Button */}
                  <button
                    onClick={handleSaveAdminRights}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#5288c1] to-blue-600 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {editingMember.role === 'member'
                        ? 'Назначить администратором/модератором и выдать права'
                        : 'Сохранить права администратора'}
                    </span>
                  </button>

                  {/* =============================================================== */}
                  {/* BOTTOM ACTIONS (ONLY OWNER)                                      */}
                  {/* =============================================================== */}
                  <div className="pt-3 border-t border-[#243344] space-y-2.5">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Управление должностью и передача прав:
                    </div>

                    {/* 1. ПЕРЕДАТЬ ПРАВА ВЛАДЕЛЬЦА (СОЗДАТЕЛЯ) ДРУГОМУ ЧЕЛОВЕКУ */}
                    {editingMember.role !== 'owner' && (
                      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                        {!confirmTransferOwner ? (
                          <button
                            type="button"
                            onClick={() => setConfirmTransferOwner(true)}
                            className="w-full py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                          >
                            <Crown className="w-4 h-4 text-amber-400" />
                            <span>Передать права владельца (Создателя) этому человеку</span>
                          </button>
                        ) : (
                          <div className="space-y-2 text-center">
                            <p className="text-xs text-amber-200 font-medium">
                              Вы уверены, что хотите передать полные права владельца {isChannel ? 'канала' : 'группы'} пользователю{' '}
                              <strong>{editingMember.displayName}</strong>? Вы останетесь администратором.
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setConfirmTransferOwner(false)}
                                className="flex-1 py-2 rounded-xl bg-[#1e2a38] text-slate-300 text-xs font-bold cursor-pointer"
                              >
                                Отмена
                              </button>
                              <button
                                type="button"
                                onClick={handleTransferOwnership}
                                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold cursor-pointer shadow"
                              >
                                👑 Подтвердить передачу
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. УБРАТЬ ИЗ АДМИНОВ (СНЯТЬ ПРАВА АДМИНИСТРАТОРА) */}
                    {(editingMember.role === 'admin' || editingMember.role === 'owner') && (
                      <button
                        type="button"
                        onClick={handleRemoveFromAdmins}
                        className="w-full py-2.5 px-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <UserMinus className="w-4 h-4 text-rose-400" />
                        <span>Убрать из админов (Разжаловать в обычные подписчики)</span>
                      </button>
                    )}
                  </div>
                </>
              )}

                {/* 3. ЗАНЕСТИ В ЧЁРНЫЙ СПИСОК */}
                {editingMember.userId !== currentUser.id && (
                  <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-2">
                    {!showBanConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowBanConfirm(true)}
                        className="w-full py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Ban className="w-4 h-4" />
                        <span>Занести в чёрный список (Заблокировать)</span>
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-[11px] text-rose-200 font-semibold block">
                          Причина внесения в чёрный список:
                        </label>
                        <input
                          type="text"
                          value={banReasonInput}
                          onChange={(e) => setBanReasonInput(e.target.value)}
                          placeholder="Укажите причину блокировки..."
                          className="w-full bg-[#131c26] border border-rose-500/40 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowBanConfirm(false)}
                            className="flex-1 py-1.5 rounded-xl bg-[#1e2a38] text-slate-300 text-xs font-bold cursor-pointer"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={handleBanMember}
                            className="flex-1 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                          >
                            🚫 В чёрный список
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 1: OVERVIEW & CHANNEL POSTS ("видит свои посты, подписчиков") */}
          {/* ================================================================= */}
          {!editingMember && activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={chat.avatarUrl}
                      alt={chat.title}
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#5288c1]"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-base text-white">{chat.title}</h4>
                        <span className="px-2 py-0.5 rounded-md bg-[#5288c1]/20 text-[#64b5f6] text-[10px] font-bold">
                          {isChannel ? '📢 Канал' : '👥 Группа'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {chat.description || 'Официальный канал. Публикации, архитектура и новости.'}
                      </p>
                    </div>
                  </div>

                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => setIsEditingInfo(!isEditingInfo)}
                      className="p-2 rounded-xl bg-[#131c26] hover:bg-[#5288c1] text-slate-300 hover:text-white transition cursor-pointer shrink-0"
                      title="Редактировать описание и название"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Inline Editor for Channel Title, Avatar & Description */}
                {isEditingInfo && (
                  <div className="p-3 rounded-xl bg-[#131c26] border border-[#2b3c4f] space-y-2.5">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Название:</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-[#1e2a38] border border-[#283748] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Аватар / Иконка (своя фотка):</label>
                      <div className="flex items-center gap-2.5 bg-[#1e2a38] p-2 rounded-xl border border-[#283748]">
                        <img
                          src={editAvatarUrl || chat.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-[#5288c1] shrink-0"
                        />
                        <label className="px-3 py-1.5 rounded-lg bg-[#5288c1]/20 hover:bg-[#5288c1] text-[#64b5f6] hover:text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 border border-[#5288c1]/40">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Загрузить фото</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  if (ev.target?.result) {
                                    setEditAvatarUrl(ev.target.result as string);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Описание:</label>
                      <textarea
                        rows={2}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full bg-[#1e2a38] border border-[#283748] rounded-lg px-3 py-1.5 text-xs text-white outline-none resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsEditingInfo(false)}
                        className="px-3 py-1 rounded-lg bg-[#202b36] text-xs text-slate-300 cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={handleSaveChannelInfo}
                        className="px-3 py-1 rounded-lg bg-[#5288c1] text-xs font-bold text-white cursor-pointer"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#283748]">
                  <div
                    onClick={() => setActiveTab('members')}
                    className="p-2 rounded-xl bg-[#131c26] text-center cursor-pointer hover:border-[#5288c1] border border-transparent transition"
                  >
                    <div className="font-bold text-sm text-white">
                      {isChannel && !isOwnerOrAdmin ? 'Скрыто' : membersList.length}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {isChannel ? 'Подписчики' : 'Участники'}
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('admins')}
                    className="p-2 rounded-xl bg-[#131c26] text-center cursor-pointer hover:border-[#5288c1] border border-transparent transition"
                  >
                    <div className="font-bold text-sm text-amber-400">
                      {isChannel && !isOwnerOrAdmin ? 'Скрыто' : adminsList.length}
                    </div>
                    <div className="text-[10px] text-slate-400">Админы</div>
                  </div>

                  <div
                    onClick={() => setActiveTab('blacklist')}
                    className="p-2 rounded-xl bg-[#131c26] text-center cursor-pointer hover:border-rose-500 border border-transparent transition"
                  >
                    <div className="font-bold text-sm text-rose-400">
                      {isChannel && !isOwnerOrAdmin ? '—' : bannedList.length}
                    </div>
                    <div className="text-[10px] text-slate-400">Чёрный список</div>
                  </div>

                  <div className="p-2 rounded-xl bg-[#131c26] text-center">
                    <div className="font-bold text-sm text-emerald-400">{messages.length}</div>
                    <div className="text-[10px] text-slate-400">Постов</div>
                  </div>
                </div>

                {/* Invite Link */}
                <div className="p-2.5 bg-[#131c26] rounded-xl flex items-center justify-between border border-[#243344]">
                  <div className="flex items-center gap-2 truncate mr-2">
                    <Link2 className="w-4 h-4 text-[#64b5f6] shrink-0" />
                    <span className="text-xs font-mono text-[#64b5f6] truncate">
                      aurachat.app/join/{chat.inviteCode || 'channel_link'}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyInvite}
                    className="px-3 py-1 bg-[#5288c1] hover:bg-blue-500 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    {showInviteCopied ? 'Скопировано!' : 'Копировать'}
                  </button>
                </div>
              </div>

              {/* Channel Posts / Publications List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#64b5f6]" />
                    <span>Публикации и посты ({messages.length})</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {isOwnerOrAdmin ? 'Вы можете публиковать и управлять постами' : 'Режим чтения для подписчиков'}
                  </span>
                </div>

                {messages.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#1e2a38] border border-[#283748] text-center text-xs text-slate-400">
                    В этом канале пока нет опубликованных постов.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                    {messages.slice().reverse().map((msg) => (
                      <div
                        key={msg.id}
                        className="p-3 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-[#64b5f6]">{msg.senderName}</span>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-0.5">
                              <Eye className="w-3 h-3" /> 1.2K
                            </span>
                            <span>{msg.createdAt}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-200 line-clamp-2">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: SUBSCRIBERS / MEMBERS ("Если создать канал, то он видит    */}
          {/* своих подписчиков... А другие не могут. Нажимаешь на человека      */}
          {/* и назначаешь администратором")                                    */}
          {/* ================================================================= */}
          {!editingMember && activeTab === 'members' && (
            <div className="space-y-3">
              {isChannel && !isOwnerOrAdmin ? (
                  <div className="p-8 rounded-2xl bg-[#1e2a38] border border-[#283748] text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                      <Lock className="w-7 h-7" />
                    </div>
                    <h4 className="font-bold text-sm text-white">
                      Список подписчиков скрыт
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      В каналах видеть своих подписчиков, назначать администраторов и управлять чёрным списком может только <strong>Создатель (Владелец)</strong> канала. Для подписчиков этот список закрыт из соображений конфиденциальности.
                    </p>
                  </div>
              ) : (
                <>
                  <div className="p-3 rounded-2xl bg-[#131c26] border border-[#243344] text-xs text-slate-300 flex items-center justify-between">
                    <span>
                      💡 Нажмите на любого человека ниже, чтобы <strong>назначить администратором</strong>, выдать права, <strong>передать права владельца</strong> или занести в <strong>чёрный список</strong>.
                    </span>
                  </div>

                  {/* Search Subscribers */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Поиск подписчика по имени или @username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#1e2a38] border border-[#283748] rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-[#5288c1]"
                    />
                  </div>

                  {/* Subscribers List */}
                  <div className="space-y-2">
                    {filteredMembers.map((member) => (
                      <div
                        key={member.userId}
                        onClick={() => handleSelectMember(member)}
                        className="p-3 rounded-2xl bg-[#1e2a38] hover:bg-[#253447] border border-[#283748] hover:border-[#5288c1] transition flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={member.avatarUrl}
                            alt={member.displayName}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-white flex items-center gap-1.5 truncate">
                              <span className="truncate">{member.displayName}</span>
                              {member.role === 'owner' && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] shrink-0">
                                  👑 {member.customTitle || 'Создатель'}
                                </span>
                              )}
                              {member.role === 'admin' && (
                                <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] shrink-0">
                                  🛡️ {member.customTitle || 'Админ'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              @{member.username}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2.5 py-1 rounded-xl bg-[#131c26] group-hover:bg-[#5288c1] text-[10px] font-bold text-[#64b5f6] group-hover:text-white transition">
                            {member.role === 'member' ? 'Назначить админом →' : 'Права / Передать →'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Add New Subscribers to Channel/Group */}
                  {availableCandidates.length > 0 && (
                    <div className="pt-3 border-t border-[#243344] space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Пригласить / Добавить людей в {isChannel ? 'канал' : 'группу'}:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {availableCandidates.map((cand) => (
                          <div
                            key={cand.userId}
                            className="p-2.5 rounded-xl bg-[#131c26] border border-[#243344] flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={cand.avatarUrl}
                                alt={cand.displayName}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">{cand.displayName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">@{cand.username}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddSubscriber(cand)}
                              className="px-2.5 py-1 rounded-lg bg-[#5288c1] hover:bg-blue-500 text-white text-[10px] font-bold cursor-pointer shrink-0"
                            >
                              + Добавить
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: ADMINISTRATORS ("убрать из админов или передать права")     */}
          {/* ================================================================= */}
          {!editingMember && activeTab === 'admins' && (
            <div className="space-y-3">
              {isChannel && !isOwnerOrAdmin ? (
                <div className="p-8 rounded-2xl bg-[#1e2a38] border border-[#283748] text-center space-y-2">
                  <Lock className="w-8 h-8 text-rose-400 mx-auto" />
                  <h4 className="font-bold text-sm text-white">Управление администраторами закрыто</h4>
                  <p className="text-xs text-slate-400">
                    Только создатель и администраторы канала видят состав админов и их права.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-2xl bg-[#131c26] border border-[#243344] text-xs text-slate-300">
                    Нажмите на администратора, чтобы изменить его права, <strong>убрать из админов</strong> внизу или <strong>передать права владельца</strong>.
                  </div>

                  <div className="space-y-2">
                    {adminsList.map((adm) => {
                      const activePerms = adm.permissions
                        ? Object.values(adm.permissions).filter(Boolean).length
                        : 9;
                      return (
                        <div
                          key={adm.userId}
                          onClick={() => handleSelectMember(adm)}
                          className="p-3.5 rounded-2xl bg-[#1e2a38] hover:bg-[#253447] border border-[#283748] hover:border-[#5288c1] transition flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={adm.avatarUrl}
                              alt={adm.displayName}
                              className="w-11 h-11 rounded-full object-cover ring-2 ring-[#5288c1]/50"
                            />
                            <div>
                              <div className="font-bold text-xs text-white flex items-center gap-1.5">
                                <span>{adm.displayName}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    adm.role === 'owner'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  }`}
                                >
                                  {adm.role === 'owner'
                                    ? `👑 ${adm.customTitle || 'Владелец'}`
                                    : `🛡️ ${adm.customTitle || 'Админ'}`}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                @{adm.username} • Активно прав: {adm.role === 'owner' ? 'Все (Владелец)' : `${activePerms} из 9`}
                              </div>
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      );
                    })}
                  </div>

                  {/* Button to promote regular subscriber */}
                  <button
                    onClick={() => setActiveTab('members')}
                    className="w-full py-2.5 rounded-2xl bg-[#1e2a38] hover:bg-[#5288c1] border border-dashed border-[#5288c1] text-[#64b5f6] hover:text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Назначить нового администратора из подписчиков</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: BLACKLIST ("смотришь, кто занесён в чёрный список")        */}
          {/* ================================================================= */}
          {!editingMember && activeTab === 'blacklist' && (
            <div className="space-y-4">
              {isChannel && !isOwnerOrAdmin ? (
                <div className="p-8 rounded-2xl bg-[#1e2a38] border border-[#283748] text-center space-y-2">
                  <Lock className="w-8 h-8 text-rose-400 mx-auto" />
                  <h4 className="font-bold text-sm text-white">Чёрный список доступен только админам</h4>
                  <p className="text-xs text-slate-400">
                    Обычные подписчики не имеют доступа к списку заблокированных пользователей.
                  </p>
                </div>
              ) : (
                <>
                  {/* Add user to blacklist box */}
                  <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-2.5">
                    <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <Ban className="w-4 h-4" />
                      <span>Занести пользователя в чёрный список:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Имя или @username..."
                        value={manualBanUsername}
                        onChange={(e) => setManualBanUsername(e.target.value)}
                        className="bg-[#131c26] border border-[#2b3c4f] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                      />
                      <input
                        type="text"
                        placeholder="Причина (например: Спам)..."
                        value={manualBanReason}
                        onChange={(e) => setManualBanReason(e.target.value)}
                        className="bg-[#131c26] border border-[#2b3c4f] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                      />
                    </div>
                    <button
                      onClick={handleManualBan}
                      disabled={!manualBanUsername.trim()}
                      className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer"
                    >
                      🚫 Заблокировать и добавить в ЧС
                    </button>
                  </div>

                  {/* Current Blacklist */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-300">
                      Заблокированные пользователи ({bannedList.length}):
                    </div>

                    {bannedList.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-[#131c26] border border-[#243344] text-center text-xs text-slate-400">
                        Чёрный список пуст. Вы также можете нажать на любого подписчика во вкладке «Подписчики» и заблокировать его.
                      </div>
                    ) : (
                      bannedList.map((banned) => (
                        <div
                          key={banned.userId}
                          className="p-3 rounded-2xl bg-[#1e2a38] border border-rose-500/30 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={banned.avatarUrl}
                              alt={banned.displayName}
                              className="w-10 h-10 rounded-full object-cover grayscale shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-white truncate">
                                {banned.displayName}{' '}
                                <span className="text-slate-400 font-mono font-normal">@{banned.username}</span>
                              </div>
                              <div className="text-[10px] text-rose-300 truncate">
                                Причина: {banned.reason || 'Нарушение правил'}
                              </div>
                              <div className="text-[9px] text-slate-500">
                                Заблокировал(а): {banned.bannedBy} • {banned.bannedAt}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleUnbanMember(banned, true)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold shrink-0 cursor-pointer"
                          >
                            Разблокировать
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: EXTRA CHANNEL SETTINGS & ADMIN ACTION LOG                  */}
          {/* ("Что там можно сделать ещё?")                                    */}
          {/* ================================================================= */}
          {!editingMember && activeTab === 'settings' && (
            <div className="space-y-4">
              {/* Channel Extra Toggles */}
              <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="text-xs font-bold text-[#64b5f6] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Дополнительные возможности {isChannel ? 'канала' : 'группы'}:</span>
                </div>

                {/* Toggle 1: Sign messages */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#131c26] border border-[#243344] cursor-pointer">
                  <div className="pr-2">
                    <div className="text-xs font-bold text-white">Подписывать публикации (Sign Messages)</div>
                    <div className="text-[10px] text-slate-400">
                      Показывать имя и должность администратора под каждым постом
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!chat.signMessages}
                    onChange={(e) =>
                      onUpdateChat({
                        ...chat,
                        signMessages: e.target.checked,
                        adminLog: appendLog(
                          `${e.target.checked ? 'включил(а)' : 'выключил(а)'} подписи авторов под постами`
                        )
                      })
                    }
                    className="w-4 h-4 accent-[#5288c1] cursor-pointer shrink-0"
                  />
                </label>

                {/* Toggle 2: Allow reactions */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#131c26] border border-[#243344] cursor-pointer">
                  <div className="pr-2">
                    <div className="text-xs font-bold text-white">Эмодзи-реакции на посты</div>
                    <div className="text-[10px] text-slate-400">
                      Разрешить подписчикам оставлять быстрые реакции (❤️, 🔥, 👍)
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={chat.allowReactions !== false}
                    onChange={(e) =>
                      onUpdateChat({
                        ...chat,
                        allowReactions: e.target.checked,
                        adminLog: appendLog(
                          `${e.target.checked ? 'разрешил(а)' : 'отключил(а)'} реакции на публикации`
                        )
                      })
                    }
                    className="w-4 h-4 accent-[#5288c1] cursor-pointer shrink-0"
                  />
                </label>

                {/* Toggle 3: Private / Public */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#131c26] border border-[#243344] cursor-pointer">
                  <div className="pr-2">
                    <div className="text-xs font-bold text-white">
                      Приватный режим (только по приглашению)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Скрыть из глобального поиска и пускать только по ссылке/QR
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={chat.isPrivate}
                    onChange={(e) =>
                      onUpdateChat({
                        ...chat,
                        isPrivate: e.target.checked,
                        adminLog: appendLog(
                          `изменил(а) тип на ${e.target.checked ? 'Приватный' : 'Публичный'}`
                        )
                      })
                    }
                    className="w-4 h-4 accent-[#5288c1] cursor-pointer shrink-0"
                  />
                </label>

                {/* Toggle 4: Join Approval */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#131c26] border border-[#243344] cursor-pointer">
                  <div className="pr-2">
                    <div className="text-xs font-bold text-white">Вступление по заявкам (Approve New Members)</div>
                    <div className="text-[10px] text-slate-400">
                      Новые подписчики должны быть одобрены создателем или админом
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!chat.requiresApproval}
                    onChange={(e) =>
                      onUpdateChat({
                        ...chat,
                        requiresApproval: e.target.checked,
                        adminLog: appendLog(
                          `${e.target.checked ? 'включил(а)' : 'отключил(а)'} обязательные заявки на вступление`
                        )
                      })
                    }
                    className="w-4 h-4 accent-[#5288c1] cursor-pointer shrink-0"
                  />
                </label>
              </div>

              {/* Recent Admin Actions Log */}
              <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-2.5">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <History className="w-4 h-4 text-amber-400" />
                  <span>Журнал недавних действий администраторов:</span>
                </div>

                {adminLogs.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#131c26] text-center text-xs text-slate-400">
                    Все назначения админов, передачи прав и блокировки в ЧС фиксируются здесь.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                    {adminLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-[#131c26] border border-[#243344] text-[11px] flex items-center justify-between gap-2"
                      >
                        <div className="text-slate-200">
                          <strong className="text-[#64b5f6]">{log.actorName}</strong> {log.action}
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">{log.timestamp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
