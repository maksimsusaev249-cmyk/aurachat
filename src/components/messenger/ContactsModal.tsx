import React, { useState } from 'react';
import { User } from '../../types';
import { 
  X, 
  Search, 
  UserPlus, 
  Phone, 
  Video,
  MessageSquare, 
  ShieldCheck, 
  User as UserIcon,
  ChevronLeft
} from 'lucide-react';
import { playSentSound } from '../../utils/audioUtils';
import { matchPhoneNumber, matchUserText } from '../../utils/searchUtils';

export interface ContactItem {
  userId: string;
  displayName: string;
  username: string;
  phone: string;
  avatarUrl: string;
  isOnline: boolean;
  statusText: string;
}

export const initialContactsList: ContactItem[] = [
  {
    userId: 'usr_durov',
    displayName: 'Павел Дуров',
    username: 'durov',
    phone: '+971 50 123 4567',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
    isOnline: false,
    statusText: 'был(а) 3 мин назад'
  },
  {
    userId: 'usr_elena',
    displayName: 'Елена (Дизайн)',
    username: 'elena_ux',
    phone: '+7 (916) 555-01-23',
    avatarUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95',
    isOnline: true,
    statusText: 'в сети'
  },
  {
    userId: 'usr_mark',
    displayName: 'Марк (Архитектор)',
    username: 'mark_arch',
    phone: '+7 (903) 777-88-99',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b',
    isOnline: false,
    statusText: 'был(а) 15 минут назад'
  },
  {
    userId: 'usr_alex',
    displayName: 'Алексей (DevOps)',
    username: 'alex_ops',
    phone: '+7 (926) 333-22-11',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b',
    isOnline: false,
    statusText: 'был(а) 2 часа назад'
  },
  {
    userId: 'usr_sofia',
    displayName: 'София (Community)',
    username: 'sofia_live',
    phone: '+7 (999) 111-22-33',
    avatarUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=SofiaAnime&backgroundColor=312e81',
    isOnline: false,
    statusText: 'был(а) 45 минут назад'
  }
];

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDirectChat: (contact: ContactItem) => void;
  onStartCall: (contact: ContactItem, isVideo?: boolean) => void;
  savedAccounts?: User[];
  currentUserId?: string;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  isOpen,
  onClose,
  onStartDirectChat,
  onStartCall,
  savedAccounts = [],
  currentUserId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'online'>('all');
  const [contacts, setContacts] = useState<ContactItem[]>(() => {
    try {
      const saved = localStorage.getItem('aurachat_custom_contacts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialContactsList;
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const allMergedContacts = React.useMemo(() => {
    const map = new Map<string, ContactItem>();
    contacts.forEach((c) => {
      if (currentUserId && c.userId === currentUserId) return;
      map.set(c.username.toLowerCase(), c);
    });
    savedAccounts.forEach((acc) => {
      if (currentUserId && acc.id === currentUserId) return;
      const key = acc.username.toLowerCase();
      const accIsOnline = acc.hideOnlineStatus
        ? false
        : Boolean(acc.isOnline && (acc.lastSeen || 'в сети') === 'в сети');
      const accStatusText = acc.hideOnlineStatus
        ? 'был(а) в сети недавно'
        : acc.lastSeen || (acc.isOnline ? 'в сети' : 'был(а) в сети недавно');
      map.set(key, {
        userId: acc.id,
        displayName: acc.displayName,
        username: acc.username,
        phone: acc.phone || acc.email || 'Пользователь AuraChat',
        avatarUrl: acc.avatarUrl,
        isOnline: accIsOnline,
        statusText: accStatusText
      });
    });
    return Array.from(map.values());
  }, [contacts, savedAccounts, currentUserId]);

  if (!isOpen) return null;

  const onlineCount = allMergedContacts.filter((c) => c.isOnline).length;

  const filteredContacts = allMergedContacts.filter((c) => {
    if (filterTab === 'online' && !c.isOnline) return false;
    const q = searchQuery.trim();
    if (!q) return true;
    return (
      matchUserText(c.displayName, q) ||
      matchUserText(c.username, q) ||
      matchPhoneNumber(c.phone, q)
    );
  });

  const handleAddNewContact = () => {
    if (!newName.trim()) return;
    playSentSound();
    const newContact: ContactItem = {
      userId: 'usr_' + Date.now(),
      displayName: newName.trim(),
      username: newName.toLowerCase().replace(/\s+/g, '_'),
      phone: newPhone.trim() || '+7 (999) 000-00-00',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(newName.trim()) + '&backgroundColor=1f2937',
      isOnline: true,
      statusText: 'только что добавлен'
    };
    const nextContacts = [newContact, ...contacts];
    setContacts(nextContacts);
    try {
      localStorage.setItem('aurachat_custom_contacts', JSON.stringify(nextContacts));
    } catch {}
    setNewName('');
    setNewPhone('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full h-full bg-[#0e1621] text-white select-none animate-in fade-in duration-150">
      <div className="w-full max-w-4xl mx-auto h-full flex flex-col bg-[#17212b] sm:border-x border-[#243344] shadow-2xl overflow-hidden">
        
        {/* Sticky Header */}
        <div className="px-3 sm:px-5 py-3.5 bg-[#17212b] border-b border-[#0e1621] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onClose}
              className="p-2 -ml-1 rounded-full text-slate-300 hover:text-white hover:bg-[#202b36] transition cursor-pointer flex items-center justify-center"
              title="Назад"
            >
              <ChevronLeft className="w-5 h-5 sm:hidden" />
              <UserIcon className="w-5 h-5 hidden sm:block text-[#64b5f6]" />
            </button>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-white truncate">Контакты</h3>
              <p className="text-[11px] text-slate-400 truncate">
                {allMergedContacts.length} контактов • {onlineCount} в сети
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 rounded-xl bg-[#5288c1] hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>{showAddForm ? 'Отмена' : 'Добавить'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-[#202b36] transition cursor-pointer"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 sm:px-5 bg-[#131c26] border-b border-[#0e1621] space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по имени, @username или телефону..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#242f3d] text-white text-xs sm:text-sm rounded-xl pl-10 pr-9 py-2.5 outline-none placeholder-slate-400 border border-transparent focus:border-[#5288c1] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'all'
                  ? 'bg-[#5288c1] text-white shadow-sm'
                  : 'bg-[#1c2733] text-slate-300 hover:text-white'
              }`}
            >
              <span>Все контакты</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[11px]">{allMergedContacts.length}</span>
            </button>

            <button
              onClick={() => setFilterTab('online')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'online'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[#1c2733] text-slate-300 hover:text-emerald-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>В сети</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[11px]">{onlineCount}</span>
            </button>
          </div>

          {/* Inline Add Contact Form */}
          {showAddForm && (
            <div className="p-3.5 bg-[#1e2a38] rounded-2xl border border-[#2b3c4f] space-y-2.5 animate-in fade-in">
              <div className="text-xs font-bold text-white">Новый контакт</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Имя и фамилия"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#17212b] rounded-xl px-3.5 py-2 text-xs text-white outline-none border border-[#2b3c4f] focus:border-[#5288c1]"
                />
                <input
                  type="tel"
                  placeholder="Номер телефона (+7 ...)"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-[#17212b] rounded-xl px-3.5 py-2 text-xs text-white outline-none border border-[#2b3c4f] focus:border-[#5288c1]"
                />
              </div>
              <button
                onClick={handleAddNewContact}
                disabled={!newName.trim()}
                className="w-full py-2 bg-[#5288c1] hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
              >
                Сохранить в контакты
              </button>
            </div>
          )}
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-1.5 scrollbar-none">
          {filteredContacts.map((contact) => (
            <div
              key={contact.userId}
              onClick={() => {
                onStartDirectChat(contact);
                onClose();
              }}
              className="p-2.5 sm:p-3.5 rounded-2xl bg-[#1b2633]/70 border border-[#243344]/80 hover:bg-[#202b36] hover:border-[#30445a] transition flex items-center justify-between gap-2 flex-nowrap group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <img
                    src={contact.avatarUrl}
                    alt={contact.displayName}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-[#283748] group-hover:ring-[#5288c1] transition"
                  />
                  {contact.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#17212b]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[13px] sm:text-[15px] text-white truncate flex items-center gap-1">
                    <span className="truncate">{contact.displayName}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#64b5f6] shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 truncate mt-0.5">
                    <span className="font-mono truncate">@{contact.username}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="font-mono hidden sm:inline">{contact.phone}</span>
                  </div>
                  <div className={`text-[11px] mt-0.5 truncate ${contact.isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {contact.statusText}
                  </div>
                </div>
              </div>

              {/* Action buttons (Chat, Audio Call, Video Call) */}
              <div
                className="flex items-center gap-1 sm:gap-1.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    onStartDirectChat(contact);
                    onClose();
                  }}
                  className="p-2 sm:p-2.5 rounded-xl bg-[#242f3d] hover:bg-[#5288c1] text-slate-200 hover:text-white transition cursor-pointer"
                  title="Написать сообщение"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    onStartCall(contact, false);
                    onClose();
                  }}
                  className="p-2 sm:p-2.5 rounded-xl bg-[#242f3d] hover:bg-emerald-600 text-emerald-400 hover:text-white transition cursor-pointer"
                  title="Аудиозвонок"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    onStartCall(contact, true);
                    onClose();
                  }}
                  className="p-2 sm:p-2.5 rounded-xl bg-[#242f3d] hover:bg-[#5288c1] text-[#64b5f6] hover:text-white transition cursor-pointer"
                  title="Видеозвонок"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {filteredContacts.length === 0 && (
            <div className="text-center py-14 text-slate-400 text-xs">
              Контактов не найдено
            </div>
          )}
        </div>

        {/* Bottom Footer */}
        <div className="px-3.5 sm:px-4 py-3 bg-[#131c26] border-t border-[#202d3a] flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] sm:text-xs text-slate-400 truncate min-w-0">
            Нажмите на контакт для перехода в диалог
          </span>
          <button
            onClick={onClose}
            className="px-4 sm:px-5 py-2 rounded-xl bg-[#242f3d] hover:bg-[#30445a] text-white text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
