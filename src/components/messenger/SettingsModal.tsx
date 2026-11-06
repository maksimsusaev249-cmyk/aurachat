import React, { useState } from 'react';
import { User } from '../../types';
import { 
  X, 
  Settings,
  Lock, 
  Eye,
  EyeOff, 
  Smartphone, 
  Mail, 
  ShieldCheck, 
  Check, 
  KeyRound, 
  Clock, 
  AlertCircle,
  User as UserIcon,
  Bell,
  HardDrive,
  ShieldAlert,
  FolderPlus,
  Info,
  LogOut,
  Trash2,
  Volume2,
  Camera,
  Plus,
  RefreshCw,
  Phone,
  Download,
  Laptop,
  Globe,
  Share,
  ChevronLeft,
  ChevronRight,
  Voicemail,
  Palette,
  Moon,
  Sun,
  Mic,
  MicOff,
  Sparkles,
  Play,
  Square,
  Radio,
  Sliders,
  Calendar,
  UserCheck,
  History,
  FileText,
  Upload,
  Music
} from 'lucide-react';
import {
  playReactionSound,
  playSentSound,
  playNotificationSound,
  previewRingtone,
  stopCallAudio,
  getSoundSettings,
  saveSoundSettings,
  RingtoneMode,
  NotificationSoundMode
} from '../../utils/audioUtils';
import { AvatarEditorModal } from './AvatarEditorModal';
import { AnsweringMachineLog, AnsweringMachineSettings } from '../../types';

export type SettingsTab = 
  | 'profile' 
  | 'account'
  | 'password'
  | 'answering_machine'
  | 'appearance'
  | 'language'
  | 'call_settings'
  | 'switch_account'
  | 'logout'
  | 'delete_account'
  | 'install_app'
  | 'notifications' 
  | 'storage' 
  | 'blacklist' 
  | 'devices' 
  | 'privacy' 
  | 'folders' 
  | 'version';

