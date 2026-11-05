import React, { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, ShieldCheck, Activity, User } from 'lucide-react';

interface WebRTCCallModalProps {
  isOpen: boolean;
  contactName: string;
  avatarUrl: string;
  isVideoCall: boolean;
  onClose: () => void;
}

export const WebRTCCallModal: React.FC<WebRTCCallModalProps> = ({
  isOpen,
  contactName,
  avatarUrl,
  isVideoCall,
  onClose
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideoCall);
  const [iceState, setIceState] = useState<'signaling' | 'gathering' | 'connected'>('signaling');

  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      setIceState('signaling');
      return;
    }

    const t1 = setTimeout(() => setIceState('gathering'), 800);
    const t2 = setTimeout(() => setIceState('connected'), 1800);

    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(timer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm flex flex-col items-center relative shadow-2xl text-center">
        {/* WebRTC State Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-[11px] font-mono text-slate-300 mb-6">
          <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span>
            {iceState === 'signaling' && 'SDP Signaling exchange...'}
            {iceState === 'gathering' && 'ICE Candidates gathering...'}
            {iceState === 'connected' && 'WebRTC P2P (SRTP Encrypted)'}
          </span>
        </div>

        {/* Peer Avatar / Video Preview */}
        <div className="relative mb-4">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-700 shadow-2xl mx-auto relative">
            <img src={avatarUrl} alt={contactName} className="w-full h-full object-cover" />
            {iceState === 'connected' && (
              <div className="absolute inset-0 border-2 border-emerald-500 rounded-full" />
            )}
          </div>
          <span className="absolute bottom-1 right-1 p-1 bg-emerald-500 rounded-full text-white shadow">
            <ShieldCheck className="w-3.5 h-3.5" />
          </span>
        </div>

        <h3 className="text-lg font-bold text-white mb-1">{contactName}</h3>
        <div className="text-xs text-slate-400 font-mono mb-8">
          {iceState === 'connected' ? formatTime(callDuration) : 'Соединение...'}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 justify-center">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition shadow-lg ${
              isMuted ? 'bg-rose-600/80 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            onClick={onClose}
            className="p-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition shadow-xl hover:scale-105"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          <button
            onClick={() => setIsVideoEnabled(!isVideoEnabled)}
            className={`p-4 rounded-full transition shadow-lg ${
              !isVideoEnabled ? 'bg-rose-600/80 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {!isVideoEnabled ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};
