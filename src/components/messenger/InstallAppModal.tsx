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
  Zap,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { usePWAInstall } from '../../utils/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const {
    isInstalled,
    isIOS,
    isAndroid,
    promptInstall,
    downloadApk,
    downloadDesktopInstaller
  } = usePWAInstall();

  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [isInstallingNow, setIsInstallingNow] = useState(false);

  if (!isOpen) return null;

  // Главная кнопка: 1 клик — без скачивания сложных пакетов и без ошибок
  const handleOneClickEasyInstall = async () => {
    setIsInstallingNow(true);
    const res = await promptInstall();
    setIsInstallingNow(false);
    if (res === 'accepted') {
      setDownloadSuccess('Готово! AuraChat установлен на ваше устройство.');
    } else {
      setDownloadSuccess('Быстрый режим приложения активирован! Можете пользоваться сразу.');
    }
  };

  const handleDownloadLauncher = async () => {
    if (isAndroid) {
      await downloadApk();
      setDownloadSuccess('Файл быстрого запуска AuraChat-Start.html сохранён! Откройте его в браузере.');
    } else {
      await downloadDesktopInstaller();
      setDownloadSuccess('Ярлык AuraChat.url сохранён! Перетащите его на Рабочий стол.');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none">
      <div onClick={onClose} className="fixed inset-0" />

      <div className="relative w-full max-w-md bg-[#17212b] border border-[#243344] rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 text-white animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#17212b] via-[#1c2937] to-[#17212b] border-b border-[#243344] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0077FF] to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Лёгкая установка</h2>
              <p className="text-xs text-slate-400">Установка в 1 клик без ошибок</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-[#243344] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {(isInstalled || downloadSuccess) && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-medium">
                {downloadSuccess || 'Приложение уже активировано и готово к работе!'}
              </span>
            </div>
          )}

          {/* 1-CLICK PRIMARY BUTTON */}
          <div className="p-4 rounded-2xl bg-[#121b24] border border-[#243344] space-y-3 text-center">
            <p className="text-xs text-slate-300 leading-relaxed">
              Нажмите кнопку ниже для мгновенной установки <strong>AuraChat</strong> на телефон или компьютер без скачивания тяжёлых файлов:
            </p>

            <button
              type="button"
              onClick={handleOneClickEasyInstall}
              disabled={isInstallingNow}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/25 transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
            >
              <Zap className="w-5 h-5" />
              <span>⚡ Установить в 1 клик (Авто-запуск)</span>
            </button>
          </div>

          {/* Secondary options: Shortcut / Mobile Home Screen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleDownloadLauncher}
              className="py-3 px-4 rounded-2xl bg-[#202b36] hover:bg-[#283747] border border-[#2f4256] text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isAndroid ? (
                <>
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Ярлык на телефон</span>
                </>
              ) : (
                <>
                  <Monitor className="w-4 h-4 text-[#64b5f6]" />
                  <span>Ярлык на Рабочий стол</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="py-3 px-4 rounded-2xl bg-[#202b36] hover:bg-[#283747] border border-[#2f4256] text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Ссылка скопирована</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>Скопировать ссылку</span>
                </>
              )}
            </button>
          </div>

          {/* Short tip for iOS / Android browser menu */}
          <div className="p-3.5 rounded-2xl bg-[#121b24] border border-[#202d3a] space-y-2 text-xs text-slate-300">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#64b5f6]" />
              <span>Установка на главный экран телефона:</span>
            </div>
            {isIOS ? (
              <p className="text-slate-400 flex items-center gap-1.5 flex-wrap">
                В Safari нажмите <Share className="w-3.5 h-3.5 text-blue-400 inline" /> <strong>«Поделиться»</strong> → <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline" /> <strong>«На экран Домой»</strong>.
              </p>
            ) : (
              <p className="text-slate-400">
                В браузере нажмите меню <strong>⋮</strong> (три точки сверху) → выберите <strong>«Добавить на гл. экран»</strong> или <strong>«Установить приложение»</strong>.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#121b24] border-t border-[#202d3a] flex items-center justify-between">
          <span className="text-[11px] text-slate-400">AuraChat v2.5 • Работает на всех устройствах</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#243344] hover:bg-[#30445a] text-white text-xs font-bold transition cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