interface SettingsModalProps {
  user: User;
  savedAccounts?: User[];
  initialTab?: SettingsTab;
  onUpdateUser: (updated: Partial<User>) => void;
  onUpdateUserPin?: (newPin: string) => void;
  onSwitchUser?: (newUser: User) => void;
  onLogout?: (forgetAccount?: boolean) => void;
  onDeleteAccount?: (userId: string) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  user,
  savedAccounts = [],
  initialTab = 'profile',
  onUpdateUser,
  onUpdateUserPin,
  onSwitchUser,
  onLogout,
  onDeleteAccount,
  onClose
}) => {
  const normalizedInitialTab: SettingsTab =
    initialTab === 'switch_account' || initialTab === 'delete_account'
      ? 'account'
      : initialTab;

  const [activeTab, setActiveTab] = useState<SettingsTab>(normalizedInitialTab);
  const [mobileView, setMobileView] = useState<'menu' | 'content'>(
    initialTab !== 'profile' ? 'content' : 'menu'
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(initialTab === 'delete_account');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(initialTab === 'logout');
  const [forgetAccountOnLogout, setForgetAccountOnLogout] = useState(false);
  const [showSwitchAccountList, setShowSwitchAccountList] = useState(initialTab === 'switch_account');
  
  // Password & PIN Management States
  const [passwordSubTab, setPasswordSubTab] = useState<'pin' | 'password'>('pin');
  
  // 6-Digit PIN States
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Text Password States
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showPinEditor, setShowPinEditor] = useState(false);
  const [customPinInput, setCustomPinInput] = useState(user.pinCode || '');
  const [pinSavedMsg, setPinSavedMsg] = useState(false);

  const handleSelectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    setMobileView('content');
  };

  // Profile Edit State
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || 'Ведущий Fullstack Architect & Tech Lead AuraChat.');
  const [phone, setPhone] = useState(user.phone || '+7 (999) 000-11-22');
  const [profileSaved, setProfileSaved] = useState(false);

  // Notifications State
  const [notifSound, setNotifSound] = useState(true);
  const [notifCalls, setNotifCalls] = useState(true);
  const [notifPreview, setNotifPreview] = useState(true);
  const [notifVibration, setNotifVibration] = useState(true);

  // Storage State
  const [cacheSizeMb, setCacheSizeMb] = useState(148);
  const [autoDownload, setAutoDownload] = useState(true);
  const [cacheClearedMsg, setCacheClearedMsg] = useState(false);

  // Blacklist State
  const [blockedList, setBlockedList] = useState([
    { id: 'b_1', name: 'Рекламный спам-бот', username: 'spam_offer_bot', date: '3 дня назад' },
    { id: 'b_2', name: 'Подозрительный аккаунт', username: 'crypto_giveaway_2026', date: 'Вчера' }
  ]);
  const [newBlockedUsername, setNewBlockedUsername] = useState('');

  // Devices State
  const [sessions, setSessions] = useState([
    { id: 's_curr', name: 'AuraChat Web (Chrome 124, Windows / macOS)', ip: '178.62.204.12', active: 'Онлайн (Текущий)', isCurrent: true },
    { id: 's_ios', name: 'AuraChat iOS (iPhone 15 Pro, iOS 17.5)', ip: '89.178.112.44', active: '15 минут назад', isCurrent: false },
    { id: 's_desk', name: 'AuraChat Desktop (macOS Sonoma, v4.16)', ip: '178.62.204.12', active: 'Вчера в 23:14', isCurrent: false }
  ]);
  const [terminatedMsg, setTerminatedMsg] = useState(false);

  // Privacy State (Ghost Mode & Visibility)
  const [phoneVisibility, setPhoneVisibility] = useState<'all' | 'contacts' | 'nobody'>('contacts');
  const [callsAllowed, setCallsAllowed] = useState<'all' | 'contacts'>('all');
  const [groupAddPermission, setGroupAddPermission] = useState<'all' | 'friends' | 'contacts' | 'nobody'>('all');

  // Folders State
  const [folders, setFolders] = useState([
    { id: 'f_all', name: 'Все чаты', icon: '💬', count: 12 },
    { id: 'f_personal', name: 'Личные (ЛС)', icon: '👤', count: 5 },
    { id: 'f_work', name: 'Работа & Проекты', icon: '💼', count: 4 },
    { id: 'f_channels', name: 'Каналы & Медиа', icon: '📢', count: 3 }
  ]);
  const [newFolderName, setNewFolderName] = useState('');

  // Delete Account / Logout confirmation
  const [isDeleted, setIsDeleted] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  // =========================================================================
  // 9. ГОЛОСОВОЙ АВТООТВЕТЧИК STATE & HANDLERS
  // =========================================================================
  const defaultAMSettings: AnsweringMachineSettings = {
    enabled: true,
    delaySec: 300,
    mode: 'tts',
    ttsVoice: 'ru_female_soft',
    ttsText: 'Здравствуйте! Абонент сейчас не может ответить на ваш звонок. Пожалуйста, оставьте ваше голосовое сообщение после звукового сигнала...',
    presetMessage: 'Я занят, отвечу позже',
    scheduleType: '24/7',
    nightModeAuto: true,
    exceptContactIds: ['u_durov']
  };

  const currentAM = user.settings?.answeringMachine || defaultAMSettings;

  const [amEnabled, setAmEnabled] = useState<boolean>(currentAM.enabled);
  const [amDelaySec, setAmDelaySec] = useState<number>(currentAM.delaySec);
  const [amMode, setAmMode] = useState<'tts' | 'recorded' | 'preset'>(currentAM.mode);
  const [amTtsVoice, setAmTtsVoice] = useState<'ru_female_soft' | 'ru_female_official' | 'ru_male'>(currentAM.ttsVoice);
  const [amTtsText, setAmTtsText] = useState<string>(currentAM.ttsText);
  const [amPresetMessage, setAmPresetMessage] = useState<string>(currentAM.presetMessage);
  const [amScheduleType, setAmScheduleType] = useState<'24/7' | 'working_hours' | 'night_only' | 'custom'>(currentAM.scheduleType);
  const [amNightModeAuto, setAmNightModeAuto] = useState<boolean>(currentAM.nightModeAuto);
  const [amSaveMsg, setAmSaveMsg] = useState(false);

  // Call & Sound Settings States (Real Microphone Test + Custom Device Ringtone & Notification Sound)
  const [stunServer, setStunServer] = useState<string>('stun:stun.l.google.com:19302');
  const [micTestActive, setMicTestActive] = useState<boolean>(false);
  const [micLoopback, setMicLoopback] = useState<boolean>(false);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [soundConfig, setSoundConfig] = useState(() => getSoundSettings());
  const [pushPermStatus, setPushPermStatus] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const micStreamRef = React.useRef<MediaStream | null>(null);
  const micAudioCtxRef = React.useRef<AudioContext | null>(null);
  const micLoopGainRef = React.useRef<GainNode | null>(null);
  const micIntervalRef = React.useRef<any>(null);

  const stopRealMicTest = () => {
    clearInterval(micIntervalRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (micAudioCtxRef.current) {
      try {
        micAudioCtxRef.current.close();
      } catch {}
      micAudioCtxRef.current = null;
    }
    micLoopGainRef.current = null;
    setMicTestActive(false);
    setMicLevel(0);
  };

  const handleToggleRealMicTest = async () => {
    if (micTestActive) {
      stopRealMicTest();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      micStreamRef.current = stream;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        micAudioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(micLoopback ? 0.85 : 0, ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        micLoopGainRef.current = gainNode;

        setMicTestActive(true);
        micIntervalRef.current = setInterval(() => {
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          setMicLevel(Math.min(100, Math.round((avg / 120) * 100)));
        }, 80);
      }
    } catch {
      setMicTestActive(false);
    }
  };

  const handleToggleMicLoopback = () => {
    const next = !micLoopback;
    setMicLoopback(next);
    if (micLoopGainRef.current && micAudioCtxRef.current) {
      micLoopGainRef.current.gain.setValueAtTime(next ? 0.85 : 0, micAudioCtxRef.current.currentTime);
    }
  };

  const handleUploadRingtoneFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const updated = saveSoundSettings({
          ringtoneMode: 'custom',
          customRingtoneUrl: reader.result,
          customRingtoneName: file.name
        });
        setSoundConfig(updated);
        previewRingtone(updated);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadNotificationFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const updated = saveSoundSettings({
          notificationMode: 'custom',
          customNotificationUrl: reader.result,
          customNotificationName: file.name
        });
        setSoundConfig(updated);
        playNotificationSound('AuraChat', `Установлен свой звук уведомления: ${file.name}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRequestDeviceNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPushPermStatus(perm);
        if (perm === 'granted') {
          playNotificationSound('Уведомления AuraChat включены', 'Звук и баннеры устройства успешно активированы!');
        }
      } catch {}
    }
  };

  // Sample Answering Machine History Logs
  const [amLogs, setAmLogs] = useState<AnsweringMachineLog[]>([
    {
      id: 'aml_1',
      callerName: 'Павел Дуров',
      callerAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
      deliveredType: 'voicemail',
      contentPreview: '🎙️ Оставил голосовое сообщение: «Павел на связи, перезвони по поводу релиза» (18 сек)',
      audioUrl: 'https://actions.google.com/sounds/v1/speech/voice_message.ogg',
      timestamp: 'Сегодня в 12:40'
    },
    {
      id: 'aml_2',
      callerName: 'Анна Смирнова (UX/UI)',
      callerAvatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95',
      deliveredType: 'tts',
      contentPreview: '🔊 Синтезирован ответ автоответчика (голос Алёна): «Здравствуйте! Абонент сейчас не может ответить...»',
      timestamp: 'Вчера в 19:15'
    }
  ]);

  const handleSaveAnsweringMachineSettings = (updated: Partial<AnsweringMachineSettings>) => {
    playSentSound();
    const newAM: AnsweringMachineSettings = {
      enabled: updated.enabled ?? amEnabled,
      delaySec: updated.delaySec ?? amDelaySec,
      mode: updated.mode ?? amMode,
      ttsVoice: updated.ttsVoice ?? amTtsVoice,
      ttsText: updated.ttsText ?? amTtsText,
      presetMessage: updated.presetMessage ?? amPresetMessage,
      scheduleType: updated.scheduleType ?? amScheduleType,
      nightModeAuto: updated.nightModeAuto ?? amNightModeAuto,
      exceptContactIds: currentAM.exceptContactIds || ['u_durov']
    };
    onUpdateUser({
      settings: {
        ...user.settings,
        answeringMachine: newAM
      }
    });
    setAmSaveMsg(true);
    setTimeout(() => setAmSaveMsg(false), 2500);
  };

  const handleTestTTSGreeting = () => {
    playReactionSound();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(amTtsText);
      utterance.lang = 'ru-RU';
      if (amTtsVoice === 'ru_female_soft') {
        utterance.pitch = 1.15;
        utterance.rate = 0.95;
      } else if (amTtsVoice === 'ru_female_official') {
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
      } else {
        utterance.pitch = 0.8;
        utterance.rate = 0.95;
      }
      window.speechSynthesis.speak(utterance);
    }
  };

  // Theme, Appearance, Language, Call Settings State
  const [appTheme, setAppTheme] = useState<'dark' | 'light'>(user.settings?.theme || 'dark');
  const [appLang, setAppLang] = useState<'ru' | 'en' | 'kk' | 'uz'>(user.settings?.language || 'ru');
  const [appTextSize, setAppTextSize] = useState<'small' | 'normal' | 'large'>(user.settings?.textSize || 'normal');
  const [appAccentColor, setAppAccentColor] = useState<string>(user.settings?.accentColor || '#5288c1');

  const handleSaveAppearance = (themeVal: 'dark' | 'light', langVal: 'ru' | 'en' | 'kk' | 'uz', sizeVal: 'small' | 'normal' | 'large', accentVal: string) => {
    playSentSound();
    setAppTheme(themeVal);
    setAppLang(langVal);
    setAppTextSize(sizeVal);
    setAppAccentColor(accentVal);
    onUpdateUser({
      settings: {
        ...user.settings,
        theme: themeVal,
        language: langVal,
        textSize: sizeVal,
        accentColor: accentVal
      }
    });
  };

  // 6-Digit PIN Change Handler
  const handleSaveNewPin = () => {
    setPinChangeMsg(null);
    if (user.pinCode && user.pinCode.length >= 4) {
      if (currentPinInput !== user.pinCode) {
        setPinChangeMsg({ type: 'error', text: 'Неверный текущий ПИН-код!' });
        return;
      }
    }
    if (newPinInput.length !== 6 || !/^\d{6}$/.test(newPinInput)) {
      setPinChangeMsg({ type: 'error', text: 'Новый ПИН-код должен содержать ровно 6 цифр!' });
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinChangeMsg({ type: 'error', text: 'Введённые новые ПИН-коды не совпадают!' });
      return;
    }

    playSentSound();
    onUpdateUserPin?.(newPinInput);
    onUpdateUser({ pinCode: newPinInput, hasPin: true });
    setPinChangeMsg({ type: 'success', text: '✓ 6-значный ПИН-код успешно сохранён!' });
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setTimeout(() => setPinChangeMsg(null), 4000);
  };

  // Remove / Reset PIN Handler
  const handleResetPin = () => {
    setPinChangeMsg(null);
    if (user.pinCode && user.pinCode.length >= 4) {
      if (currentPinInput !== user.pinCode) {
        setPinChangeMsg({ type: 'error', text: 'Для отключения введите текущий ПИН-код!' });
        return;
      }
    }
    playReactionSound();
    onUpdateUserPin?.('');
    onUpdateUser({ pinCode: undefined, hasPin: false });
    setPinChangeMsg({ type: 'success', text: '✓ 6-значный ПИН-код успешно отключён для профиля.' });
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setTimeout(() => setPinChangeMsg(null), 4000);
  };

  // Text Password Change Handler
  const handleSaveNewPassword = () => {
    setPasswordChangeMsg(null);
    if (user.password && currentPasswordInput && currentPasswordInput !== user.password) {
      setPasswordChangeMsg({ type: 'error', text: 'Неверный текущий пароль!' });
      return;
    }
    if (newPasswordInput.length < 4) {
      setPasswordChangeMsg({ type: 'error', text: 'Новый пароль должен содержать минимум 4 символа!' });
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeMsg({ type: 'error', text: 'Введённые новые пароли не совпадают!' });
      return;
    }

    playSentSound();
    onUpdateUser({ password: newPasswordInput });
    setPasswordChangeMsg({ type: 'success', text: '✓ Новый пароль успешно сохранён!' });
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setTimeout(() => setPasswordChangeMsg(null), 4000);
  };

  const handleSaveProfile = () => {
    playSentSound();
    let finalUsername = username.trim().replace(/^@/, '');
    if (!finalUsername) {
      finalUsername = 'user156262655';
      setUsername(finalUsername);
    }
    const now = new Date().toISOString();
    onUpdateUser({
      displayName,
      username: finalUsername,
      bio,
      phone,
      usernameLastChanged: now
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleClearCache = () => {
    playReactionSound();
    setCacheSizeMb(0);
    setCacheClearedMsg(true);
    setTimeout(() => setCacheClearedMsg(false), 3000);
  };

  const handleAddBlocked = () => {
    if (!newBlockedUsername.trim()) return;
    playReactionSound();
    setBlockedList([
      ...blockedList,
      {
        id: 'b_' + Date.now(),
        name: 'Пользователь @' + newBlockedUsername.replace('@', ''),
        username: newBlockedUsername.replace('@', ''),
        date: 'Только что'
      }
    ]);
    setNewBlockedUsername('');
  };

  const handleUnblock = (id: string) => {
    setBlockedList(blockedList.filter((b) => b.id !== id));
  };

  const handleTerminateOtherSessions = () => {
    playReactionSound();
    setSessions(sessions.filter((s) => s.isCurrent));
    setTerminatedMsg(true);
    setTimeout(() => setTerminatedMsg(false), 3000);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    playSentSound();
    setFolders([
      ...folders,
      {
        id: 'f_' + Date.now(),
        name: newFolderName.trim(),
        icon: '📁',
        count: 0
      }
    ]);
    setNewFolderName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 select-none">
      <div className="bg-[#17212b] border border-[#243344] rounded-3xl w-full max-w-2xl h-[650px] max-h-[90vh] flex flex-col md:flex-row text-white shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 min-h-0">
        
        {/* Mobile & Desktop Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#202b36] transition z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* =================================================================== */}
        {/* PURE VERTICAL COLUMN NAVIGATION LIST (СПИСОК В СТОЛБИК С СКРОЛЛОМ)  */}
        {/* =================================================================== */}
        <div className={`w-full md:w-64 bg-[#131c26] md:border-r border-[#0e1621] p-3 sm:p-4 flex flex-col gap-1.5 overflow-y-auto scrollbar-thin shrink-0 text-xs h-full min-h-0 max-h-full overscroll-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-y] ${
          mobileView === 'content' ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="flex items-center justify-between px-3 py-2 mb-1 text-slate-300 font-bold text-xs uppercase tracking-wider border-b border-[#202b36] pb-3">
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#5288c1]" />
              <span>Настройки</span>
            </span>
            <span className="text-[10px] text-slate-500 font-normal">v4.18</span>
          </div>

          <button
            onClick={() => handleSelectTab('profile')}
            className={`w-full px-3.5 py-3 rounded-2xl text-left font-medium transition flex items-center justify-between cursor-pointer ${
              activeTab === 'profile' ? 'bg-[#5288c1] text-white shadow' : 'text-slate-200 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Профиль</div>
                <div className="text-[10px] text-slate-400">Имя, юзернейм, био и аватарка</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          <button
            onClick={() => handleSelectTab('account')}
            className={`w-full px-3.5 py-3 rounded-2xl text-left font-medium transition flex items-center justify-between cursor-pointer border border-[#5288c1]/30 ${
              activeTab === 'account' ? 'bg-[#5288c1] text-white shadow' : 'bg-[#1a2634] text-slate-200 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-[#64b5f6] shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Аккаунт и вход</div>
                <div className="text-[10px] text-[#64b5f6]">Смена, выход, удалить аккаунт</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          <button
            onClick={() => handleSelectTab('password')}
            className={`w-full px-3.5 py-3 rounded-2xl text-left font-medium transition flex items-center justify-between cursor-pointer border border-indigo-500/30 ${
              activeTab === 'password' ? 'bg-gradient-to-r from-indigo-600 to-[#5288c1] text-white shadow font-bold' : 'bg-[#1a2634] text-slate-200 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-indigo-200">Пароль и 6-значный ПИН</div>
                <div className="text-[10px] text-indigo-300/80">Сменить код, защиту профиля</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0" />
          </button>

          {/* 9. ГОЛОСОВОЙ АВТООТВЕТЧИК BUTTON */}
          <button
            onClick={() => handleSelectTab('answering_machine')}
            className={`w-full px-3.5 py-3 rounded-2xl text-left font-medium transition flex items-center justify-between cursor-pointer border border-purple-500/40 ${
              activeTab === 'answering_machine'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-[#5288c1] text-white shadow font-bold'
                : 'bg-purple-950/20 text-purple-200 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 shrink-0">
                <Voicemail className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-purple-200 flex items-center gap-1.5">
                  <span>Автоответчик</span>
                  {amEnabled ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                  )}
                </div>
                <div className="text-[10px] text-purple-300/80">TTS, приветствие, расписание</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-purple-400 shrink-0" />
          </button>

          {/* ОФОРМЛЕНИЕ И ТЕМА */}
          <button
            onClick={() => handleSelectTab('appearance')}
            className={`w-full px-3.5 py-3 rounded-2xl text-left font-medium transition flex items-center justify-between cursor-pointer ${
              activeTab === 'appearance' ? 'bg-[#5288c1] text-white shadow' : 'text-slate-200 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400 shrink-0">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Оформление и Тема</div>
                <div className="text-[10px] text-slate-400">Тёмная/Светлая, цвета, шрифт</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          {/* ЯЗЫК И ИНТЕРФЕЙС */}
          <button
            onClick={() => handleSelectTab('language')}
            className={`w-full px-3.5 py-3 rounded-2xl text-left font-medium transition flex items-center justify-between cursor-pointer ${
              activeTab === 'language' ? 'bg-[#5288c1] text-white shadow' : 'text-slate-200 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Язык приложения</div>
                <div className="text-[10px] text-slate-400">Русский, English, Қазақша, O'zbek</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          {/* НАСТРОЙКИ ЗВОНКОВ */}
          <button
            onClick={() => handleSelectTab('call_settings')}
            className={`w-full px-3.5 py-3 rounded-2xl text-left font-medium transition flex items-center justify-between cursor-pointer ${
              activeTab === 'call_settings' ? 'bg-[#5288c1] text-white shadow' : 'text-slate-200 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Настройки звонков</div>
                <div className="text-[10px] text-slate-400">STUN сервер, микрофон, рингтон</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          <button
            onClick={() => handleSelectTab('install_app')}
            className={`w-full px-3.5 py-3 rounded-2xl text-left font-medium transition flex items-center justify-between cursor-pointer border border-emerald-500/30 ${
              activeTab === 'install_app'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-[#5288c1] text-white shadow font-bold'
                : 'bg-emerald-950/20 text-emerald-300 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-emerald-300">Установить приложение</div>
                <div className="text-[10px] text-emerald-400/80">Windows, Android APK, iOS</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0" />
          </button>

          <button
            onClick={() => handleSelectTab('notifications')}
            className={`w-full px-3.5 py-3 rounded-2xl text-left font-medium transition flex items-center justify-between cursor-pointer ${
              activeTab === 'notifications' ? 'bg-[#5288c1] text-white shadow' : 'text-slate-200 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Уведомления</div>
                <div className="text-[10px] text-slate-400">Звуки, звонки, превью</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          <button
            onClick={() => handleSelectTab('storage')}
            className={`w-full px-3.5 py-3 rounded-2xl text-left font-medium transition flex items-center justify-between cursor-pointer ${
              activeTab === 'storage' ? 'bg-[#5288c1] text-white shadow' : 'text-slate-200 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Память и данные</div>
                <div className="text-[10px] text-slate-400">Кэш, автозагрузка</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          <button
            onClick={() => handleSelectTab('blacklist')}
            className={`w-full px-3.5 py-3 rounded-2xl text-left font-medium transition flex items-center justify-between cursor-pointer ${
              activeTab === 'blacklist' ? 'bg-[#5288c1] text-white shadow' : 'text-slate-200 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Черный список</div>
                <div className="text-[10px] text-slate-400">Заблокированные контакты</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          <button
            onClick={() => handleSelectTab('devices')}
            className={`w-full px-3.5 py-3 rounded-2xl text-left font-medium transition flex items-center justify-between cursor-pointer ${
              activeTab === 'devices' ? 'bg-[#5288c1] text-white shadow' : 'text-slate-200 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Устройства</div>
                <div className="text-[10px] text-slate-400">Активные сессии, ПК и моб.</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          <button
            onClick={() => handleSelectTab('privacy')}
            className={`w-full px-3.5 py-3 rounded-2xl text-left font-medium transition flex items-center justify-between cursor-pointer ${
              activeTab === 'privacy' ? 'bg-[#5288c1] text-white shadow' : 'text-slate-200 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Приватность</div>
                <div className="text-[10px] text-slate-400">Номер телефона, звонки</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          <button
            onClick={() => handleSelectTab('folders')}
            className={`w-full px-3.5 py-3 rounded-2xl text-left font-medium transition flex items-center justify-between cursor-pointer ${
              activeTab === 'folders' ? 'bg-[#5288c1] text-white shadow' : 'text-slate-200 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 shrink-0">
                <FolderPlus className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Папки чатов</div>
                <div className="text-[10px] text-slate-400">Группировка диалогов</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          <button
            onClick={() => handleSelectTab('version')}
            className={`w-full px-3.5 py-3 rounded-2xl text-left font-medium transition flex items-center justify-between cursor-pointer ${
              activeTab === 'version' ? 'bg-[#5288c1] text-white shadow' : 'text-slate-200 hover:bg-[#202b36]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-500/20 text-slate-400 shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Информация и версия</div>
                <div className="text-[10px] text-slate-400">AuraChat Web Architecture</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          {/* Direct Account Action Buttons in Left Sidebar */}
          <div className="pt-2 mt-1 border-t border-[#202b36] space-y-1.5">
            <button
              onClick={() => {
                setShowSwitchAccountList(true);
                handleSelectTab('account');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e2a38] hover:bg-[#283748] text-[#64b5f6] font-bold text-xs flex items-center gap-2.5 transition cursor-pointer border border-[#2b3c4f]"
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span>Смена аккаунта</span>
            </button>

            <button
              onClick={() => {
                playReactionSound();
                onLogout?.();
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-xs flex items-center gap-2.5 transition cursor-pointer border border-amber-500/30"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Выйти из аккаунта</span>
            </button>

            <button
              onClick={() => {
                setShowDeleteConfirm(true);
                handleSelectTab('account');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-xs flex items-center gap-2.5 transition cursor-pointer border border-rose-500/30"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Удалить аккаунт</span>
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT CONTENT PANEL WITH VERTICAL SMOOTH SCROLLING                 */}
        {/* =================================================================== */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin text-xs h-full min-h-0 max-h-full overscroll-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-y] ${
          mobileView === 'menu' ? 'hidden md:block' : 'block'
        }`}>
          {/* Mobile Back Button to Return to Settings Column List */}
          <button
            onClick={() => setMobileView('menu')}
            className="md:hidden flex items-center gap-1.5 text-xs text-[#5288c1] hover:text-white font-bold pb-2 border-b border-[#243344] mb-3 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>← Вернуться к списку настроек</span>
          </button>
          
          {/* TAB 1: ПРОФИЛЬ */}
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-[#64b5f6]" /> Мой Профиль
              </h3>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#1e2a38] border border-[#283748]">
                <div className="flex items-center gap-4">
                  <div 
                    onClick={() => setIsAvatarEditorOpen(true)}
                    className="relative group shrink-0 cursor-pointer"
                    title="Нажмите, чтобы изменить фото профиля"
                  >
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-2 ring-[#5288c1] group-hover:scale-105 transition"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                    <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#5288c1] text-white shadow-md">
                      <Camera className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-white">{displayName}</h4>
                    <p className="text-slate-400 font-mono text-xs">@{username}</p>
                    <p className={`text-[11px] mt-0.5 flex items-center gap-1.5 font-medium ${
                      user.isOnline !== false && !user.hideOnlineStatus ? 'text-emerald-400' : 'text-slate-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        user.isOnline !== false && !user.hideOnlineStatus ? 'bg-emerald-400' : 'bg-slate-500'
                      }`} />
                      <span>{user.hideOnlineStatus ? 'Невидимка (был(а) в сети недавно)' : (user.lastSeen || 'в сети')}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAvatarEditorOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#5288c1] hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
                >
                  <Camera className="w-4 h-4" />
                  <span>Изменить аватарку</span>
                </button>
              </div>

              {/* ВЫБОР И АВТОМАТИЧЕСКАЯ РАБОТА СТАТУСА В СЕТИ (Видят все пользователи) */}
              <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Мой статус в соцсети (видят все пользователи):</span>
                  </div>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#131c26] text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      user.isOnline !== false && !user.hideOnlineStatus ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                    }`} />
                    <span>
                      Сейчас у всех: {user.hideOnlineStatus ? 'был(а) в сети недавно (Невидимка)' : (user.lastSeen || 'в сети')}
                    </span>
                  </span>
                </div>

                {/* Автоматический режим работы при входе и выходе */}
                <div className="p-2.5 rounded-xl bg-[#131c26] border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-[11px] text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Автоматический режим статуса (Вход / Выход из соцсети)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playSentSound();
                        onUpdateUser({
                          isOnline: true,
                          lastSeen: 'в сети',
                          hideOnlineStatus: false,
                          settings: {
                            ...user.settings,
                            presenceMode: 'auto',
                            offlineAt: undefined
                          } as any
                        });
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        (user.settings as any)?.presenceMode !== 'manual' && !user.hideOnlineStatus
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-[#1e2a38] text-slate-300 hover:text-white border border-[#283748]'
                      }`}
                    >
                      {(user.settings as any)?.presenceMode !== 'manual' && !user.hideOnlineStatus
                        ? '✓ Работает автоматически'
                        : 'Включить авто-режим'}
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-relaxed space-y-0.5">
                    <div>• Если вы зашли в соцсеть (даже если было «был недавно») → у всех сразу: <span className="text-emerald-400 font-semibold">«в сети»</span></div>
                    <div>• Как только вы вышли из соцсети → у всех пишет: <span className="text-amber-300 font-semibold">«был(а) только что в сети»</span></div>
                    <div>• Через несколько минут после выхода → <span className="text-slate-300 font-semibold">«был(а) 1 мин назад» → «был(а) в сети недавно»</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: '⚡ Авто (В сети при входе)', status: 'в сети', isOnline: true, ghost: false, mode: 'auto' },
                    { label: '🟢 В сети', status: 'в сети', isOnline: true, ghost: false, mode: 'manual' },
                    { label: '🕒 Был(а) только что в сети', status: 'был(а) только что в сети', isOnline: false, ghost: false, mode: 'manual' },
                    { label: '🕒 Был(а) в сети недавно', status: 'был(а) в сети недавно', isOnline: false, ghost: false, mode: 'manual' },
                    { label: '⏱️ Был(а) 1 мин назад', status: 'был(а) 1 мин назад', isOnline: false, ghost: false, mode: 'manual' },
                    { label: '👻 Невидимка (скрыт)', status: 'был(а) в сети недавно', isOnline: false, ghost: true, mode: 'manual' }
                  ].map((item) => {
                    const currentMode = (user.settings as any)?.presenceMode || 'auto';
                    const isActive = item.ghost
                      ? Boolean(user.hideOnlineStatus)
                      : item.mode === 'auto'
                        ? currentMode === 'auto' && !user.hideOnlineStatus
                        : currentMode === 'manual' && !user.hideOnlineStatus && (user.lastSeen || 'в сети') === item.status;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          playSentSound();
                          onUpdateUser({
                            isOnline: item.isOnline,
                            lastSeen: item.status,
                            hideOnlineStatus: item.ghost,
                            settings: {
                              ...user.settings,
                              presenceMode: item.mode,
                              offlineAt: item.isOnline ? undefined : Date.now()
                            } as any
                          });
                        }}
                        className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold text-left border transition cursor-pointer flex items-center justify-between gap-1 ${
                          isActive
                            ? 'bg-[#5288c1] border-blue-400 text-white shadow'
                            : 'bg-[#131c26] border-[#283748] text-slate-300 hover:text-white hover:bg-[#202b36]'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {isActive && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Отображаемое имя</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[#242f3d] rounded-xl px-3.5 py-2 text-white outline-none border border-transparent focus:border-[#5288c1]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400">Имя пользователя (Username)</label>
                    <span className="text-[10px] text-amber-400 font-medium">Сохранение на 7 дней</span>
                  </div>
                  <input
                    type="text"
                    value={username}
                    placeholder="user156262655"
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#242f3d] rounded-xl px-3.5 py-2 text-white outline-none border border-transparent focus:border-[#5288c1] font-mono text-xs"
                  />
                  <div className="mt-1.5 p-2 rounded-xl bg-[#131c26] border border-[#283748] text-[11px] text-slate-400 space-y-1">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Формат по умолчанию:</span>
                      <span className="font-mono text-cyan-400">user156262655</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      💡 Если оставить пустым, система автоматически присвоит имя вида <span className="font-mono text-slate-400">user156262655</span>. При сохранении имя пользователя фиксируется на 7 дней, новую смену можно сделать только на 7-й день.
                    </p>
                    {user.usernameLastChanged && (
                      <div className="text-[10px] text-amber-300 font-mono pt-0.5">
                        🔒 Срок 7 дней активен (до {new Date(new Date(user.usernameLastChanged).getTime() + 7 * 86400000).toLocaleDateString()})
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Номер телефона</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#242f3d] rounded-xl px-3.5 py-2 text-white outline-none border border-transparent focus:border-[#5288c1] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">О себе (Био)</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-[#242f3d] rounded-xl px-3.5 py-2 text-white outline-none border border-transparent focus:border-[#5288c1] resize-none"
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full py-2.5 bg-[#5288c1] hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Сохранить изменения профиля</span>
                </button>

                {profileSaved && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-center font-semibold border border-emerald-500/30">
                    ✓ Данные профиля успешно обновлены
                  </div>
                )}

                {/* БЛОК УПРАВЛЕНИЯ АККАУНТОМ ПРЯМО В ПРОФИЛЕ */}
                <div className="pt-4 mt-4 border-t border-[#243344] space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Управление аккаунтом
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSwitchAccountList(!showSwitchAccountList)}
                      className="py-2.5 px-3 rounded-xl bg-[#1e2a38] hover:bg-[#283748] text-[#64b5f6] border border-[#2b3c4f] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Смена аккаунта</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playReactionSound();
                        onLogout?.();
                      }}
                      className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Выйти из аккаунта</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                      className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Удалить аккаунт</span>
                    </button>
                  </div>

                  {/* Раскрывающийся список для быстрой смены аккаунта */}
                  {showSwitchAccountList && (
                    <div className="p-3.5 rounded-2xl bg-[#131c26] border border-[#283748] space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                        <span>Выберите аккаунт для переключения:</span>
                        <button
                          type="button"
                          onClick={() => setShowSwitchAccountList(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>

                      {savedAccounts.map((acc) => {
                        const isCurrent = acc.id === user.id || acc.username === user.username;
                        return (
                          <div
                            key={acc.id}
                            onClick={() => {
                              if (!isCurrent && onSwitchUser) {
                                playSentSound();
                                onSwitchUser(acc);
                              }
                            }}
                            className={`p-2.5 rounded-xl flex items-center justify-between border transition ${
                              isCurrent
                                ? 'bg-[#2b5278]/40 border-[#5288c1] cursor-default'
                                : 'bg-[#1e2a38] hover:bg-[#283748] border-[#283748] cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <img src={acc.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                              <div>
                                <div className="font-bold text-xs text-white flex items-center gap-1.5">
                                  <span>{acc.displayName}</span>
                                  {acc.pinCode && <Lock className="w-3 h-3 text-[#64b5f6]" />}
                                </div>
                                <div className="text-[10px] text-[#64b5f6] font-mono flex items-center gap-1">
                                  <span>@{acc.username}</span>
                                  <span className="text-slate-500">•</span>
                                  {acc.pinCode ? (
                                    <span className="text-emerald-400">🔒 ПИН 6 цифр</span>
                                  ) : (
                                    <span className="text-amber-400">⚠️ ПИН не создан</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isCurrent ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                Текущий
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-[#5288c1] text-white text-[10px] font-bold">
                                Переключить
                              </span>
                            )}
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => {
                          playReactionSound();
                          onLogout?.();
                        }}
                        className="w-full py-2 rounded-xl bg-[#242f3d] hover:bg-[#5288c1] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Добавить или войти в другой аккаунт</span>
                      </button>
                    </div>
                  )}

                  {/* Подтверждение удаления аккаунта */}
                  {showDeleteConfirm && (
                    <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 space-y-3 animate-in fade-in">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-xs text-white">Удаление аккаунта @{user.username}</div>
                          <p className="text-[11px] text-rose-200/90 mt-0.5 leading-relaxed">
                            Вы действительно хотите навсегда удалить этот аккаунт из AuraChat? Все ваши личные данные и сессии будут сброшены.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            playSentSound();
                            if (onDeleteAccount) {
                              onDeleteAccount(user.id);
                            } else {
                              onLogout?.();
                            }
                          }}
                          className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer transition shadow-md"
                        >
                          Да, удалить аккаунт навсегда
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-4 py-2 rounded-xl bg-[#1e2a38] hover:bg-[#283748] text-slate-300 font-bold text-xs cursor-pointer"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1.5: АККАУНТ И ВХОД (СМЕНА, ВЫХОД, УДАЛЕНИЕ) */}
          {activeTab === 'account' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-[#64b5f6]" /> Управление аккаунтом AuraChat
              </h3>

              {/* Current Active Account Card */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#5288c1]/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[#5288c1]"
                  />
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>{user.displayName}</span>
                      {user.pinCode && <Lock className="w-3.5 h-3.5 text-[#64b5f6]" />}
                    </div>
                    <div className="text-xs text-[#64b5f6] font-mono">@{user.username}</div>
                    <div className="text-[10px] text-emerald-400">
                      {user.pinCode ? '✓ Защищён 6-значным ПИН' : '⚠️ ПИН-код не задан'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    playReactionSound();
                    onLogout?.();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Выйти</span>
                </button>
              </div>

              {/* 1. Смена аккаунта (по ПИН-коду) */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-2.5">
                <div className="font-bold text-xs text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#64b5f6]" />
                    <span>Смена аккаунта (по 6-значному ПИН-коду)</span>
                  </div>
                  <span className="text-[10px] text-[#64b5f6] bg-[#5288c1]/20 px-2 py-0.5 rounded-md font-mono">
                    Защита 6-PIN
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  При переключении на аккаунт запрашивается 6-значный ПИН-код безопасности. Если код ещё не создан, будет предложено задать новый:
                </p>

                <div className="space-y-2 pt-1">
                  {savedAccounts.map((acc) => {
                    const isCurrent = acc.id === user.id || acc.username === user.username;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => {
                          if (!isCurrent && onSwitchUser) {
                            playSentSound();
                            onSwitchUser(acc);
                          }
                        }}
                        className={`p-3 rounded-xl flex items-center justify-between border transition ${
                          isCurrent
                            ? 'bg-[#2b5278]/40 border-[#5288c1] cursor-default'
                            : 'bg-[#131c26] hover:bg-[#243344] border-[#283748] cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img src={acc.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                          <div>
                            <div className="font-bold text-xs text-white flex items-center gap-1.5">
                              <span>{acc.displayName}</span>
                              {acc.pinCode && <Lock className="w-3.5 h-3.5 text-[#64b5f6]" />}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                              <span>@{acc.username}</span>
                              <span>•</span>
                              {acc.pinCode ? (
                                <span className="text-emerald-400 text-[10px]">🔒 ПИН 6 цифр</span>
                              ) : (
                                <span className="text-amber-400 text-[10px]">⚠️ ПИН не создан (предложит)</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isCurrent ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                            Активен
                          </span>
                        ) : (
                          <button className="px-3 py-1.5 rounded-xl bg-[#5288c1] hover:bg-blue-500 text-white text-xs font-bold cursor-pointer">
                            Войти (PIN)
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    playReactionSound();
                    onLogout?.();
                  }}
                  className="w-full py-2.5 mt-2 rounded-xl bg-[#242f3d] hover:bg-[#5288c1] text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить ещё один аккаунт / Зарегистрировать</span>
                </button>
              </div>

              {/* 2. Полностью выйти из аккаунта */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                      <LogOut className="w-4 h-4" />
                      <span>Полностью выйти из аккаунта</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Завершить текущий сеанс @{user.username} и вернуться на экран авторизации
                    </div>
                  </div>
                  {!showLogoutConfirm && (
                    <button
                      onClick={() => setShowLogoutConfirm(true)}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer transition shrink-0"
                    >
                      Выйти из аккаунта
                    </button>
                  )}
                </div>

                {/* Logout Confirmation Box */}
                {showLogoutConfirm && (
                  <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-3 animate-in fade-in">
                    <div className="text-xs text-amber-200 font-semibold leading-relaxed">
                      Вы действительно хотите полностью выйти из аккаунта <strong>@{user.username}</strong>?
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={forgetAccountOnLogout}
                        onChange={(e) => setForgetAccountOnLogout(e.target.checked)}
                        className="w-4 h-4 accent-[#5288c1] rounded cursor-pointer"
                      />
                      <span>Забыть и удалить аккаунт из сохранённых на этом устройстве</span>
                    </label>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          playSentSound();
                          onLogout?.(forgetAccountOnLogout);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer transition shadow"
                      >
                        Да, полностью выйти
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLogoutConfirm(false)}
                        className="px-4 py-2.5 rounded-xl bg-[#141d26] hover:bg-[#202b36] text-slate-300 font-bold text-xs cursor-pointer transition"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Удалить аккаунт */}
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-rose-400 flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4" />
                      <span>Удалить аккаунт навсегда</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Полное удаление учётной записи @{user.username}, переписок и медиафайлов
                    </div>
                  </div>
                  {!showDeleteConfirm && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer transition shrink-0"
                    >
                      Удалить аккаунт
                    </button>
                  )}
                </div>

                {showDeleteConfirm && (
                  <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 space-y-2.5">
                    <p className="text-xs text-rose-200 font-semibold">
                      ⚠️ Подтвердите удаление аккаунта @{user.username}. Это действие необратимо.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          playSentSound();
                          if (onDeleteAccount) {
                            onDeleteAccount(user.id);
                          } else {
                            onLogout?.();
                          }
                        }}
                        className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer transition shadow-md"
                      >
                        Да, удалить аккаунт
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 rounded-xl bg-[#1e2a38] text-slate-300 font-bold text-xs cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1.6: ПАРОЛЬ И 6-ЗНАЧНЫЙ ПИН-КОД */}
          {activeTab === 'password' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Пароль и 6-значный ПИН-код</h3>
                  <p className="text-xs text-slate-400">Управление защитой профиля @{user.username} и быстрым входом</p>
                </div>
              </div>

              {/* Subtab Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#141d26] rounded-xl border border-[#283748]">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordSubTab('pin');
                    setPinChangeMsg(null);
                  }}
                  className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                    passwordSubTab === 'pin'
                      ? 'bg-[#5288c1] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>6-значный ПИН-код (Быстрый вход)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordSubTab('password');
                    setPasswordChangeMsg(null);
                  }}
                  className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                    passwordSubTab === 'password'
                      ? 'bg-[#5288c1] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Текстовый пароль</span>
                </button>
              </div>

              {/* SUBTAB 1: 6-DIGIT PIN */}
              {passwordSubTab === 'pin' && (
                <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#2b3c4f] space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#283748]">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-[#64b5f6]" />
                        <span>6-значный ПИН-код безопасности</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Запрашивается при входе в профиль и переключении аккаунтов
                      </div>
                    </div>
                    {user.pinCode ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                        <Check className="w-3 h-3" /> Защита активна
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                        ⚠️ Не установлен
                      </span>
                    )}
                  </div>

                  {user.pinCode && (
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">
                        Текущий 6-значный ПИН-код:
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="••••••"
                        value={currentPinInput}
                        onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full bg-[#141d26] border border-[#2b3c4f] focus:border-[#5288c1] rounded-xl px-3.5 py-2.5 text-white font-mono tracking-widest outline-none text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">
                      Новый 6-значный ПИН-код:
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Введите ровно 6 цифр (напр. 123456)"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full bg-[#141d26] border border-[#2b3c4f] focus:border-[#5288c1] rounded-xl px-3.5 py-2.5 text-white font-mono tracking-widest outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">
                      Повторите новый 6-значный ПИН-код:
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Повторите 6 цифр для подтверждения"
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full bg-[#141d26] border border-[#2b3c4f] focus:border-[#5288c1] rounded-xl px-3.5 py-2.5 text-white font-mono tracking-widest outline-none text-sm"
                    />
                  </div>

                  {pinChangeMsg && (
                    <div className={`p-2.5 rounded-xl text-xs font-bold text-center border ${
                      pinChangeMsg.type === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}>
                      {pinChangeMsg.text}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveNewPin}
                      disabled={newPinInput.length !== 6 || confirmPinInput.length !== 6}
                      className="flex-1 py-2.5 rounded-xl bg-[#5288c1] hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer disabled:cursor-not-allowed shadow"
                    >
                      {user.pinCode ? 'Сохранить новый ПИН-код' : 'Установить 6-значный ПИН'}
                    </button>

                    {user.pinCode && (
                      <button
                        type="button"
                        onClick={handleResetPin}
                        className="px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 font-bold text-xs transition cursor-pointer"
                      >
                        Сбросить ПИН
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* SUBTAB 2: TEXT PASSWORD */}
              {passwordSubTab === 'password' && (
                <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#2b3c4f] space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#283748]">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-[#64b5f6]" />
                        <span>Текстовый пароль учётной записи</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Основной пароль для авторизации по логину и телефону
                      </div>
                    </div>
                    {user.password ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                        <Check className="w-3 h-3" /> Пароль задан
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                        ⚠️ Не задан
                      </span>
                    )}
                  </div>

                  {user.password && (
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">
                        Текущий пароль:
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswordText ? 'text' : 'password'}
                          placeholder="Введите ваш текущий пароль"
                          value={currentPasswordInput}
                          onChange={(e) => setCurrentPasswordInput(e.target.value)}
                          className="w-full bg-[#141d26] border border-[#2b3c4f] focus:border-[#5288c1] rounded-xl px-3.5 py-2.5 pr-10 text-white font-mono outline-none text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordText(!showPasswordText)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">
                      Новый пароль:
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswordText ? 'text' : 'password'}
                        placeholder="Придумайте новый пароль (от 4 символов)"
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        className="w-full bg-[#141d26] border border-[#2b3c4f] focus:border-[#5288c1] rounded-xl px-3.5 py-2.5 pr-10 text-white font-mono outline-none text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordText(!showPasswordText)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">
                      Повторите новый пароль:
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswordText ? 'text' : 'password'}
                        placeholder="Повторите новый пароль"
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        className="w-full bg-[#141d26] border border-[#2b3c4f] focus:border-[#5288c1] rounded-xl px-3.5 py-2.5 pr-10 text-white font-mono outline-none text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordText(!showPasswordText)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {passwordChangeMsg && (
                    <div className={`p-2.5 rounded-xl text-xs font-bold text-center border ${
                      passwordChangeMsg.type === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}>
                      {passwordChangeMsg.text}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveNewPassword}
                    disabled={newPasswordInput.length < 4 || newPasswordInput !== confirmPasswordInput}
                    className="w-full py-2.5 rounded-xl bg-[#5288c1] hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer disabled:cursor-not-allowed shadow"
                  >
                    Сохранить новый пароль
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: УСТАНОВИТЬ ПРИЛОЖЕНИЕ */}
          {activeTab === 'install_app' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Установка AuraChat</h3>
                  <p className="text-xs text-slate-400">Быстрое скачивание и установка на любое устройство — ПК, Android, iOS</p>
                </div>
              </div>

              {/* 1. Android APK */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Android (.APK файл)</h4>
                      <p className="text-xs text-slate-400">Прямое скачивание без Google Play. Работает на любых версиях Android.</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    APK 3.2.0
                  </span>
                </div>

                <a
                  href="/downloads/aurachat_v3.2.0.apk"
                  download="aurachat_v3.2.0.apk"
                  onClick={(e) => {
                    e.preventDefault();
                    const apkBlob = new Blob(['AuraChat Android Client Package v3.2.0'], { type: 'application/vnd.android.package-archive' });
                    const url = URL.createObjectURL(apkBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'aurachat_v3.2.0.apk';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Скачать .APK на Android (Прямая загрузка)</span>
                </a>
              </div>

              {/* 2. iOS (iPhone / iPad) */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">iOS (iPhone & iPad)</h4>
                    <p className="text-xs text-slate-400">Инструкция по установке Web App без App Store</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#141d26] border border-[#202d3a] space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#5288c1] text-white flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                    <span>Откройте данный сайт в браузере <strong>Safari</strong> на iPhone/iPad.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#5288c1] text-white flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                    <span>Нажмите кнопку <strong>«Поделиться»</strong> (<Share className="w-3 h-3 inline text-blue-400" />) в нижней панели Safari.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#5288c1] text-white flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                    <span>Прокрутите вниз и выберите <strong>«На экран "Домой"»</strong> (Add to Home Screen).</span>
                  </div>
                </div>
              </div>

              {/* 3. Компьютер (Windows / Mac / Linux PWA) */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Компьютер (Windows / Mac / Linux)</h4>
                      <p className="text-xs text-slate-400">Нативное приложение для ПК в один клик. Легкое скачивание и вы в системе!</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    alert('Для установки на ПК нажмите иконку уровня адреса страницы в браузере «Установить AuraChat» или нажмите Ctrl+D, чтобы добавить ярлык!');
                  }}
                  className="w-full py-2.5 bg-[#5288c1] hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <Laptop className="w-4 h-4" />
                  <span>Установить ярлык / PWA приложение на ПК</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: УВЕДОМЛЕНИЯ И ЗВУКИ (СВОЙ ЗВОНОК И УВЕДОМЛЕНИЕ С УСТРОЙСТВА) */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" /> Уведомления и Звуки устройства
              </h3>

              {/* 1. Звук уведомления (Свой с устройства или Системный звук устройства) */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      <span>Звук уведомлений в чатах</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Выберите системный звук устройства или загрузите свой аудиофайл
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => playNotificationSound('Проверка уведомления', 'Звук уведомления AuraChat работает!')}
                    className="px-3 py-1.5 rounded-xl bg-[#0077FF] hover:bg-blue-500 text-white text-[11px] font-bold transition cursor-pointer shrink-0"
                  >
                    🔊 Проверить звук
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    { id: 'device_system', label: '📱 Звук устройства' },
                    { id: 'vk_knock', label: '💬 Стук ВК' },
                    { id: 'chime', label: '✨ Кристалл' },
                    { id: 'silent', label: '🔕 Без звука' }
                  ] as Array<{ id: NotificationSoundMode; label: string }>).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const updated = saveSoundSettings({ notificationMode: opt.id });
                        setSoundConfig(updated);
                        setNotifSound(opt.id !== 'silent');
                        if (opt.id !== 'silent') playNotificationSound();
                      }}
                      className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                        soundConfig.notificationMode === opt.id
                          ? 'bg-[#5288c1] border-blue-400 text-white shadow'
                          : 'bg-[#131c26] border-[#283748] text-slate-300 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Upload Custom Notification Sound from Device */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <label className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition">
                    <Upload className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">
                      {soundConfig.customNotificationName
                        ? `Свой звук уведомления: ${soundConfig.customNotificationName}`
                        : 'Поставить свой звук уведомления с устройства (MP3/WAV/OGG)'}
                    </span>
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadNotificationFile(file);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* 2. Звонок (Свой рингтон с устройства или звук устройства) */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <span>Мелодия звонка (Рингтон вызова)</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Установите свой звонок с устройства или стандартный сигнал
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => previewRingtone(soundConfig)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition cursor-pointer"
                    >
                      ▶ Слушать
                    </button>
                    <button
                      type="button"
                      onClick={() => stopCallAudio()}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold transition cursor-pointer"
                    >
                      ■ Стоп
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    { id: 'device_system', label: '📱 Звук устройства' },
                    { id: 'melody_vk', label: '🎵 AuraChat' },
                    { id: 'classic_phone', label: '☎️ Классический' },
                    { id: 'silent', label: '🔕 Без звука' }
                  ] as Array<{ id: RingtoneMode; label: string }>).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const updated = saveSoundSettings({ ringtoneMode: opt.id });
                        setSoundConfig(updated);
                        setNotifCalls(opt.id !== 'silent');
                        if (opt.id !== 'silent') previewRingtone(updated);
                        else stopCallAudio();
                      }}
                      className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                        soundConfig.ringtoneMode === opt.id
                          ? 'bg-emerald-600 border-emerald-400 text-white shadow'
                          : 'bg-[#131c26] border-[#283748] text-slate-300 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <label className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition">
                  <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {soundConfig.customRingtoneName
                      ? `Свой звонок: ${soundConfig.customRingtoneName}`
                      : 'Поставить свой звонок с устройства (MP3/WAV/OGG)'}
                  </span>
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadRingtoneFile(file);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>

              {/* 3. Громкость и системные Push-уведомления устройства */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Громкость звонка и уведомлений:</span>
                  <span className="font-mono text-[#64b5f6] font-bold">{Math.round((soundConfig.volume ?? 0.85) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={soundConfig.volume ?? 0.85}
                  onChange={(e) => {
                    const vol = parseFloat(e.target.value);
                    const updated = saveSoundSettings({ volume: vol });
                    setSoundConfig(updated);
                  }}
                  className="w-full accent-[#5288c1] cursor-pointer"
                />

                <div className="pt-2 border-t border-[#283748] flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white">Системные уведомления устройства (Push + Звук ОС)</div>
                    <div className="text-[11px] text-slate-400">
                      Статус разрешения браузера/ОС: <span className="font-mono text-emerald-400">{pushPermStatus}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestDeviceNotifications}
                    className="px-3 py-1.5 rounded-xl bg-[#5288c1] hover:bg-blue-500 text-white text-[11px] font-bold transition cursor-pointer shrink-0"
                  >
                    {pushPermStatus === 'granted' ? '✓ Активно (Тест)' : 'Разрешить на устройстве'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Предпросмотр сообщений</div>
                    <div className="text-[11px] text-slate-400">Показывать имя отправителя и текст в баннере</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPreview}
                    onChange={(e) => setNotifPreview(e.target.checked)}
                    className="w-5 h-5 accent-[#5288c1] cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Вибрация на мобильных устройствах</div>
                    <div className="text-[11px] text-slate-400">Виброотклик устройства при звонках и сообщениях</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifVibration}
                    onChange={(e) => {
                      setNotifVibration(e.target.checked);
                      setSoundConfig(saveSoundSettings({ vibrationEnabled: e.target.checked }));
                    }}
                    className="w-5 h-5 accent-[#5288c1] cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>Звуковые сигналы интерфейса (Пищалка)</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        soundConfig.uiSoundsEnabled ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {soundConfig.uiSoundsEnabled ? 'Включена' : 'Выключена'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Звуковой сигнал при нажатии кнопок, лайках, отправке и скачивании (выключено)
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!soundConfig.uiSoundsEnabled}
                    onChange={(e) => {
                      const updated = saveSoundSettings({ uiSoundsEnabled: e.target.checked });
                      setSoundConfig(updated);
                    }}
                    className="w-5 h-5 accent-[#5288c1] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ПАМЯТЬ И ДАННЫЕ */}
          {activeTab === 'storage' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-400" /> Использование Памяти и Кэш
              </h3>

              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Занято кэшем приложения:</span>
                  <span className="font-bold font-mono text-emerald-400 text-sm">{cacheSizeMb} MB</span>
                </div>

                {/* Storage Bar */}
                <div className="w-full h-3 bg-[#131c26] rounded-full overflow-hidden flex">
                  <div className="h-full bg-blue-500 w-2/5" title="Медиа и фото" />
                  <div className="h-full bg-purple-500 w-1/4" title="GIF и стикеры" />
                  <div className="h-full bg-rose-500 w-1/6" title="Голосовые сообщения" />
                  <div className="h-full bg-slate-600 flex-1" title="Прочее" />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Фото (62 MB)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> GIF (45 MB)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Голосовые (31 MB)</span>
                </div>

                <button
                  onClick={handleClearCache}
                  disabled={cacheSizeMb === 0}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl font-bold transition shadow cursor-pointer mt-2"
                >
                  Очистить весь кэш ({cacheSizeMb} MB)
                </button>

                {cacheClearedMsg && (
                  <div className="p-2 text-center text-emerald-300 font-semibold text-xs">
                    ✓ Кэш успешно очищен, память освобождена!
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Автозагрузка медиа</div>
                  <div className="text-[11px] text-slate-400">Автоматически загружать фото и видео в чатах</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoDownload}
                  onChange={(e) => setAutoDownload(e.target.checked)}
                  className="w-5 h-5 accent-[#5288c1] cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 4: ЧЕРНЫЙ СПИСОК */}
          {activeTab === 'blacklist' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" /> Черный список (Заблокированные)
              </h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Юзернейм для блокировки (@username)..."
                  value={newBlockedUsername}
                  onChange={(e) => setNewBlockedUsername(e.target.value)}
                  className="flex-1 bg-[#242f3d] rounded-xl px-3.5 py-2 text-white outline-none border border-transparent focus:border-[#5288c1]"
                />
                <button
                  onClick={handleAddBlocked}
                  disabled={!newBlockedUsername.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl font-bold transition cursor-pointer"
                >
                  Заблокировать
                </button>
              </div>

              <div className="space-y-2">
                {blockedList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-[#1e2a38] border border-[#283748] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white">{item.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">@{item.username} • {item.date}</div>
                    </div>
                    <button
                      onClick={() => handleUnblock(item.id)}
                      className="px-3 py-1 bg-[#242f3d] hover:bg-[#314154] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Разблокировать
                    </button>
                  </div>
                ))}

                {blockedList.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    Черный список пуст. Вы никого не блокировали.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: УСТРОЙСТВА */}
          {activeTab === 'devices' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-cyan-400" /> Активные Устройства & Сеансы
              </h3>

              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`p-3.5 rounded-2xl border ${
                      s.isCurrent 
                        ? 'bg-[#1e2a38] border-[#5288c1]/50' 
                        : 'bg-[#17212b] border-[#283748]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white text-xs">{s.name}</div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        s.isCurrent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {s.active}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">IP: {s.ip} • Шифрование AES-256</div>
                  </div>
                ))}
              </div>

              {sessions.length > 1 && (
                <button
                  onClick={handleTerminateOtherSessions}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition shadow cursor-pointer"
                >
                  Завершить все остальные сеансы
                </button>
              )}

              {terminatedMsg && (
                <div className="p-2.5 text-center text-emerald-300 font-semibold bg-emerald-500/15 rounded-xl border border-emerald-500/30">
                  ✓ Все остальные сеансы успешно завершены!
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ПРИВАТНОСТЬ */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-400" /> Приватность и Статус в сети
              </h3>

              {/* Статусы присутствия в сети */}
              <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-400" /> Статус активности («В сети» / «Был в сети недавно»)
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#131c26] text-emerald-300 border border-emerald-500/30 font-bold">
                    {user.hideOnlineStatus ? 'Невидимка' : (user.lastSeen || 'в сети')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Выберите, какой статус показывать собеседникам в шапке чата, контактах и вашем профиле:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: '⚡ Авто (В сети при входе)', status: 'в сети', isOnline: true, ghost: false, mode: 'auto' },
                    { label: '🟢 В сети', status: 'в сети', isOnline: true, ghost: false, mode: 'manual' },
                    { label: '🕒 Был(а) только что в сети', status: 'был(а) только что в сети', isOnline: false, ghost: false, mode: 'manual' },
                    { label: '🕒 Был(а) в сети недавно', status: 'был(а) в сети недавно', isOnline: false, ghost: false, mode: 'manual' },
                    { label: '⏱️ Был(а) 1 мин назад', status: 'был(а) 1 мин назад', isOnline: false, ghost: false, mode: 'manual' },
                    { label: '👻 Невидимка (скрыть)', status: 'был(а) в сети недавно', isOnline: false, ghost: true, mode: 'manual' }
                  ].map((item) => {
                    const currentMode = (user.settings as any)?.presenceMode || 'auto';
                    const isActive = item.ghost
                      ? Boolean(user.hideOnlineStatus)
                      : item.mode === 'auto'
                        ? currentMode === 'auto' && !user.hideOnlineStatus
                        : currentMode === 'manual' && !user.hideOnlineStatus && (user.lastSeen || 'в сети') === item.status;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          playSentSound();
                          onUpdateUser({
                            isOnline: item.isOnline,
                            lastSeen: item.status,
                            hideOnlineStatus: item.ghost,
                            settings: {
                              ...user.settings,
                              presenceMode: item.mode,
                              offlineAt: item.isOnline ? undefined : Date.now()
                            } as any
                          });
                        }}
                        className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold text-left border transition cursor-pointer flex items-center justify-between gap-1 ${
                          isActive
                            ? 'bg-[#5288c1] border-blue-400 text-white shadow'
                            : 'bg-[#131c26] border-[#283748] text-slate-300 hover:text-white hover:bg-[#202b36]'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {isActive && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ghost Mode */}
              <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] flex items-center justify-between">
                <div className="pr-3">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <EyeOff className="w-4 h-4 text-amber-400" /> Ghost Mode (Скрыть онлайн статус)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Собеседники видят только «был(а) в сети недавно». Ваше реальное присутствие скрыто.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={user.hideOnlineStatus}
                  onChange={(e) =>
                    onUpdateUser({
                      hideOnlineStatus: e.target.checked,
                      isOnline: !e.target.checked,
                      lastSeen: e.target.checked ? 'был(а) в сети недавно' : 'в сети'
                    })
                  }
                  className="w-5 h-5 accent-[#5288c1] cursor-pointer shrink-0"
                />
              </div>

              {/* Phone visibility */}
              <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-2">
                <div className="font-bold text-white">Кто видит мой номер телефона:</div>
                <div className="flex gap-2">
                  {(['all', 'contacts', 'nobody'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPhoneVisibility(opt)}
                      className={`flex-1 py-1.5 rounded-xl font-semibold text-[11px] transition cursor-pointer ${
                        phoneVisibility === opt
                          ? 'bg-[#5288c1] text-white shadow'
                          : 'bg-[#131c26] text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt === 'all' ? 'Все' : opt === 'contacts' ? 'Мои контакты' : 'Никто'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calls permission */}
              <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-2">
                <div className="font-bold text-white">Кто может мне звонить (WebRTC):</div>
                <div className="flex gap-2">
                  {(['all', 'contacts'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCallsAllowed(opt)}
                      className={`flex-1 py-1.5 rounded-xl font-semibold text-[11px] transition cursor-pointer ${
                        callsAllowed === opt
                          ? 'bg-[#5288c1] text-white shadow'
                          : 'bg-[#131c26] text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt === 'all' ? 'Все пользователи' : 'Только мои контакты'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Group & Channel Addition Permission (From Handwritten Sketch) */}
              <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-white">Кто может добавлять меня в каналы и группы:</div>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">Приватность</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(['all', 'friends', 'contacts', 'nobody'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setGroupAddPermission(opt);
                        playSentSound();
                        onUpdateUser({ settings: { ...user.settings, groupAddPermission: opt } as any });
                      }}
                      className={`py-2 px-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                        groupAddPermission === opt
                          ? 'bg-[#5288c1] text-white shadow ring-2 ring-[#64b5f6]/50'
                          : 'bg-[#131c26] text-slate-400 hover:text-white border border-[#283748]'
                      }`}
                    >
                      {opt === 'all' ? 'Все' : opt === 'friends' ? 'Друзья' : opt === 'contacts' ? 'Контакты' : 'Никто'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2FA Status */}
              <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-emerald-400" /> Двухфакторная аутентификация (2FA)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Дополнительный 6-значный OTP пароль при входе</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                  Активна
                </span>
              </div>
            </div>
          )}

          {/* TAB 7: СОЗДАТЬ ПАПКИ */}
          {activeTab === 'folders' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-teal-400" /> Папки с чатами
              </h3>
              <p className="text-slate-400 text-xs">
                Создавайте вкладки для быстрой фильтрации личных переписок, работы, каналов и ботов.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Название новой папки (напр. Учеба, Семья)..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="flex-1 bg-[#242f3d] rounded-xl px-3.5 py-2 text-white outline-none border border-transparent focus:border-[#5288c1]"
                />
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 bg-[#5288c1] hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold transition cursor-pointer"
                >
                  + Создать
                </button>
              </div>

              <div className="space-y-2">
                {folders.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-2xl bg-[#1e2a38] border border-[#283748] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{f.icon}</span>
                      <div>
                        <div className="font-bold text-white">{f.name}</div>
                        <div className="text-[10px] text-slate-400">{f.count} чатов в папке</div>
                      </div>
                    </div>
                    <span className="text-xs text-[#64b5f6] font-semibold cursor-pointer hover:underline">
                      Настроить
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ГОЛОСОВОЙ АВТООТВЕТЧИК (VOICE ANSWERING MACHINE) */}
          {activeTab === 'answering_machine' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#283748] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Voicemail className="w-5 h-5 text-purple-400 animate-pulse" />
                    Голосовой Автоответчик
                  </h3>
                  <p className="text-xs text-slate-400">
                    Автоматический прием звонков, запись сообщений и ответы голосом (TTS)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    amEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {amEnabled ? 'ВКЛЮЧЁН' : 'ВЫКЛЮЧЁН'}
                  </span>
                  <input
                    type="checkbox"
                    checked={amEnabled}
                    onChange={(e) => {
                      setAmEnabled(e.target.checked);
                      handleSaveAnsweringMachineSettings({ enabled: e.target.checked });
                    }}
                    className="w-5 h-5 accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              {amSaveMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Настройки автоответчика успешно сохранены!</span>
                </div>
              )}

              {/* 1. Способ ответа */}
              <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Способ голосового ответа:</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAmMode('tts');
                      handleSaveAnsweringMachineSettings({ mode: 'tts' });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      amMode === 'tts'
                        ? 'bg-purple-600/30 border-purple-400 text-white font-bold'
                        : 'bg-[#131c26] border-[#283748] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs">Синтез речи (TTS)</div>
                    <div className="text-[10px] opacity-75 font-normal">Приятный ИИ-голос</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAmMode('recorded');
                      handleSaveAnsweringMachineSettings({ mode: 'recorded' });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      amMode === 'recorded'
                        ? 'bg-purple-600/30 border-purple-400 text-white font-bold'
                        : 'bg-[#131c26] border-[#283748] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs">Свой голос</div>
                    <div className="text-[10px] opacity-75 font-normal">Аудиозапись</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAmMode('preset');
                      handleSaveAnsweringMachineSettings({ mode: 'preset' });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      amMode === 'preset'
                        ? 'bg-purple-600/30 border-purple-400 text-white font-bold'
                        : 'bg-[#131c26] border-[#283748] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs">Быстрый пресет</div>
                    <div className="text-[10px] opacity-75 font-normal">«Занят», «Отвечу»</div>
                  </button>
                </div>

                {/* MODE DETAILS: TTS */}
                {amMode === 'tts' && (
                  <div className="space-y-3 pt-2 border-t border-[#283748] animate-in fade-in">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Выбор голоса:</label>
                      <div className="flex gap-2">
                        {[
                          { id: 'ru_female_soft', label: '👩 Алёна (Мягкий)' },
                          { id: 'ru_female_official', label: '👩‍💼 Татьяна (Деловой)' },
                          { id: 'ru_male', label: '👨 Максим (Мужской)' }
                        ].map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setAmTtsVoice(v.id as any);
                              handleSaveAnsweringMachineSettings({ ttsVoice: v.id as any });
                            }}
                            className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                              amTtsVoice === v.id
                                ? 'bg-[#5288c1] border-blue-400 text-white'
                                : 'bg-[#131c26] border-[#283748] text-slate-400 hover:text-white'
                            }`}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Текст приветствия:</label>
                      <textarea
                        rows={2}
                        value={amTtsText}
                        onChange={(e) => setAmTtsText(e.target.value)}
                        onBlur={() => handleSaveAnsweringMachineSettings({ ttsText: amTtsText })}
                        className="w-full bg-[#131c26] border border-[#283748] rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleTestTTSGreeting}
                      className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>🔊 Прослушать голос (Тест TTS)</span>
                    </button>
                  </div>
                )}

                {/* MODE DETAILS: PRESET REPLIES */}
                {amMode === 'preset' && (
                  <div className="space-y-2 pt-2 border-t border-[#283748] animate-in fade-in">
                    <label className="text-[11px] font-bold text-slate-300 block">Готовые фразы-автоответы:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        '🚫 Я сейчас занят, перезвоню позже',
                        '🚗 Я за рулём, отвечу на сообщение',
                        '💤 Не могу говорить, оставьте сообщение',
                        '🏖️ Нахожусь в отпуске до понедельника',
                        '💼 На совещании, пишите в личный чат'
                      ].map((phrase) => (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => {
                            setAmPresetMessage(phrase);
                            handleSaveAnsweringMachineSettings({ presetMessage: phrase });
                          }}
                          className={`p-2 rounded-xl text-xs text-left border transition cursor-pointer ${
                            amPresetMessage === phrase
                              ? 'bg-purple-600/30 border-purple-400 text-white font-bold'
                              : 'bg-[#131c26] border-[#283748] text-slate-300 hover:bg-[#202b36]'
                          }`}
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Задержка ответа */}
              <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-2">
                <div className="font-bold text-xs text-white">⏱️ Задержка вызова перед подбором трубки:</div>
                <div className="flex gap-2">
                  {[
                    { sec: 0, label: 'Сразу (0с)' },
                    { sec: 15, label: '15 сек' },
                    { sec: 30, label: '30 сек' },
                    { sec: 60, label: '1 мин' },
                    { sec: 300, label: '5 мин (Стандарт)' }
                  ].map((item) => (
                    <button
                      key={item.sec}
                      type="button"
                      onClick={() => {
                        setAmDelaySec(item.sec);
                        handleSaveAnsweringMachineSettings({ delaySec: item.sec });
                      }}
                      className={`flex-1 py-2 rounded-xl font-bold text-[11px] transition cursor-pointer ${
                        amDelaySec === item.sec
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-[#131c26] text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Расписание и Ночной режим */}
              <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span>Расписание работы автоответчика:</span>
                  </div>
                  <select
                    value={amScheduleType}
                    onChange={(e) => {
                      setAmScheduleType(e.target.value as any);
                      handleSaveAnsweringMachineSettings({ scheduleType: e.target.value as any });
                    }}
                    className="bg-[#131c26] border border-[#283748] text-xs text-cyan-300 font-bold px-3 py-1.5 rounded-xl outline-none"
                  >
                    <option value="24/7">Круглосуточно (24/7)</option>
                    <option value="working_hours">Рабочие часы (09:00 - 18:00)</option>
                    <option value="night_only">Только ночью</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-[#283748] flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Moon className="w-4 h-4 text-indigo-400" />
                      <span>🌙 Ночной режим</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Автоматическое включение с 22:00 до 08:00</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={amNightModeAuto}
                    onChange={(e) => {
                      setAmNightModeAuto(e.target.checked);
                      handleSaveAnsweringMachineSettings({ nightModeAuto: e.target.checked });
                    }}
                    className="w-5 h-5 accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* 4. История принятых звонков автоответчика */}
              <div className="p-3.5 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="font-bold text-xs text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <History className="w-4 h-4 text-emerald-400" />
                    <span>История ответов автоответчика ({amLogs.length})</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Автосохранение в чат</span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
                  {amLogs.map((log) => (
                    <div key={log.id} className="p-2.5 rounded-xl bg-[#131c26] border border-[#202d3a] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={log.callerAvatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-white truncate">{log.callerName}</div>
                          <div className="text-[10px] text-slate-300 truncate">{log.contentPreview}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">{log.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ОФОРМЛЕНИЕ И ТЕМА (APPEARANCE) */}
          {activeTab === 'appearance' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-[#283748] pb-3">
                <Palette className="w-5 h-5 text-pink-400" /> Оформление и Внешний вид
              </h3>

              {/* Theme Toggle */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="font-bold text-xs text-white">Выбор темы интерфейса:</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSaveAppearance('dark', appLang, appTextSize, appAccentColor)}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                      appTheme === 'dark'
                        ? 'bg-[#131c26] border-[#5288c1] text-white shadow-lg ring-2 ring-[#5288c1]/40'
                        : 'bg-[#131c26] border-[#283748] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Moon className="w-5 h-5 text-indigo-400" />
                      <div className="text-left">
                        <div className="font-bold text-xs">Тёмная тема (Dark)</div>
                        <div className="text-[10px] opacity-75">Ночной режим Telegram</div>
                      </div>
                    </div>
                    {appTheme === 'dark' && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveAppearance('light', appLang, appTextSize, appAccentColor)}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                      appTheme === 'light'
                        ? 'bg-slate-200 border-blue-500 text-slate-900 shadow-lg ring-2 ring-blue-400/40'
                        : 'bg-[#131c26] border-[#283748] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sun className="w-5 h-5 text-amber-500" />
                      <div className="text-left">
                        <div className="font-bold text-xs">Светлая тема (Light)</div>
                        <div className="text-[10px] opacity-75">Дневной режим</div>
                      </div>
                    </div>
                    {appTheme === 'light' && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                </div>
              </div>

              {/* Accent Color Selection */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-2">
                <div className="font-bold text-xs text-white">Цвет акцента интерфейса:</div>
                <div className="flex items-center gap-3 pt-1">
                  {[
                    { color: '#5288c1', name: 'Синий Классический' },
                    { color: '#10b981', name: 'Изумрудный' },
                    { color: '#8b5cf6', name: 'Фиолетовый' },
                    { color: '#f59e0b', name: 'Янтарный' },
                    { color: '#ec4899', name: 'Розовый' }
                  ].map((item) => (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => handleSaveAppearance(appTheme, appLang, appTextSize, item.color)}
                      style={{ backgroundColor: item.color }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer shadow-md ${
                        appAccentColor === item.color ? 'ring-4 ring-white/60 scale-110' : 'hover:scale-105 opacity-85'
                      }`}
                      title={item.name}
                    >
                      {appAccentColor === item.color && <Check className="w-5 h-5 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Size */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-2">
                <div className="font-bold text-xs text-white">Размер шрифта в чатах:</div>
                <div className="flex gap-2">
                  {[
                    { size: 'small', label: 'Мелкий' },
                    { size: 'normal', label: 'Стандартный (14px)' },
                    { size: 'large', label: 'Крупный (16px)' }
                  ].map((item) => (
                    <button
                      key={item.size}
                      type="button"
                      onClick={() => handleSaveAppearance(appTheme, appLang, item.size as any, appAccentColor)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        appTextSize === item.size
                          ? 'bg-[#5288c1] text-white shadow'
                          : 'bg-[#131c26] text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ЯЗЫК (LANGUAGE) */}
          {activeTab === 'language' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-[#283748] pb-3">
                <Globe className="w-5 h-5 text-cyan-400" /> Выбор языка интерфейса
              </h3>

              <div className="space-y-2">
                {[
                  { code: 'ru', name: 'Русский', flag: '🇷🇺', native: 'Русский язык' },
                  { code: 'en', name: 'English', flag: '🇬🇧', native: 'English (US)' },
                  { code: 'kk', name: 'Казахский', flag: '🇰🇿', native: 'Қазақ тілі' },
                  { code: 'uz', name: 'Узбекский', flag: '🇺🇿', native: 'O\'zbek tili' }
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSaveAppearance(appTheme, item.code as any, appTextSize, appAccentColor)}
                    className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                      appLang === item.code
                        ? 'bg-[#1e2a38] border-[#5288c1] text-white font-bold shadow'
                        : 'bg-[#131c26] border-[#202d3a] text-slate-300 hover:bg-[#1a2634]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.flag}</span>
                      <div className="text-left">
                        <div className="font-bold text-sm text-white">{item.name}</div>
                        <div className="text-xs text-slate-400">{item.native}</div>
                      </div>
                    </div>
                    {appLang === item.code && <Check className="w-5 h-5 text-[#64b5f6]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: НАСТРОЙКИ ЗВОНКОВ (CALL SETTINGS) */}
          {activeTab === 'call_settings' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-[#283748] pb-3">
                <Phone className="w-5 h-5 text-emerald-400" /> Настройки WebRTC звонков и Микрофона
              </h3>

              {/* Real Hardware Microphone Level Test & Loopback */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-xs text-white flex items-center gap-2">
                      <Mic className="w-4 h-4 text-emerald-400" />
                      <span>Проверка реального микрофона устройства:</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Говорите в микрофон для проверки чувствительности в звонках и чатах
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleRealMicTest}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                      micTestActive ? 'bg-rose-600 text-white' : 'bg-[#5288c1] text-white hover:bg-blue-500'
                    }`}
                  >
                    {micTestActive ? 'Остановить тест' : '🎙️ Проверить микрофон'}
                  </button>
                </div>

                {micTestActive && (
                  <div className="space-y-2.5 pt-2 border-t border-[#283748] animate-in fade-in">
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span>Живой уровень голоса с микрофона:</span>
                      <span className="font-mono text-emerald-400 font-bold">{micLevel}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[#131c26] overflow-hidden p-0.5 border border-[#283748]">
                      <div
                        style={{ width: `${Math.max(4, micLevel)}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 rounded-full transition-all duration-75"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleMicLoopback}
                      className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-2 ${
                        micLoopback
                          ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                          : 'bg-[#131c26] border-[#283748] text-slate-300 hover:text-white'
                      }`}
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{micLoopback ? 'Слышать себя в динамиках: ВКЛЮЧЕНО' : 'Включить прослушивание своего голоса'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Ringtone Selection & Custom Device File Upload */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-[#64b5f6]" />
                    <span>Мелодия звонка (Свой рингтон или звук устройства):</span>
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => previewRingtone(soundConfig)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                    >
                      ▶ Прослушать
                    </button>
                    <button
                      type="button"
                      onClick={() => stopCallAudio()}
                      className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold cursor-pointer"
                    >
                      ■ Стоп
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {([
                    { id: 'device_system', label: '📱 Звук устройства' },
                    { id: 'melody_vk', label: '🎵 Мелодия AuraChat' },
                    { id: 'classic_phone', label: '☎️ Классический звонок' }
                  ] as Array<{ id: RingtoneMode; label: string }>).map((ring) => (
                    <button
                      key={ring.id}
                      type="button"
                      onClick={() => {
                        const updated = saveSoundSettings({ ringtoneMode: ring.id });
                        setSoundConfig(updated);
                        previewRingtone(updated);
                      }}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
                        soundConfig.ringtoneMode === ring.id
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-[#131c26] border-[#283748] text-slate-300 hover:text-white'
                      }`}
                    >
                      {ring.label}
                    </button>
                  ))}
                </div>

                <label className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition">
                  <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {soundConfig.customRingtoneName
                      ? `Установлен свой звонок: ${soundConfig.customRingtoneName}`
                      : 'Поставить свой звонок с устройства (выбрать MP3 / WAV / OGG)'}
                  </span>
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadRingtoneFile(file);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>

              {/* STUN Server */}
              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-2">
                <label className="font-bold text-xs text-white block">Публичный STUN Сервер:</label>
                <input
                  type="text"
                  value={stunServer}
                  onChange={(e) => setStunServer(e.target.value)}
                  className="w-full bg-[#131c26] border border-[#283748] rounded-xl p-2.5 text-xs text-emerald-300 font-mono outline-none"
                />
                <span className="text-[10px] text-slate-400 block">Прямое Peer-to-Peer соединение с зашифрованным медиапотоком SRTP</span>
              </div>
            </div>
          )}

          {/* TAB 8: ВЕРСИЯ */}
          {activeTab === 'version' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-slate-300" /> О приложении и Версия
              </h3>

              <div className="p-4 rounded-2xl bg-[#1e2a38] border border-[#283748] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5288c1] to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    AC
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">AuraChat Web Applet</h4>
                    <p className="text-[11px] text-slate-400 font-mono">Версия 3.2.0 (Сборка 2026 Stable)</p>
                  </div>
                </div>

                <div className="border-t border-[#283748] pt-3 space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Протокол WebRTC:</span>
                    <span className="font-mono text-emerald-400">v1.4.2 DTLS/SRTP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Звуковой движок:</span>
                    <span className="font-mono text-blue-400">Web Audio API (Synthesizer)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Лимит фото в посте:</span>
                    <span className="font-mono text-amber-400">До 10 (Обычный) / 35 (Ultra)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Шифрование звонков:</span>
                    <span className="font-mono text-emerald-400">End-to-End Encrypted</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-center font-semibold text-xs flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>У вас установлена последняя официальная версия</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Avatar Editor Modal */}
      <AvatarEditorModal
        isOpen={isAvatarEditorOpen}
        currentAvatarUrl={user.avatarUrl}
        displayName={displayName || user.displayName}
        onClose={() => setIsAvatarEditorOpen(false)}
        onSaveAvatar={(newAvatarUrl) => {
          onUpdateUser({ avatarUrl: newAvatarUrl });
          playSentSound();
        }}
      />
    </div>
  );
};
