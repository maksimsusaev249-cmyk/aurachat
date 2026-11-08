import React, { useState } from 'react';
import { User } from '../../types';
import { 
  X, 
  Users, 
  PlusCircle, 
  MessageSquare, 
  Radio, 
  Settings, 
  User as UserIcon, 
  Bell, 
  HardDrive, 
  ShieldAlert, 
  Smartphone, 
  Lock, 
  FolderPlus, 
  Info, 
  LogOut, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  Moon,
  Sparkles,
  Phone,
  Download,
  RefreshCw,
  Camera,
  Share2,
  Pencil,
  Bookmark,
  Zap
} from 'lucide-react';
import { playReactionSound } from '../../utils/audioUtils';

import { SettingsTab } from './SettingsModal';

interface MainMenuDrawerProps {
  isOpen: boolean;
  currentUser: User;
  savedAccounts?: User[];
  missedCallsCount?: number;
  isSimpleMode?: boolean;
  onToggleSimpleMode?: (enabled: boolean) => void;
  onClose: () => void;
  onOpenContacts: () => void;
  onOpenCallsHistory?: () => void;
  onOpenInstallApp?: () => void;
  onOpenCreateChat: (defaultType: 'group' | 'channel' | 'direct') => void;
  onOpenSettings: (initialTab?: SettingsTab) => void;
  onOpenProfile: () => void;
  onSwitchUser?: (targetUser: User) => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onOpenSavedMessages?: () => void;
}

