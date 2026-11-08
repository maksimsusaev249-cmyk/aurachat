import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  ShieldCheck, 
  Volume2,
  Volume1,
  VolumeX,
  Voicemail,
  Send,
  Sparkles,
  Check,
  Music,
  Upload,
  Settings2,
  Headphones,
  Bluetooth,
  Speaker,
  RefreshCw,
  MessageSquare,
  X,
  Monitor,
  ScreenShare,
  Maximize2,
  Minimize2,
  Move,
  EyeOff
} from 'lucide-react';
import {
  startOutgoingDialTone,
  startIncomingRingtone,
  stopCallAudio,
  playSentSound,
  getSoundSettings,
  saveSoundSettings,
  previewRingtone,
  RingtoneMode
} from '../../utils/audioUtils';
import {
  publishCallSignalToCloud,
  subscribeToCallSignalsFromCloud
} from '../../firebase';

export interface CallSession {
  direction: 'outgoing' | 'incoming';
  contactName: string;
  avatarUrl: string;
  isVideo: boolean;
  callId?: string;
  targetUserId?: string;
  targetUsername?: string;
  callerUserId?: string;
  callerUsername?: string;
  isGroupCall?: boolean;
  groupMembers?: any[];
}

interface RealWebRTCCallModalProps {
  session: CallSession | null;
  onClose: (durationSec?: number) => void;
  onLeaveVoicemail?: (contactName: string, durationSec: number, audioUrl?: string) => void;
  onSendQuickResponse?: (contactName: string, responseText: string) => void;
}

type CallStatus = 
  | 'ringing' 
  | 'connected' 
  | 'answering_greeting' 
  | 'voicemail_recording' 
  | 'voicemail_sent' 
  | 'ended';

type AudioRoute = 'speaker' | 'bluetooth' | 'earpiece';

export const defaultQuickReplies = [
  'Перезвоню позже',
  'Я сейчас на встрече',
  'Не могу говорить, напиши мне',
  'Я за рулём, перезвоню',
  'Перезвони через 15 минут',
  'Сейчас занят, освобожусь — наберу'
];

