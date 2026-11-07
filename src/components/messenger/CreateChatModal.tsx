import React, { useState } from 'react';
import { Chat, ChatMember, User, Community, CommunityModerator } from '../../types';
import { 
  X, 
  Users, 
  Radio, 
  Lock, 
  Globe, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  UserPlus, 
  ArrowLeft,
  ArrowRight,
  Search,
  MessageSquare,
  Shield,
  Layers,
  Upload,
  Camera
} from 'lucide-react';
import { playSentSound } from '../../utils/audioUtils';

interface CreateChatModalProps {
  isOpen: boolean;
  currentUser: User;
  defaultType?: 'group' | 'channel' | 'direct' | 'community';
  chats?: Chat[];
  onClose: () => void;
  onCreateChat: (newChat: Chat) => void;
  onCreateCommunity?: (newCommunity: Community) => void;
}

const sampleContacts = [
  {
    userId: 'usr_durov',
    displayName: 'Павел Дуров',
    username: 'durov',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533'
  },
  {
    userId: 'usr_elena',
    displayName: 'Елена (Дизайн)',
    username: 'elena_ux',
    avatarUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95'
  },
  {
    userId: 'usr_mark',
    displayName: 'Марк (Архитектор)',
    username: 'mark_arch',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b'
  },
  {
    userId: 'usr_alex',
    displayName: 'Алексей (DevOps)',
    username: 'alex_ops',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b'
  }
];

const sampleAvatars = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=CoreEngineering&backgroundColor=0284c7',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80'
];

