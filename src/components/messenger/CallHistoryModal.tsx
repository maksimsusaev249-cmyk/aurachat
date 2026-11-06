import React, { useState } from 'react';
import { CallRecord } from '../../types';
import { initialContactsList, ContactItem } from './ContactsModal';
import { matchPhoneNumber, matchUserText } from '../../utils/searchUtils';
import { 
  X, 
  Phone, 
  PhoneCall, 
  Video, 
  Trash2, 
  CheckCheck, 
  Search,
  ChevronLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Hash,
  ShieldCheck
} from 'lucide-react';

interface CallHistoryModalProps {
  isOpen: boolean;
  calls: CallRecord[];
  missedCallsCount: number;
  onClose: () => void;
  onStartCall: (contactName: string, avatarUrl: string, isVideo: boolean) => void;
  onSimulateIncomingCall: (fromName?: string, isVideo?: boolean) => void;
  onSimulateMissedCall: () => void;
  onMarkAllAsRead: () => void;
  onClearHistory: () => void;
  onDeleteCall: (id: string) => void;
}

export const CallHistoryModal: React.FC<CallHistoryModalProps> = ({
  isOpen,
  calls,
  missedCallsCount,
  onClose,
  onStartCall,
  onMarkAllAsRead,
  onClearHistory,
  onDeleteCall
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'missed' | 'outgoing' | 'contacts' | 'dialpad'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialNumber, setDialNumber] = useState('');

  if (!isOpen) return null;

  const missedCount = calls.filter((c) => c.isMissed).length;
  const completedCount = calls.filter((c) => !c.isMissed).length;

  const filteredCalls = calls.filter((c) => {
    const matchesTab =
      activeTab === 'missed'
        ? c.isMissed
        : activeTab === 'outgoing'
        ? !c.isMissed
        : true;
    const q = searchQuery.trim();
    const matchesSearch =
      !q ||
      matchUserText(c.contactName, q) ||
      (c.contactUsername ? matchUserText(c.contactUsername, q) : false);
    return matchesTab && matchesSearch;
  });

  const filteredContacts = initialContactsList.filter((c) => {
    const q = searchQuery.trim();
    if (!q) return true;
    return (
      matchUserText(c.displayName, q) ||
      matchUserText(c.username, q) ||
      matchPhoneNumber(c.phone, q)
    );
  });

  const formatDuration = (sec: number) => {
    if (!sec || sec <= 0) return '';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m > 0 ? `${m} мин ` : ''}${s} сек`;
  };

  const handleCallByDialpad = (isVideo: boolean) => {
    const clean = dialNumber.trim();
    if (!clean) return;
    const matchedContact = initialContactsList.find(
      (c) => c.phone.replace(/\D/g, '') === clean.replace(/\D/g, '')
    );
    const name = matchedContact ? matchedContact.displayName : clean;
    const avatar = matchedContact
      ? matchedContact.avatarUrl
      : `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(clean)}&backgroundColor=182533`;
    onStartCall(name, avatar, isVideo);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full h-full bg-[#0e1621] text-white select-none animate-in fade-in duration-150">
      <div className="w-full max-w-4xl mx-auto h-full flex flex-col bg-[#17212b] sm:border-x border-[#243344] shadow-2xl overflow-hidden">
        
        {/* Sticky Top Header (Mobile & Desktop friendly, matching Contacts) */}
        <div className="px-3 sm:px-5 py-3.5 bg-[#17212b] border-b border-[#0e1621] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onClose}
              className="p-2 -ml-1 rounded-full text-slate-300 hover:text-white hover:bg-[#202b36] transition cursor-pointer flex items-center justify-center"
              title="Назад"
            >
              <ChevronLeft className="w-5 h-5 sm:hidden" />
              <PhoneCall className="w-5 h-5 hidden sm:block text-[#64b5f6]" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg text-white truncate">Звонки</h2>
                {missedCallsCount > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full shrink-0">
                    {missedCallsCount} новых
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {calls.length} вызовов в журнале • Аудио и видеосвязь
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {missedCallsCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="px-2.5 py-1.5 rounded-xl bg-[#202b36] hover:bg-[#2b3947] text-[#64b5f6] text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                title="Отметить все пропущенные как прочитанные"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden md:inline">Прочитано</span>
              </button>
            )}

            {calls.length > 0 && activeTab !== 'contacts' && activeTab !== 'dialpad' && (
              <button
                onClick={onClearHistory}
                className="px-2.5 py-1.5 rounded-xl bg-[#202b36] hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                title="Очистить историю звонков"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Очистить</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-[#202b36] transition cursor-pointer"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Navigation Bar (Unified with Contacts style) */}
        <div className="p-3 sm:px-5 bg-[#131c26] border-b border-[#0e1621] space-y-2.5 shrink-0">
          {activeTab !== 'dialpad' && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeTab === 'contacts'
                    ? 'Поиск контакта по имени, @username или телефону...'
                    : 'Поиск в истории звонков по имени или @username...'
                }
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
          )}

          {/* Compact Scrollable Filter & Mode Tabs for Mobile & Desktop */}
          <div
            className="flex items-center gap-1.5 overflow-x-auto touch-pan-x overscroll-x-contain pb-1 pt-0.5 -mx-1 px-1"
            style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}
          >
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-[#5288c1] text-white shadow-sm'
                  : 'bg-[#1c2733] text-slate-300 hover:text-white hover:bg-[#243242]'
              }`}
            >
              <span>Все</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/25 text-[10px]">{calls.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('missed')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'missed'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-[#1c2733] text-slate-300 hover:text-rose-300 hover:bg-[#243242]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
              <span>Пропущенные</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/25 text-[10px]">{missedCount}</span>
            </button>

            <button
              onClick={() => setActiveTab('outgoing')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'outgoing'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[#1c2733] text-slate-300 hover:text-emerald-300 hover:bg-[#243242]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span>Принятые и исходящие</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/25 text-[10px]">{completedCount}</span>
            </button>

            <button
              onClick={() => setActiveTab('contacts')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'contacts'
                  ? 'bg-[#5288c1] text-white shadow-sm'
                  : 'bg-[#1c2733] text-[#64b5f6] hover:text-white hover:bg-[#243242]'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Контакты ({initialContactsList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('dialpad')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'dialpad'
                  ? 'bg-[#5288c1] text-white shadow-sm'
                  : 'bg-[#1c2733] text-slate-300 hover:text-white hover:bg-[#243242]'
              }`}
            >
              <Hash className="w-3.5 h-3.5 shrink-0" />
              <span>Набор номера</span>
            </button>
          </div>
        </div>

        {/* Main Content Area (Smooth Vertical Touch Scroll on Phones) */}
        <div
          className="flex-1 min-h-0 overflow-y-auto touch-pan-y overscroll-y-contain p-2.5 sm:p-4 space-y-1.5"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          
          {/* MODE 1: DIALPAD (НАБОР НОМЕРА) */}
          {activeTab === 'dialpad' && (
            <div className="max-w-xs mx-auto py-4 flex flex-col items-center space-y-4">
              <div className="w-full bg-[#131c26] border border-[#243344] rounded-2xl px-4 py-3 text-center">
                <input
                  type="tel"
                  placeholder="+7 (999) 000-00-00"
                  value={dialNumber}
                  onChange={(e) => setDialNumber(e.target.value)}
                  className="w-full bg-transparent text-center text-xl font-mono font-bold text-white outline-none placeholder-slate-600"
                />
                <div className="text-[11px] text-slate-400 mt-1">
                  Введите номер телефона для звонка
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 w-full">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => setDialNumber((prev) => (prev.length < 20 ? prev + digit : prev))}
                    className="h-14 rounded-2xl bg-[#202b36] hover:bg-[#2b3947] active:bg-[#5288c1] text-white font-bold text-lg transition flex flex-col items-center justify-center cursor-pointer active:scale-95 shadow-sm"
                  >
                    <span>{digit}</span>
                    {digit === '0' && <span className="text-[9px] text-slate-400 leading-none">+</span>}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full pt-2">
                <button
                  type="button"
                  disabled={!dialNumber.trim()}
                  onClick={() => handleCallByDialpad(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
                >
                  <Phone className="w-4 h-4" />
                  <span>Аудиозвонок</span>
                </button>
                <button
                  type="button"
                  disabled={!dialNumber.trim()}
                  onClick={() => handleCallByDialpad(true)}
                  className="flex-1 py-3.5 rounded-2xl bg-[#5288c1] hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
                >
                  <Video className="w-4 h-4" />
                  <span>Видеозвонок</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: CONTACTS QUICK CALL LIST (КАК В КОНТАКТАХ) */}
          {activeTab === 'contacts' && (
            <>
              {filteredContacts.map((contact: ContactItem) => (
                <div
                  key={contact.userId}
                  onClick={() => onStartCall(contact.displayName, contact.avatarUrl, false)}
                  className="p-2.5 sm:p-3 rounded-2xl bg-[#1b2633]/60 hover:bg-[#202b36] border border-transparent hover:border-[#2b3c4f] transition flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <img
                        src={contact.avatarUrl}
                        alt={contact.displayName}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-[#283748] group-hover:ring-[#5288c1] transition"
                      />
                      {contact.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#17212b]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{contact.displayName}</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-[#64b5f6] shrink-0" />
                      </div>
                      <div className="text-xs text-slate-400 truncate flex items-center gap-2 mt-0.5">
                        <span className="font-mono">@{contact.username}</span>
                        <span>•</span>
                        <span className={contact.isOnline ? 'text-emerald-400' : 'text-slate-500'}>
                          {contact.statusText}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onStartCall(contact.displayName, contact.avatarUrl, false)}
                      className="p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition cursor-pointer"
                      title={`Позвонить ${contact.displayName}`}
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onStartCall(contact.displayName, contact.avatarUrl, true)}
                      className="p-2.5 rounded-xl bg-[#5288c1]/20 hover:bg-[#5288c1] text-[#64b5f6] hover:text-white border border-[#5288c1]/30 transition cursor-pointer"
                      title={`Видеозвонок ${contact.displayName}`}
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredContacts.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Контакты по запросу «{searchQuery}» не найдены
                </div>
              )}
            </>
          )}

          {/* MODE 3: CALL HISTORY LIST (ALL / MISSED / COMPLETED) */}
          {activeTab !== 'contacts' && activeTab !== 'dialpad' && (
            <>
              {filteredCalls.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400 px-4">
                  <div className="w-16 h-16 rounded-full bg-[#202b36] flex items-center justify-center mb-3">
                    <Phone className="w-7 h-7 text-slate-500" />
                  </div>
                  <p className="font-bold text-sm sm:text-base text-slate-200">
                    {searchQuery
                      ? 'Ничего не найдено'
                      : activeTab === 'missed'
                      ? 'Пропущенных вызовов нет'
                      : 'История звонков пуста'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Нажмите на вкладку «Контакты», чтобы быстро позвонить собеседнику по аудио или видеосвязи.
                  </p>
                  <button
                    onClick={() => setActiveTab('contacts')}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#5288c1] hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Перейти к контактам
                  </button>
                </div>
              ) : (
                filteredCalls.map((call) => {
                  const durationText = formatDuration(call.durationSec);
                  return (
                    <div
                      key={call.id}
                      onClick={() => onStartCall(call.contactName, call.avatarUrl, call.isVideo)}
                      className={`p-2.5 sm:p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer group ${
                        call.isMissed
                          ? 'bg-rose-950/15 border-rose-500/25 hover:bg-rose-950/25'
                          : 'bg-[#1b2633]/70 border-[#243344]/80 hover:bg-[#202b36] hover:border-[#30445a]'
                      }`}
                    >
                      {/* Left: Avatar + Name + Call Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <img
                            src={call.avatarUrl}
                            alt={call.contactName}
                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-[#243344] group-hover:ring-[#5288c1] transition"
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 p-1 rounded-full text-white shadow ${
                              call.isMissed
                                ? 'bg-rose-600 ring-2 ring-[#17212b]'
                                : 'bg-emerald-600 ring-2 ring-[#17212b]'
                            }`}
                          >
                            {call.isMissed ? (
                              <ArrowDownLeft className="w-2.5 h-2.5 stroke-[3]" />
                            ) : (
                              <ArrowUpRight className="w-2.5 h-2.5 stroke-[3]" />
                            )}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4
                              className={`font-bold text-sm sm:text-[15px] truncate ${
                                call.isMissed ? 'text-rose-300' : 'text-white'
                              }`}
                            >
                              {call.contactName}
                            </h4>
                            {call.contactUsername && (
                              <span className="text-[11px] text-slate-400 font-mono truncate hidden sm:inline">
                                @{call.contactUsername}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5 text-xs flex-wrap">
                            <span
                              className={`font-medium flex items-center gap-1 ${
                                call.isMissed ? 'text-rose-400' : 'text-emerald-400'
                              }`}
                            >
                              {call.isVideo ? (
                                <Video className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <Phone className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>
                                {call.isMissed
                                  ? 'Пропущенный'
                                  : call.direction === 'incoming'
                                  ? 'Входящий'
                                  : 'Исходящий'}
                              </span>
                            </span>

                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400">{call.timestamp}</span>

                            {!call.isMissed && durationText && (
                              <>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-300 font-mono text-[11px]">
                                  {durationText}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Touch-friendly Call & Delete Buttons */}
                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onStartCall(call.contactName, call.avatarUrl, false)}
                          className="p-2.5 rounded-xl bg-[#242f3d] hover:bg-emerald-600 text-emerald-400 hover:text-white transition cursor-pointer"
                          title={`Аудиозвонок ${call.contactName}`}
                        >
                          <Phone className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onStartCall(call.contactName, call.avatarUrl, true)}
                          className="p-2.5 rounded-xl bg-[#242f3d] hover:bg-[#5288c1] text-[#64b5f6] hover:text-white transition cursor-pointer"
                          title={`Видеозвонок ${call.contactName}`}
                        >
                          <Video className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onDeleteCall(call.id)}
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-[#242f3d] transition cursor-pointer"
                          title="Удалить запись"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* Bottom Bar for Mobile & Quick Actions */}
        <div className="px-4 py-3 bg-[#131c26] border-t border-[#202d3a] flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => setActiveTab(activeTab === 'contacts' ? 'all' : 'contacts')}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#5288c1] hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow"
          >
            <Users className="w-4 h-4" />
            <span>{activeTab === 'contacts' ? 'К журналу звонков' : 'Позвонить контакту'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#242f3d] hover:bg-[#30445a] text-white text-xs font-semibold transition cursor-pointer"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