export const RealWebRTCCallModal: React.FC<RealWebRTCCallModalProps> = ({ 
  session, 
  onClose,
  onLeaveVoicemail,
  onSendQuickResponse
}) => {
  const [callStatus, setCallStatus] = useState<CallStatus>('ringing');
  const [callDuration, setCallDuration] = useState(0);

  // Quick Responses State (Точка Б отвечает или сбрасывает быстрым ответом)
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [customReplyText, setCustomReplyText] = useState('');
  const [callNotice, setCallNotice] = useState<string | null>(null);

  // Voicemail Greeting & Recording states
  const [voicemailGreetingText, setVoicemailGreetingText] = useState(
    'Здравствуйте! Абонент сейчас не может ответить на ваш звонок. Пожалуйста, оставьте ваше голосовое сообщение после сигнала...'
  );
  const [voicemailDuration, setVoicemailDuration] = useState(0);
  const [, setIsRecordingVoicemail] = useState(false);

  // Audio / Video stream toggles & Real Microphone Analyser
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(session ? session.isVideo : false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [micLevel, setMicLevel] = useState<number>(0);
  const [micWaveBars, setMicWaveBars] = useState<number[]>([15, 22, 18, 25, 20, 16, 24, 18]);
  const [micConnected, setMicConnected] = useState<boolean>(false);
  const [cameraConnected, setCameraConnected] = useState<boolean>(false);
  const [isLoopbackEnabled, setIsLoopbackEnabled] = useState<boolean>(false);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [selectedOutputId, setSelectedOutputId] = useState<string>('');

  // Speakerphone & Bluetooth Headset controls
  const [audioRoute, setAudioRoute] = useState<AudioRoute>('speaker');
  const [showAudioRouteMenu, setShowAudioRouteMenu] = useState(false);

  // Quick Ringtone & Sound Picker inside Call Modal
  const [showSoundConfig, setShowSoundConfig] = useState<boolean>(false);
  const [soundSettings, setSoundSettings] = useState(() => getSoundSettings());

  // Real local media stream & Web Audio API refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const loopbackGainRef = useRef<GainNode | null>(null);
  const micMeterTimerRef = useRef<any>(null);

  // Voicemail media recorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Fullscreen view state for Desktop / Computer
  const [isDesktopFullscreen, setIsDesktopFullscreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Cross-tab & Cross-device WebRTC call synchronization channel & refs
  const instancePeerIdRef = useRef<string>(
    `peer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
  const pendingIceCandidatesRef = useRef<any[]>([]);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState<boolean>(false);
  const [remoteFrameDataUrl, setRemoteFrameDataUrl] = useState<string | null>(null);
  const [hasNativeRemoteVideo, setHasNativeRemoteVideo] = useState<boolean>(false);
  const [mainView, setMainView] = useState<'remote' | 'local'>(
    session?.isVideo ? 'local' : 'remote'
  );
  // Screen sharing state & refs
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState<boolean>(false);
  const [screenFitMode, setScreenFitMode] = useState<'contain' | 'cover'>('contain');

  // Floating Speaker Webcam Bubble during Screen Share («Кружок веб-камеры спикера»)
  const [speakerBubbleCorner, setSpeakerBubbleCorner] = useState<'bottom-right' | 'top-right' | 'bottom-left' | 'top-left'>('bottom-right');
  const [isSpeakerBubbleMinimized, setIsSpeakerBubbleMinimized] = useState<boolean>(false);

  const handleCycleSpeakerCorner = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSpeakerBubbleCorner((prev) => {
      if (prev === 'bottom-right') return 'bottom-left';
      if (prev === 'bottom-left') return 'top-left';
      if (prev === 'top-left') return 'top-right';
      return 'bottom-right';
    });
  };
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState<boolean>(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const isVideoEnabledRef = useRef<boolean>(session ? session.isVideo : false);
  const isScreenSharingRef = useRef<boolean>(false);

  useEffect(() => {
    isVideoEnabledRef.current = isVideoEnabled;
  }, [isVideoEnabled]);

  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  useEffect(() => {
    if (callStatus === 'connected') {
      if (session?.isVideo) {
        setCallNotice(`Видеозвонок начался с ${session.contactName}`);
      } else {
        setCallNotice(`Звонок начался с ${session?.contactName || 'абонентом'}`);
      }
    }
  }, [callStatus, session?.isVideo, session?.contactName]);

  useEffect(() => {
    if (!callNotice) return;
    const timer = setTimeout(() => {
      setCallNotice(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [callNotice]);

  const voicemailTimeoutRef = useRef<any>(null);
  const callStatusRef = useRef<CallStatus>('ringing');

  useEffect(() => {
    callStatusRef.current = callStatus;
    if (callStatus !== 'ringing' && voicemailTimeoutRef.current) {
      clearTimeout(voicemailTimeoutRef.current);
      voicemailTimeoutRef.current = null;
    }
  }, [callStatus]);

  const handleSwapCameras = () => {
    setMainView((prev) => (prev === 'remote' ? 'local' : 'remote'));
  };

  // Helper to broadcast call signals to BOTH BroadcastChannel and Shared Server
  const broadcastSignal = (payload: any) => {
    const signalWithSender = {
      ...payload,
      senderPeerId: instancePeerIdRef.current,
      signalId: payload.signalId || `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now()
    };

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('applet_webrtc_call_sync');
        channel.postMessage(signalWithSender);
        channel.close();
      }
    } catch {}

    if (signalWithSender.callId) {
      publishCallSignalToCloud(signalWithSender).catch(() => {});
    }
  };

  // Flush queued ICE candidates once remoteDescription is set
  const flushPendingIceCandidates = async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription || pendingIceCandidatesRef.current.length === 0) return;
    const queued = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];
    for (const cand of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch {}
    }
  };

  // Synchronize local audio & video/screen tracks onto RTCPeerConnection
  const syncLocalTracksToPeerConnection = (
    pc: RTCPeerConnection,
    overrideVideoTrack?: MediaStreamTrack | null
  ) => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0] || null;
    if (audioTrack && localStreamRef.current) {
      const audioSender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
      if (audioSender) {
        audioSender.replaceTrack(audioTrack).catch(() => {});
      } else {
        try {
          pc.addTrack(audioTrack, localStreamRef.current);
        } catch {}
      }
    }

    const activeVideoTrack =
      overrideVideoTrack !== undefined
        ? overrideVideoTrack
        : isScreenSharingRef.current && screenStreamRef.current
        ? screenStreamRef.current.getVideoTracks()[0] || null
        : isVideoEnabledRef.current && localStreamRef.current
        ? localStreamRef.current.getVideoTracks()[0] || null
        : null;

    const videoTransceiver = pc
      .getTransceivers?.()
      ?.find(
        (t) =>
          t.sender?.track?.kind === 'video' ||
          t.receiver?.track?.kind === 'video'
      );
    const existingVideoSender =
      pc.getSenders().find((s) => s.track && s.track.kind === 'video') ||
      videoTransceiver?.sender;

    if (existingVideoSender) {
      if (videoTransceiver) {
        try {
          videoTransceiver.direction = activeVideoTrack ? 'sendrecv' : 'recvonly';
        } catch {}
      }
      existingVideoSender.replaceTrack(activeVideoTrack).catch(() => {});
    } else if (activeVideoTrack) {
      const sourceStream =
        isScreenSharingRef.current && screenStreamRef.current
          ? screenStreamRef.current
          : localStreamRef.current;
      if (sourceStream) {
        try {
          pc.addTrack(activeVideoTrack, sourceStream);
        } catch {}
      }
    }
  };

  // Helper to create & broadcast a WebRTC Offer (for initial connect and mid-call video/screen renegotiation)
  const negotiateWebRtcOffer = async (
    pc: RTCPeerConnection,
    overrideVideoTrack?: MediaStreamTrack | null
  ) => {
    try {
      syncLocalTracksToPeerConnection(pc, overrideVideoTrack);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      broadcastSignal({
        type: 'WEBRTC_OFFER',
        callId: session?.callId,
        sdp: pc.localDescription?.sdp || offer.sdp,
        isVideoEnabled: isVideoEnabledRef.current,
        isScreenSharing: isScreenSharingRef.current
      });
    } catch {}
  };

  // Initialize WebRTC RTCPeerConnection with STUN servers
  const initPeerConnection = () => {
    if (peerConnectionRef.current) {
      syncLocalTracksToPeerConnection(peerConnectionRef.current);
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    if (!remoteStreamRef.current) {
      remoteStreamRef.current = new MediaStream();
    }
    if (!remoteAudioStreamRef.current) {
      remoteAudioStreamRef.current = new MediaStream();
    }

    // When remote media track (audio, camera, or screen share) arrives from other participant
    pc.ontrack = (event) => {
      const track = event.track;
      if (!track) return;

      if (track.kind === 'audio') {
        if (!remoteAudioStreamRef.current) {
          remoteAudioStreamRef.current = new MediaStream();
        }
        remoteAudioStreamRef.current.getAudioTracks().forEach((old) => {
          if (old.id !== track.id) remoteAudioStreamRef.current?.removeTrack(old);
        });
        remoteAudioStreamRef.current.addTrack(track);
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteAudioStreamRef.current;
          remoteAudioRef.current.play().catch(() => {});
        }
      }

      if (track.kind === 'video') {
        const nextVideoStream = new MediaStream([track]);
        if (remoteAudioStreamRef.current) {
          remoteAudioStreamRef.current.getAudioTracks().forEach((aTrack) => {
            nextVideoStream.addTrack(aTrack);
          });
        }
        remoteStreamRef.current = nextVideoStream;

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = nextVideoStream;
          remoteVideoRef.current.play().catch(() => {});
        }

        const markNativeActiveIfReady = () => {
          const v = remoteVideoRef.current;
          if (v && v.videoWidth > 10 && v.videoHeight > 10 && !track.muted) {
            setHasNativeRemoteVideo(true);
            setRemoteVideoEnabled(true);
            setMainView('remote');
          }
        };

        track.onunmute = () => {
          if (remoteVideoRef.current && remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
            remoteVideoRef.current.play().catch(() => {});
          }
          setTimeout(markNativeActiveIfReady, 120);
        };

        track.onmute = () => {
          setHasNativeRemoteVideo(false);
        };
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && session?.callId) {
        broadcastSignal({
          type: 'WEBRTC_ICE',
          callId: session.callId,
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate
        });
      }
    };

    syncLocalTracksToPeerConnection(pc);

    peerConnectionRef.current = pc;
    return pc;
  };

  useEffect(() => {
    if (!session) return;
    let channel: BroadcastChannel | null = null;

    const handleSignal = async (data: any) => {
      if (!data || (data.callId && session.callId && data.callId !== session.callId)) return;
      // Ignore signals sent by this very same call modal instance!
      if (data.senderPeerId && data.senderPeerId === instancePeerIdRef.current) return;

      if (data.type === 'CALL_ANSWERED' && session.direction === 'outgoing') {
        if (voicemailTimeoutRef.current) {
          clearTimeout(voicemailTimeoutRef.current);
          voicemailTimeoutRef.current = null;
        }
        stopCallAudio();
        playSentSound();
        callStatusRef.current = 'connected';
        setCallStatus('connected');

        if (!localStreamRef.current) {
          await startLocalMedia(selectedMicId, isVideoEnabledRef.current);
        }
        const pc = initPeerConnection();
        await negotiateWebRtcOffer(pc);

        if (isVideoEnabledRef.current) {
          broadcastSignal({
            type: 'VIDEO_TOGGLE',
            callId: session.callId,
            isVideoEnabled: true
          });
        }
      }

      if (data.type === 'WEBRTC_OFFER' && data.sdp) {
        if (typeof data.isScreenSharing === 'boolean') {
          setIsRemoteScreenSharing(data.isScreenSharing);
          if (data.isScreenSharing) {
            setIsDesktopFullscreen(true);
            setMainView('remote');
          }
        }
        if (typeof data.isVideoEnabled === 'boolean') {
          setRemoteVideoEnabled(data.isVideoEnabled);
          if (data.isVideoEnabled) {
            setMainView('remote');
          }
        }

        if (!localStreamRef.current) {
          await startLocalMedia(selectedMicId, isVideoEnabledRef.current);
        }
        const pc = initPeerConnection();
        syncLocalTracksToPeerConnection(pc);

        try {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
          await flushPendingIceCandidates(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          broadcastSignal({
            type: 'WEBRTC_ANSWER',
            callId: session.callId,
            sdp: pc.localDescription?.sdp || answer.sdp,
            isVideoEnabled: isVideoEnabledRef.current,
            isScreenSharing: isScreenSharingRef.current
          });
        } catch {}
      }

      if (data.type === 'WEBRTC_ANSWER' && data.sdp) {
        if (typeof data.isScreenSharing === 'boolean') {
          setIsRemoteScreenSharing(data.isScreenSharing);
          if (data.isScreenSharing) {
            setIsDesktopFullscreen(true);
            setMainView('remote');
          }
        }
        if (typeof data.isVideoEnabled === 'boolean') {
          setRemoteVideoEnabled(data.isVideoEnabled);
          if (data.isVideoEnabled) {
            setMainView('remote');
          }
        }

        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription({ type: 'answer', sdp: data.sdp })
            );
            await flushPendingIceCandidates(peerConnectionRef.current);
          } catch {}
        }
      }

      if (data.type === 'WEBRTC_ICE' && data.candidate) {
        const pc = peerConnectionRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch {}
        } else {
          pendingIceCandidatesRef.current.push(data.candidate);
        }
      }

      if (data.type === 'SCREEN_SHARE_STATE') {
        const isSharing = Boolean(data.isScreenSharing);
        setIsRemoteScreenSharing(isSharing);
        if (isSharing) {
          setIsDesktopFullscreen(true);
          setMainView('remote');
          setCallNotice(`Абонент ${session.contactName} включил демонстрацию экрана.`);
        } else {
          if (!remoteVideoEnabled) {
            setRemoteFrameDataUrl(null);
          }
          setCallNotice(`Абонент ${session.contactName} завершил демонстрацию экрана.`);
        }
      }

      if (data.type === 'VIDEO_TOGGLE') {
        const remoteOn = Boolean(data.isVideoEnabled);
        setRemoteVideoEnabled(remoteOn);
        if (remoteOn) {
          setMainView('remote');
        } else {
          setHasNativeRemoteVideo(false);
          if (!isRemoteScreenSharing) {
            setRemoteFrameDataUrl(null);
          }
          if (isVideoEnabledRef.current) {
            setMainView('local');
          }
        }
      }

      if (data.type === 'LIVE_VIDEO_FRAME' && data.frameDataUrl) {
        setRemoteFrameDataUrl(data.frameDataUrl);
        if (data.frameSource === 'screen') {
          setIsRemoteScreenSharing(true);
          setMainView('remote');
        } else if (data.frameSource === 'camera') {
          setRemoteVideoEnabled(true);
          setMainView('remote');
        }
      }

      if (
        (data.type === 'CALL_REJECTED' || data.type === 'CALL_ENDED') &&
        session.direction === 'outgoing'
      ) {
        stopCallAudio();
        stopLocalStream();
        if (data.quickResponse) {
          setCallNotice(`Абонент отклонил вызов: «${data.quickResponse}»`);
          setTimeout(() => {
            onClose(0);
          }, 2200);
        } else {
          setCallNotice('Абонент сбросил вызов');
          setTimeout(() => {
            onClose(0);
          }, 1200);
        }
      } else if (
        (data.type === 'CALL_CANCELLED' || data.type === 'CALL_ENDED') &&
        session.direction === 'incoming'
      ) {
        stopCallAudio();
        stopLocalStream();
        setCallNotice('Абонент завершил вызов');
        setTimeout(() => {
          onClose(0);
        }, 1200);
      }
    };

    // 1. Local BroadcastChannel sync
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('applet_webrtc_call_sync');
        channel.onmessage = (event) => {
          if (event.data) handleSignal(event.data);
        };

        if (session.direction === 'outgoing') {
          channel.postMessage({
            type: 'CALL_OFFER',
            senderPeerId: instancePeerIdRef.current,
            callId: session.callId || 'call_' + Date.now(),
            contactName: session.contactName,
            avatarUrl: session.avatarUrl,
            isVideo: session.isVideo
          });
        }
      }
    } catch {}

    // 2. Shared Server Real-time Signaling Across Devices (Phone <-> Computer)
    const unsubCloudSignals = subscribeToCallSignalsFromCloud((signal) => {
      if (signal && signal.callId === session.callId) {
        handleSignal(signal);
      }
    });

    return () => {
      channel?.close();
      unsubCloudSignals();
    };
  }, [session]);

  // Real-time Hybrid Frame Relay: broadcasts live camera / screen frames so remote participant ALWAYS sees video/screen even across NATs without TURN
  useEffect(() => {
    if (!session?.callId || callStatus !== 'connected') return;
    if (!isScreenSharing && !isVideoEnabled) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fallbackVideo = document.createElement('video');
    fallbackVideo.muted = true;
    fallbackVideo.playsInline = true;
    fallbackVideo.autoplay = true;

    const activeStream = isScreenSharing
      ? screenStreamRef.current
      : localStreamRef.current;
    if (activeStream) {
      fallbackVideo.srcObject = activeStream;
      fallbackVideo.play().catch(() => {});
    }

    const frameTimer = setInterval(() => {
      if (!ctx || callStatusRef.current !== 'connected') return;
      const domVideo = isScreenSharingRef.current
        ? screenVideoRef.current
        : localVideoRef.current;

      const currentStream = isScreenSharingRef.current
        ? screenStreamRef.current
        : localStreamRef.current;
      if (currentStream && fallbackVideo.srcObject !== currentStream) {
        fallbackVideo.srcObject = currentStream;
        fallbackVideo.play().catch(() => {});
      }

      const sourceVideo =
        domVideo && domVideo.readyState >= 2 && domVideo.videoWidth > 0
          ? domVideo
          : fallbackVideo;

      if (!sourceVideo || sourceVideo.readyState < 2 || sourceVideo.videoWidth === 0) {
        return;
      }

      const targetW = isScreenSharingRef.current ? 640 : 384;
      const aspect = sourceVideo.videoHeight / Math.max(1, sourceVideo.videoWidth);
      const targetH = Math.max(180, Math.round(targetW * aspect));

      canvas.width = targetW;
      canvas.height = targetH;
      try {
        ctx.drawImage(sourceVideo, 0, 0, targetW, targetH);
        const frameDataUrl = canvas.toDataURL(
          'image/jpeg',
          isScreenSharingRef.current ? 0.62 : 0.55
        );
        if (frameDataUrl && frameDataUrl.length > 100) {
          broadcastSignal({
            type: 'LIVE_VIDEO_FRAME',
            callId: session.callId,
            frameSource: isScreenSharingRef.current ? 'screen' : 'camera',
            frameDataUrl,
            isVideoEnabled: isVideoEnabledRef.current,
            isScreenSharing: isScreenSharingRef.current
          });
        }
      } catch {}
    }, 260);

    return () => {
      clearInterval(frameTimer);
      fallbackVideo.srcObject = null;
    };
  }, [session?.callId, callStatus, isScreenSharing, isVideoEnabled]);

  // Ensure media streams are continuously attached to HTML video/audio elements on re-render or view switch
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      remoteVideoRef.current.play().catch(() => {});
    }
    if (remoteAudioRef.current && remoteAudioStreamRef.current) {
      if (remoteAudioRef.current.srcObject !== remoteAudioStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteAudioStreamRef.current;
      }
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteVideoEnabled, isRemoteScreenSharing, mainView, callStatus]);

  useEffect(() => {
    if (screenVideoRef.current && screenStreamRef.current) {
      if (screenVideoRef.current.srcObject !== screenStreamRef.current) {
        screenVideoRef.current.srcObject = screenStreamRef.current;
      }
      screenVideoRef.current.play().catch(() => {});
    }
  }, [isScreenSharing]);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [isVideoEnabled, mainView, callStatus]);

  // Start real webcam & microphone stream with Web Audio API AnalyserNode
  const startLocalMedia = async (micDeviceId?: string, forceVideo?: boolean) => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {}
      }
      clearInterval(micMeterTimerRef.current);

      const wantVideo = forceVideo !== undefined ? forceVideo : (session?.isVideo || isVideoEnabled);
      let stream: MediaStream | null = null;

      // 1. First attempt: try both audio and video
      if (wantVideo) {
        try {
          const videoConstraints: MediaTrackConstraints = {
            facingMode: facingMode
          };
          const audioConstraints: MediaTrackConstraints = micDeviceId
            ? { deviceId: { exact: micDeviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: audioConstraints
          });
          setCameraConnected(true);
        } catch {
          // Fallback video with simple constraints
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true
            });
            setCameraConnected(true);
          } catch {
            // Video failed, proceed to audio-only fallback
          }
        }
      }

      // 2. Fallback to audio-only if video failed or not requested
      if (!stream) {
        try {
          const audioConstraints: MediaTrackConstraints = micDeviceId
            ? { deviceId: { exact: micDeviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false
          });
        } catch {
          // Minimal audio fallback
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
        }
      }

      if (!stream) throw new Error('No media stream obtained');

      localStreamRef.current = stream;
      setMicConnected(true);
      const hasVideo = stream.getVideoTracks().length > 0;
      setCameraConnected(hasVideo);
      setIsVideoEnabled(hasVideo);

      // Attach video stream to video element
      if (localVideoRef.current && hasVideo) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      // Enumerate available devices (microphones, speakers, bluetooth)
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          setAudioInputs(devices.filter((d) => d.kind === 'audioinput'));
          setAudioOutputs(devices.filter((d) => d.kind === 'audiooutput'));
        }).catch(() => {});
      }

      // Connect microphone stream to Web Audio API AnalyserNode for live voice visualization
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.55;
        source.connect(analyser);
        analyserRef.current = analyser;

        // Loopback gain node ("Слышать себя / Проверка микрофона")
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(isLoopbackEnabled ? 0.85 : 0, ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        loopbackGainRef.current = gainNode;

        micMeterTimerRef.current = setInterval(() => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          const level = isMuted ? 0 : Math.min(100, Math.round((avg / 110) * 100));
          setMicLevel(level);

          const bars: number[] = [];
          for (let i = 0; i < 8; i++) {
            const val = isMuted ? 6 : Math.max(8, Math.min(36, Math.round((data[i * 2] / 255) * 36)));
            bars.push(val);
          }
          setMicWaveBars(bars);
        }, 90);
      }
    } catch {
      setMicConnected(false);
      setCameraConnected(false);
    }
  };

  const stopLocalStream = () => {
    clearInterval(micMeterTimerRef.current);
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    setIsRemoteScreenSharing(false);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch {}
      peerConnectionRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    loopbackGainRef.current = null;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setMicLevel(0);
    setMicConnected(false);
    setCameraConnected(false);
    setRemoteVideoEnabled(false);
    setHasNativeRemoteVideo(false);
    setRemoteFrameDataUrl(null);
    pendingIceCandidatesRef.current = [];
  };

  // Answer call / Connect call
  const handleAnswerCall = async () => {
    if (voicemailTimeoutRef.current) {
      clearTimeout(voicemailTimeoutRef.current);
      voicemailTimeoutRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    stopCallAudio();
    playSentSound();
    callStatusRef.current = 'connected';
    setCallStatus('connected');
    if (isVideoEnabled && !remoteVideoEnabled) {
      setMainView('local');
    }

    if (!localStreamRef.current) {
      await startLocalMedia(selectedMicId, isVideoEnabled);
    }
    const pc = initPeerConnection();
    syncLocalTracksToPeerConnection(pc);
    await negotiateWebRtcOffer(pc);

    broadcastSignal({
      type: 'CALL_ANSWERED',
      callId: session?.callId,
      isVideoEnabled: isVideoEnabledRef.current
    });

    if (isVideoEnabledRef.current) {
      broadcastSignal({
        type: 'VIDEO_TOGGLE',
        callId: session?.callId,
        isVideoEnabled: true
      });
    }
  };

  // Quick response handler: Точка Б сбрасывает и отправляет быстрый ответ
  const handleQuickResponseSelect = (replyText: string) => {
    stopCallAudio();
    stopLocalStream();
    playSentSound();

    if (onSendQuickResponse && session) {
      onSendQuickResponse(session.contactName, replyText);
    }

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('applet_webrtc_call_sync');
        channel.postMessage({
          type: 'CALL_REJECTED',
          callId: session?.callId,
          quickResponse: replyText,
          senderName: session?.contactName
        });
        channel.close();
      }
    } catch {}

    if (session?.callId) {
      publishCallSignalToCloud({
        type: 'CALL_REJECTED',
        callId: session.callId,
        quickResponse: replyText,
        timestamp: Date.now()
      });
    }

    onClose(0);
  };

  // Simulation helpers for testing Point A calling Point B
  const handleSimulatePointBAnswer = () => {
    handleAnswerCall();
  };

  const handleSimulatePointBReject = () => {
    stopCallAudio();
    stopLocalStream();
    setCallNotice('Точка Б отклонила вызов');
    setTimeout(() => {
      onClose(0);
    }, 1200);
  };

  const handleSimulatePointBQuickReply = (text: string) => {
    stopCallAudio();
    stopLocalStream();
    playSentSound();
    if (onSendQuickResponse && session) {
      onSendQuickResponse(session.contactName, text);
    }
    setCallNotice(`Точка Б отклонила вызов и ответила: «${text}»`);
    setTimeout(() => {
      onClose(0);
    }, 2000);
  };

  // Initialize call session & activate real microphone immediately
  useEffect(() => {
    if (!session) {
      stopCallAudio();
      stopLocalStream();
      return;
    }

    setSoundSettings(getSoundSettings());
    callStatusRef.current = 'ringing';
    setCallStatus('ringing');
    setCallDuration(0);
    setVoicemailDuration(0);
    setIsVideoEnabled(session.isVideo);
    setMainView(session.isVideo ? 'local' : 'remote');
    setIsMuted(false);
    setShowQuickReplies(false);
    setCallNotice(null);

    // Start real microphone & camera stream
    startLocalMedia(selectedMicId, session.isVideo);

    if (session.direction === 'outgoing') {
      startOutgoingDialTone();

      if (voicemailTimeoutRef.current) {
        clearTimeout(voicemailTimeoutRef.current);
      }
      voicemailTimeoutRef.current = setTimeout(() => {
        if (callStatusRef.current === 'ringing') {
          triggerAnsweringMachine();
        }
      }, 50 * 1000);

      return () => {
        if (voicemailTimeoutRef.current) {
          clearTimeout(voicemailTimeoutRef.current);
          voicemailTimeoutRef.current = null;
        }
        stopCallAudio();
        stopLocalStream();
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      };
    } else {
      startIncomingRingtone(session.contactName);

      return () => {
        if (voicemailTimeoutRef.current) {
          clearTimeout(voicemailTimeoutRef.current);
          voicemailTimeoutRef.current = null;
        }
        stopCallAudio();
        stopLocalStream();
      };
    }
  }, [session]);

  // Duration timer when connected
  useEffect(() => {
    let timer: any;
    if (callStatus === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  // Attach local camera stream to PIP / Main video element whenever it mounts or updates
  useEffect(() => {
    if (isVideoEnabled && localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => {});
    }
  }, [callStatus, isVideoEnabled, micConnected, cameraConnected, facingMode, isScreenSharing, isSpeakerBubbleMinimized]);

  // Attach screen share stream to video element
  useEffect(() => {
    if (isScreenSharing && screenStreamRef.current && screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenStreamRef.current;
      screenVideoRef.current.play().catch(() => {});
    }
  }, [isScreenSharing]);

  // Voicemail recording timer
  useEffect(() => {
    let timer: any;
    if (callStatus === 'voicemail_recording') {
      timer = setInterval(() => {
        setVoicemailDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  // Trigger Answering Machine (ONLY if still ringing and nobody answered!)
  const triggerAnsweringMachine = () => {
    if (callStatusRef.current !== 'ringing') return;
    stopCallAudio();
    callStatusRef.current = 'answering_greeting';
    setCallStatus('answering_greeting');

    const greetingText = 'Здравствуйте! Абонент сейчас не может ответить на ваш звонок. Пожалуйста, оставьте ваше голосовое сообщение после сигнала...';
    setVoicemailGreetingText(greetingText);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(greetingText);
        utterance.lang = 'ru-RU';
        utterance.rate = 0.95;
        utterance.pitch = 1.1;

        const voices = window.speechSynthesis.getVoices();
        const ruVoice = 
          voices.find(v => v.lang.startsWith('ru') && (v.name.includes('female') || v.name.includes('Milena') || v.name.includes('Tatyana') || v.name.includes('Google'))) ||
          voices.find(v => v.lang.startsWith('ru'));
        
        if (ruVoice) {
          utterance.voice = ruVoice;
        }

        utterance.onend = () => finishGreetingAndStartRecording();
        utterance.onerror = () => finishGreetingAndStartRecording();
        window.speechSynthesis.speak(utterance);
      } catch {
        setTimeout(finishGreetingAndStartRecording, 3500);
      }
    } else {
      setTimeout(finishGreetingAndStartRecording, 3500);
    }
  };

  const finishGreetingAndStartRecording = () => {
    setTimeout(() => {
      setCallStatus('voicemail_recording');
      startVoicemailAudioCapture();
    }, 400);
  };

  const startVoicemailAudioCapture = async () => {
    setIsRecordingVoicemail(true);
    recordedChunksRef.current = [];

    try {
      const stream = localStreamRef.current || await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.start(200);
    } catch {}
  };

  const handleSendVoicemail = () => {
    stopLocalStream();
    setCallStatus('voicemail_sent');
    playSentSound();

    const duration = Math.max(1, voicemailDuration);

    if (recordedChunksRef.current.length > 0) {
      const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : URL.createObjectURL(blob);
        if (session && onLeaveVoicemail) {
          onLeaveVoicemail(session.contactName, duration, dataUrl);
        }
      };
      reader.readAsDataURL(blob);
    } else if (session && onLeaveVoicemail) {
      onLeaveVoicemail(session.contactName, duration, undefined);
    }

    setTimeout(() => {
      onClose(duration);
    }, 1200);
  };

  const handleToggleLoopback = () => {
    const next = !isLoopbackEnabled;
    setIsLoopbackEnabled(next);
    if (loopbackGainRef.current && audioCtxRef.current) {
      loopbackGainRef.current.gain.setValueAtTime(next ? 0.85 : 0, audioCtxRef.current.currentTime);
    }
  };

  // Switch Audio Routing: Speakerphone vs Bluetooth vs Earpiece
  const handleSelectAudioRoute = async (route: AudioRoute, deviceId?: string) => {
    setAudioRoute(route);
    if (deviceId !== undefined) {
      setSelectedOutputId(deviceId);
    }
    setShowAudioRouteMenu(false);

    // Apply device sink ID if supported
    try {
      const audioElements = document.querySelectorAll('audio');
      for (const el of Array.from(audioElements)) {
        if ('setSinkId' in el && deviceId) {
          await (el as any).setSinkId(deviceId);
        }
      }
    } catch {}
  };

  const cycleAudioRoute = () => {
    if (audioRoute === 'speaker') {
      handleSelectAudioRoute('bluetooth');
    } else if (audioRoute === 'bluetooth') {
      handleSelectAudioRoute('earpiece');
    } else {
      handleSelectAudioRoute('speaker');
    }
  };

  // Flip Front/Back Camera
  const handleToggleFacingMode = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    await startLocalMedia(selectedMicId, true);
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null;
    if (peerConnectionRef.current && cameraTrack) {
      await negotiateWebRtcOffer(peerConnectionRef.current, cameraTrack);
    }
  };

  // Upload custom ringtone file right inside the call modal
  const handleCustomRingtoneUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const updated = saveSoundSettings({
          ringtoneMode: 'custom',
          customRingtoneUrl: reader.result,
          customRingtoneName: file.name
        });
        setSoundSettings(updated);
        if (callStatus === 'ringing') {
          if (session?.direction === 'incoming') {
            startIncomingRingtone();
          } else {
            startOutgoingDialTone();
          }
        } else {
          previewRingtone(updated);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectRingtoneMode = (mode: RingtoneMode) => {
    const updated = saveSoundSettings({ ringtoneMode: mode });
    setSoundSettings(updated);
    if (callStatus === 'ringing') {
      if (session?.direction === 'incoming') {
        startIncomingRingtone();
      } else {
        startOutgoingDialTone();
      }
    } else {
      previewRingtone(updated);
    }
  };

  const handleEndCall = () => {
    stopCallAudio();
    stopLocalStream();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const endSignalType =
      callStatusRef.current === 'connected'
        ? 'CALL_ENDED'
        : session?.direction === 'incoming'
        ? 'CALL_REJECTED'
        : 'CALL_CANCELLED';

    broadcastSignal({
      type: endSignalType,
      callId: session?.callId
    });

    const finalDuration = callDuration;
    onClose(finalDuration);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !nextMuted;
      });
    }
    setIsMuted(nextMuted);
    if (nextMuted) setMicLevel(0);
  };

  const handleToggleVideo = async () => {
    const nextVideo = !isVideoEnabled;
    isVideoEnabledRef.current = nextVideo;
    setIsVideoEnabled(nextVideo);

    broadcastSignal({
      type: 'VIDEO_TOGGLE',
      callId: session?.callId,
      isVideoEnabled: nextVideo
    });

    if (nextVideo) {
      if (!remoteVideoEnabled) {
        setMainView('local');
      }
      await startLocalMedia(selectedMicId, true);
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null;
      if (cameraTrack) {
        const pc = initPeerConnection();
        await negotiateWebRtcOffer(pc, cameraTrack);
      }
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = false;
          t.stop();
        });
      }
      if (peerConnectionRef.current) {
        syncLocalTracksToPeerConnection(peerConnectionRef.current, null);
      }
    }
  };

  const handleToggleBrowserFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        setIsBrowserFullscreen(true);
      } else {
        document.exitFullscreen().catch(() => {});
        setIsBrowserFullscreen(false);
      }
    } catch {}
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      isScreenSharingRef.current = false;
      setIsScreenSharing(false);
      setCallNotice('Демонстрация экрана завершена.');

      broadcastSignal({
        type: 'SCREEN_SHARE_STATE',
        callId: session?.callId,
        isScreenSharing: false
      });

      if (peerConnectionRef.current) {
        const cameraTrack =
          isVideoEnabledRef.current && localStreamRef.current
            ? localStreamRef.current.getVideoTracks()[0] || null
            : null;
        await negotiateWebRtcOffer(peerConnectionRef.current, cameraTrack);
      }
    } else {
      try {
        setIsDesktopFullscreen(true);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          setCallNotice('Демонстрация экрана поддерживается в браузерах Chrome, Edge, Safari, Firefox и Android.');
          return;
        }

        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        screenStreamRef.current = stream;
        isScreenSharingRef.current = true;
        setIsScreenSharing(true);
        setCallNotice('Демонстрация экрана включена. Экран транслируется участникам звонка.');

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
          screenVideoRef.current.play().catch(() => {});
        }

        broadcastSignal({
          type: 'SCREEN_SHARE_STATE',
          callId: session?.callId,
          isScreenSharing: true
        });

        const screenTrack = stream.getVideoTracks()[0];
        if (screenTrack) {
          screenTrack.onended = () => {
            if (isScreenSharingRef.current) {
              handleToggleScreenShare();
            }
          };

          const pc = initPeerConnection();
          await negotiateWebRtcOffer(pc, screenTrack);
        }
      } catch (err: any) {
        if (err?.name === 'NotAllowedError') {
          setCallNotice('Выбор экрана был отменён.');
        } else {
          setCallNotice('Разрешение на захват экрана не предоставлено.');
        }
      }
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-lg p-0 sm:p-2 select-none animate-fadeIn">
      <div className={`relative transition-all duration-300 bg-[#0e1621] border border-[#243344] overflow-hidden shadow-2xl flex flex-col justify-between text-white text-center ${
        isDesktopFullscreen
          ? 'w-full h-full max-w-none max-h-none rounded-none border-none p-4 md:p-8 bg-[#090d14]'
          : 'w-full max-w-sm h-[690px] max-h-[95dvh] rounded-3xl p-5'
      }`}>
        
        {/* Always-mounted remote audio player so voice audio works in all views */}
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        {/* Main Background Video / Stream (Swappable: Screen Share, Remote or Local) */}
        <div className="absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden">
          {isScreenSharing || isRemoteScreenSharing ? (
            /* Live Screen Share Stream — Полный обзор экрана с управлением масштабом и участниками */
            <div className="relative w-full h-full bg-[#05070a] flex items-center justify-center overflow-hidden group">
              <video
                ref={isScreenSharing ? screenVideoRef : remoteVideoRef}
                autoPlay
                playsInline
                muted={isScreenSharing}
                className={`w-full h-full transition-all duration-200 ${
                  screenFitMode === 'contain' ? 'object-contain' : 'object-cover'
                }`}
              />
              {!isScreenSharing && isRemoteScreenSharing && remoteFrameDataUrl && !hasNativeRemoteVideo && (
                <img
                  src={remoteFrameDataUrl}
                  alt="Демонстрация экрана собеседника"
                  className={`absolute inset-0 w-full h-full transition-all duration-150 ${
                    screenFitMode === 'contain' ? 'object-contain' : 'object-cover'
                  }`}
                />
              )}

              {/* Верхняя панель управления демонстрацией экрана (скрывается, чтобы не перекрывать экран, появляется при наведении мыши) */}
              <div className="absolute top-3 sm:top-5 left-4 right-4 flex items-center justify-between gap-2 z-30 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="px-3 py-1.5 rounded-xl bg-[#0077FF]/90 backdrop-blur-md text-xs font-semibold text-white border border-sky-400/40 flex items-center gap-2 shadow-xl">
                  <Monitor className="w-4 h-4 text-sky-200 animate-pulse" />
                  <span className="truncate">
                    {isScreenSharing ? 'Демонстрация вашего экрана активна' : `Демонстрация экрана: ${session.contactName}`}
                  </span>
                  {session?.isGroupCall && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/20 font-mono">Конференция</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-xl">
                  {/* Переключение режима полноэкранного показа (Во весь экран) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDesktopFullscreen(true);
                      handleToggleBrowserFullscreen();
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#3a3b3c] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition"
                    title="Развернуть видео демонстрации на весь экран"
                  >
                    {isBrowserFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-sky-400" /> : <Maximize2 className="w-3.5 h-3.5 text-sky-400" />}
                    <span className="hidden sm:inline">{isBrowserFullscreen ? 'Свернуть' : 'Во весь экран'}</span>
                  </button>

                  {/* Переключение масштаба: По размеру (без обрезки) / Заполнить весь экран */}
                  <button
                    type="button"
                    onClick={() => setScreenFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                    className="px-2.5 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#3a3b3c] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition"
                    title={screenFitMode === 'contain' ? 'Заполнить весь экран' : 'Показать экран полностью (100% без обрезки)'}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">{screenFitMode === 'contain' ? 'Масштаб: 100%' : 'Заполнение'}</span>
                  </button>

                  {/* Кнопка остановить демонстрацию экрана (если транслирует текущий пользователь) */}
                  {isScreenSharing && (
                    <button
                      type="button"
                      onClick={handleToggleScreenShare}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow"
                      title="Завершить демонстрацию экрана"
                    >
                      <ScreenShare className="w-3.5 h-3.5" />
                      <span>Остановить</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Нижняя панель участников конференции при демонстрации экрана */}
              {session?.isGroupCall && session.groupMembers && session.groupMembers.length > 0 && (
                <div className="absolute bottom-24 sm:bottom-28 left-4 right-4 flex items-center justify-center gap-2 z-20 pointer-events-none">
                  <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/65 backdrop-blur-md border border-white/10 pointer-events-auto max-w-full overflow-x-auto scrollbar-thin shadow-2xl">
                    {session.groupMembers.slice(0, 6).map((m: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#1c1c20] shrink-0 border border-white/5">
                        <img src={m.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                        <span className="text-[11px] text-white truncate max-w-[80px]">{m.displayName?.split(' ')[0] || m.username}</span>
                        <Mic className="w-3 h-3 text-emerald-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : remoteVideoEnabled && mainView === 'remote' ? (
            /* Real Live Remote Video as Main Background */
            <div className="relative w-full h-full">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {remoteFrameDataUrl && !hasNativeRemoteVideo && (
                <img
                  src={remoteFrameDataUrl}
                  alt={session.contactName}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />
              <div className="absolute top-16 left-4 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-mono text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 z-10">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>{session.contactName} (Видео)</span>
              </div>
            </div>
          ) : isVideoEnabled ? (
            /* Local Video as Main Fullscreen Background when user's camera is ON */
            <div className="relative w-full h-full">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/40 pointer-events-none" />
              <div className="absolute top-16 left-4 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] sm:text-xs font-mono text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ваша камера</span>
              </div>
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="absolute top-16 right-4 px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-[10px] sm:text-xs font-semibold text-white border border-white/15 flex items-center gap-1 cursor-pointer transition z-20"
                title="Перевернуть камеру"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Камера</span>
              </button>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#17212b] via-[#0e1621] to-black">
              {callStatus === 'ringing' && (
                <div className="absolute w-64 h-64 md:w-96 md:h-96 rounded-full border border-blue-500/30 animate-ping pointer-events-none" />
              )}
            </div>
          )}
        </div>

        {/* PiP Corner Video (Shown only when BOTH camera videos are active and NO screen sharing is occurring) */}
        {!isScreenSharing && !isRemoteScreenSharing && isVideoEnabled && remoteVideoEnabled && (
          <div
            onClick={handleSwapCameras}
            className="absolute top-16 right-4 z-20 w-28 h-40 md:w-44 md:h-64 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-2xl bg-black group cursor-pointer transition hover:scale-105"
            title="Нажмите, чтобы поменять камеры местами"
          >
            {mainView === 'remote' || isRemoteScreenSharing ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            ) : (
              <div className="relative w-full h-full">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {remoteFrameDataUrl && !hasNativeRemoteVideo && (
                  <img
                    src={remoteFrameDataUrl}
                    alt={session.contactName}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </div>
            )}

            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <span className="px-2 py-1 rounded-xl bg-amber-500 text-black font-extrabold text-[9px] sm:text-xs shadow">
                Поменять ⟳
              </span>
            </div>
          </div>
        )}

        {/* Floating Speaker Webcam Bubble (Показывается, когда включена демонстрация экрана И включена камера) */}
        {(isScreenSharing || isRemoteScreenSharing) && (isVideoEnabled || remoteVideoEnabled) && (
          isSpeakerBubbleMinimized ? (
            <button
              type="button"
              onClick={() => setIsSpeakerBubbleMinimized(false)}
              className={`absolute z-30 ${
                speakerBubbleCorner === 'bottom-right'
                  ? 'bottom-24 sm:bottom-28 right-4'
                  : speakerBubbleCorner === 'top-right'
                  ? 'top-14 sm:top-16 right-4'
                  : speakerBubbleCorner === 'bottom-left'
                  ? 'bottom-24 sm:bottom-28 left-4'
                  : 'top-14 sm:top-16 left-4'
              } px-3 py-1.5 rounded-full bg-black/85 border border-[#0077FF]/60 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xl backdrop-blur-md hover:bg-black transition cursor-pointer`}
              title="Развернуть веб-камеру спикера"
            >
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <span>Камера ({isVideoEnabled ? 'Вы' : session.contactName})</span>
            </button>
          ) : (
            <div
              className={`absolute z-30 ${
                speakerBubbleCorner === 'bottom-right'
                  ? 'bottom-24 sm:bottom-28 right-4'
                  : speakerBubbleCorner === 'top-right'
                  ? 'top-14 sm:top-16 right-4'
                  : speakerBubbleCorner === 'bottom-left'
                  ? 'bottom-24 sm:bottom-28 left-4'
                  : 'top-14 sm:top-16 left-4'
              } w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-2 border-[#0077FF] shadow-2xl ring-4 ring-black/70 bg-black group transition-all duration-200 hover:scale-105`}
              title="Веб-камера спикера при демонстрации экрана"
            >
              {isVideoEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              ) : (
                <div className="relative w-full h-full">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {remoteFrameDataUrl && !hasNativeRemoteVideo && (
                    <img
                      src={remoteFrameDataUrl}
                      alt={session.contactName}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>
              )}

              {/* Speaker Label */}
              <div className="absolute bottom-1.5 inset-x-0 flex justify-center pointer-events-none">
                <span className="px-2 py-0.5 rounded-full bg-black/80 text-[9px] font-bold text-white backdrop-blur-sm truncate max-w-[85%] border border-white/10 shadow">
                  {isVideoEnabled ? 'Вы' : session.contactName}
                </span>
              </div>

              {/* Action Controls on Hover */}
              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCycleSpeakerCorner}
                  className="p-1.5 rounded-full bg-black/80 hover:bg-[#0077FF] text-white transition cursor-pointer shadow"
                  title="Переместить камеру в другой угол экрана"
                >
                  <Move className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFacingMode();
                  }}
                  className="p-1.5 rounded-full bg-black/80 hover:bg-[#0077FF] text-white transition cursor-pointer shadow"
                  title="Переключить камеру (фронтальная / задняя)"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSpeakerBubbleMinimized(true);
                  }}
                  className="p-1.5 rounded-full bg-black/80 hover:bg-rose-600 text-white transition cursor-pointer shadow"
                  title="Свернуть кружок камеры"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        )}

        {/* Top Header: Security, Audio Route, Sound & Desktop Fullscreen Toggle — HIDDEN during Screen Sharing */}
        {!isScreenSharing && !isRemoteScreenSharing && (
          <div className="relative z-10 pt-1 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2 gap-1.5 flex-wrap">
              
              {/* Audio Route Selector (ГРОМКАЯ СВЯЗЬ / BLUETOOTH / ДИНАМИК) */}
              <div className="relative">
              <button
                type="button"
                onClick={() => setShowAudioRouteMenu(!showAudioRouteMenu)}
                className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer shadow-sm ${
                  audioRoute === 'speaker'
                    ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                    : audioRoute === 'bluetooth'
                    ? 'bg-blue-600/30 border-blue-400 text-blue-200'
                    : 'bg-slate-800 border-slate-600 text-slate-300'
                }`}
                title="Переключить громкую связь или гарнитуру блютуз"
              >
                {audioRoute === 'speaker' && <Volume2 className="w-3.5 h-3.5 text-amber-300" />}
                {audioRoute === 'bluetooth' && <Bluetooth className="w-3.5 h-3.5 text-cyan-300" />}
                {audioRoute === 'earpiece' && <Volume1 className="w-3.5 h-3.5 text-slate-300" />}
                
                <span>
                  {audioRoute === 'speaker' && 'Громкая связь'}
                  {audioRoute === 'bluetooth' && 'Bluetooth'}
                  {audioRoute === 'earpiece' && 'Динамик'}
                </span>
              </button>

              {/* Audio Routing Menu Popover */}
              {showAudioRouteMenu && (
                <div className="absolute left-0 top-8 z-40 w-56 p-2 bg-[#131c26]/95 border border-[#2b3d52] rounded-2xl shadow-2xl backdrop-blur-md text-left space-y-1 animate-in fade-in">
                  <div className="text-[10px] font-bold text-slate-400 px-2 py-0.5 uppercase tracking-wider">
                    Вывод звука
                  </div>

                  {/* Speakerphone */}
                  <button
                    type="button"
                    onClick={() => handleSelectAudioRoute('speaker')}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                      audioRoute === 'speaker'
                        ? 'bg-amber-500/20 text-amber-200 font-bold border border-amber-500/30'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Speaker className="w-4 h-4 text-amber-400" />
                      <span>Громкая связь</span>
                    </div>
                    {audioRoute === 'speaker' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  {/* Bluetooth Headset */}
                  <button
                    type="button"
                    onClick={() => handleSelectAudioRoute('bluetooth')}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                      audioRoute === 'bluetooth'
                        ? 'bg-blue-500/20 text-blue-200 font-bold border border-blue-500/30'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Bluetooth className="w-4 h-4 text-cyan-400" />
                      <span>Bluetooth-гарнитура</span>
                    </div>
                    {audioRoute === 'bluetooth' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  {/* Standard Receiver / Earpiece */}
                  <button
                    type="button"
                    onClick={() => handleSelectAudioRoute('earpiece')}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                      audioRoute === 'earpiece'
                        ? 'bg-emerald-500/20 text-emerald-200 font-bold border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Volume1 className="w-4 h-4 text-slate-300" />
                      <span>Разговорный динамик</span>
                    </div>
                    {audioRoute === 'earpiece' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  {/* List Detected Output Devices */}
                  {audioOutputs.length > 0 && (
                    <div className="pt-1 border-t border-[#243344] mt-1 space-y-1">
                      <div className="text-[9px] text-slate-500 px-2 font-medium">Устройства системы:</div>
                      {audioOutputs.map((d, i) => (
                        <button
                          key={d.deviceId || i}
                          type="button"
                          onClick={() => handleSelectAudioRoute('bluetooth', d.deviceId)}
                          className={`w-full px-2 py-1 rounded-lg text-[10px] truncate text-left transition cursor-pointer ${
                            selectedOutputId === d.deviceId
                              ? 'text-cyan-300 font-bold bg-cyan-900/40'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          🎧 {d.label || `Аудиовыход #${i + 1}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Desktop Fullscreen Toggle (На весь экран для ПК) */}
              <button
                type="button"
                onClick={() => setIsDesktopFullscreen(!isDesktopFullscreen)}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-1 border border-white/20 bg-black/60 text-slate-200 hover:bg-black/90 hover:text-white transition cursor-pointer shadow"
                title={isDesktopFullscreen ? "Свернуть в формат окна" : "Развернуть на весь экран (для ПК)"}
              >
                {isDesktopFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-cyan-300" /> : <Maximize2 className="w-3.5 h-3.5 text-cyan-300" />}
                <span>{isDesktopFullscreen ? "Свернуть" : "На весь экран"}</span>
              </button>

              {/* Sound & Ringtone Config Toggle */}
              <button
                type="button"
                onClick={() => setShowSoundConfig(!showSoundConfig)}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-1 border transition cursor-pointer ${
                  showSoundConfig
                    ? 'bg-[#0077FF] border-blue-400 text-white'
                    : 'bg-black/50 border-white/15 text-slate-200 hover:bg-black/70'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Звонок</span>
              </button>
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl md:text-4xl font-extrabold text-white drop-shadow truncate max-w-full px-2 mt-1">
            {session.contactName}
          </h3>

          <div className="text-xs font-mono mt-1 text-slate-300">
            {callStatus === 'ringing' && (
              session.direction === 'outgoing' ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[#64b5f6] text-xs font-medium tracking-wide animate-pulse flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#64b5f6] animate-ping" />
                    Вызов абонента...
                  </span>
                </div>
              ) : (
                <span className="text-emerald-400 text-xs font-medium tracking-wide animate-pulse flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Входящий вызов...
                </span>
              )
            )}

            {callStatus === 'connected' && (
              <span className="text-emerald-300 bg-black/50 border border-emerald-500/30 px-3 py-0.5 rounded-full backdrop-blur-md">
                В разговоре • {formatDuration(callDuration)}
              </span>
            )}

            {callStatus === 'answering_greeting' && (
              <span className="text-purple-300 bg-purple-950/60 border border-purple-500/40 px-3 py-1 rounded-full backdrop-blur-md font-semibold flex items-center gap-1.5 animate-pulse">
                <Voicemail className="w-3.5 h-3.5 text-purple-400" /> Автоответчик говорит...
              </span>
            )}

            {callStatus === 'voicemail_recording' && (
              <span className="text-rose-300 bg-rose-950/60 border border-rose-500/40 px-3 py-1 rounded-full backdrop-blur-md font-semibold flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Запись сообщения: {formatDuration(voicemailDuration)}
              </span>
            )}

            {callStatus === 'voicemail_sent' && (
              <span className="text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-full backdrop-blur-md font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Сообщение отправлено!
              </span>
            )}
          </div>
        </div>
        )}

        {/* QUICK RINGTONE & MICROPHONE CONFIG PANEL */}
        {showSoundConfig && (
          <div className="relative z-30 my-2 p-3 rounded-2xl bg-[#131c26]/95 border border-[#2c3e50] text-left space-y-2.5 shadow-2xl backdrop-blur-md animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#243344] pb-1.5">
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-[#64b5f6]" />
                <span>Мелодия звонка и Микрофон</span>
              </span>
              <button
                type="button"
                onClick={() => setShowSoundConfig(false)}
                className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
              >
                Закрыть
              </button>
            </div>

            {/* Custom Ringtone Upload from Device */}
            <div className="space-y-1.5">
              <div className="text-[10px] text-slate-300 font-medium">Звук звонка:</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectRingtoneMode('device_system')}
                  className={`py-1.5 px-2 rounded-xl text-[10px] font-semibold border transition cursor-pointer ${
                    soundSettings.ringtoneMode === 'device_system'
                      ? 'bg-[#0077FF] border-blue-400 text-white'
                      : 'bg-[#1a2634] border-[#283748] text-slate-300'
                  }`}
                >
                  📱 Звук устройства
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectRingtoneMode('melody_vk')}
                  className={`py-1.5 px-2 rounded-xl text-[10px] font-semibold border transition cursor-pointer ${
                    soundSettings.ringtoneMode === 'melody_vk'
                      ? 'bg-[#0077FF] border-blue-400 text-white'
                      : 'bg-[#1a2634] border-[#283748] text-slate-300'
                  }`}
                >
                  🎵 Мелодия Chatix
                </button>
              </div>

              <label className="w-full py-1.5 px-2.5 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-200 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {soundSettings.customRingtoneName
                    ? `Свой звонок: ${soundSettings.customRingtoneName}`
                    : 'Поставить свой звонок с устройства (MP3/WAV/OGG)'}
                </span>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleCustomRingtoneUpload(file);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>

            {/* Microphone Device Selector */}
            <div className="space-y-1.5 pt-1 border-t border-[#243344]">
              <div className="flex items-center justify-between text-[10px] text-slate-300">
                <span>Устройство микрофона:</span>
                <span className="text-emerald-400 font-mono">Уровень: {micLevel}%</span>
              </div>
              {audioInputs.length > 0 && (
                <select
                  value={selectedMicId}
                  onChange={(e) => {
                    setSelectedMicId(e.target.value);
                    startLocalMedia(e.target.value);
                  }}
                  className="w-full bg-[#1a2634] border border-[#283748] rounded-xl px-2 py-1 text-[10px] text-white outline-none"
                >
                  <option value="">Микрофон по умолчанию</option>
                  {audioInputs.map((d, idx) => (
                    <option key={d.deviceId || idx} value={d.deviceId}>
                      {d.label || `Микрофон #${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={handleToggleLoopback}
                className={`w-full py-1.5 px-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  isLoopbackEnabled
                    ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                    : 'bg-[#1a2634] border-[#283748] text-slate-300 hover:text-white'
                }`}
              >
                {isLoopbackEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-300" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{isLoopbackEnabled ? 'Проверка микрофона: ВЫ СЛЫШИТЕ СЕБЯ' : 'Проверить микрофон (слышать себя)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Center: Contact Avatar, Live Microphone Equalizer & Voicemail UI */}
        <div className="relative z-10 my-auto flex flex-col items-center">

          {/* 1. Ringing or Connected Mode: Show Center Avatar ONLY when camera and screen share are OFF */}
          {(callStatus === 'ringing' || callStatus === 'connected') && !isVideoEnabled && !remoteVideoEnabled && !isScreenSharing && !isRemoteScreenSharing && (
            <div className="flex flex-col items-center">
              <div className="relative">
                <img
                  src={session.avatarUrl}
                  alt=""
                  style={{
                    transform: callStatus === 'connected' ? `scale(${1 + (micLevel / 100) * 0.14})` : undefined
                  }}
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-[#5288c1] shadow-2xl transition-transform duration-75"
                />
                <span className={`absolute bottom-1 right-1 p-1.5 rounded-full text-white shadow ${
                  isMuted ? 'bg-rose-600' : 'bg-emerald-500'
                }`}>
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </span>
              </div>
            </div>
          )}

          {/* 2. Answering Machine Greeting Mode */}
          {callStatus === 'answering_greeting' && (
            <div className="flex flex-col items-center max-w-xs animate-in zoom-in-95">
              <div className="relative mb-4">
                <img
                  src={session.avatarUrl}
                  alt=""
                  className="w-28 h-28 rounded-full object-cover border-4 border-purple-500 shadow-2xl"
                />
                <div className="absolute -bottom-1 -right-1 p-2 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-full text-white shadow">
                  <Voicemail className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#141d26]/90 border border-purple-500/40 text-purple-200 text-xs text-center shadow-lg backdrop-blur-md">
                <div className="flex items-center justify-center gap-1.5 text-purple-400 font-bold mb-1">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Приятный женский автоответчик</span>
                </div>
                <p className="italic leading-relaxed">
                  «{voicemailGreetingText}»
                </p>
                <div className="text-[10px] text-slate-400 mt-2">
                  Ожидайте соединения записи...
                </div>
              </div>
            </div>
          )}

          {/* 3. Voicemail Recording Mode */}
          {callStatus === 'voicemail_recording' && (
            <div className="flex flex-col items-center max-w-xs animate-in zoom-in-95 space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 shadow-lg animate-pulse">
                  <Mic className="w-10 h-10 animate-bounce" />
                </div>
              </div>

              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-white">Оставьте сообщение абоненту</h4>
                <p className="text-xs text-slate-300">
                  Говорите в микрофон, запись сохраняется и будет отправлена в чат с {session.contactName}
                </p>
              </div>

              <div className="flex items-center justify-center gap-1 h-8 px-4 py-1 rounded-xl bg-black/40 border border-white/10">
                {micWaveBars.map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${Math.max(8, h)}px` }}
                    className="w-1 bg-rose-400 rounded-full transition-all duration-75"
                  />
                ))}
              </div>
            </div>
          )}

          {/* 4. Voicemail Sent Success State */}
          {callStatus === 'voicemail_sent' && (
            <div className="flex flex-col items-center max-w-xs animate-in zoom-in-95 space-y-3">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-lg">
                <Check className="w-10 h-10" />
              </div>
              <h4 className="text-sm font-bold text-emerald-300">Сообщение оставлено!</h4>
              <p className="text-xs text-slate-300">
                Ваше голосовое сообщение успешно передано в чат абоненту.
              </p>
            </div>
          )}

          {/* CALL NOTICE TOAST (e.g., Point B rejected with quick response) */}
          {callNotice && (
            <div className="mt-3 px-4 py-2 rounded-2xl bg-slate-900/95 border border-blue-500/40 text-blue-200 text-xs shadow-2xl backdrop-blur-md animate-in fade-in flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{callNotice}</span>
            </div>
          )}

          {/* QUICK REPLIES POPOVER FOR POINT B (Входящий вызов: ответить или сбросить с быстрой фразой) */}
          {showQuickReplies && session.direction === 'incoming' && callStatus === 'ringing' && (
            <div className="mt-3 w-72 bg-[#131c26]/95 border border-[#2b3d52] rounded-2xl p-3 shadow-2xl backdrop-blur-md text-left space-y-2 animate-in fade-in zoom-in-95 z-40">
              <div className="flex items-center justify-between border-b border-[#243344] pb-1.5">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#64b5f6]" />
                  <span>Быстрые ответы (Точка Б)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickReplies(false)}
                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {defaultQuickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => handleQuickResponseSelect(reply)}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs bg-[#1a2634] hover:bg-[#0077FF]/25 hover:text-white text-slate-200 transition cursor-pointer flex items-center justify-between group"
                  >
                    <span>{reply}</span>
                    <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition">Сбросить →</span>
                  </button>
                ))}
              </div>

              <div className="pt-1 border-t border-[#243344] flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Свой вариант ответа..."
                  value={customReplyText}
                  onChange={(e) => setCustomReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customReplyText.trim()) {
                      handleQuickResponseSelect(customReplyText.trim());
                    }
                  }}
                  className="flex-1 bg-[#1a2634] border border-[#283748] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#0077FF]"
                />
                <button
                  type="button"
                  disabled={!customReplyText.trim()}
                  onClick={() => {
                    if (customReplyText.trim()) {
                      handleQuickResponseSelect(customReplyText.trim());
                    }
                  }}
                  className="p-1.5 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] disabled:opacity-40 text-white transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Control Bar */}
        <div className="relative z-10 pb-2 flex flex-col items-center gap-3">
          
          {/* Ringing State Actions */}
          {callStatus === 'ringing' && (
            <div className="flex items-center justify-center gap-6 w-full">
              {session.direction === 'incoming' ? (
                <>
                  {/* 1. Быстрый ответ */}
                  <button
                    onClick={() => setShowQuickReplies((prev) => !prev)}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                    title="Быстрый ответ"
                  >
                    <div className="p-4 rounded-full bg-[#1e2a38] hover:bg-[#283748] text-blue-300 border border-blue-500/30 transition shadow-lg group-hover:scale-105">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-medium text-blue-300">Быстрый ответ</span>
                  </button>

                  {/* 2. Взять трубку */}
                  <button
                    onClick={handleAnswerCall}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                    title="Взять трубку"
                  >
                    <div className="p-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/40 group-hover:scale-110 transition animate-bounce">
                      <Phone className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-semibold text-emerald-400">Взять трубку</span>
                  </button>

                  {/* 3. Сбросить */}
                  <button
                    onClick={handleEndCall}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                    title="Сбросить"
                  >
                    <div className="p-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-600/40 group-hover:scale-110 transition">
                      <PhoneOff className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-semibold text-rose-400">Сбросить</span>
                  </button>
                </>
              ) : (
                /* Исходящий вызов (Вызов абонента...): у звонящего абонента кнопки "Взять трубку" быть НЕ должно! ТОЛЬКО Сбросить */
                <button
                  onClick={handleEndCall}
                  className="flex flex-col items-center gap-1 cursor-pointer group"
                  title="Сбросить вызов"
                >
                  <div className="p-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-600/40 group-hover:scale-110 transition">
                    <PhoneOff className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-semibold text-rose-400">Сбросить</span>
                </button>
              )}
            </div>
          )}

          {/* Connected State Actions: Mic, Speaker, Screen Share, Camera, End Call */}
          {callStatus === 'connected' && (
            <div className="flex items-center justify-center gap-3 w-full bg-black/60 backdrop-blur-md p-3.5 rounded-full border border-white/10">
              {/* 1. Mic Toggle */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`p-4 rounded-full transition cursor-pointer shadow-lg ${
                  isMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
                title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* 2. Speakerphone / Bluetooth toggle */}
              <button
                type="button"
                onClick={cycleAudioRoute}
                className={`p-4 rounded-full transition cursor-pointer shadow-lg ${
                  audioRoute === 'speaker'
                    ? 'bg-amber-600 text-white'
                    : audioRoute === 'bluetooth'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
                title={`Вывод звука: ${audioRoute === 'speaker' ? 'Громкая связь' : audioRoute === 'bluetooth' ? 'Гарнитура Bluetooth' : 'Разговорный динамик'}`}
              >
                {audioRoute === 'speaker' && <Volume2 className="w-6 h-6" />}
                {audioRoute === 'bluetooth' && <Bluetooth className="w-6 h-6" />}
                {audioRoute === 'earpiece' && <Volume1 className="w-6 h-6" />}
              </button>

              {/* 3. Screen Share (Демонстрация экрана) */}
              <button
                type="button"
                onClick={handleToggleScreenShare}
                className={`p-4 rounded-full transition cursor-pointer shadow-lg ${
                  isScreenSharing
                    ? 'bg-[#0077FF] text-white shadow-blue-500/50 ring-2 ring-sky-300 animate-pulse'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title={isScreenSharing ? 'Остановить демонстрацию экрана' : 'Включить демонстрацию экрана (в группе, канале, личных)'}
              >
                <Monitor className="w-6 h-6" />
              </button>

              {/* 4. Video / Camera Toggle */}
              <button
                type="button"
                onClick={handleToggleVideo}
                className={`p-4 rounded-full transition cursor-pointer shadow-lg ${
                  !isVideoEnabled ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-cyan-600 text-white'
                }`}
                title={isVideoEnabled ? 'Выключить камеру' : 'Включить камеру'}
              >
                {!isVideoEnabled ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>

              {/* 5. End Call Button */}
              <button
                type="button"
                onClick={handleEndCall}
                className="p-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl hover:scale-105 transition cursor-pointer"
                title="Завершить звонок"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </div>
          )}

          {/* Voicemail Recording Controls */}
          {callStatus === 'voicemail_recording' && (
            <div className="flex items-center justify-center gap-4 w-full">
              <button
                type="button"
                onClick={handleSendVoicemail}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Отправить сообщение</span>
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                className="py-3 px-4 rounded-2xl bg-[#243344] hover:bg-rose-600 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                Сброс
              </button>
            </div>
          )}

          {/* Greeting in progress: Standard red hang-up button */}
          {callStatus === 'answering_greeting' && (
            <div className="flex items-center justify-center w-full">
              <button
                onClick={handleEndCall}
                className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl hover:scale-105 transition cursor-pointer"
                title="Повесить трубку"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
