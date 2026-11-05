import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  PhoneCall, 
  Video, 
  Users, 
  Check, 
  Phone, 
  ShieldCheck,
  Delete,
  PhoneIncoming,
  History,
  Grid
} from 'lucide-react';
import { initialContactsList, ContactItem } from './ContactsModal';

interface StartCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCallWithParticipants: (selectedContacts: ContactItem[], isVideo: boolean) => void;
  onStartCallWithNumber?: (phoneNumber: string, isVideo: boolean) => void;
  onStartCallToNumber?: (phoneNumber: string, isVideo: boolean) => void;
  onSimulateIncomingCall?: (callerName?: string, isVideo?: boolean, avatarUrl?: string) => void;
  onOpenHistory?: () => void;
}

export const StartCallModal: React.FC<StartCallModalProps> = ({
  isOpen,
  onClose,
  onStartCallWithParticipants,
  onStartCallWithNumber,
  onStartCallToNumber,
  onSimulateIncomingCall,
  onOpenHistory
}) => {
  // Tabs: 'dialpad' (набор звонка / клавиатура) | 'contacts' (список контактов)
  const [activeTab, setActiveTab] = useState<'dialpad' | 'contacts'>('dialpad');
  
  // Dialpad state
  const [dialedNumber, setDialedNumber] = useState('');
  const [isVideo, setIsVideo] = useState(false);

  // Contacts state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Listen to physical keyboard typing when in dialpad tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'dialpad') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if focused on other inputs
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && target.id !== 'dialpad-input') return;

      if (/^[0-9*#+]$/.test(e.key)) {
        e.preventDefault();
        setDialedNumber((prev) => (prev.length < 24 ? prev + e.key : prev));
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setDialedNumber((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleCallDialedNumber();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, dialedNumber, isVideo]);

  if (!isOpen) return null;

  const contactsList = initialContactsList;

  const filteredContacts = contactsList.filter((c) =>
    c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const selectedContacts = contactsList.filter((c) => selectedUserIds.includes(c.userId));

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Dialpad button click
  const handleDigitPress = (digit: string) => {
    if (dialedNumber.length >= 24) return;
    setDialedNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setDialedNumber((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDialedNumber('');
  };

  // Start outgoing call to dialed number
  const handleCallDialedNumber = () => {
    const trimmed = dialedNumber.trim();
    if (!trimmed) return;

    const caller = onStartCallToNumber || onStartCallWithNumber;
    if (caller) {
      caller(trimmed, isVideo);
    } else {
      // Fallback: check matching contact or create pseudo contact
      const match = contactsList.find(
        (c) => c.phone.replace(/\D/g, '') === trimmed.replace(/\D/g, '') || c.phone === trimmed
      );
      if (match) {
        onStartCallWithParticipants([match], isVideo);
      } else {
        const dummy: ContactItem = {
          userId: 'num_' + Date.now(),
          displayName: trimmed,
          username: 'phone',
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmed)}`,
          isOnline: true,
          phone: trimmed,
          statusText: 'Набранный номер'
        };
        onStartCallWithParticipants([dummy], isVideo);
      }
    }
    onClose();
  };

  // Simulate incoming call from dialed number or contact
  const handleSimulateIncomingFromDialer = () => {
    const trimmed = dialedNumber.trim() || '+7 (999) 777-00-11';
    const match = contactsList.find(
      (c) => c.phone.replace(/\D/g, '') === trimmed.replace(/\D/g, '') || c.phone === trimmed
    );
    const callerName = match ? match.displayName : trimmed;
    const callerAvatar = match
      ? match.avatarUrl
      : `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(trimmed)}&backgroundColor=182533`;

    if (onSimulateIncomingCall) {
      onSimulateIncomingCall(callerName, isVideo, callerAvatar);
    }
    onClose();
  };

  const handleStartSubmitContacts = () => {
    if (selectedContacts.length === 0) return;
    onStartCallWithParticipants(selectedContacts, isVideo);
    onClose();
  };

  // Keypad definitions with letters
  const keypadKeys = [
    { num: '1', letters: '' },
    { num: '2', letters: 'ABC' },
    { num: '3', letters: 'DEF' },
    { num: '4', letters: 'GHI' },
    { num: '5', letters: 'JKL' },
    { num: '6', letters: 'MNO' },
    { num: '7', letters: 'PQRS' },
    { num: '8', letters: 'TUV' },
    { num: '9', letters: 'WXYZ' },
    { num: '*', letters: '' },
    { num: '0', letters: '+' },
    { num: '#', letters: '' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none animate-fadeIn">
      <div 
        onClick={onClose}
        className="fixed inset-0"
      />

      <div className="relative w-full max-w-md max-h-[94vh] bg-[#17212b] border border-[#243344] rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 text-white animate-scaleUp">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#17212b] via-[#1e2c3c] to-[#17212b] border-b border-[#243344] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/20">
              <PhoneCall className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Звонки</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  WebRTC P2P
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Набор номера, исходящие и входящие вызовы
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenHistory && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenHistory();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white border border-white/10 transition cursor-pointer flex items-center gap-1"
                title="История вызовов"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Журнал</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-[#243344] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Segmented Tabs: Клавиатура набора vs Контакты */}
        <div className="p-2.5 bg-[#121b24] border-b border-[#202d3a] flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('dialpad')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'dialpad'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/40'
                : 'bg-[#1a2533] text-slate-300 hover:bg-[#202e3f] hover:text-white'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Клавиатура набора</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'contacts'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/40'
                : 'bg-[#1a2533] text-slate-300 hover:bg-[#202e3f] hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Контакты ({contactsList.length})</span>
          </button>
        </div>

        {/* Video / Audio Call Mode Toggle Bar */}
        <div className="px-4 py-2.5 bg-[#0f1721] border-b border-[#202d3a] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Шифрование звонков и HD аудио</span>
          </div>

          <div className="flex items-center gap-1 bg-[#1a2634] p-0.5 rounded-xl border border-[#2b3b4d]">
            <button
              type="button"
              onClick={() => setIsVideo(false)}
              className={`px-2.5 py-1 rounded-lg transition text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 ${
                !isVideo
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Phone className="w-3 h-3" />
              <span>Аудио</span>
            </button>

            <button
              type="button"
              onClick={() => setIsVideo(true)}
              className={`px-2.5 py-1 rounded-lg transition text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 ${
                isVideo
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3 h-3" />
              <span>Видео</span>
            </button>
          </div>
        </div>

        {/* TAB 1: НОМЕРОНАБИРАТЕЛЬ (DIALPAD) */}
        {activeTab === 'dialpad' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between scrollbar-thin">
            {/* Number Input Display */}
            <div className="relative mb-3 flex flex-col items-center">
              <div className="w-full flex items-center justify-between bg-[#0e1621] border border-[#27384c] rounded-2xl px-4 py-3 min-h-[56px]">
                <input
                  id="dialpad-input"
                  type="text"
                  value={dialedNumber}
                  onChange={(e) => setDialedNumber(e.target.value.replace(/[^0-9*#+\s()-]/g, ''))}
                  placeholder="Введите номер телефона..."
                  className="w-full bg-transparent text-center font-mono text-xl sm:text-2xl font-bold tracking-wider text-white placeholder-slate-600 outline-none"
                />

                {dialedNumber && (
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0 ml-2"
                    title="Удалить цифру"
                  >
                    <Delete className="w-5 h-5 text-rose-400" />
                  </button>
                )}
              </div>

              {/* Quick Preset Buttons */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap justify-center text-[10px]">
                <span className="text-slate-400 font-medium">Быстрый выбор:</span>
                <button
                  type="button"
                  onClick={() => setDialedNumber('+7 (999) 777-00-11')}
                  className="px-2 py-0.5 rounded-lg bg-[#1a2533] hover:bg-[#243346] text-slate-300 border border-slate-700/60 transition cursor-pointer"
                >
                  Павел Дуров
                </button>
                <button
                  type="button"
                  onClick={() => setDialedNumber('+7 (903) 123-45-67')}
                  className="px-2 py-0.5 rounded-lg bg-[#1a2533] hover:bg-[#243346] text-slate-300 border border-slate-700/60 transition cursor-pointer"
                >
                  Алиса Морозова
                </button>
                <button
                  type="button"
                  onClick={() => setDialedNumber('+7 (916) 555-88-99')}
                  className="px-2 py-0.5 rounded-lg bg-[#1a2533] hover:bg-[#243346] text-slate-300 border border-slate-700/60 transition cursor-pointer"
                >
                  Алексей DevOps
                </button>
                {dialedNumber && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2 py-0.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/40 transition cursor-pointer"
                  >
                    Очистить
                  </button>
                )}
              </div>
            </div>

            {/* 12-Button Telephone Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto w-full my-auto py-2">
              {keypadKeys.map((item) => (
                <button
                  key={item.num}
                  type="button"
                  onClick={() => handleDigitPress(item.num)}
                  className="h-14 sm:h-16 rounded-2xl bg-[#1b2634] hover:bg-[#243346] active:bg-[#2b3c52] active:scale-95 border border-[#27384c] flex flex-col items-center justify-center transition cursor-pointer shadow-sm group"
                >
                  <span className="text-xl sm:text-2xl font-bold font-mono text-white group-hover:text-cyan-300 transition-colors">
                    {item.num}
                  </span>
                  {item.letters && (
                    <span className="text-[9px] font-semibold tracking-widest text-slate-400 group-hover:text-slate-300">
                      {item.letters}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Action Buttons: Outgoing Call & Simulate Incoming Call */}
            <div className="pt-3 border-t border-[#202d3a] flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {/* Outgoing Call Button */}
                <button
                  type="button"
                  disabled={!dialedNumber.trim()}
                  onClick={handleCallDialedNumber}
                  className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                    !dialedNumber.trim()
                      ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed shadow-none'
                      : isVideo
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                  }`}
                >
                  {isVideo ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5 fill-current" />}
                  <span>Исходящий вызов</span>
                </button>

                {/* Simulate Incoming Call Button */}
                <button
                  type="button"
                  onClick={handleSimulateIncomingFromDialer}
                  className="py-3 px-3.5 rounded-2xl bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                  title="Симулировать входящий звонок на устройство (проверка рингтона, вибрации и ответа)"
                >
                  <PhoneIncoming className="w-4 h-4 text-indigo-400" />
                  <span className="hidden sm:inline">Входящий вызов</span>
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-400">
                Наберите номер или нажмите <span className="text-indigo-300 font-semibold">«Входящий вызов»</span> для проверки звонка на телефон
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: КОНТАКТЫ (CONTACTS LIST) */}
        {activeTab === 'contacts' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Search Field */}
            <div className="p-3 sm:p-4 border-b border-[#202d3a] bg-[#17212b] shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по имени, номеру телефона..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0f1721] border border-[#243344] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    Очистить
                  </button>
                )}
              </div>

              {/* Selected Pills */}
              {selectedContacts.length > 0 && (
                <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  <span className="text-xs text-slate-400 font-medium shrink-0">Выбрано:</span>
                  {selectedContacts.map((contact) => (
                    <div
                      key={contact.userId}
                      className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border border-emerald-500/40 rounded-full shrink-0 text-xs text-emerald-200"
                    >
                      <img
                        src={contact.avatarUrl}
                        alt=""
                        className="w-3.5 h-3.5 rounded-full object-cover"
                      />
                      <span>{contact.displayName.split(' ')[0]}</span>
                      <button
                        type="button"
                        onClick={() => toggleSelectUser(contact.userId)}
                        className="p-0.5 rounded-full hover:bg-emerald-500/40 text-emerald-300 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
              {filteredContacts.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">Контакты не найдены</p>
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const isSelected = selectedUserIds.includes(contact.userId);
                  return (
                    <div
                      key={contact.userId}
                      className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-white shadow-sm'
                          : 'bg-[#1b2633]/60 border-[#253547]/60 hover:bg-[#202d3d] hover:border-[#30445a]'
                      }`}
                      onClick={() => toggleSelectUser(contact.userId)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={contact.avatarUrl}
                            alt={contact.displayName}
                            className="w-10 h-10 rounded-full object-cover border border-white/10"
                          />
                          {contact.isOnline && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#17212b]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm text-white truncate">
                            {contact.displayName}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="font-mono text-slate-300">{contact.phone}</span>
                            <span>•</span>
                            <span className={contact.isOnline ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                              {contact.statusText}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Quick simulate incoming call from this contact */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSimulateIncomingCall) {
                              onSimulateIncomingCall(contact.displayName, isVideo, contact.avatarUrl);
                              onClose();
                            }
                          }}
                          className="p-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/30 text-indigo-300 transition"
                          title="Входящий звонок от этого контакта"
                        >
                          <PhoneIncoming className="w-4 h-4" />
                        </button>

                        {/* Selection Checkbox */}
                        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-400 text-white scale-105 shadow-xs'
                            : 'border-slate-600 bg-black/20 text-transparent'
                        }`}>
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Contacts Footer Submit */}
            <div className="p-3 bg-[#121b24] border-t border-[#202d3a] flex flex-col gap-2 shrink-0">
              <button
                type="button"
                disabled={selectedContacts.length === 0}
                onClick={handleStartSubmitContacts}
                className={`w-full py-3 px-5 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  selectedContacts.length === 0
                    ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed shadow-none'
                    : selectedContacts.length === 1
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
                }`}
              >
                {isVideo ? <Video className="w-4 h-4" /> : <PhoneCall className="w-4 h-4" />}
                <span>
                  {selectedContacts.length === 0
                    ? 'Выберите собеседника из списка'
                    : selectedContacts.length === 1
                    ? `Позвонить ${selectedContacts[0].displayName.split(' ')[0]}`
                    : `Групповой звонок (${selectedContacts.length})`}
                </span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
