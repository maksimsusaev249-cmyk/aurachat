import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../types';
import { 
  X, 
  Lock, 
  KeyRound, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Delete,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { playReactionSound, playSentSound } from '../../utils/audioUtils';

interface AccountPinPromptModalProps {
  isOpen: boolean;
  targetUser: User | null;
  onClose: () => void;
  onSuccess: (authenticatedUser: User, updatedPin?: string) => void;
}

type ModalMode = 'verify' | 'create_pin' | 'create_password';

export const AccountPinPromptModal: React.FC<AccountPinPromptModalProps> = ({
  isOpen,
  targetUser,
  onClose,
  onSuccess
}) => {
  const hasExistingPin = Boolean(targetUser?.pinCode && targetUser.pinCode.length >= 4);

  // Initial mode: if user has a PIN, verify it; otherwise offer to create one
  const [mode, setMode] = useState<ModalMode>(hasExistingPin ? 'verify' : 'create_pin');
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [confirmPinDigits, setConfirmPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeInputIndex, setActiveInputIndex] = useState<number>(0);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens or target user changes
  useEffect(() => {
    if (isOpen && targetUser) {
      const userHasPin = Boolean(targetUser.pinCode && targetUser.pinCode.length >= 4);
      setMode(userHasPin ? 'verify' : 'create_pin');
      setPinDigits(['', '', '', '', '', '']);
      setConfirmPinDigits(['', '', '', '', '', '']);
      setCustomPassword('');
      setErrorMessage(null);
      setIsShaking(false);
      setIsSuccess(false);
      setActiveInputIndex(0);

      // Auto-focus first input after animation
      setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 150);
    }
  }, [isOpen, targetUser]);

  // Global keyboard listener for escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle digit change in verification mode
  const handleDigitChange = (index: number, value: string) => {
    if (isSuccess) return;
    setErrorMessage(null);

    // Only take the last character typed if it's a digit
    const cleaned = value.replace(/\D/g, '');
    const char = cleaned.slice(-1);

    const newPinDigits = [...pinDigits];
    newPinDigits[index] = char;
    setPinDigits(newPinDigits);

    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus();
      setActiveInputIndex(index + 1);
    }

    // If all 6 digits entered
    const fullPin = newPinDigits.join('');
    if (fullPin.length === 6 && !newPinDigits.includes('')) {
      verifyPin(fullPin);
    }
  };

  const handleKeyDownInput = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
      setActiveInputIndex(index - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasteData.length; i++) {
      newDigits[i] = pasteData[i];
    }
    setPinDigits(newDigits);

    if (pasteData.length === 6) {
      verifyPin(pasteData);
    } else {
      inputsRef.current[pasteData.length]?.focus();
      setActiveInputIndex(pasteData.length);
    }
  };

  // Verify entered PIN
  const verifyPin = (enteredPin: string) => {
    if (!targetUser) return;
    const expectedPin = targetUser.pinCode;

    if (expectedPin && (enteredPin === expectedPin || (expectedPin.length === 4 && enteredPin.startsWith(expectedPin)))) {
      // Success!
      setIsSuccess(true);
      playReactionSound();
      setErrorMessage(null);

      setTimeout(() => {
        onSuccess(targetUser);
        onClose();
      }, 500);
    } else {
      // Incorrect PIN
      setIsShaking(true);
      setErrorMessage('Неверный 6-значный ПИН-код! Попробуйте снова.');
      setTimeout(() => {
        setIsShaking(false);
        setPinDigits(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
        setActiveInputIndex(0);
      }, 700);
    }
  };

  // On-screen Keypad click
  const handleKeypadPress = (digit: string) => {
    if (mode === 'verify') {
      const emptyIndex = pinDigits.findIndex((d) => d === '');
      if (emptyIndex !== -1) {
        handleDigitChange(emptyIndex, digit);
      }
    } else if (mode === 'create_pin') {
      const emptyIndex = pinDigits.findIndex((d) => d === '');
      if (emptyIndex !== -1) {
        const next = [...pinDigits];
        next[emptyIndex] = digit;
        setPinDigits(next);
        setErrorMessage(null);
      }
    }
  };

  const handleKeypadBackspace = () => {
    if (mode === 'verify') {
      const lastFilledIndex = [...pinDigits].reverse().findIndex((d) => d !== '');
      if (lastFilledIndex !== -1) {
        const actualIndex = 5 - lastFilledIndex;
        const next = [...pinDigits];
        next[actualIndex] = '';
        setPinDigits(next);
        inputsRef.current[actualIndex]?.focus();
        setActiveInputIndex(actualIndex);
        setErrorMessage(null);
      }
    } else if (mode === 'create_pin') {
      const lastFilledIndex = [...pinDigits].reverse().findIndex((d) => d !== '');
      if (lastFilledIndex !== -1) {
        const actualIndex = 5 - lastFilledIndex;
        const next = [...pinDigits];
        next[actualIndex] = '';
        setPinDigits(next);
        setErrorMessage(null);
      }
    }
  };

  const handleKeypadClear = () => {
    setPinDigits(['', '', '', '', '', '']);
    setErrorMessage(null);
    if (mode === 'verify') {
      inputsRef.current[0]?.focus();
      setActiveInputIndex(0);
    }
  };

  // Handle Save New PIN
  const handleSaveNewPin = () => {
    if (!targetUser) return;
    const newPin = pinDigits.join('');
    if (newPin.length !== 6 || pinDigits.includes('')) {
      setErrorMessage('ПИН-код должен состоять ровно из 6 цифр.');
      return;
    }

    setIsSuccess(true);
    playReactionSound();
    setTimeout(() => {
      onSuccess(targetUser, newPin);
      onClose();
    }, 450);
  };

  // Handle Save New Custom Password
  const handleSaveCustomPassword = () => {
    if (!targetUser) return;
    if (!customPassword.trim() || customPassword.length < 4) {
      setErrorMessage('Пароль должен содержать минимум 4 символа.');
      return;
    }

    setIsSuccess(true);
    playReactionSound();
    setTimeout(() => {
      // In this app, we can store either as updated PIN or password
      onSuccess(targetUser, customPassword);
      onClose();
    }, 450);
  };

  // Handle Skip PIN (login directly without setting PIN)
  const handleLoginWithoutPin = () => {
    playSentSound();
    if (targetUser) onSuccess(targetUser);
    onClose();
  };

  if (!isOpen || !targetUser) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#121026] text-white flex items-center justify-center p-4 select-none animate-fadeIn">
      <div 
        className={`w-full max-w-md bg-[#1c1a36] border border-[#2d2954] rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#243447] flex items-center justify-between bg-[#1f2d3d]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#5288c1]/20 border border-[#5288c1]/40 flex items-center justify-center text-[#64b5f6]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                {mode === 'verify' ? 'Вход по ПИН-коду' : 'Защита профиля'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {mode === 'verify' ? 'Безопасная смена аккаунта' : 'Настройка 6-значного кода'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Profile Card */}
        <div className="p-5 flex flex-col items-center text-center">
          <div className="relative mb-3">
            <img
              src={targetUser.avatarUrl}
              alt={targetUser.displayName}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-[#5288c1]/50 shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#5288c1] border-2 border-[#182533] flex items-center justify-center text-white shadow">
              {hasExistingPin ? <Lock className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />}
            </div>
          </div>

          <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
            <span>{targetUser.displayName}</span>
            {targetUser.verified && (
              <span className="text-xs bg-[#5288c1] text-white px-1.5 py-0.5 rounded-full font-bold">✓</span>
            )}
          </h3>
          <p className="text-xs text-[#64b5f6] font-mono">@{targetUser.username}</p>

          {/* Status Badge */}
          <div className="mt-2">
            {hasExistingPin ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Lock className="w-3 h-3" /> Профиль защищён 6-значным ПИН
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <AlertCircle className="w-3 h-3" /> ПИН-код не был установлен
              </span>
            )}
          </div>
        </div>

        {/* Content Body Based on Mode */}
        <div className="px-6 pb-6 flex flex-col items-center">
          {mode === 'verify' && (
            <div className="w-full flex flex-col items-center">
              <p className="text-xs text-slate-300 mb-4 text-center max-w-xs">
                Введите <span className="text-white font-bold">6-значный ПИН-код</span> для доступа к этому профилю:
              </p>

              {/* 6 Digit Input Boxes */}
              <div className="flex items-center justify-center gap-2 mb-3" onPaste={handlePaste}>
                {pinDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputsRef.current[idx] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDownInput(idx, e)}
                    onFocus={() => setActiveInputIndex(idx)}
                    disabled={isSuccess}
                    className={`w-11 h-13 text-center text-xl font-bold rounded-xl transition outline-none select-none ${
                      isSuccess
                        ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300'
                        : isShaking
                        ? 'bg-rose-500/20 border-2 border-rose-400 text-rose-300'
                        : digit
                        ? 'bg-[#243447] border-2 border-[#5288c1] text-white shadow-inner'
                        : activeInputIndex === idx
                        ? 'bg-[#1e2d3d] border-2 border-[#64b5f6] text-white'
                        : 'bg-[#1e2d3d] border border-[#2b3e55] text-slate-400'
                    }`}
                  />
                ))}
              </div>

              {/* Success indicator or Error message */}
              {isSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-3 animate-fadeIn">
                  <Check className="w-4 h-4" /> ПИН-код подтверждён! Входим...
                </div>
              )}

              {errorMessage && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mb-3 animate-fadeIn">
                  <AlertCircle className="w-4 h-4" /> {errorMessage}
                </div>
              )}

              {/* Discreet test hint if default user */}
              {targetUser.id === 'usr_me' && (
                <p className="text-[10px] text-slate-500 mb-2">
                  (Тестовый ПИН-код по умолчанию: <span className="font-mono text-slate-400">123456</span>)
                </p>
              )}

              {/* Numeric Keypad with Digits, X Reset, Erase Backspace, and Check Confirm */}
              <div className="w-full max-w-[280px] grid grid-cols-3 gap-2.5 mt-2 mb-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadPress(num)}
                    disabled={isSuccess}
                    className="h-12 rounded-2xl bg-[#2a264a] hover:bg-[#383363] active:bg-[#f1c40f] active:text-[#1c1a36] text-white font-extrabold text-xl transition shadow border border-[#3c366e] flex items-center justify-center active:scale-95 cursor-pointer"
                  >
                    {num}
                  </button>
                ))}

                {/* Крестик (❌ / Сбросить) */}
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  disabled={isSuccess}
                  title="Сбросить все цифры"
                  className="h-12 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500 text-rose-400 active:text-white font-bold text-xs border border-rose-500/30 transition flex flex-col items-center justify-center active:scale-95 cursor-pointer gap-0.5"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                  <span className="text-[9px]">Сброс</span>
                </button>

                {/* Цифра 0 */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  disabled={isSuccess}
                  className="h-12 rounded-2xl bg-[#2a264a] hover:bg-[#383363] active:bg-[#f1c40f] active:text-[#1c1a36] text-white font-extrabold text-xl transition shadow border border-[#3c366e] flex items-center justify-center active:scale-95 cursor-pointer"
                >
                  0
                </button>

                {/* Стереть (⌫ / Backspace) */}
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  disabled={isSuccess}
                  title="Стереть последнюю цифру"
                  className="h-12 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500 text-amber-300 active:text-[#1c1a36] font-bold text-xs border border-amber-500/30 transition flex flex-col items-center justify-center active:scale-95 cursor-pointer gap-0.5"
                >
                  <Delete className="w-4 h-4 stroke-[2.5]" />
                  <span className="text-[9px]">Стереть</span>
                </button>
              </div>

              {/* Галочка (✓ / Подтвердить ПИН) Button */}
              <button
                type="button"
                onClick={() => {
                  const fullPin = pinDigits.join('');
                  if (fullPin.length >= 4) {
                    verifyPin(fullPin);
                  } else {
                    setErrorMessage('Введите все 6 цифр ПИН-кода');
                  }
                }}
                disabled={isSuccess}
                className="w-full max-w-[280px] py-3 mb-3 bg-[#f1c40f] hover:bg-[#e6b800] text-[#1c1a36] rounded-2xl font-extrabold text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Подтвердить ПИН</span>
              </button>

              {/* Alternative / Forgot PIN link */}
              <div className="w-full pt-3 border-t border-[#243447] flex flex-col gap-2 items-center text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('create_pin');
                    setPinDigits(['', '', '', '', '', '']);
                    setErrorMessage(null);
                  }}
                  className="text-xs text-[#64b5f6] hover:text-[#90caf9] hover:underline flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Забыли ПИН или хотите создать новый?
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('create_password');
                    setErrorMessage(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-200 transition"
                >
                  Или войти через текстовый пароль
                </button>
              </div>
            </div>
          )}

          {mode === 'create_pin' && (
            <div className="w-full flex flex-col items-center">
              <div className="p-3 mb-4 rounded-2xl bg-[#5288c1]/10 border border-[#5288c1]/30 text-left w-full">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#64b5f6] mb-1">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>
                    {!hasExistingPin ? 'ПИН-код ещё не задан' : 'Создание нового ПИН-кода'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {!hasExistingPin
                    ? 'Для этого профиля ещё не был настроен 6-значный ПИН. Придумайте и введите 6 цифр, чтобы защитить вход.'
                    : 'Введите новый 6-значный ПИН-код для замены предыдущего пароля профиля.'}
                </p>
              </div>

              {/* 6-Digit Display */}
              <div className="flex items-center justify-center gap-2 mb-3">
                {pinDigits.map((digit, idx) => (
                  <div
                    key={idx}
                    className={`w-11 h-13 rounded-xl flex items-center justify-center text-xl font-bold transition ${
                      digit
                        ? 'bg-[#243447] border-2 border-[#5288c1] text-white shadow-inner'
                        : 'bg-[#1e2d3d] border border-[#2b3e55] text-slate-500'
                    }`}
                  >
                    {digit ? '●' : '—'}
                  </div>
                ))}
              </div>

              {errorMessage && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mb-3">
                  <AlertCircle className="w-4 h-4" /> {errorMessage}
                </div>
              )}

              {/* Keypad for PIN Creation */}
              <div className="w-full max-w-[280px] grid grid-cols-3 gap-2 mt-1 mb-4">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadPress(num)}
                    className="h-11 rounded-xl bg-[#243447] hover:bg-[#2e4259] active:bg-[#5288c1] text-white font-semibold text-lg transition shadow flex items-center justify-center active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  className="h-11 rounded-xl bg-[#243447]/60 hover:bg-[#243447] text-slate-400 hover:text-white font-medium text-xs transition flex items-center justify-center"
                >
                  Сброс
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-11 rounded-xl bg-[#243447] hover:bg-[#2e4259] active:bg-[#5288c1] text-white font-semibold text-lg transition shadow flex items-center justify-center active:scale-95"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  className="h-11 rounded-xl bg-[#243447]/60 hover:bg-[#243447] text-slate-400 hover:text-white transition flex items-center justify-center"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSaveNewPin}
                  disabled={pinDigits.includes('')}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#5288c1] to-[#3b72aa] hover:from-[#5b95d4] hover:to-[#4380be] disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  <span>Сохранить 6-значный ПИН и войти</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('create_password');
                    setErrorMessage(null);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-[#243447] hover:bg-[#2e4259] text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#64b5f6]" />
                  <span>Или установить текстовый пароль</span>
                </button>

                {!hasExistingPin && (
                  <button
                    type="button"
                    onClick={handleLoginWithoutPin}
                    className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition hover:underline"
                  >
                    Войти без ПИН-кода (установлю позже сам)
                  </button>
                )}

                {hasExistingPin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('verify');
                      setPinDigits(['', '', '', '', '', '']);
                      setErrorMessage(null);
                    }}
                    className="w-full py-2 text-xs text-slate-400 hover:text-white transition"
                  >
                    Вернуться к вводу текущего ПИН
                  </button>
                )}
              </div>
            </div>
          )}

          {mode === 'create_password' && (
            <div className="w-full flex flex-col items-center">
              <p className="text-xs text-slate-300 mb-3 text-center">
                Установите свой собственный пароль для быстрого входа в профиль:
              </p>

              <div className="w-full relative mb-3">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Придумайте пароль (от 4 символов)"
                  value={customPassword}
                  onChange={(e) => {
                    setCustomPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full px-4 py-3 bg-[#1e2d3d] border border-[#2b3e55] focus:border-[#5288c1] rounded-2xl text-white text-sm outline-none transition pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mb-3">
                  <AlertCircle className="w-4 h-4" /> {errorMessage}
                </div>
              )}

              <div className="w-full flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSaveCustomPassword}
                  className="w-full py-3 rounded-2xl bg-[#5288c1] hover:bg-blue-600 text-white font-semibold text-sm transition shadow flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Сохранить пароль и войти</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('create_pin');
                    setPinDigits(['', '', '', '', '', '']);
                    setErrorMessage(null);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-[#243447] hover:bg-[#2e4259] text-xs font-semibold text-slate-200 transition"
                >
                  Вернуться к 6-значному ПИН-коду
                </button>

                <button
                  type="button"
                  onClick={handleLoginWithoutPin}
                  className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-200 transition hover:underline"
                >
                  Войти без пароля
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
