import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  UserPlus, 
  UserCheck, 
  Grid, 
  Film, 
  Share2, 
  Sparkles,
  ShieldCheck,
  Heart,
  Phone,
  Video,
  Volume2,
  Search,
  MoreHorizontal,
  Play,
  ExternalLink,
  Users,
  Lock,
  Mic,
  Link as LinkIcon,
  Image as ImageIcon
} from 'lucide-react';
import { Post } from '../../types';
import { playReactionSound, playVoiceMemoAudio } from '../../utils/audioUtils';

export interface ViewTargetUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio?: string;
  isOnline?: boolean;
}

interface OtherUserProfileModalProps {
  user: ViewTargetUser | null;
  onClose: () => void;
  isFollowing: boolean;
  onToggleFollow: (userId: string) => void;
  onStartChatWithUser: (user: ViewTargetUser) => void;
  onStartCallWithUser?: (user: ViewTargetUser, isVideo: boolean) => void;
  posts?: Post[];
  reels?: Post[];
}

export const OtherUserProfileModal: React.FC<OtherUserProfileModalProps> = ({
  user,
  onClose,
  isFollowing,
  onToggleFollow,
  onStartChatWithUser,
  onStartCallWithUser,
  posts = [],
  reels = []
}) => {
  const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'posts' | 'voice' | 'links' | 'groups'>('media');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  if (!user) return null;

  // Filter posts & reels for this user
  const userPosts = posts.filter((p) => p.userId === user.id || p.userName === user.name || p.userName === user.username);
  const userReels = reels.filter((r) => r.userId === user.id || r.userName === user.name || r.userName === user.username);

  // Sample Shared Voice Memos (Matching Telegram iOS video)
  const sharedVoiceMemos = [
    { id: 'v_1', sender: 'Вы', duration: '0:06', date: '16 дек. 2025 в 21:45', durationSec: 6 },
    { id: 'v_2', sender: 'Вы', duration: '0:12', date: '16 дек. 2025 в 21:44', durationSec: 12 }
  ];

  // Sample Shared Links (Matching Telegram iOS video)
  const sharedLinks = [
    { id: 'l_1', title: 'klik-klan-scm6.onrender.com', url: 'https://klik-klan-scm6.onrender.com?ref=7389515615', date: 'ДЕКАБРЬ 2025' },
    { id: 'l_2', title: 'poehali.dev', url: 'http://poehali.dev', date: 'ДЕКАБРЬ 2025' },
    { id: 'l_3', title: 'StreamHub — запусти свой сайт за минуту!', url: 'https://stream-platforms-manager--preview.poehali.dev', date: 'ДЕКАБРЬ 2025' },
    { id: 'l_4', title: 'Figma Community File', url: 'https://www.figma.com/file/O1d-1=&p=f&t=fle3Q5Tz3NTdVwIq-08...', date: 'ОКТЯБРЬ 2025' }
  ];

  // Sample Shared Groups (Matching Telegram iOS video)
  const sharedGroups = [
    { id: 'g_1', title: 'Сквад мандаринок', members: '14 участников', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Mandarin&backgroundColor=ea580c' },
    { id: 'g_2', title: 'Haro-flood', members: '88 участников', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=HaroFlood&backgroundColor=0284c7' }
  ];

  const handlePlayVoice = (id: string, durationSec: number) => {
    if (playingVoiceId === id) {
      setPlayingVoiceId(null);
      return;
    }
    setPlayingVoiceId(id);
    playVoiceMemoAudio(durationSec, () => {}, () => setPlayingVoiceId(null));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs select-none">
      {/* Chatix User Profile Modal */}
      <div 
        className="w-full max-w-md bg-[#222222] border border-[#2e2e2e] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#e1e3e6] h-[85vh] max-h-[680px] min-h-0 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-4 py-3 border-b border-[#2e2e2e] flex items-center justify-between bg-[#222222] shrink-0">
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-[#2c2d2e] text-[#71aaeb] hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
          >
            ‹ Назад
          </button>
          <span className="font-bold text-xs text-white">Профиль Chatix</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#2c2d2e] text-[#828282] hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Profile Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4 scrollbar-thin bg-[#141414] [-webkit-overflow-scrolling:touch] [touch-action:pan-y]">
          {/* Chatix Profile Header Card */}
          <div className="bg-[#222222] border border-[#2e2e2e] rounded-2xl p-4 flex flex-col items-center text-center space-y-2.5">
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-[#2e2e2e]"
              />
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#222222]" title="В сети" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white flex items-center justify-center gap-1.5">
                <span>{user.name}</span>
                <ShieldCheck className="w-4 h-4 text-[#0077FF]" />
              </h2>
              <p className="text-xs text-[#71aaeb] mt-0.5">@{user.username} • в сети</p>
              {user.bio && (
                <p className="text-xs text-[#939393] mt-1 max-w-xs leading-relaxed">{user.bio}</p>
              )}
            </div>

            {/* Primary Chatix Action Buttons: Сообщение & Подписаться */}
            <div className="flex items-center gap-2 w-full pt-1">
              <button
                onClick={() => {
                  onClose();
                  onStartChatWithUser(user);
                }}
                className="flex-1 h-9 px-3 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Сообщение</span>
              </button>

              <button
                onClick={() => {
                  onToggleFollow(user.id);
                  playReactionSound();
                }}
                className="flex-1 h-9 px-3 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {isFollowing ? <UserCheck className="w-4 h-4 text-[#71aaeb]" /> : <UserPlus className="w-4 h-4 text-[#71aaeb]" />}
                <span>{isFollowing ? 'Вы подписаны' : 'Подписаться'}</span>
              </button>
            </div>

            {/* VK Secondary Action Row (Звонок | Уведомления | Поиск | Заблокировать) */}
            <div className="grid grid-cols-4 gap-2 w-full pt-1">
              <button
                onClick={() => {
                  onClose();
                  onStartCallWithUser?.(user, false);
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] transition cursor-pointer"
              >
                <Phone className="w-4 h-4 text-[#71aaeb]" />
                <span className="text-[10px] text-[#e1e3e6] font-medium">Звонок</span>
              </button>

              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  playReactionSound();
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] transition cursor-pointer"
              >
                <Volume2 className={`w-4 h-4 ${isMuted ? 'text-rose-400' : 'text-[#71aaeb]'}`} />
                <span className="text-[10px] text-[#e1e3e6] font-medium">{isMuted ? 'Без звука' : 'Звук'}</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onStartChatWithUser(user);
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] transition cursor-pointer"
              >
                <Search className="w-4 h-4 text-[#71aaeb]" />
                <span className="text-[10px] text-[#e1e3e6] font-medium">Чат</span>
              </button>

              <button
                onClick={() => {
                  setIsBlocked(!isBlocked);
                  playReactionSound();
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#2c2d2e] hover:bg-rose-500/20 transition cursor-pointer"
              >
                <Lock className="w-4 h-4 text-rose-400" />
                <span className="text-[10px] text-rose-400 font-medium">{isBlocked ? 'Разблок.' : 'В ЧС'}</span>
              </button>
            </div>
          </div>

          {/* Shared Media & Wall Content Card */}
          <div className="bg-[#222222] border border-[#2e2e2e] rounded-2xl p-3.5 space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-[#2e2e2e] pb-2.5">
              <button
                onClick={() => setActiveMediaTab('media')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeMediaTab === 'media' ? 'bg-[#2c2d2e] text-white' : 'text-[#828282] hover:text-white'
                }`}
              >
                Фото и видео
              </button>

              <button
                onClick={() => setActiveMediaTab('posts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeMediaTab === 'posts' ? 'bg-[#2c2d2e] text-white' : 'text-[#828282] hover:text-white'
                }`}
              >
                Записи ({userPosts.length + userReels.length})
              </button>

              <button
                onClick={() => setActiveMediaTab('voice')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeMediaTab === 'voice' ? 'bg-[#2c2d2e] text-white' : 'text-[#828282] hover:text-white'
                }`}
              >
                Голосовые ({sharedVoiceMemos.length})
              </button>

              <button
                onClick={() => setActiveMediaTab('links')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeMediaTab === 'links' ? 'bg-[#2c2d2e] text-white' : 'text-[#828282] hover:text-white'
                }`}
              >
                Ссылки ({sharedLinks.length})
              </button>

              <button
                onClick={() => setActiveMediaTab('groups')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeMediaTab === 'groups' ? 'bg-[#2c2d2e] text-white' : 'text-[#828282] hover:text-white'
                }`}
              >
                Сообщества ({sharedGroups.length})
              </button>
            </div>

            {/* TAB 1: MEDIA GRID */}
            {activeMediaTab === 'media' && (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-square rounded-xl bg-[#19191a] overflow-hidden relative border border-[#2e2e2e]">
                    <img
                      src={`https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80&sig=${i}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">0:{i * 12}</span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: POSTS GRID */}
            {activeMediaTab === 'posts' && (
              <div className="grid grid-cols-3 gap-2">
                {userPosts.length > 0 ? (
                  userPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="aspect-square rounded-xl overflow-hidden relative group cursor-pointer border border-[#2e2e2e]"
                    >
                      <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                        <Heart className="w-3.5 h-3.5 fill-white" />
                        <span>{post.likesCount}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 py-6 text-center text-xs text-[#828282]">
                    У пользователя пока нет записей на стене
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: VOICE MESSAGES LIST */}
            {activeMediaTab === 'voice' && (
              <div className="space-y-2">
                {sharedVoiceMemos.map((v) => (
                  <div key={v.id} className="p-3 rounded-xl bg-[#19191a] border border-[#2e2e2e] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handlePlayVoice(v.id, v.durationSec)}
                        className="p-2.5 rounded-full bg-[#0077FF] text-white hover:bg-[#0066DD] transition cursor-pointer"
                      >
                        {playingVoiceId === v.id ? <X className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      </button>
                      <div>
                        <div className="font-semibold text-xs text-white">{v.sender}</div>
                        <div className="text-[10px] text-[#828282]">{v.duration} • {v.date}</div>
                      </div>
                    </div>
                    <Mic className="w-4 h-4 text-[#71aaeb]" />
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: LINKS LIST */}
            {activeMediaTab === 'links' && (
              <div className="space-y-2">
                {sharedLinks.map((l) => (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-xl bg-[#19191a] border border-[#2e2e2e] block hover:bg-[#2c2d2e] transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-xs text-[#71aaeb] truncate">{l.title}</div>
                      <ExternalLink className="w-3.5 h-3.5 text-[#828282] shrink-0" />
                    </div>
                    <div className="text-[10px] text-[#828282] truncate mt-0.5">{l.url}</div>
                  </a>
                ))}
              </div>
            )}

            {/* TAB 5: SHARED GROUPS LIST */}
            {activeMediaTab === 'groups' && (
              <div className="space-y-2">
                {sharedGroups.map((g) => (
                  <div key={g.id} className="p-3 rounded-xl bg-[#19191a] border border-[#2e2e2e] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={g.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                      <div>
                        <div className="font-semibold text-xs text-white">{g.title}</div>
                        <div className="text-[10px] text-[#828282]">{g.members}</div>
                      </div>
                    </div>
                    <Users className="w-4 h-4 text-[#71aaeb]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Post Detail Popup */}
      {selectedPost && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
          <div className="bg-[#222222] border border-[#2e2e2e] rounded-2xl p-4 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white">Запись на стене</span>
              <button onClick={() => setSelectedPost(null)} className="text-[#828282] hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <img src={selectedPost.mediaUrl} alt="" className="w-full rounded-xl max-h-80 object-cover" />
            <p className="text-xs text-[#e1e3e6]">{selectedPost.caption}</p>
          </div>
        </div>
      )}
    </div>
  );
};
