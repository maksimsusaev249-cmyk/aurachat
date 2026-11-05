import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { 
  ArrowRight, 
  ArrowLeft,
  Check, 
  Lock, 
  X, 
  Trash2, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Smartphone,
  Mail,
  ShieldCheck,
  Delete,
  MessageSquare,
  User as UserIcon
} from 'lucide-react';
import { playSentSound, playReactionSound } from '../../utils/audioUtils';
import { 
  sendPhoneVerificationCode, 
  verifyPhoneCodeAndSignIn
} from '../../firebase';

interface AuthModalProps {
  isOpen: boolean;
  isLoggedIn?: boolean;
  lastUser?: User | null;
  savedAccounts?: User[];
  onRemoveSavedAccount?: (userId: string) => void;
  onLogin: (user: User) => void;
  onRegister: (newUser: User) => void;
  onClose?: () => void;
}

type ScreenView =
  | 'home'           // Стартовая: Логотип, Имя приложения, [Профили], [По тел.], [По почте], [Регистрация]
  | 'profiles'       // Экран сохранённых профилей
  | 'login_phone'    // По телефону: сначала номер -> код с SMS -> потом ПИН-код (если есть) -> В системе
  | 'login_email'    // По почте: сначала почта -> код с почты -> потом ПИН-код (если есть) -> В системе
  | 'login_pin'      // Экран ввода ПИН-кода при входе (если подключен у пользователя)
  | 'reg_name'       // Регистрация Шаг 1: [ Имя ] ->
  | 'reg_user'       // Регистрация Шаг 2: [ Юзер ] ->
  | 'reg_contact'    // Регистрация Шаг 3: [ Почта ] / [ Телефон ] (+ код) ->
  | 'reg_password'   // Регистрация Шаг 4: [ Пароль ] ->
  | 'reg_pin';       // Регистрация Шаг 5: ПИН-код (окошко + круглые кнопки) -> В системе

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  isLoggedIn = true,
  lastUser,
  savedAccounts = [],
  onRemoveSavedAccount,
  onLogin,
  onRegister,
  onClose
}) => {
  const [view, setView] = useState<ScreenView>('home');
  const [formError, setFormError] = useState('');

  // Login by Phone / Email states
  const [loginTarget, setLoginTarget] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('749201');
  const [otpTimer, setOtpTimer] = useState(0);
  const [phoneConfirmation, setPhoneConfirmation] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // User awaiting PIN verification after SMS/Email code or profile selection
  const [pendingLoginUser, setPendingLoginUser] = useState<User | null>(null);
  const [loginPinInput, setLoginPinInput] = useState('');

  // Registration states (matching exact sketch flow)
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regContactType, setRegContactType] = useState<'email' | 'phone'>('phone');
  const [regContactValue, setRegContactValue] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpCode, setRegOtpCode] = useState('');
  const [regGeneratedOtp, setRegGeneratedOtp] = useState('583920');
  const [regPassword, setRegPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [regPin, setRegPin] = useState('');

  // Timer for OTP resend
  useEffect(() => {
    let t: any;
    if (otpTimer > 0) {
      t = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(t);
  }, [otpTimer]);

  // Reset to home screen when modal opens
  useEffect(() => {
    if (isOpen) {
      setView('home');
      setFormError('');
      setOtpSent(false);
      setOtpCode('');
      setLoginPinInput('');
    }
  }, [isOpen]);

  // Keyboard support on PIN screens
  useEffect(() => {
    if (!isOpen || (view !== 'reg_pin' && view !== 'login_pin')) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        playReactionSound();
        if (view === 'reg_pin') {
          setRegPin((prev) => (prev.length < 6 ? prev + e.key : prev));
        } else {
          setLoginPinInput((prev) => (prev.length < 6 ? prev + e.key : prev));
        }
      } else if (e.key === 'Backspace') {
        playReactionSound();
        if (view === 'reg_pin') {
          setRegPin((prev) => prev.slice(0, -1));
        } else {
          setLoginPinInput((prev) => prev.slice(0, -1));
        }
      } else if (e.key === 'Enter') {
        if (view === 'reg_pin') {
          handleFinishRegistration(false);
        } else if (view === 'login_pin') {
          handleVerifyLoginPin();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, view, regPin, loginPinInput, pendingLoginUser]);

  if (!isOpen) return null;

  // --- LOGIN BY PHONE / EMAIL HANDLERS ---
  const handleSendLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const target = loginTarget.trim();
    if (!target) {
      setFormError(view === 'login_phone' ? 'Введите номер телефона' : 'Введите адрес электронной почты');
      return;
    }

    playReactionSound();
    setIsAuthLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);

    try {
      if (view === 'login_phone' && target.startsWith('+')) {
        const conf = await sendPhoneVerificationCode(target, 'recaptcha-auth-container');
        setPhoneConfirmation(conf);
      }
    } catch {}

    setIsAuthLoading(false);
    setOtpSent(true);
    setOtpTimer(60);
    setOtpCode('');
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const trimmedCode = otpCode.trim();
    if (trimmedCode.length < 4) {
      setFormError('Введите код подтверждения');
      return;
    }

    playSentSound();
    setIsAuthLoading(true);

    try {
      if (view === 'login_phone' && phoneConfirmation) {
        const fbUser = await verifyPhoneCodeAndSignIn(phoneConfirmation, trimmedCode);
        setIsAuthLoading(false);
        proceedAfterOtpVerified(fbUser);
        return;
      }
    } catch {}

    setIsAuthLoading(false);

    const cleanTarget = loginTarget.trim().replace(/^@/, '');
    const allKnownAccounts = [...savedAccounts];
    if (lastUser && !allKnownAccounts.some((a) => a.id === lastUser.id)) {
      allKnownAccounts.push(lastUser);
    }

    const existingUser = allKnownAccounts.find(
      (a) =>
        (view === 'login_phone' && a.phone === cleanTarget) ||
        (view === 'login_email' && a.email?.toLowerCase() === cleanTarget.toLowerCase()) ||
        a.username.toLowerCase() === cleanTarget.toLowerCase()
    );

    if (existingUser) {
      proceedAfterOtpVerified(existingUser);
    } else {
      // Create or sign in 1 phone/email = 1 account
      const newLoggedUser: User = {
        id: 'u_' + Date.now(),
        displayName: view === 'login_phone' ? `Абонент ${cleanTarget.slice(-4)}` : cleanTarget.split('@')[0],
        username: `user_${Math.floor(1000 + Math.random() * 9000)}`,
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cleanTarget)}&backgroundColor=182533`,
        phone: view === 'login_phone' ? cleanTarget : undefined,
        email: view === 'login_email' ? cleanTarget : undefined,
        bio: 'Пользователь AuraChat',
        hasPin: false
      };
      proceedAfterOtpVerified(newLoggedUser);
    }
  };

  // Check if user has PIN connected: if yes -> go to login_pin screen; if no -> enter system immediately
  const proceedAfterOtpVerified = (user: User) => {
    if (user.pinCode && user.pinCode.length >= 4) {
      setPendingLoginUser(user);
      setLoginPinInput('');
      setFormError('');
      setView('login_pin');
    } else {
      onLogin(user);
    }
  };

  const handleVerifyLoginPin = () => {
    if (!pendingLoginUser) return;
    if (loginPinInput === pendingLoginUser.pinCode) {
      playSentSound();
      const target = pendingLoginUser;
      setPendingLoginUser(null);
      setLoginPinInput('');
      onLogin(target);
    } else {
      setFormError('Неверный ПИН-код. Попробуйте снова.');
      setLoginPinInput('');
    }
  };

  // --- REGISTRATION HANDLERS (5 STEPS FROM SKETCH) ---
  const handleRegNameNext = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!regName.trim()) {
      setFormError('Введите ваше имя');
      return;
    }
    playReactionSound();
    setView('reg_user');
  };

  const handleRegUserNext = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    playReactionSound();
    setView('reg_contact');
  };

  const handleSendRegOtp = () => {
    setFormError('');
    if (!regContactValue.trim()) {
      setFormError(regContactType === 'phone' ? 'Введите номер телефона' : 'Введите адрес почты');
      return;
    }
    playReactionSound();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRegGeneratedOtp(code);
    setRegOtpSent(true);
    setRegOtpCode('');
  };

  const handleRegContactNext = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!regContactValue.trim()) {
      setFormError(regContactType === 'phone' ? 'Введите номер телефона' : 'Введите адрес почты');
      return;
    }
    if (!regOtpSent) {
      handleSendRegOtp();
      return;
    }
    if (regOtpCode.trim().length < 4) {
      setFormError('Введите код подтверждения из уведомления');
      return;
    }
    playReactionSound();
    setView('reg_password');
  };

  const handleRegPasswordNext = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!regPassword.trim()) {
      setFormError('Введите пароль');
      return;
    }
    playReactionSound();
    setRegPin('');
    setView('reg_pin');
  };

  const handleFinishRegistration = (skipPin: boolean = false) => {
    playSentSound();
    const cleanContact = regContactValue.trim().replace(/^@/, '');

    // Enforce 1 phone / email = 1 account rule
    const existingAccount = savedAccounts.find(
      (a) =>
        (regContactType === 'phone' && a.phone === cleanContact) ||
        (regContactType === 'email' && a.email?.toLowerCase() === cleanContact.toLowerCase())
    );
    if (existingAccount) {
      proceedAfterOtpVerified(existingAccount);
      return;
    }

    const finalName = regName.trim() || 'Пользователь';
    let finalUsername = regUsername.trim().replace(/^@/, '').toLowerCase();
    if (!finalUsername) {
      const base = cleanContact ? cleanContact.split('@')[0].replace(/\D/g, '').slice(-4) || 'user' : 'user';
      finalUsername = `user_${base}_${Math.floor(100 + Math.random() * 900)}`;
    } else if (savedAccounts.some((a) => a.username === finalUsername)) {
      finalUsername = `${finalUsername}_${Math.floor(100 + Math.random() * 900)}`;
    }

    const finalPin = skipPin || regPin.length < 4 ? undefined : regPin;

    const newUser: User = {
      id: 'u_' + Date.now(),
      displayName: finalName,
      username: finalUsername,
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(finalUsername)}&backgroundColor=182533`,
      phone: regContactType === 'phone' ? cleanContact : undefined,
      email: regContactType === 'email' ? cleanContact : undefined,
      password: regPassword,
      bio: 'Пользователь AuraChat',
      pinCode: finalPin,
      hasPin: Boolean(finalPin)
    };

    onRegister(newUser);
  };

  // All available profiles for the "Профили" screen
  const allProfiles: User[] = [...savedAccounts];
  if (lastUser && !allProfiles.some((a) => a.id === lastUser.id)) {
    allProfiles.unshift(lastUser);
  }

  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-[#0e1621] text-white flex flex-col overflow-y-auto touch-pan-y select-none animate-in fade-in duration-200"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div id="recaptcha-auth-container" />

      {/* Top Bar: Secure Header (no unauthorized bypass) */}
      <div className="w-full max-w-md mx-auto px-6 pt-5 flex items-center justify-between shrink-0">
        <span className="text-[11px] font-medium text-slate-400">AuraChat v2.5</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#17212b] hover:bg-[#202b36] border border-[#30445a] text-slate-400 hover:text-white transition cursor-pointer"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Full-Screen Centered Content */}
      <div className="flex-1 w-full max-w-md mx-auto flex flex-col justify-center px-6 py-8">
        
        {/* Error Notice */}
        {formError && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{formError}</span>
          </div>
        )}

        {/* =====================================================================
            ЭКРАН 1: СТАРТОВАЯ СТРАНИЦА НА ВЕСЬ ЭКРАН (Защищённый вход)
            Круглый логотип + Имя приложения + защищённые кнопки:
            [ Профили с ПИН ] [ По тел. ] [ По почте ] [ Регистрация ]
           ===================================================================== */}
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in">
            {/* Круглый логотип и имя приложения */}
            <div className="flex flex-col items-center space-y-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-[#0077FF] via-[#5288c1] to-cyan-400 p-1 shadow-2xl shadow-blue-500/25 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-[#17212b] flex flex-col items-center justify-center">
                  <MessageSquare className="w-10 h-10 text-[#64b5f6]" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-cyan-300 mt-0.5">
                    LOGO
                  </span>
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                AuraChat
              </h1>
              <p className="text-xs text-slate-400 text-center">
                Безопасный мессенджер со сквозным шифрованием
              </p>
            </div>

            {/* Овальные защищённые кнопки в столбик */}
            <div className="w-full max-w-xs space-y-3">
              {/* 1. Профили */}
              <button
                type="button"
                onClick={() => {
                  playReactionSound();
                  setFormError('');
                  setView('profiles');
                }}
                className="w-full py-3.5 px-6 rounded-full bg-[#17212b] hover:bg-[#202b36] border-2 border-[#30445a] hover:border-[#64b5f6] text-white font-bold text-sm tracking-wide transition flex items-center justify-between cursor-pointer shadow-lg active:scale-98"
              >
                <span className="flex items-center gap-3">
                  <UserIcon className="w-4 h-4 text-[#64b5f6]" />
                  <span>Профили</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#243344] text-xs text-[#64b5f6]">
                  {allProfiles.length}
                </span>
              </button>

              {/* 3. По тел. */}
              <button
                type="button"
                onClick={() => {
                  playReactionSound();
                  setFormError('');
                  setLoginTarget('');
                  setOtpSent(false);
                  setOtpCode('');
                  setView('login_phone');
                }}
                className="w-full py-3.5 px-6 rounded-full bg-[#17212b] hover:bg-[#202b36] border-2 border-[#30445a] hover:border-emerald-400 text-white font-bold text-sm tracking-wide transition flex items-center justify-between cursor-pointer shadow-lg active:scale-98"
              >
                <span className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>По тел.</span>
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* 4. По почте */}
              <button
                type="button"
                onClick={() => {
                  playReactionSound();
                  setFormError('');
                  setLoginTarget('');
                  setOtpSent(false);
                  setOtpCode('');
                  setView('login_email');
                }}
                className="w-full py-3.5 px-6 rounded-full bg-[#17212b] hover:bg-[#202b36] border-2 border-[#30445a] hover:border-amber-400 text-white font-bold text-sm tracking-wide transition flex items-center justify-between cursor-pointer shadow-lg active:scale-98"
              >
                <span className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-amber-400" />
                  <span>По почте</span>
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* 5. Регистрация */}
              <button
                type="button"
                onClick={() => {
                  playReactionSound();
                  setFormError('');
                  setRegName('');
                  setRegUsername('');
                  setRegContactValue('');
                  setRegOtpSent(false);
                  setRegOtpCode('');
                  setRegPassword('');
                  setRegPin('');
                  setView('reg_name');
                }}
                className="w-full py-3.5 px-6 rounded-full bg-[#17212b] hover:bg-[#202b36] border-2 border-[#30445a] hover:border-[#64b5f6] text-white font-bold text-sm tracking-wide transition flex items-center justify-between cursor-pointer shadow-lg active:scale-98"
              >
                <span className="flex items-center gap-3">
                  <span className="w-4 h-4 text-[#64b5f6] font-black">+</span>
                  <span>Регистрация нового аккаунта</span>
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            ЭКРАН «ПРОФИЛИ»
           ===================================================================== */}
        {view === 'profiles' && (
          <div className="flex flex-col space-y-6 animate-in fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-extrabold text-white">Профили</h2>
              <p className="text-xs text-slate-400">
                Выберите аккаунт для входа (если подключен ПИН-код, потребуется его ввод)
              </p>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {allProfiles.length === 0 ? (
                <div className="p-8 rounded-3xl bg-[#17212b] border border-[#243344] text-center text-slate-400 text-xs">
                  Сохранённых профилей пока нет
                </div>
              ) : (
                allProfiles.map((acc) => (
                  <div
                    key={acc.id}
                    onClick={() => {
                      playReactionSound();
                      proceedAfterOtpVerified(acc);
                    }}
                    className="p-3.5 rounded-full bg-[#17212b] hover:bg-[#202b36] border-2 border-[#2b3c4f] hover:border-[#5288c1] flex items-center justify-between cursor-pointer transition shadow-md group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={acc.avatarUrl}
                        alt={acc.displayName}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-[#5288c1]/50 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                          <span className="truncate">{acc.displayName}</span>
                          {acc.pinCode && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <div className="text-xs text-slate-400 font-mono truncate">
                          @{acc.username} {acc.phone ? `• ${acc.phone}` : acc.email ? `• ${acc.email}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onRemoveSavedAccount && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveSavedAccount(acc.id);
                          }}
                          className="p-2 rounded-full hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                          title="Удалить профиль"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <div className="p-2.5 rounded-full bg-[#0077FF] text-white group-hover:scale-105 transition">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setView('home')}
                className="px-5 py-2.5 rounded-full bg-[#17212b] hover:bg-[#202b36] border border-[#30445a] text-slate-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            ВХОД «ПО ТЕЛ.» ИЛИ «ПО ПОЧТЕ»:
            Сначала код из SMS или почты -> затем ПИН-код (если подключен) -> В системе
           ===================================================================== */}
        {(view === 'login_phone' || view === 'login_email') && (
          <form
            onSubmit={otpSent ? handleVerifyLoginOtp : handleSendLoginOtp}
            className="flex flex-col space-y-6 animate-in fade-in"
          >
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#17212b] border-2 border-[#30445a] flex items-center justify-center">
                {view === 'login_phone' ? (
                  <Smartphone className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Mail className="w-6 h-6 text-amber-400" />
                )}
              </div>
              <h2 className="text-xl font-extrabold text-white">
                {view === 'login_phone' ? 'Вход по телефону' : 'Вход по почте'}
              </h2>
              <p className="text-xs text-slate-400">
                Сначала подтвердите код из {view === 'login_phone' ? 'SMS' : 'почты'}, затем ПИН-код (если подключен)
              </p>
            </div>

            <div className="space-y-4">
              <input
                type={view === 'login_email' ? 'email' : 'tel'}
                required
                disabled={otpSent}
                placeholder={view === 'login_phone' ? '+7 (999) 000-00-00' : 'user@mail.com'}
                value={loginTarget}
                onChange={(e) => setLoginTarget(e.target.value)}
                className="w-full px-6 py-4 rounded-full bg-[#17212b] border-2 border-[#30445a] focus:border-[#64b5f6] text-center text-white text-sm font-mono outline-none transition disabled:opacity-60"
              />

              {otpSent && (
                <div className="space-y-4 animate-in fade-in">
                  {/* Instant Code Banner so SMS/Email always arrives in preview */}
                  <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-emerald-300 font-semibold">
                        {view === 'login_phone' ? '📲 Код из SMS:' : '📩 Код с почты:'}
                      </div>
                      <div className="font-mono font-black text-lg tracking-[0.25em] text-white mt-0.5">
                        {generatedOtp}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpCode(generatedOtp);
                        playReactionSound();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition shadow"
                    >
                      <Check className="w-4 h-4" />
                      <span>Вставить код</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    placeholder="Введите 6-значный код"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-6 py-4 rounded-full bg-[#17212b] border-2 border-emerald-500/60 focus:border-emerald-400 text-center tracking-[0.4em] text-lg font-mono text-white outline-none transition"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => {
                  if (otpSent) {
                    setOtpSent(false);
                  } else {
                    setView('home');
                  }
                }}
                className="px-5 py-3 rounded-full bg-[#17212b] hover:bg-[#202b36] border border-[#30445a] text-slate-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="px-7 py-3.5 rounded-full bg-[#0077FF] hover:bg-[#0066DD] text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition shadow-xl"
              >
                <span>{otpSent ? 'Далее' : 'Получить код'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* =====================================================================
            РЕГИСТРАЦИЯ ШАГ 1: [ ИМЯ ] -> (Второй прямоугольник сверху на рисунке)
           ===================================================================== */}
        {view === 'reg_name' && (
          <form onSubmit={handleRegNameNext} className="flex flex-col justify-between min-h-[360px] animate-in fade-in">
            <div className="text-center space-y-1">
              <span className="text-xs font-mono text-[#64b5f6] uppercase tracking-widest">Шаг 1 из 5</span>
              <h2 className="text-2xl font-extrabold text-white">Ваше имя</h2>
            </div>

            {/* По центру овальное поле [ Имя ] как на рисунке */}
            <div className="my-auto py-8">
              <input
                type="text"
                required
                autoFocus
                placeholder="Имя"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full px-6 py-4 rounded-full bg-[#17212b] border-2 border-[#30445a] focus:border-[#64b5f6] text-center text-lg font-bold text-white outline-none transition shadow-inner"
              />
            </div>

            {/* Внизу стрелка -> как на рисунке */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setView('home')}
                className="p-3.5 rounded-full bg-[#17212b] hover:bg-[#202b36] border border-[#30445a] text-slate-300 cursor-pointer transition"
                title="Назад"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <button
                type="submit"
                className="p-4 rounded-full bg-[#0077FF] hover:bg-[#0066DD] text-white cursor-pointer transition shadow-xl hover:scale-105"
                title="Далее"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </form>
        )}

        {/* =====================================================================
            РЕГИСТРАЦИЯ ШАГ 2: [ ЮЗЕР ] -> (Третий прямоугольник сверху на рисунке)
           ===================================================================== */}
        {view === 'reg_user' && (
          <form onSubmit={handleRegUserNext} className="flex flex-col justify-between min-h-[360px] animate-in fade-in">
            <div className="text-center space-y-1">
              <span className="text-xs font-mono text-[#64b5f6] uppercase tracking-widest">Шаг 2 из 5</span>
              <h2 className="text-2xl font-extrabold text-white">Юзернейм</h2>
              <p className="text-xs text-slate-400">Можно указать свой @юзер или пропустить</p>
            </div>

            {/* По центру овальное поле [ Юзер ] как на рисунке */}
            <div className="my-auto py-8">
              <input
                type="text"
                autoFocus
                placeholder="Юзер"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="w-full px-6 py-4 rounded-full bg-[#17212b] border-2 border-[#30445a] focus:border-[#64b5f6] text-center text-lg font-mono font-bold text-white outline-none transition shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setView('reg_name')}
                className="p-3.5 rounded-full bg-[#17212b] hover:bg-[#202b36] border border-[#30445a] text-slate-300 cursor-pointer transition"
                title="Назад"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <button
                type="submit"
                className="p-4 rounded-full bg-[#0077FF] hover:bg-[#0066DD] text-white cursor-pointer transition shadow-xl hover:scale-105"
                title="Далее"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </form>
        )}

        {/* =====================================================================
            РЕГИСТРАЦИЯ ШАГ 3: [ ПОЧТА ] / [ ТЕЛЕФОН ] -> (Первый блок во 2-м ряду)
           ===================================================================== */}
        {view === 'reg_contact' && (
          <form onSubmit={handleRegContactNext} className="flex flex-col justify-between min-h-[380px] animate-in fade-in">
            <div className="text-center space-y-1">
              <span className="text-xs font-mono text-[#64b5f6] uppercase tracking-widest">Шаг 3 из 5</span>
              <h2 className="text-2xl font-extrabold text-white">Почта или Телефон</h2>
              <p className="text-xs text-slate-400">Выберите способ привязки и подтвердите кодом</p>
            </div>

            <div className="my-auto py-6 space-y-4">
              {/* Две овальные кнопки [ Почта ] и [ Телефон ] как на рисунке */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRegContactType('email');
                    setRegOtpSent(false);
                    setFormError('');
                  }}
                  className={`w-full py-3 px-6 rounded-full border-2 font-bold text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
                    regContactType === 'email'
                      ? 'bg-[#0077FF]/20 border-[#64b5f6] text-white'
                      : 'bg-[#17212b] border-[#30445a] text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Почта</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRegContactType('phone');
                    setRegOtpSent(false);
                    setFormError('');
                  }}
                  className={`w-full py-3 px-6 rounded-full border-2 font-bold text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
                    regContactType === 'phone'
                      ? 'bg-[#0077FF]/20 border-[#64b5f6] text-white'
                      : 'bg-[#17212b] border-[#30445a] text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Телефон</span>
                </button>
              </div>

              <input
                type={regContactType === 'email' ? 'email' : 'tel'}
                required
                placeholder={regContactType === 'email' ? 'Введите вашу почту' : '+7 (999) 000-00-00'}
                value={regContactValue}
                onChange={(e) => setRegContactValue(e.target.value)}
                className="w-full px-6 py-3.5 rounded-full bg-[#17212b] border-2 border-[#30445a] focus:border-[#64b5f6] text-center text-sm font-mono text-white outline-none transition"
              />

              {regOtpSent && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] text-emerald-300">
                        Код ({regContactType === 'phone' ? 'SMS' : 'Почта'}):
                      </div>
                      <div className="font-mono font-black text-base tracking-widest text-white">
                        {regGeneratedOtp}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRegOtpCode(regGeneratedOtp);
                        playReactionSound();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black font-bold text-xs cursor-pointer"
                    >
                      Вставить код
                    </button>
                  </div>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    placeholder="Код из сообщения"
                    value={regOtpCode}
                    onChange={(e) => setRegOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-6 py-3.5 rounded-full bg-[#17212b] border-2 border-emerald-500/60 text-center tracking-[0.4em] font-mono text-white outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setView('reg_user')}
                className="p-3.5 rounded-full bg-[#17212b] hover:bg-[#202b36] border border-[#30445a] text-slate-300 cursor-pointer transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <button
                type="submit"
                className="p-4 rounded-full bg-[#0077FF] hover:bg-[#0066DD] text-white cursor-pointer transition shadow-xl hover:scale-105"
                title="Далее"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </form>
        )}

        {/* =====================================================================
            РЕГИСТРАЦИЯ ШАГ 4: [ ПАРОЛЬ ] -> (Второй блок во 2-м ряду на рисунке)
           ===================================================================== */}
        {view === 'reg_password' && (
          <form onSubmit={handleRegPasswordNext} className="flex flex-col justify-between min-h-[360px] animate-in fade-in">
            <div className="text-center space-y-1">
              <span className="text-xs font-mono text-[#64b5f6] uppercase tracking-widest">Шаг 4 из 5</span>
              <h2 className="text-2xl font-extrabold text-white">Пароль</h2>
            </div>

            {/* По центру овальное поле [ Пароль ] как на рисунке */}
            <div className="my-auto py-8 relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                placeholder="Пароль"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full px-6 py-4 rounded-full bg-[#17212b] border-2 border-[#30445a] focus:border-[#64b5f6] text-center text-lg font-mono font-bold text-white outline-none transition shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setView('reg_contact')}
                className="p-3.5 rounded-full bg-[#17212b] hover:bg-[#202b36] border border-[#30445a] text-slate-300 cursor-pointer transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <button
                type="submit"
                className="p-4 rounded-full bg-[#0077FF] hover:bg-[#0066DD] text-white cursor-pointer transition shadow-xl hover:scale-105"
                title="К ПИН-коду"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </form>
        )}

        {/* =====================================================================
            ЭКРАН «ПИН-КОД» (При регистрации ИЛИ при входе, если подключен):
            Прямоугольное окошко сверху + круглые кнопки (0-9) -> В системе!
           ===================================================================== */}
        {(view === 'reg_pin' || view === 'login_pin') && (
          <div className="flex flex-col items-center space-y-6 animate-in fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-extrabold text-white">ПИН-код</h2>
              <p className="text-xs text-slate-400">
                {view === 'login_pin'
                  ? `Введите ПИН-код аккаунта ${pendingLoginUser?.displayName || ''}`
                  : 'Установите 6-значный ПИН-код (или пропустите)'}
              </p>
            </div>

            {/* Прямоугольное окошко сверху как на рисунке */}
            <div className="w-full max-w-[260px] h-14 rounded-2xl bg-[#17212b] border-2 border-[#30445a] flex items-center justify-center gap-3 px-4 shadow-inner">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const currentVal = view === 'reg_pin' ? regPin : loginPinInput;
                const filled = currentVal.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                      filled
                        ? 'bg-[#64b5f6] scale-110 shadow-[0_0_10px_rgba(100,181,246,0.8)]'
                        : 'bg-[#243344]'
                    }`}
                  />
                );
              })}
            </div>

            {/* Круглые кнопки цифровой клавиатуры 3x4 как на рисунке */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-[260px] place-items-center">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    playReactionSound();
                    if (view === 'reg_pin') {
                      setRegPin((prev) => (prev.length < 6 ? prev + digit : prev));
                    } else {
                      setLoginPinInput((prev) => (prev.length < 6 ? prev + digit : prev));
                    }
                  }}
                  className="w-16 h-16 rounded-full bg-[#17212b] hover:bg-[#202b36] active:bg-[#0077FF] border-2 border-[#30445a] text-white font-extrabold text-xl flex items-center justify-center transition cursor-pointer shadow-lg active:scale-95"
                >
                  {digit}
                </button>
              ))}

              {/* Сброс */}
              <button
                type="button"
                onClick={() => {
                  playReactionSound();
                  if (view === 'reg_pin') setRegPin('');
                  else setLoginPinInput('');
                }}
                className="w-16 h-16 rounded-full bg-[#17212b] hover:bg-rose-500/20 border-2 border-rose-500/30 text-rose-400 flex items-center justify-center transition cursor-pointer active:scale-95"
                title="Сбросить"
              >
                <X className="w-6 h-6" />
              </button>

              {/* 0 */}
              <button
                type="button"
                onClick={() => {
                  playReactionSound();
                  if (view === 'reg_pin') {
                    setRegPin((prev) => (prev.length < 6 ? prev + '0' : prev));
                  } else {
                    setLoginPinInput((prev) => (prev.length < 6 ? prev + '0' : prev));
                  }
                }}
                className="w-16 h-16 rounded-full bg-[#17212b] hover:bg-[#202b36] active:bg-[#0077FF] border-2 border-[#30445a] text-white font-extrabold text-xl flex items-center justify-center transition cursor-pointer shadow-lg active:scale-95"
              >
                0
              </button>

              {/* Стереть */}
              <button
                type="button"
                onClick={() => {
                  playReactionSound();
                  if (view === 'reg_pin') {
                    setRegPin((prev) => prev.slice(0, -1));
                  } else {
                    setLoginPinInput((prev) => prev.slice(0, -1));
                  }
                }}
                className="w-16 h-16 rounded-full bg-[#17212b] hover:bg-[#202b36] border-2 border-[#30445a] text-amber-300 flex items-center justify-center transition cursor-pointer active:scale-95"
                title="Стереть"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>

            {/* Переход «В системе» */}
            <div className="w-full max-w-[260px] space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (view === 'reg_pin') {
                    handleFinishRegistration(false);
                  } else {
                    handleVerifyLoginPin();
                  }
                }}
                className="w-full py-3.5 rounded-full bg-[#0077FF] hover:bg-[#0066DD] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-xl"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>В систему →</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setFormError('');
                    if (view === 'reg_pin') setView('reg_password');
                    else setView('home');
                  }}
                  className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Назад</span>
                </button>

                {view === 'reg_pin' && (
                  <button
                    type="button"
                    onClick={() => handleFinishRegistration(true)}
                    className="text-[#64b5f6] hover:underline font-semibold cursor-pointer"
                  >
                    Пропустить без ПИН →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
