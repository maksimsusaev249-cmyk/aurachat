import React, { useState } from 'react';
import { 
  X, 
  Monitor, 
  Smartphone, 
  Download, 
  Check, 
  Copy, 
  Share, 
  PlusSquare, 
  Laptop, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink,
  ArrowRight,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { usePWAInstall } from '../../utils/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { 
    isInstallable, 
    isInstalled, 
    isIOS, 
    isAndroid, 
    isDesktop, 
    promptInstall, 
    downloadApk, 
    downloadDesktopInstaller 
  } = usePWAInstall();

  // Selected Tab: defaults to detected OS
  const defaultTab = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';
  const [activeTab, setActiveTab] = useState<'desktop' | 'android' | 'ios'>(defaultTab);

  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadApkClick = () => {
    downloadApk();
    setDownloadSuccess('Файл NovaChat-v2.5.0.apk скачан! Откройте его на Android для установки.');
    setTimeout(() => setDownloadSuccess(null), 5000);
  };

  const handleDownloadDesktopClick = () => {
    downloadDesktopInstaller();
    setDownloadSuccess('Ярлык для рабочего стола скачан! Перетащите его на рабочий стол.');
    setTimeout(() => setDownloadSuccess(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none">
      <div 
        onClick={onClose}
        className="fixed inset-0"
      />

      <div className="relative w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] bg-[#17212b] border border-[#243344] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 text-white animate-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#17212b] via-[#1c2937] to-[#17212b] border-b border-[#243344] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-[#5288c1] text-white shadow-lg shadow-teal-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Установить приложение</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  v2.5 Release
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Легкое скачивание и ты сразу в системе без лишних настроек
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-[#243344] transition cursor-pointer"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Standalone status indicator banner */}
        {isInstalled && (
          <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-800/40 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Приложение уже установлено и работает в нативном автономном режиме!</span>
          </div>
        )}

        {/* Success toast notification */}
        {downloadSuccess && (
          <div className="px-4 py-2.5 bg-blue-950/50 border-b border-blue-700/50 flex items-center gap-2 text-xs text-blue-200 animate-in fade-in">
            <Zap className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Platform Switcher Tabs */}
        <div className="p-3 bg-[#121b24] border-b border-[#202d3a] flex items-center justify-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-[#5288c1] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#1a2533]'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Компьютер (ПК)</span>
            {isDesktop && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>

          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'android'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#1a2533]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android (.APK)</span>
            {isAndroid && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>

          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#1a2533]'
            }`}
          >
            <Share className="w-4 h-4" />
            <span>iOS (iPhone/iPad)</span>
            {isIOS && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin">
          
          {/* TAB 1: DESKTOP / КОМПЬЮТЕР */}
          {activeTab === 'desktop' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-[#1d2938] border border-[#2b3c4f] flex flex-col sm:flex-row items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-[#64b5f6] flex items-center justify-center shrink-0 border border-blue-500/20">
                  <Laptop className="w-8 h-8" />
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <h3 className="font-bold text-base text-white">NovaChat Desktop для компьютера</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Открывается в отдельном окне без рамок браузера, поддерживает горячие клавиши, звонки WebRTC и мгновенную работу с медиа.
                  </p>
                </div>
              </div>

              {/* Action Buttons for Desktop */}
              <div className="space-y-2">
                {isInstallable ? (
                  <button
                    onClick={promptInstall}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-[#5288c1] hover:from-blue-500 hover:to-blue-400 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-5 h-5" />
                    <span>Установить приложение на компьютер (1 клик)</span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-slate-300 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-white">Установка через строку браузера:</span>
                      <p className="text-slate-300 mt-0.5">
                        В браузере (Chrome / Edge / Яндекс) нажмите на иконку монитора со стрелкой <strong>«Установить приложение»</strong> справа в адресной строке.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleDownloadDesktopClick}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#243344] hover:bg-[#2e4055] text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer border border-[#314459]"
                >
                  <Monitor className="w-4 h-4 text-slate-400" />
                  <span>Скачать ярлык запуска для Рабочего стола</span>
                </button>
              </div>

              {/* Benefits list */}
              <div className="p-3.5 rounded-xl bg-[#121b24] border border-[#202d3a] space-y-2 text-xs">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Преимущества версии для ПК:</span>
                </div>
                <ul className="space-y-1.5 text-slate-400 pl-5 list-disc">
                  <li>Запуск прямо с рабочего стола или панели задач</li>
                  <li>Ты уже в системе: не нужно повторно логиниться</li>
                  <li>Плавное воспроизведение видео Reels и быстрые голосовые</li>
                  <li>Звонки со сквозным шифрованием и демонстрацией экрана</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: ANDROID (.APK) */}
          {activeTab === 'android' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-[#14261e] border border-emerald-900/40 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Smartphone className="w-8 h-8" />
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <h3 className="font-bold text-base text-white">NovaChat APK для Android</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Прямая загрузка APK файла. Без ожидания модерации Google Play. Полная поддержка камеры, кружочков и фоновых звонков.
                  </p>
                </div>
              </div>

              {/* Action Buttons for Android */}
              <div className="space-y-2">
                <button
                  onClick={handleDownloadApkClick}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>Скачать APK файл (NovaChat-v2.5.0.apk)</span>
                </button>

                {isInstallable && (
                  <button
                    onClick={promptInstall}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#243344] hover:bg-[#2e4055] text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer border border-[#314459]"
                  >
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Быстрая установка WebAPK на главный экран</span>
                  </button>
                )}
              </div>

              {/* 3 Steps Guide for Android */}
              <div className="p-4 rounded-2xl bg-[#121b24] border border-[#202d3a] space-y-3">
                <h4 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                  <span>Инструкция по установке APK:</span>
                </h4>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <span>Нажмите <strong>«Скачать APK файл»</strong> выше и дождитесь окончания загрузки.</span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <span>Откройте файл в шторке уведомлений или в папке «Загрузки».</span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <span>При запросе выберите «Разрешить установку» и нажмите «Установить».</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#202d3a] flex items-center gap-2 text-[11px] text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span>Готово! Иконка появится на экране, и ты сразу авторизован в системе.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: iOS (IPHONE / IPAD - ИНСТРУКЦИЯ) */}
          {activeTab === 'ios' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-[#1f2937] border border-slate-700/50 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/20">
                  <Share className="w-8 h-8" />
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <h3 className="font-bold text-base text-white">NovaChat для iPhone и iPad</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Установка на iOS работает через браузер Safari в 3 простых шага без App Store. Приложение запускается на весь экран без адресной строки.
                  </p>
                </div>
              </div>

              {/* Copy link button if opened in another browser */}
              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 px-4 rounded-xl bg-[#243344] hover:bg-[#2e4055] text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer border border-[#314459]"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#64b5f6]" />}
                <span>{copiedLink ? 'Ссылка скопирована! Откройте Safari' : 'Скопировать ссылку для Safari'}</span>
              </button>

              {/* Step-by-Step Illustrated Guide for iOS */}
              <div className="p-4 rounded-2xl bg-[#121b24] border border-[#202d3a] space-y-3.5">
                <h4 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Пошаговая инструкция установки в Safari:</span>
                </h4>

                <div className="space-y-3 text-xs text-slate-300">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#17212b] border border-[#243344]">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-[#64b5f6] flex items-center justify-center shrink-0 font-bold text-xs">
                      1
                    </div>
                    <div>
                      <span className="font-bold text-white block">Откройте Safari</span>
                      <span className="text-slate-400 text-[11px]">
                        Убедитесь, что страница открыта именно в браузере Safari на iPhone или iPad.
                      </span>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#17212b] border border-[#243344]">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-[#64b5f6] flex items-center justify-center shrink-0 font-bold text-xs">
                      2
                    </div>
                    <div>
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span>Нажмите «Поделиться»</span>
                        <Share className="w-3.5 h-3.5 text-blue-400" />
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        Иконка квадрата со стрелочкой вверх ⬆️ в нижней панели управления Safari.
                      </span>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#17212b] border border-[#243344]">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
                      3
                    </div>
                    <div>
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span>Выберите «На экран "Домой"»</span>
                        <PlusSquare className="w-3.5 h-3.5 text-emerald-400" />
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        Прокрутите меню действий вниз и найдите пункт со знаком «+».
                      </span>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#17212b] border border-[#243344]">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
                      4
                    </div>
                    <div>
                      <span className="font-bold text-white block">Нажмите «Добавить»</span>
                      <span className="text-slate-400 text-[11px]">
                        В правом верхнем углу нажмите кнопку «Добавить».
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Иконка NovaChat появится на домашнем экране. Ты в системе и готов к общению!</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#121b24] border-t border-[#202d3a] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
            <span className="truncate">Сессия сохраняется на всех устройствах</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#243344] hover:bg-[#30445a] text-white font-medium transition cursor-pointer"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
