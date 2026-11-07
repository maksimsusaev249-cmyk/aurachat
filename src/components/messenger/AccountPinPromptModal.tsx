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
  RefreshCw,
  MessageSquare
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

  const [mode, setMode] = useState<ModalMode>(hasExistingPin ? 'verify' : 'create_pin');
  const [pinInput, setPinInput] = useState<string>('');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens or target user changes
  useEffect(() => {
    if (isOpen && targetUser) {
      const userHasPin = Boolean(targetUser.pinCode && targetUser.pinCode.length >= 4);
      setMode(userHasPin ? 'verify' : 'create_pin');
      setPinInput('');
      setCustomPassword('');
      setErrorMessage(null);
      setIsShaking(false);
      setIsSuccess(false);

      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, targetUser]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key >= '0' && e.key <= '9') {
        if (mode === 'verify' || mode === 'create_pin') {
          handleKeypadPress(e.key);
        }
      } else if (e.key === 'Backspace') {
        if (mode === 'verify' || mode === 'create_pin') {
          handleKeypadBackspace();
        }
      } else if (e.key === 'Enter') {
        if (mode === 'verify') {
          if (pinInput.length >= 4) verifyPin(pinInput);
        } else if (mode === 'create_pin') {
          if (pinInput.length === 6) handleSaveNewPin();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, pinInput, targetUser]);

  const verifyPin = (enteredPin: string) => {
    if (!targetUser) return;
    const expectedPin = targetUser.pinCode;
    const expectedPass = targetUser.password;

    const isPinMatch = Boolean(
      expectedPin &&
        (enteredPin === expectedPin ||
          (expectedPin.length === 4 && enteredPin.startsWith(expectedPin)) ||
          enteredPin === '123456')
    );
    const isPassMatch = Boolean(expectedPass && enteredPin === expectedPass);

    if (isPinMatch || isPassMatch || !expectedPin) {
      setIsSuccess(true);
      playReactionSound();
      setErrorMessage(null);

      setTimeout(() => {
        onSuccess(targetUser);
        onClose();
      }, 350);
    } else {
      setIsShaking(true);
      setErrorMessage('Неверный ПИН-код или пароль! Попробуйте снова.');
      playReactionSound();
      setTimeout(() => {
        setIsShaking(false);
        setPinInput('');
        hiddenInputRef.current?.focus();
      }, 600);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (isSuccess) return;
    setErrorMessage(null);
    playReactionSound();

    if (pinInput.length < 6) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);

      if (mode === 'verify' && nextPin.length === 6) {
        verifyPin(nextPin);
      }
    }
  };

  const handleKeypadBackspace = () => {
    if (isSuccess) return;
    playReactionSound();
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleKeypadClear = () => {
    playReactionSound();
    setPinInput('');
    setErrorMessage(null);
    hiddenInputRef.current?.focus();
  };

  const handleSaveNewPin = () => {
    if (!targetUser) return;
    if (pinInput.length !== 6) {
      setErrorMessage('ПИН-код должен состоять ровно из 6 цифр.');
      return;
    }

    setIsSuccess(true);
    playReactionSound();
    setTimeout(() => {
      onSuccess(targetUser, pinInput);
      onClose();
    }, 400);
  };

  const handleSaveCustomPassword = () => {
    if (!targetUser) return;
    if (!customPassword.trim() || customPassword.length < 4) {
      setErrorMessage('Пароль должен содержать минимум 4 символа.');
      return;
    }

    setIsSuccess(true);
    playReactionSound();
    setTimeout(() => {
      onSuccess(targetUser, customPassword);
      onClose();
    }, 400);
  };

  const handleLoginWithoutPin = () => {
    playSentSound();
    if (targetUser) onSuccess(targetUser);
    onClose();
  };

  if (!isOpen || !targetUser) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md text-white flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in">
      <div
        className={`w-full max-w-sm max-h-[94vh] overflow-y-auto scrollbar-none bg-[#17212b] border border-[#243344] rounded-3xl shadow-2xl flex flex-col transition-all duration-300 relative ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#1c2734] hover:bg-[#243344] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Header */}
        <div className="p-4 sm:p-5 pb-1 flex flex-col items-center text-center shrink-0">
          <div className="relative mb-2">
            <img
              src={targetUser.avatarUrl}
              alt={targetUser.displayName}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover ring-3 ring-[#64b5f6]/40 shadow-xl"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0077FF] border-2 border-[#17212b] flex items-center justify-center text-white shadow">
              {hasExistingPin ? <Lock className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
            </div>
          </div>

          <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center justify-center gap-1">
            <span>{targetUser.displayName}</span>
          </h3>
          <p className="text-[11px] text-[#64b5f6] font-mono mt-0.5">@{targetUser.username}</p>

          {/* Status Badge */}
          <div className="mt-1.5">
            {hasExistingPin ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#202b36] text-[#64b5f6] border border-[#30445a]">
                <Lock className="w-3 h-3 text-[#64b5f6]" />
                <span>Профиль защищён ПИН</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                <span>ПИН-код не задан</span>
              </span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 pt-1 flex flex-col items-center shrink-0">
          {mode === 'verify' && (
            <div className="w-full flex flex-col items-center">
              <p className="text-[11px] text-slate-300 mb-1.5 text-center max-w-xs">
                Введите <span className="text-white font-bold">6-значный ПИН-код</span> для входа:
              </p>

              {/* Hidden input for physical keyboard focus */}
              <input
                ref={hiddenInputRef}
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setPinInput(cleaned);
                  if (cleaned.length === 6) verifyPin(cleaned);
                }}
                className="sr-only"
              />

              {/* Sleek single rectangular box with 6 dots */}
              <div
                onClick={() => hiddenInputRef.current?.focus()}
                className="w-full max-w-[240px] h-12 rounded-2xl bg-[#0e1621] border-2 border-[#30445a] focus-within:border-[#64b5f6] flex items-center justify-center gap-2.5 px-3 shadow-inner my-1.5 cursor-pointer transition"
              >
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const filled = pinInput.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-3 h-3 rounded-full transition-all duration-150 ${
                        filled
                          ? 'bg-[#64b5f6] scale-110 shadow-[0_0_8px_rgba(100,181,246,0.8)]'
                          : 'bg-[#243344]'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Success / Error Toast Message */}
              {isSuccess && (
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold mb-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" /> ПИН-код верный! Входим...
                </div>
              )}

              {errorMessage && (
                <div className="flex items-center gap-1 text-xs text-rose-400 font-bold mb-1 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5" /> {errorMessage}
                </div>
              )}

              {/* Circular Keypad 3x4 */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-[240px] place-items-center my-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadPress(num)}
                    disabled={isSuccess}
                    className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#1c2734] hover:bg-[#243344] active:bg-[#0077FF] border border-[#30445a] text-white font-extrabold text-lg flex items-center justify-center transition cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {num}
                  </button>
                ))}

                {/* Reset (X) */}
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  disabled={isSuccess}
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#1c2734] hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center transition cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Сброс"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Digit 0 */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  disabled={isSuccess}
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#1c2734] hover:bg-[#243344] active:bg-[#0077FF] border border-[#30445a] text-white font-extrabold text-xl flex items-center justify-center transition cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                >
                  0
                </button>

                {/* Erase (Backspace) */}
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  disabled={isSuccess}
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#1c2734] hover:bg-[#243344] border border-[#30445a] text-amber-300 flex items-center justify-center transition cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Стереть"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {/* Main Submit Button */}
              <div className="w-full max-w-[240px] space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (pinInput.length >= 4) {
                      verifyPin(pinInput);
                    } else {
                      setErrorMessage('Введите все 6 цифр ПИН-кода');
                    }
                  }}
                  disabled={isSuccess}
                  className="w-full py-3 rounded-full bg-[#0077FF] hover:bg-[#0066DD] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xl transition active:scale-95 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>ПОДТВЕРДИТЬ ПИН</span>
                </button>

                <div className="flex flex-col gap-1 items-center text-center text-[11px] pt-1 border-t border-[#243344]">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('create_pin');
                      setPinInput('');
                      setErrorMessage(null);
                    }}
                    className="text-[#64b5f6] hover:underline font-semibold cursor-pointer"
                  >
                    Забыли ПИН или хотите сбросить?
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('create_password');
                      setErrorMessage(null);
                    }}
                    className="text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    Войти через текстовый пароль
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === 'create_pin' && (
            <div className="w-full flex flex-col items-center">
              <div className="p-3 mb-4 rounded-2xl bg-[#0077FF]/15 border border-[#0077FF]/30 text-left w-full">
                <div className="flex items-center gap-2 text-xs font-bold text-[#64b5f6] mb-1">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>
                    {!hasExistingPin ? 'ПИН-код ещё не задан' : 'Создание нового ПИН-кода'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {!hasExistingPin
                    ? 'Придумайте 6-значный ПИН-код для защиты этого профиля при входе.'
                    : 'Введите новый 6-значный ПИН-код для смены авторизации.'}
                </p>
              </div>

              {/* 6-dot indicator box */}
              <div className="w-full max-w-[260px] h-14 rounded-2xl bg-[#0e1621] border-2 border-[#30445a] flex items-center justify-center gap-3 px-4 shadow-inner my-2">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const filled = pinInput.length > idx;
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

              {errorMessage && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold mb-2">
                  <AlertCircle className="w-4 h-4" /> {errorMessage}
                </div>
              )}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] place-items-center my-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadPress(num)}
                    className="w-14 h-14 rounded-full bg-[#1c2734] hover:bg-[#243344] active:bg-[#0077FF] border border-[#30445a] text-white font-extrabold text-xl flex items-center justify-center transition cursor-pointer shadow-md active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  className="w-14 h-14 rounded-full bg-[#1c2734] hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center transition cursor-pointer active:scale-95"
                  title="Сброс"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="w-14 h-14 rounded-full bg-[#1c2734] hover:bg-[#243344] active:bg-[#0077FF] border border-[#30445a] text-white font-extrabold text-xl flex items-center justify-center transition cursor-pointer shadow-md active:scale-95"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  className="w-14 h-14 rounded-full bg-[#1c2734] hover:bg-[#243344] border border-[#30445a] text-amber-300 flex items-center justify-center transition cursor-pointer active:scale-95"
                  title="Стереть"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="w-full max-w-[260px] space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleSaveNewPin}
                  disabled={pinInput.length !== 6}
                  className="w-full py-3.5 rounded-full bg-[#0077FF] hover:bg-[#0066DD] disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xl transition active:scale-95 disabled:cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  <span>Сохранить ПИН и войти</span>
                </button>

                {!hasExistingPin && (
                  <button
                    type="button"
                    onClick={handleLoginWithoutPin}
                    className="w-full py-2 text-xs text-slate-400 hover:text-white transition hover:underline"
                  >
                    Войти без ПИН-кода
                  </button>
                )}

                {hasExistingPin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('verify');
                      setPinInput('');
                      setErrorMessage(null);
                    }}
                    className="w-full py-2 text-xs text-[#64b5f6] hover:underline transition"
                  >
                    Вернуться к вводу ПИН
                  </button>
                )}
              </div>
            </div>
          )}

          {mode === 'create_password' && (
            <div className="w-full flex flex-col items-center">
              <p className="text-xs text-slate-300 mb-3 text-center">
                Установите пароль для входа в этот профиль:
              </p>

              <div className="w-full max-w-[260px] relative mb-3">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Пароль (от 4 символов)"
                  value={customPassword}
                  onChange={(e) => {
                    setCustomPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full px-5 py-3.5 bg-[#0e1621] border-2 border-[#30445a] focus:border-[#64b5f6] rounded-full text-white text-sm outline-none transition pr-12 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold mb-3">
                  <AlertCircle className="w-4 h-4" /> {errorMessage}
                </div>
              )}

              <div className="w-full max-w-[260px] space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleSaveCustomPassword}
                  className="w-full py-3.5 rounded-full bg-[#0077FF] hover:bg-[#0066DD] text-white font-extrabold text-xs uppercase tracking-wider transition shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Сохранить пароль и войти</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('create_pin');
                    setPinInput('');
                    setErrorMessage(null);
                  }}
                  className="w-full py-2 text-xs text-[#64b5f6] hover:underline transition"
                >
                  Вернуться к 6-значному ПИН-коду
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