export const MainMenuDrawer: React.FC<MainMenuDrawerProps> = ({
  isOpen,
  currentUser,
  savedAccounts = [],
  missedCallsCount = 0,
  isSimpleMode = false,
  onToggleSimpleMode,
  onClose,
  onOpenContacts,
  onOpenCallsHistory,
  onOpenInstallApp,
  onOpenCreateChat,
  onOpenSettings,
  onOpenProfile,
  onSwitchUser,
  onOpenAuth,
  onLogout,
  onOpenSavedMessages
}) => {
  const [isNewChatExpanded, setIsNewChatExpanded] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [isAccountsExpanded, setIsAccountsExpanded] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex select-none">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Container (VKontakte Side Menu) */}
      <div className="relative w-80 max-w-[85vw] h-full bg-[#222222] border-r border-[#2e2e2e] text-[#e1e3e6] shadow-2xl flex flex-col z-10 overflow-hidden">
        
        {/* Chatix Header + Account Switcher */}
        <div className="p-4 bg-[#222222] border-b border-[#2e2e2e] shrink-0 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#0077FF] text-white font-black text-xs flex items-center justify-center">
                AC
              </span>
              <h3 className="font-bold text-sm text-white">Chatix</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#828282] hover:text-white hover:bg-[#2c2d2e] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current User Profile Card (Chatix ID Switcher) */}
          <div
            onClick={() => setIsAccountsExpanded(!isAccountsExpanded)}
            className="p-2.5 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] flex items-center justify-between cursor-pointer transition select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="min-w-0">
                <div className="font-bold text-xs text-white truncate flex items-center gap-1">
                  <span>{currentUser.displayName}</span>
                  {currentUser.hasPin && <Lock className="w-3 h-3 text-[#71aaeb] shrink-0" />}
                </div>
                <div className="text-[11px] text-[#71aaeb] truncate">@{currentUser.username} • Chatix ID</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-[#0077FF]/20 text-[#71aaeb] text-[10px] font-bold shrink-0">
                {savedAccounts.length} акк.
              </span>
              <ChevronDown className={`w-4 h-4 text-[#828282] transition-transform ${isAccountsExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {/* Expandable Accounts List */}
          {isAccountsExpanded && (
            <div className="p-2 rounded-xl bg-[#19191a] border border-[#2e2e2e] space-y-1">
              <div className="text-[10px] font-semibold text-[#828282] uppercase tracking-wider px-1 py-0.5 flex items-center justify-between">
                <span>Аккаунты Chatix</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSettings('account');
                    onClose();
                  }}
                  className="text-[#71aaeb] hover:underline cursor-pointer"
                >
                  Настройки
                </button>
              </div>

              {savedAccounts.map((acc) => {
                const isCurrent = acc.id === currentUser.id;
                return (
                  <div
                    key={acc.id}
                    onClick={() => {
                      if (!isCurrent && onSwitchUser) {
                        onSwitchUser(acc);
                        onClose();
                      }
                    }}
                    className={`p-2 rounded-lg flex items-center justify-between transition ${
                      isCurrent
                        ? 'bg-[#0077FF]/15 border border-[#0077FF]/40'
                        : 'hover:bg-[#2c2d2e] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={acc.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{acc.displayName}</div>
                        <div className="text-[10px] text-[#828282] truncate">@{acc.username}</div>
                      </div>
                    </div>
                    {isCurrent ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-[10px] text-[#71aaeb] font-semibold shrink-0">Войти</span>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth?.();
                }}
                className="w-full mt-1 py-1.5 px-2 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#71aaeb]" />
                <span>Добавить аккаунт</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu Navigation List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 scrollbar-thin text-xs">
          
          {/* Моя страница */}
          <button
            onClick={() => {
              onOpenProfile();
              onClose();
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#2c2d2e] transition cursor-pointer text-[#e1e3e6]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#2c2d2e] text-[#71aaeb] flex items-center justify-center">
                <UserIcon className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm">Моя страница</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#828282]" />
          </button>

          {/* Избранное */}
          <button
            onClick={() => {
              if (onOpenSavedMessages) onOpenSavedMessages();
              onClose();
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#2c2d2e] transition cursor-pointer text-[#e1e3e6]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#2c2d2e] text-[#71aaeb] flex items-center justify-center">
                <Bookmark className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm">Избранное</div>
                <div className="text-[10px] text-[#828282]">Личные заметки, файлы и ссылки</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#828282]" />
          </button>

          {/* Друзья / Контакты */}
          <button
            onClick={() => {
              onOpenContacts();
              onClose();
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#2c2d2e] transition cursor-pointer text-[#e1e3e6]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#2c2d2e] text-[#71aaeb] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm">Друзья и контакты</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#828282]" />
          </button>

          {/* Звонки */}
          <button
            onClick={() => {
              if (onOpenCallsHistory) onOpenCallsHistory();
              onClose();
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#2c2d2e] transition cursor-pointer text-[#e1e3e6]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#2c2d2e] text-[#71aaeb] flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm flex items-center gap-2">
                  <span>Звонки</span>
                  {missedCallsCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-600 text-white rounded-full">
                      {missedCallsCount}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#828282]">История аудио и видеозвонков</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#828282]" />
          </button>

          {/* Создать сообщество или чат */}
          <div>
            <button
              onClick={() => setIsNewChatExpanded(!isNewChatExpanded)}
              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#2c2d2e] transition cursor-pointer text-[#e1e3e6]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-[#2c2d2e] text-[#71aaeb] flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">Создать беседу / канал</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#828282] transition-transform ${isNewChatExpanded ? 'rotate-180' : ''}`} />
            </button>

            {isNewChatExpanded && (
              <div className="pl-14 pr-3 py-1 space-y-1 bg-[#19191a] border-y border-[#2e2e2e]">
                <button
                  onClick={() => {
                    onOpenCreateChat('channel');
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-lg hover:bg-[#2c2d2e] text-left text-[#e1e3e6] transition flex items-center gap-2.5 cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5 text-[#71aaeb]" />
                  <span className="font-medium">Создать канал</span>
                </button>

                <button
                  onClick={() => {
                    onOpenCreateChat('group');
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-lg hover:bg-[#2c2d2e] text-left text-[#e1e3e6] transition flex items-center gap-2.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-[#71aaeb]" />
                  <span className="font-medium">Создать беседу</span>
                </button>

                <button
                  onClick={() => {
                    onOpenCreateChat('direct');
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-lg hover:bg-[#2c2d2e] text-left text-[#e1e3e6] transition flex items-center gap-2.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#71aaeb]" />
                  <span className="font-medium">Написать сообщение</span>
                </button>
              </div>
            )}
          </div>

          <div className="my-2 border-t border-[#2e2e2e]" />

          {/* Голосовой автоответчик */}
          <button
            onClick={() => {
              onOpenSettings('answering_machine');
              onClose();
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#2c2d2e] transition cursor-pointer text-[#e1e3e6]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#2c2d2e] text-[#71aaeb] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm">Голосовой секретарь</div>
                <div className="text-[10px] text-[#828282]">Приветствие, голос и автоответ</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#828282]" />
          </button>

          {/* Оформление и темы */}
          <button
            onClick={() => {
              onOpenSettings('appearance');
              onClose();
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#2c2d2e] transition cursor-pointer text-[#e1e3e6]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#2c2d2e] text-[#71aaeb] flex items-center justify-center">
                <Moon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm">Тема оформления</div>
                <div className="text-[10px] text-[#828282]">Тёмная тема Chatix</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#828282]" />
          </button>

          {/* Простой режим / Обычный режим (Тумблер) */}
          <div
            onClick={() => {
              if (onToggleSimpleMode) {
                playReactionSound();
                onToggleSimpleMode(!isSimpleMode);
              } else {
                onOpenSettings('app_mode');
                onClose();
              }
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#2c2d2e] transition cursor-pointer text-[#e1e3e6] group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                isSimpleMode ? 'bg-amber-500/20 text-amber-400' : 'bg-[#2c2d2e] text-[#828282]'
              }`}>
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <div className="font-semibold text-sm flex items-center gap-1.5">
                  <span>Простой режим</span>
                  {isSimpleMode && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      ВКЛ
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#828282] truncate">
                  {isSimpleMode ? 'Только контакты, чаты и звонки' : 'Обычный режим с лентой и соцсетью'}
                </div>
              </div>
            </div>

            {/* iOS style toggle switch */}
            <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ml-2 ${
              isSimpleMode ? 'bg-amber-500' : 'bg-[#3a3a3c]'
            }`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                isSimpleMode ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </div>

          {/* Настройки */}
          <button
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#2c2d2e] transition cursor-pointer text-[#e1e3e6]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#2c2d2e] text-[#71aaeb] flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm">Настройки</div>
                <div className="text-[10px] text-[#828282]">Аккаунт, приватность и безопасность</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#828282]" />
          </button>

          {/* Установить приложение */}
          {onOpenInstallApp && (
            <button
              onClick={() => {
                onOpenInstallApp();
                onClose();
              }}
              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#2c2d2e] transition cursor-pointer text-[#e1e3e6]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-[#2c2d2e] text-[#71aaeb] flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">Приложение Chatix</div>
                  <div className="text-[10px] text-[#828282]">Установка на ПК, Android и iOS</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#828282]" />
            </button>
          )}
        </div>

        {/* Footer: Смена аккаунта, Выйти */}
        <div className="p-3 bg-[#19191a] border-t border-[#2e2e2e] shrink-0 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onOpenSettings('account');
                onClose();
              }}
              className="py-2 px-2.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] transition flex items-center justify-center gap-1.5 cursor-pointer font-semibold text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#71aaeb]" />
              <span>Аккаунты</span>
            </button>

            <button
              onClick={() => {
                onClose();
                if (onLogout) {
                  onLogout();
                } else {
                  onOpenSettings('logout');
                }
              }}
              className="py-2 px-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer font-semibold text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