export const CreateChatModal: React.FC<CreateChatModalProps> = ({
  isOpen,
  currentUser,
  defaultType = 'channel',
  chats = [],
  onClose,
  onCreateChat,
  onCreateCommunity
}) => {
  const [chatType, setChatType] = useState<'group' | 'channel' | 'direct' | 'community'>(defaultType);
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Select People, Step 2: Title, Type & Join Request
  
  const [peopleSearch, setPeopleSearch] = useState('');
  const [title, setTitle] = useState('');
  const [commDescription, setCommDescription] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(sampleAvatars[0]);
  const [isPrivate, setIsPrivate] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(true);

  // Bound channel and group for community
  const [attachedChannelId, setAttachedChannelId] = useState<string>('');
  const [attachedGroupId, setAttachedGroupId] = useState<string>('');

  // Selected members for Group / Channel / Community Mods
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([sampleContacts[0].userId]);
  const [moderatorIds, setModeratorIds] = useState<string[]>([]);

  const handleCustomPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const toggleMember = (uid: string) => {
    if (selectedUserIds.includes(uid)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== uid));
      setModeratorIds(moderatorIds.filter((id) => id !== uid));
    } else {
      setSelectedUserIds([...selectedUserIds, uid]);
    }
  };

  const toggleModerator = (uid: string) => {
    if (moderatorIds.includes(uid)) {
      setModeratorIds(moderatorIds.filter((id) => id !== uid));
    } else {
      setModeratorIds([...moderatorIds, uid]);
      if (!selectedUserIds.includes(uid)) {
        setSelectedUserIds([...selectedUserIds, uid]);
      }
    }
  };

  const filteredPeople = sampleContacts.filter(
    (c) =>
      c.displayName.toLowerCase().includes(peopleSearch.toLowerCase()) ||
      c.username.toLowerCase().includes(peopleSearch.toLowerCase())
  );

  const handleStartDirectDialog = (contact: typeof sampleContacts[0]) => {
    const newDirectChat: Chat = {
      id: 'chat_direct_' + Date.now(),
      type: 'direct',
      title: contact.displayName,
      avatarUrl: contact.avatarUrl,
      isPrivate: false,
      membersCount: 2,
      members: [
        {
          userId: currentUser.id,
          displayName: currentUser.displayName,
          username: currentUser.username,
          avatarUrl: currentUser.avatarUrl,
          role: 'member'
        },
        {
          userId: contact.userId,
          displayName: contact.displayName,
          username: contact.username,
          avatarUrl: contact.avatarUrl,
          role: 'member'
        }
      ],
      lastMessage: 'Личный диалог начат.',
      lastMessageTime: 'Только что',
      unreadCount: 0
    };
    playSentSound();
    onCreateChat(newDirectChat);
    onClose();
  };

  const handleCreateChannelOrGroup = () => {
    if (!title.trim()) return;

    const code = Math.random().toString(36).substring(2, 9);
    const members: ChatMember[] = [
      {
        userId: currentUser.id,
        displayName: currentUser.displayName,
        username: currentUser.username,
        avatarUrl: currentUser.avatarUrl,
        role: 'owner',
        customTitle: 'Создатель'
      }
    ];

    selectedUserIds.forEach((uid) => {
      const contact = sampleContacts.find((c) => c.userId === uid);
      if (contact) {
        const isMod = moderatorIds.includes(uid);
        members.push({
          userId: contact.userId,
          displayName: contact.displayName,
          username: contact.username,
          avatarUrl: contact.avatarUrl,
          role: isMod ? 'admin' : 'member',
          customTitle: isMod ? 'Модератор' : undefined
        });
      }
    });

    const newChat: Chat = {
      id: 'chat_' + Date.now(),
      type: chatType,
      title: title.trim(),
      avatarUrl: selectedAvatar,
      isPrivate: isPrivate,
      inviteCode: code,
      requiresApproval: isPrivate && requiresApproval,
      membersCount: members.length,
      members: members,
      topics: [
        {
          id: 'top_main',
          chatId: 'chat_' + Date.now(),
          title: chatType === 'group' ? 'Общий топик' : 'Все публикации',
          icon: chatType === 'group' ? '💬' : '📢'
        }
      ],
      lastMessage: isPrivate && requiresApproval
        ? `Создан ${chatType === 'channel' ? 'приватный канал' : 'приватная группа'} с заявками на вступление.`
        : `Создан новый ${chatType === 'channel' ? 'канал' : 'чат'}.`,
      lastMessageTime: 'Только что',
      unreadCount: 0,
      joinRequests: [],
      updatedAt: Date.now()
    };

    playSentSound();
    onCreateChat(newChat);
    onClose();
  };

  const handleCreateCommunitySubmit = () => {
    if (!title.trim()) return;

    const code = Math.random().toString(36).substring(2, 9);
    const selectedChannel = chats.find((c) => c.id === attachedChannelId);
    const selectedGroup = chats.find((c) => c.id === attachedGroupId);

    const moderators: CommunityModerator[] = [];

    moderatorIds.forEach((uid) => {
      const contact = sampleContacts.find((c) => c.userId === uid);
      if (contact) {
        moderators.push({
          userId: contact.userId,
          displayName: contact.displayName,
          username: contact.username,
          avatarUrl: contact.avatarUrl,
          role: 'moderator',
          customTitle: 'Модератор',
          addedAt: 'Сегодня'
        });
      }
    });

    // Сообщество создается ровно с 1 подписчиком (только владелец)
    const subscribersUserIds = [currentUser.id];

    const newCommunity: Community = {
      id: 'comm_' + Date.now(),
      title: title.trim(),
      description: commDescription.trim() || 'Сообщество участников и подписчиков',
      avatarUrl: selectedAvatar,
      bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      ownerId: currentUser.id,
      ownerName: currentUser.displayName,
      ownerAvatar: currentUser.avatarUrl,
      isPrivate: isPrivate,
      inviteCode: code,
      subscribersCount: 1, // Ровно 1 подписчик (Владелец)
      subscribersUserIds: subscribersUserIds,
      attachedChannelId: selectedChannel?.id,
      attachedChannelTitle: selectedChannel ? `${selectedChannel.title} (📢 Канал)` : undefined,
      attachedGroupId: selectedGroup?.id,
      attachedGroupTitle: selectedGroup ? `${selectedGroup.title} (👥 Группа)` : undefined,
      moderators: moderators,
      postsCount: 0,
      createdAt: 'Только что'
    };

    playSentSound();
    if (onCreateCommunity) {
      onCreateCommunity(newCommunity);
    }
    onClose();
  };

  const channelChats = chats.filter((c) => c.type === 'channel');
  const groupChats = chats.filter((c) => c.type === 'group');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 select-none animate-in fade-in">
      <div className="bg-[#17212b] border border-[#243344] rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 text-white shadow-2xl relative scrollbar-thin">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-[#202b36] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. ВЫБОР ТИПА: Канал, Группа, Диалог, Сообщество */}
        <div className="mb-5">
          <div className="text-xs text-[#5288c1] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>Выберите формат общения</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => {
                setChatType('channel');
                setStep(1);
              }}
              className={`p-2.5 rounded-2xl border text-left transition flex flex-col items-center sm:items-start text-center sm:text-left gap-1 cursor-pointer ${
                chatType === 'channel'
                  ? 'bg-[#2b5278] border-[#5288c1] shadow'
                  : 'bg-[#1e2a38] border-[#283748] text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <div className="font-bold text-xs text-white">Канал</div>
                <div className="text-[9px] text-slate-300 hidden sm:block">Вещание</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setChatType('group');
                setStep(1);
              }}
              className={`p-2.5 rounded-2xl border text-left transition flex flex-col items-center sm:items-start text-center sm:text-left gap-1 cursor-pointer ${
                chatType === 'group'
                  ? 'bg-[#2b5278] border-[#5288c1] shadow'
                  : 'bg-[#1e2a38] border-[#283748] text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="font-bold text-xs text-white">Группа</div>
                <div className="text-[9px] text-slate-300 hidden sm:block">Общение</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChatType('direct')}
              className={`p-2.5 rounded-2xl border text-left transition flex flex-col items-center sm:items-start text-center sm:text-left gap-1 cursor-pointer ${
                chatType === 'direct'
                  ? 'bg-[#2b5278] border-[#5288c1] shadow'
                  : 'bg-[#1e2a38] border-[#283748] text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="font-bold text-xs text-white">Диалог</div>
                <div className="text-[9px] text-slate-300 hidden sm:block">Поиск</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setChatType('community')}
              className={`p-2.5 rounded-2xl border text-left transition flex flex-col items-center sm:items-start text-center sm:text-left gap-1 cursor-pointer ${
                chatType === 'community'
                  ? 'bg-[#2b5278] border-[#5288c1] shadow'
                  : 'bg-[#1e2a38] border-[#283748] text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <div className="font-bold text-xs text-white">Сообщество</div>
                <div className="text-[9px] text-slate-300 hidden sm:block">Хаб и посты</div>
              </div>
            </button>
          </div>
        </div>

        {/* ============================================================================ */}
        {/* ВАРИАНТ А: ДИАЛОГ (ЛИЧНЫЕ СООБЩЕНИЯ) -> "А диалог - просто поиск и всё"        */}
        {/* ============================================================================ */}
        {chatType === 'direct' && (
          <div className="space-y-4">
            <div className="bg-[#1e2a38] border border-[#283748] rounded-2xl p-3">
              <h4 className="font-bold text-sm text-white mb-1 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Диалог — просто поиск и всё</span>
              </h4>
              <p className="text-xs text-slate-400">
                Введите имя или логин человека, чтобы сразу открыть персональный диалог.
              </p>
            </div>

            {/* Search Input for Direct Dialogue */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск людей по имени или @username..."
                value={peopleSearch}
                onChange={(e) => setPeopleSearch(e.target.value)}
                className="w-full bg-[#242f3d] text-white text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none placeholder-slate-400 border border-transparent focus:border-[#5288c1] transition"
              />
            </div>

            {/* Contact List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
              {filteredPeople.map((contact) => (
                <div
                  key={contact.userId}
                  onClick={() => handleStartDirectDialog(contact)}
                  className="p-3 rounded-2xl bg-[#1e2a38] hover:bg-[#253547] border border-[#283748] transition flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={contact.avatarUrl}
                      alt={contact.displayName}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-600"
                    />
                    <div>
                      <div className="font-bold text-xs text-white group-hover:text-blue-300 transition">
                        {contact.displayName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        @{contact.username}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-[#5288c1] bg-[#243344] px-3 py-1.5 rounded-xl group-hover:bg-[#5288c1] group-hover:text-white transition">
                    Написать →
                  </span>
                </div>
              ))}

              {filteredPeople.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs bg-[#1e2a38] rounded-2xl border border-[#283748]">
                  Человек не найден. Попробуйте другой запрос.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================================ */}
        {/* ВАРИАНТ Б: КАНАЛ ИЛИ ГРУППА ПО ИНСТРУКЦИИ ИЗ 3 ШАГОВ                           */}
        {/* 1. Сначала "Создать канал" / "Создать группу"                               */}
        {/* 2. Выбираем людей, с которыми хотим поговорить или обсудить (в поиске)     */}
        {/* 3. Выбираем название, тип чата и заявку                                    */}
        {/* ============================================================================ */}
        {(chatType === 'channel' || chatType === 'group') && (
          <div>
            {/* ШАГ 1: ВЫБОР ЛЮДЕЙ И УЧАСТНИКОВ В ПОИСКЕ */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="bg-[#1e2a38] border border-[#283748] rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-[#64b5f6]" />
                      <span>Шаг 1: Выберите людей в поиске</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Отметьте собеседников, с которыми хотите поговорить или обсудить
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-[#5288c1]/20 text-[#64b5f6] border border-[#5288c1]/40 px-2.5 py-1 rounded-lg">
                    Выбрано: {selectedUserIds.length}
                  </span>
                </div>

                {/* Поиск людей */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Поиск людей по имени или @username..."
                    value={peopleSearch}
                    onChange={(e) => setPeopleSearch(e.target.value)}
                    className="w-full bg-[#242f3d] text-white text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none placeholder-slate-400 border border-transparent focus:border-[#5288c1] transition"
                  />
                </div>

                {/* Список людей с галочками */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                  {filteredPeople.map((contact) => {
                    const isSelected = selectedUserIds.includes(contact.userId);
                    const isModerator = moderatorIds.includes(contact.userId);

                    return (
                      <div
                        key={contact.userId}
                        className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                          isSelected ? 'bg-[#243344] border-[#5288c1]' : 'bg-[#1e2a38] border-[#283748]'
                        }`}
                      >
                        <div
                          onClick={() => toggleMember(contact.userId)}
                          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                        >
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
                            isSelected ? 'bg-[#5288c1] border-[#5288c1] text-white' : 'border-slate-500'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>

                          <img
                            src={contact.avatarUrl}
                            alt={contact.displayName}
                            className="w-9 h-9 rounded-full object-cover"
                          />

                          <div className="min-w-0">
                            <div className="font-bold text-xs text-white truncate">
                              {contact.displayName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              @{contact.username}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <button
                            type="button"
                            onClick={() => toggleModerator(contact.userId)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                              isModerator
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                : 'bg-[#242f3d] text-slate-400 hover:text-white border border-[#283748]'
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            <span>{isModerator ? 'Модератор' : 'Модер'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Кнопка перехода ко 2 шагу */}
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-3 bg-[#5288c1] hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <span>Далее: Название, тип чата и заявка</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ШАГ 2: НАЗВАНИЕ, ТИП ЧАТА И ЗАЯВКА НА ВСТУПЛЕНИЕ */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="bg-[#1e2a38] border border-[#283748] rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Шаг 2: Название, тип и заявка</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Настройте название, параметры приватности и модерацию заявок
                    </p>
                  </div>

                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-[#5288c1] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Назад</span>
                  </button>
                </div>

                {/* 1. Название */}
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Название {chatType === 'channel' ? 'канала' : 'группы'}:
                  </label>
                  <input
                    type="text"
                    placeholder={chatType === 'channel' ? 'Например: Официальные Анонсы' : 'Например: Рабочее Обсуждение'}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                    className="w-full bg-[#242f3d] text-white text-xs rounded-xl px-4 py-2.5 outline-none placeholder-slate-400 border border-transparent focus:border-[#5288c1] transition font-medium"
                  />
                </div>

                {/* 2. Аватар */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] text-slate-300 font-semibold">
                      Выберите аватар или загрузите свою фотку:
                    </label>
                    <label className="text-[10px] text-[#64b5f6] font-bold hover:underline cursor-pointer flex items-center gap-1 bg-[#5288c1]/20 px-2.5 py-1 rounded-lg border border-[#5288c1]/40 hover:bg-[#5288c1]/30 transition">
                      <Upload className="w-3.5 h-3.5 text-[#64b5f6]" />
                      <span>Загрузить фото</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCustomPhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-none">
                    {/* Uploaded custom avatar preview */}
                    {selectedAvatar && !sampleAvatars.includes(selectedAvatar) && (
                      <div className="relative shrink-0">
                        <img
                          src={selectedAvatar}
                          alt="Своя фотка"
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-400 scale-105 shadow-md"
                        />
                        <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-[8px] text-white px-1 font-bold rounded-full">
                          Свое
                        </span>
                      </div>
                    )}

                    {sampleAvatars.map((av, idx) => (
                      <img
                        key={idx}
                        src={av}
                        alt=""
                        onClick={() => setSelectedAvatar(av)}
                        className={`w-11 h-11 rounded-full object-cover cursor-pointer transition ring-2 shrink-0 ${
                          selectedAvatar === av ? 'ring-[#5288c1] scale-105' : 'ring-transparent opacity-60 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* 3. Тип чата (Публичный / Приватный) */}
                <div className="bg-[#1e2a38] border border-[#283748] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        {isPrivate ? <Lock className="w-4 h-4 text-amber-400" /> : <Globe className="w-4 h-4 text-emerald-400" />}
                        <span>Тип чата: {isPrivate ? 'Приватный (по ссылке / QR)' : 'Публичный'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {isPrivate
                          ? 'Доступен только по специальному приглашению'
                          : 'Доступен всем пользователям через глобальный поиск'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPrivate(!isPrivate)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                        isPrivate
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {isPrivate ? 'Приватный' : 'Публичный'}
                    </button>
                  </div>

                  {/* 4. Заявка на вступление */}
                  {isPrivate && (
                    <div className="pt-3 border-t border-[#2b3c4f] flex items-center justify-between">
                      <div className="pr-2">
                        <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-[#64b5f6]" />
                          <span>Заявка на вступление (Approval)</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Пользователь подает заявку, а владелец или модератор одобряет
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={requiresApproval}
                        onChange={(e) => setRequiresApproval(e.target.checked)}
                        className="w-5 h-5 accent-[#5288c1] cursor-pointer shrink-0"
                      />
                    </div>
                  )}
                </div>

                {/* Кнопки Назад и Создать */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="py-3 px-4 bg-[#242f3d] hover:bg-[#2c3a4b] text-slate-300 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Назад к людям</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateChannelOrGroup}
                    disabled={!title.trim()}
                    className="flex-1 py-3 bg-[#5288c1] hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Создать {chatType === 'channel' ? 'канал' : 'группу'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================================ */}
        {/* ВАРИАНТ В: СООБЩЕСТВО (COMMUNITY) - ХАБ ПОСТОВ, КАНАЛА И ГРУППЫ              */}
        {/* ============================================================================ */}
        {chatType === 'community' && (
          <div className="space-y-4">
            <div className="bg-[#1e2a38] border border-[#283748] rounded-2xl p-3">
              <h4 className="font-bold text-sm text-white mb-1 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Создать новое Сообщество</span>
              </h4>
              <p className="text-xs text-slate-400">
                Объединяйте канал анонсов, чат обсуждений, публикации и подписчиков в единый хаб.
              </p>
            </div>

            {/* 1. Название и Описание */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  Название сообщества:
                </label>
                <input
                  type="text"
                  placeholder="Например: Frontend & AI Studio Hub"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#242f3d] text-white text-xs rounded-xl px-4 py-2.5 outline-none placeholder-slate-400 border border-transparent focus:border-[#5288c1] transition font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  Описание сообщества:
                </label>
                <textarea
                  placeholder="Расскажите о вашей группе, целях и темах..."
                  value={commDescription}
                  onChange={(e) => setCommDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-[#242f3d] text-white text-xs rounded-xl px-4 py-2.5 outline-none placeholder-slate-400 border border-transparent focus:border-[#5288c1] transition font-medium resize-none"
                />
              </div>
            </div>

            {/* 2. Аватар */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] text-slate-300 font-bold">
                  Иконка сообщества (своя фотка или готовый вариант):
                </label>
                <label className="text-[10px] text-cyan-300 font-bold hover:underline cursor-pointer flex items-center gap-1 bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/40 hover:bg-cyan-500/30 transition">
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Загрузить фото</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomPhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-none">
                {selectedAvatar && !sampleAvatars.includes(selectedAvatar) && (
                  <div className="relative shrink-0">
                    <img
                      src={selectedAvatar}
                      alt="Своя фотка"
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-cyan-400 scale-105 shadow-md"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-cyan-500 text-[8px] text-white px-1 font-bold rounded-full">
                      Свое
                    </span>
                  </div>
                )}

                {sampleAvatars.map((av, idx) => (
                  <img
                    key={idx}
                    src={av}
                    alt=""
                    onClick={() => setSelectedAvatar(av)}
                    className={`w-10 h-10 rounded-xl object-cover cursor-pointer transition ring-2 shrink-0 ${
                      selectedAvatar === av ? 'ring-cyan-400 scale-105' : 'ring-transparent opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 3. Привязать Канал и Группу */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#1e2a38] border border-[#283748] rounded-2xl p-3">
              <div>
                <label className="text-[10px] text-cyan-300 font-bold block mb-1">📢 Привязать Канал:</label>
                <select
                  value={attachedChannelId}
                  onChange={(e) => setAttachedChannelId(e.target.value)}
                  className="w-full bg-[#242f3d] text-xs text-white p-2 rounded-xl border border-[#283748] outline-none"
                >
                  <option value="">Без канала</option>
                  {channelChats.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-amber-300 font-bold block mb-1">👥 Привязать Группу:</label>
                <select
                  value={attachedGroupId}
                  onChange={(e) => setAttachedGroupId(e.target.value)}
                  className="w-full bg-[#242f3d] text-xs text-white p-2 rounded-xl border border-[#283748] outline-none"
                >
                  <option value="">Без группы</option>
                  {groupChats.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Публичное / Приватное */}
            <div className="bg-[#1e2a38] border border-[#283748] rounded-2xl p-3 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-white flex items-center gap-1.5">
                  {isPrivate ? <Lock className="w-4 h-4 text-amber-400" /> : <Globe className="w-4 h-4 text-emerald-400" />}
                  <span>{isPrivate ? 'Приватное сообщество (только по ссылке)' : 'Публичное (в поиске и по ссылке)'}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isPrivate ? 'Доступ по коду/ссылке с кнопкой Подписаться' : 'Каждый сможет найти и подписаться'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  isPrivate
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {isPrivate ? 'Приватное' : 'Публичное'}
              </button>
            </div>

            {/* 5. Подключить Модераторов (вручную) */}
            <div className="bg-[#1e2a38] border border-[#283748] rounded-2xl p-3 space-y-2">
              <div className="font-bold text-xs text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Подключить модераторов (вручную):</span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                {sampleContacts.map((contact) => {
                  const isMod = moderatorIds.includes(contact.userId);

                  return (
                    <div
                      key={contact.userId}
                      onClick={() => toggleModerator(contact.userId)}
                      className={`p-2 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                        isMod ? 'bg-[#243344] border-amber-500/40' : 'bg-[#17212b] border-[#283748]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img src={contact.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <div className="text-xs font-bold text-white">{contact.displayName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">@{contact.username}</div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                        isMod ? 'bg-amber-500/20 text-amber-300' : 'bg-[#202b36] text-slate-400'
                      }`}>
                        <Shield className="w-3 h-3" />
                        <span>{isMod ? 'Модератор ✓' : '+ Модер'}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Кнопка Создать сообщество */}
            <button
              type="button"
              onClick={handleCreateCommunitySubmit}
              disabled={!title.trim()}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Check className="w-4 h-4" />
              <span>Создать Сообщество</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

