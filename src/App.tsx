/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  initialCurrentUser, 
  initialChats, 
  initialStories, 
  initialMessages, 
  initialReels, 
  initialPosts,
  initialVisitors,
  initialCommunityGifs,
  initialCallRecords,
  initialCommunities,
  getRefreshedPostsFeed,
  getRefreshedReelsFeed
} from './data/messengerData';
import { Chat, Message, Story, User, Post, CommunityGif, ProfileVisitor, CallRecord, Community } from './types';
import { TelegramSidebar } from './components/messenger/TelegramSidebar';
import { ChatArea } from './components/messenger/ChatArea';
import { ReelsFeed } from './components/messenger/ReelsFeed';
import { PostsFeed } from './components/messenger/PostsFeed';
import { UserProfileView } from './components/messenger/UserProfileView';
import { StoryViewerModal } from './components/messenger/StoryViewerModal';
import { AddStoryModal } from './components/messenger/AddStoryModal';
import { SettingsModal } from './components/messenger/SettingsModal';
import { TechSpecModal } from './components/messenger/TechSpecModal';
import { VideoNoteModal } from './components/VideoNoteModal';
import { RealWebRTCCallModal, CallSession } from './components/messenger/RealWebRTCCallModal';
import { PlusActionMenuModal } from './components/messenger/PlusActionMenuModal';
import { OtherUserProfileModal, ViewTargetUser } from './components/messenger/OtherUserProfileModal';
import { CameraStudioModal, CaptureMode } from './components/messenger/CameraStudioModal';
import { CreateChatModal } from './components/messenger/CreateChatModal';
import { CommunityViewModal } from './components/messenger/CommunityViewModal';
import { CallHistoryModal } from './components/messenger/CallHistoryModal';
import { StartCallModal } from './components/messenger/StartCallModal';
import { MainMenuDrawer } from './components/messenger/MainMenuDrawer';
import { ContactsModal, ContactItem } from './components/messenger/ContactsModal';
import { QRScannerModal } from './components/messenger/QRScannerModal';
import { InstallAppModal } from './components/messenger/InstallAppModal';
import { AuthModal } from './components/messenger/AuthModal';
import { AccountPinPromptModal } from './components/messenger/AccountPinPromptModal';
import { SettingsTab } from './components/messenger/SettingsModal';
import { GlobalSearchModal } from './components/messenger/GlobalSearchModal';
import { playReactionSound, playSentSound, playNotificationSound } from './utils/audioUtils';
import { isVideoMedia } from './utils/mediaUtils';
import { formatSmartTime, getCurrentFormattedTime, normalizeCreatedAtIso } from './utils/dateUtils';
import { 
  syncAccountToCloud, 
  savePlatformStateToCloud, 
  subscribeToCloudPlatformState,
  publishCallSignalToCloud,
  subscribeToCallSignalsFromCloud,
  isFirestoreQuotaExceeded,
  subscribeToQuotaExceeded
} from './firebase';
import { 
  MessageSquare, 
  Play, 
  Image as ImageIcon, 
  Settings, 
  FileCode, 
  ShieldCheck,
  Disc,
  Phone,
  Plus,
  Camera,
  UserPlus,
  User as UserIcon,
  Layers,
  Users,
  Search,
  Grid,
  MoreHorizontal,
  ChevronRight,
  X,
  ExternalLink,
  Compass,
  Sparkles
} from 'lucide-react';

export default function App() {
  // Navigation: 'chats' | 'reels' | 'posts' | 'profile'
  const [activeScreen, setActiveScreen] = useState<'chats' | 'reels' | 'posts' | 'profile'>('chats');
  const [postsInitialTab, setPostsInitialTab] = useState<'all' | 'communities'>('all');

  // Application State
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('aurachat_currentUser');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialCurrentUser;
  });

  const [chats, setChats] = useState<Chat[]>(() => {
    const sanitizeChats = (list: Chat[]): Chat[] => {
      const seenIds = new Set<string>();
      const seenDirectTitles = new Set<string>();
      return list.filter((c) => {
        if (!c || !c.id) return false;
        if (seenIds.has(c.id)) return false;
        if (c.type === 'direct') {
          const key = (c.title || '').trim().toLowerCase();
          if (key && seenDirectTitles.has(key)) return false;
          if (key) seenDirectTitles.add(key);
        }
        seenIds.add(c.id);
        return true;
      }).map((c) =>
        c.type === 'saved'
          ? {
              ...c,
              membersCount: 1,
              unreadCount: 0,
              members: c.members?.slice(0, 1) || []
            }
          : c
      );
    };
    try {
      const savedMapRaw = localStorage.getItem('aurachat_userChatsMap_v2');
      const savedUserRaw = localStorage.getItem('aurachat_currentUser');
      const activeUid = savedUserRaw ? JSON.parse(savedUserRaw).id : initialCurrentUser.id;
      if (savedMapRaw) {
        const parsedMap = JSON.parse(savedMapRaw);
        if (parsedMap[activeUid] && parsedMap[activeUid].length > 0) {
          return sanitizeChats(parsedMap[activeUid]);
        }
      }
      const saved = localStorage.getItem('aurachat_active_chats_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return sanitizeChats(parsed);
      }
    } catch (e) {}
    return sanitizeChats(initialChats);
  });
  const [globalCatalogChats, setGlobalCatalogChats] = useState<Chat[]>(() => {
    try {
      const saved = localStorage.getItem('aurachat_global_chats_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialChats;
  });
  const [selectedChat, setSelectedChat] = useState<Chat>(() => {
    const first = chats[0] || initialChats[0];
    return first ? { ...first, unreadCount: 0 } : first;
  });
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [onlinePeerMap, setOnlinePeerMap] = useState<Record<string, number>>({});
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(() => {
    const dedupeMap = (raw: Record<string, Message[]>): Record<string, Message[]> => {
      const clean: Record<string, Message[]> = {};
      Object.keys(raw || {}).forEach((chatId) => {
        const list = Array.isArray(raw[chatId]) ? raw[chatId] : [];
        const seenIds = new Set<string>();
        const deduped: Message[] = [];
        list.forEach((m, idx) => {
          if (!m) return;
          const safeId = m.id && !seenIds.has(m.id) ? m.id : `${m.id || 'msg'}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
          seenIds.add(safeId);
          // Avoid consecutive duplicate identical messages created at the exact same moment
          const prevMsg = deduped[deduped.length - 1];
          if (
            prevMsg &&
            prevMsg.senderId === m.senderId &&
            prevMsg.content === m.content &&
            prevMsg.createdAt === m.createdAt
          ) {
            return;
          }
          deduped.push({ ...m, id: safeId });
        });
        clean[chatId] = deduped;
      });
      return clean;
    };
    try {
      const saved = localStorage.getItem('aurachat_messagesMap_v2');
      if (saved) return dedupeMap(JSON.parse(saved));
    } catch (e) {}
    return dedupeMap(initialMessages);
  });
  const [stories, setStories] = useState<Story[]>(() => {
    try {
      const saved = localStorage.getItem('aurachat_user_stories_v2');
      if (saved) {
        const parsed: Story[] = JSON.parse(saved);
        return parsed
          .filter((s) => s.mediaUrl && !s.mediaUrl.startsWith('blob:'))
          .map((s) => ({
            ...s,
            mediaType: isVideoMedia(s.mediaUrl, s.mediaType) ? 'video' : 'image'
          }));
      }
    } catch (e) {}
    return initialStories;
  });
  const [visitCycle] = useState<number>(() => {
    try {
      const next = (Number(localStorage.getItem('aurachat_visit_cycle')) || 0) + 1;
      localStorage.setItem('aurachat_visit_cycle', String(next));
      return next;
    } catch (e) {
      return 1;
    }
  });
  const [reels, setReels] = useState<Post[]>(() => {
    try {
      const savedGlobal = localStorage.getItem('aurachat_global_reels_v3') || localStorage.getItem('aurachat_user_reels_v2');
      if (savedGlobal) {
        const parsed: Post[] = JSON.parse(savedGlobal);
        return parsed
          .filter((r) => r.mediaUrl && !r.mediaUrl.startsWith('blob:'))
          .map((r) => ({
            ...r,
            createdAt: normalizeCreatedAtIso(r.createdAt, r.id),
            mediaType: isVideoMedia(r.mediaUrl, r.mediaType) ? 'video' : 'image'
          }));
      }
    } catch (e) {}
    return getRefreshedReelsFeed(initialReels, visitCycle);
  });
  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const savedGlobal = localStorage.getItem('aurachat_global_posts_v3') || localStorage.getItem('aurachat_user_posts_v2');
      if (savedGlobal) {
        const parsed: Post[] = JSON.parse(savedGlobal);
        return parsed
          .filter((p) => !p.mediaUrl || !p.mediaUrl.startsWith('blob:'))
          .map((p) => ({
            ...p,
            createdAt: normalizeCreatedAtIso(p.createdAt, p.id),
            mediaType: !p.mediaUrl
              ? 'text'
              : isVideoMedia(p.mediaUrl, p.mediaType)
                ? 'video'
                : 'image'
          }));
      }
    } catch (e) {}
    return getRefreshedPostsFeed(initialPosts, visitCycle);
  });
  const [feedRefreshCount, setFeedRefreshCount] = useState<number>(1);
  const [reelsRefreshCount, setReelsRefreshCount] = useState<number>(1);
  const [visitors, setVisitors] = useState<ProfileVisitor[]>(initialVisitors);
  const [communityGifs, setCommunityGifs] = useState<CommunityGif[]>(initialCommunityGifs);
  const [savedPostIds, setSavedPostIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      localStorage.setItem('aurachat_user_stories_v2', JSON.stringify(stories));
    } catch (e) {}
  }, [stories]);

  useEffect(() => {
    try {
      localStorage.setItem('aurachat_user_reels_v2', JSON.stringify(reels));
      localStorage.setItem('aurachat_global_reels_v3', JSON.stringify(reels));
    } catch (e) {}
  }, [reels]);

  useEffect(() => {
    try {
      localStorage.setItem('aurachat_user_posts_v2', JSON.stringify(posts));
      localStorage.setItem('aurachat_global_posts_v3', JSON.stringify(posts));
    } catch (e) {}
  }, [posts]);

  useEffect(() => {
    try {
      localStorage.setItem('aurachat_global_chats_v2', JSON.stringify(globalCatalogChats));
    } catch (e) {}
  }, [globalCatalogChats]);

  const handleRefreshPostsFeed = () => {
    setFeedRefreshCount((prev) => {
      const next = prev + 1;
      setPosts((curr) => getRefreshedPostsFeed(curr, visitCycle + next));
      return next;
    });
  };

  const handleRefreshReelsFeed = () => {
    setReelsRefreshCount((prev) => {
      const next = prev + 1;
      setReels((curr) => getRefreshedReelsFeed(curr, visitCycle + next));
      return next;
    });
  };

  const handleOpenPostsFeed = (tab: 'all' | 'communities' = 'all') => {
    setPostsInitialTab(tab);
    if (tab === 'all') {
      handleRefreshPostsFeed();
    }
    setActiveScreen('posts');
  };

  const handleOpenReelsFeed = () => {
    handleRefreshReelsFeed();
    setActiveScreen('reels');
  };

  const handleToggleSavePost = (postId: string) => {
    playReactionSound();
    setSavedPostIds((prev) => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleToggleLikePost = (postId: string) => {
    let updatedLikesCount = 0;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextLiked = !p.isLiked;
        updatedLikesCount = Math.max(0, p.likesCount + (nextLiked ? 1 : -1));
        return {
          ...p,
          isLiked: nextLiked,
          likesCount: updatedLikesCount
        };
      })
    );
    setReels((prev) =>
      prev.map((r) => {
        if (r.id !== postId) return r;
        const nextLiked = !r.isLiked;
        if (!updatedLikesCount) {
          updatedLikesCount = Math.max(0, r.likesCount + (nextLiked ? 1 : -1));
        }
        return {
          ...r,
          isLiked: nextLiked,
          likesCount: updatedLikesCount
        };
      })
    );

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('aurachat_live_messages_sync');
        ch.postMessage({ type: 'POST_LIKE_TOGGLE', postId, likesCount: updatedLikesCount });
        ch.close();
      }
    } catch {}
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    playReactionSound();
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.filter((c) => c.id !== commentId),
          commentsCount: Math.max(0, p.commentsCount - 1)
        };
      })
    );
    setReels((prev) =>
      prev.map((r) => {
        if (r.id !== postId) return r;
        return {
          ...r,
          comments: r.comments.filter((c) => c.id !== commentId),
          commentsCount: Math.max(0, r.commentsCount - 1)
        };
      })
    );

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('aurachat_live_messages_sync');
        ch.postMessage({ type: 'DELETE_POST_COMMENT', postId, commentId });
        ch.close();
      }
    } catch {}
  };

  const handleAddPostComment = (postId: string, comment: any) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          commentsCount: p.commentsCount + 1,
          comments: [...p.comments, comment]
        };
      })
    );
    setReels((prev) =>
      prev.map((r) => {
        if (r.id !== postId) return r;
        return {
          ...r,
          commentsCount: r.commentsCount + 1,
          comments: [...r.comments, comment]
        };
      })
    );

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('aurachat_live_messages_sync');
        ch.postMessage({ type: 'NEW_POST_COMMENT', postId, comment });
        ch.close();
      }
    } catch {}
  };

  // Modals & Calls
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [isAddStoryOpen, setIsAddStoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('profile');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [lastLoggedUser, setLastLoggedUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('aurachat_currentUser_v3');
      if (saved) return JSON.parse(saved);
      const legacy = localStorage.getItem('aurachat_currentUser');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed && parsed.id !== 'usr_me' && parsed.id !== 'u_durov' && parsed.id !== 'u_anna') {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });
  const [savedAccounts, setSavedAccounts] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('aurachat_savedAccounts_v3');
      if (saved) return JSON.parse(saved);
      // Clean legacy mock accounts if present
      const legacy = localStorage.getItem('aurachat_savedAccounts');
      if (legacy) {
        const parsed: User[] = JSON.parse(legacy);
        const filtered = parsed.filter(
          (a) => a.id !== 'u_durov' && a.id !== 'u_anna' && a.id !== 'usr_me'
        );
        if (filtered.length > 0) return filtered;
      }
    } catch (e) {}
    return [];
  });

  // Helper to create pure "Избранное" (Saved Messages) chat for any user
  const createSavedMessagesChat = (user: User): Chat => ({
    id: 'chat_saved_' + user.id,
    type: 'saved',
    title: 'Избранное',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=SavedVault_' + user.id + '&backgroundColor=2563eb',
    isPrivate: true,
    lastMessage: 'Пересылайте сюда важные сообщения, заметки и файлы',
    lastMessageTime: 'Только что',
    unreadCount: 0,
    membersCount: 1,
    members: [
      {
        userId: user.id,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: 'owner'
      }
    ]
  });

  // User accounts chat storage: maps userId -> Chat[]
  const [userChatsMap, setUserChatsMap] = useState<Record<string, Chat[]>>(() => {
    try {
      const saved = localStorage.getItem('aurachat_userChatsMap_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  // User authentication and session state: Defaults to false so first screen is Login / Registration
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('aurachat_isLoggedIn_v3');
      if (saved !== null) return JSON.parse(saved);
      const legacy = localStorage.getItem('aurachat_isLoggedIn');
      if (legacy !== null) {
        const parsedLegacy = JSON.parse(legacy);
        const savedAccs = localStorage.getItem('aurachat_savedAccounts_v3') || localStorage.getItem('aurachat_savedAccounts');
        if (parsedLegacy && savedAccs) {
          const parsedList: User[] = JSON.parse(savedAccs);
          const hasRealUser = parsedList.some(
            (a) => a.id !== 'usr_me' && a.id !== 'u_durov' && a.id !== 'u_anna'
          );
          if (hasRealUser) return true;
        }
      }
    } catch (e) {}
    return false;
  });

  // LocalStorage persistence Effects
  useEffect(() => {
    try {
      localStorage.setItem('aurachat_currentUser', JSON.stringify(currentUser));
      localStorage.setItem('aurachat_currentUser_v3', JSON.stringify(currentUser));
      if (!isFirestoreQuotaExceeded()) {
        syncAccountToCloud(currentUser);
      }
    } catch (e) {}
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('aurachat_savedAccounts', JSON.stringify(savedAccounts));
      localStorage.setItem('aurachat_savedAccounts_v3', JSON.stringify(savedAccounts));
    } catch (e) {}
  }, [savedAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem('aurachat_isLoggedIn', JSON.stringify(isLoggedIn));
      localStorage.setItem('aurachat_isLoggedIn_v3', JSON.stringify(isLoggedIn));
    } catch (e) {}
  }, [isLoggedIn]);

  useEffect(() => {
    try {
      localStorage.setItem('aurachat_active_chats_v2', JSON.stringify(chats));
      setUserChatsMap((prev) => {
        const next = { ...prev, [currentUser.id]: chats };
        localStorage.setItem('aurachat_userChatsMap_v2', JSON.stringify(next));
        return next;
      });
    } catch (e) {}
  }, [chats, currentUser.id]);

  useEffect(() => {
    try {
      localStorage.setItem('aurachat_messagesMap_v2', JSON.stringify(messagesMap));
    } catch (e) {}
  }, [messagesMap]);

  // 6-Digit PIN Prompt state for switching accounts or logging in
  const [pinPromptTargetUser, setPinPromptTargetUser] = useState<User | null>(null);

  // Broadcast a user's presence / status update so all tabs and users immediately see it
  const broadcastUserPresence = (userToBroadcast: User) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('aurachat_live_messages_sync');
        ch.postMessage({
          type: 'USER_PRESENCE_UPDATE',
          user: userToBroadcast
        });
        ch.close();
      }
      if (!isFirestoreQuotaExceeded()) {
        syncAccountToCloud(userToBroadcast);
      }
    } catch {}
  };

  // Switch Account Handler:
  // - Exiting account gets "был(а) только что в сети" (if in auto mode)
  // - Entering account automatically gets "в сети" (even if it previously had "был(а) в сети недавно")
  const handleSwitchUser = (targetUser: User) => {
    const nowMs = Date.now();
    const prevMode = (currentUser.settings as any)?.presenceMode || 'auto';
    const exitingUser: User =
      prevMode === 'manual' || currentUser.hideOnlineStatus
        ? currentUser
        : {
            ...currentUser,
            isOnline: false,
            lastSeen: 'был(а) только что в сети',
            settings: {
              ...currentUser.settings,
              presenceMode: 'auto',
              offlineAt: nowMs
            } as any
          };

    const targetMode = (targetUser.settings as any)?.presenceMode || 'auto';
    const enteringUser: User =
      targetMode === 'manual' || targetUser.hideOnlineStatus
        ? targetUser
        : {
            ...targetUser,
            isOnline: true,
            lastSeen: 'в сети',
            settings: {
              ...targetUser.settings,
              presenceMode: 'auto',
              offlineAt: undefined
            } as any
          };

    // 1. Save current account's chats and calls into maps
    setUserChatsMap((prev) => ({
      ...prev,
      [currentUser.id]: chats
    }));
    setUserCallsMap((prev) => ({
      ...prev,
      [currentUser.id]: calls
    }));

    setSavedAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === exitingUser.id) return exitingUser;
        if (acc.id === enteringUser.id) return enteringUser;
        return acc;
      })
    );

    if (exitingUser.id !== enteringUser.id) {
      broadcastUserPresence(exitingUser);
    }
    broadcastUserPresence(enteringUser);

    setCurrentUser(enteringUser);
    setLastLoggedUser(enteringUser);

    // 2. Load target user's chats (if new account -> only [savedChat]) and calls (if new account -> [])
    const targetChats = userChatsMap[enteringUser.id] || [createSavedMessagesChat(enteringUser)];
    setChats(targetChats);
    setSelectedChat({ ...targetChats[0], unreadCount: 0 });
    const targetCalls = (userCallsMap[enteringUser.id] || []).filter(
      (c) => c.id !== 'call_1' && c.id !== 'call_2' && c.id !== 'call_3'
    );
    setCalls(targetCalls);
    setIsMobileChatOpen(false);
  };

  // Complete Logout Handler ("надо полностью выйти из аккаунта")
  // When user exits the social network, status automatically becomes "был(а) только что в сети"
  const handleLogout = (forgetAccount: boolean = false) => {
    const nowMs = Date.now();
    const curMode = (currentUser.settings as any)?.presenceMode || 'auto';
    const loggedOutUser: User =
      curMode === 'manual' || currentUser.hideOnlineStatus
        ? currentUser
        : {
            ...currentUser,
            isOnline: false,
            lastSeen: 'был(а) только что в сети',
            settings: {
              ...currentUser.settings,
              presenceMode: 'auto',
              offlineAt: nowMs
            } as any
          };

    // 1. Save current account chats
    setUserChatsMap((prev) => ({
      ...prev,
      [currentUser.id]: chats
    }));

    if (forgetAccount) {
      setSavedAccounts((prev) => prev.filter((a) => a.id !== currentUser.id));
      setLastLoggedUser(null);
    } else {
      setCurrentUser(loggedOutUser);
      setLastLoggedUser(loggedOutUser);
      setSavedAccounts((prev) =>
        prev.map((a) => (a.id === loggedOutUser.id ? loggedOutUser : a))
      );
      broadcastUserPresence(loggedOutUser);
    }

    // 2. Mark completely logged out
    setIsLoggedIn(false);

    // 3. Close open views and show locked Auth screen
    setIsSettingsOpen(false);
    setIsMainMenuOpen(false);
    setPinPromptTargetUser(null);
    setIsAuthModalOpen(true);
  };

  const handleClearChatHistory = (chatId: string, forBoth: boolean = false) => {
    playReactionSound();
    if (forBoth && typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('aurachat_live_messages_sync');
        channel.postMessage({ type: 'CLEAR_CHAT_HISTORY', chatId });
        channel.close();
      } catch {}
    }

    setMessagesMap((prev) => ({
      ...prev,
      [chatId]: []
    }));
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, lastMessage: 'Переписка очищена', lastMessageTime: 'Только что', unreadCount: 0 } : c
      )
    );
  };

  // Delete chat for self or for both users
  const handleDeleteChat = (chatId: string, forBoth: boolean = false) => {
    playReactionSound();
    if (forBoth && typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('aurachat_live_messages_sync');
        channel.postMessage({ type: 'DELETE_CHAT_FOR_BOTH', chatId });
        channel.close();
      } catch {}
    }

    setMessagesMap((prev) => {
      const copy = { ...prev };
      delete copy[chatId];
      return copy;
    });

    setChats((prev) => {
      const remaining = prev.filter((c) => c.id !== chatId);
      const fallback = remaining[0] || createSavedMessagesChat(currentUser);
      if (selectedChat.id === chatId) {
        setSelectedChat(fallback);
      }
      return remaining.length > 0 ? remaining : [fallback];
    });

    setIsMobileChatOpen(false);
  };

  // Leave group or channel
  const handleLeaveChat = (chatId: string) => {
    playReactionSound();
    setChats((prev) => {
      const remaining = prev.filter((c) => c.id !== chatId);
      const fallback = remaining[0] || createSavedMessagesChat(currentUser);
      if (selectedChat.id === chatId) {
        setSelectedChat(fallback);
      }
      return remaining.length > 0 ? remaining : [fallback];
    });
    setIsMobileChatOpen(false);
  };


  // Request Account Switch (Only prompts for PIN if the account has a PIN configured in Settings)
  const handleRequestSwitchUser = (targetUser: User) => {
    if (isLoggedIn && targetUser.id === currentUser.id) return;
    if (targetUser.pinCode && targetUser.pinCode.length >= 4) {
      setPinPromptTargetUser(targetUser);
    } else {
      handlePinPromptSuccess(targetUser);
    }
  };

  // Called when 6-digit PIN is successfully verified or newly created
  const handlePinPromptSuccess = (authenticatedUser: User, updatedPin?: string) => {
    let finalUser = authenticatedUser;
    if (updatedPin) {
      finalUser = {
        ...authenticatedUser,
        pinCode: updatedPin,
        hasPin: true
      };
      setSavedAccounts((prev) =>
        prev.map((acc) =>
          acc.id === finalUser.id ? finalUser : acc
        )
      );
    }
    handleSwitchUser(finalUser);
    setIsLoggedIn(true);
    setPinPromptTargetUser(null);
    setIsSettingsOpen(false);
    setIsAuthModalOpen(false);
  };

  // Update current user's PIN code from Settings ("Или сам установишь")
  const handleUpdateCurrentUserPin = (newPin: string) => {
    const hasPin = Boolean(newPin && newPin.length === 6);
    setCurrentUser((prev) => ({
      ...prev,
      pinCode: newPin || undefined,
      hasPin
    }));
    setSavedAccounts((prev) =>
      prev.map((acc) =>
        acc.id === currentUser.id
          ? { ...acc, pinCode: newPin || undefined, hasPin }
          : acc
      )
    );
  };

  // Register New Account Handler: ONLY "Избранное", NO ONE ELSE!
  const handleRegisterNewUser = (newUser: User) => {
    // 1. Save current account's chats and calls
    setUserChatsMap((prev) => ({
      ...prev,
      [currentUser.id]: chats
    }));
    setUserCallsMap((prev) => ({
      ...prev,
      [currentUser.id]: calls,
      [newUser.id]: []
    }));

    // 2. Create clean "Избранное" ONLY for the newly registered user
    const newSavedChat = createSavedMessagesChat(newUser);

    // 3. Store ONLY this chat in userChatsMap for newUser
    setUserChatsMap((prev) => ({
      ...prev,
      [newUser.id]: [newSavedChat]
    }));

    setCurrentUser(newUser);
    setLastLoggedUser(newUser);
    setSavedAccounts((prev) => [...prev, newUser]);

    // 4. Set chats to ONLY [newSavedChat], empty calls [], and reset subscriptions so there are NO foreign stories or missed calls
    setChats([newSavedChat]);
    setSelectedChat(newSavedChat);
    setCalls([]);
    setFollowingUserIds({});

    // 5. Add welcome message in "Избранное"
    setMessagesMap((prev) => ({
      ...prev,
      [newSavedChat.id]: [
        {
          id: 'msg_welcome_' + Date.now(),
          chatId: newSavedChat.id,
          senderId: newUser.id,
          senderName: 'Избранное',
          senderAvatar: newSavedChat.avatarUrl,
          type: 'text',
          content: '🌟 Добро пожаловать в AuraChat! Это ваше персональное облако «Избранное». Здесь можно безопасно хранить важные заметки, файлы и медиа. Только вы имеете доступ к этим сообщениям.',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        }
      ]
    }));

    setIsLoggedIn(true);
    setIsAuthModalOpen(false);
    setActiveScreen('chats');
  };

  const handleDeleteUserAccount = (userId: string) => {
    setSavedAccounts((prev) => {
      const remaining = prev.filter((a) => a.id !== userId);
      if (remaining.length > 0) {
        handleSwitchUser(remaining[0]);
      } else {
        setIsAuthModalOpen(true);
      }
      return remaining;
    });
    setUserChatsMap((prev) => {
      const copy = { ...prev };
      delete copy[userId];
      return copy;
    });
    setUserCallsMap((prev) => {
      const copy = { ...prev };
      delete copy[userId];
      return copy;
    });
  };

  const handleOpenSettings = (tab: SettingsTab = 'profile') => {
    setSettingsInitialTab(tab);
    setIsSettingsOpen(true);
  };
  const [isTechSpecOpen, setIsTechSpecOpen] = useState(false);
  const [isVideoNoteRecorderOpen, setIsVideoNoteRecorderOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isQuotaExceededState, setIsQuotaExceededState] = useState(isFirestoreQuotaExceeded());
  const [isQuotaBannerDismissed, setIsQuotaBannerDismissed] = useState(false);
  const isIncomingCloudUpdateRef = useRef(false);
  const [isCameraStudioOpen, setIsCameraStudioOpen] = useState(false);
  const [cameraStudioMode, setCameraStudioMode] = useState<CaptureMode>('post');
  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [createChatDefaultType, setCreateChatDefaultType] = useState<'group' | 'channel' | 'direct' | 'community'>('group');
  const [communities, setCommunities] = useState<Community[]>(() => {
    try {
      const saved = localStorage.getItem('aurachat_communities_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialCommunities;
  });
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

  const handleCreateCommunity = (newComm: Community) => {
    playSentSound();
    // Новое сообщество ВСЕГДА создается ровно с 1 подписчиком (Владелец)
    const strictComm: Community = {
      ...newComm,
      subscribersCount: 1,
      subscribersUserIds: [currentUser.id]
    };
    setCommunities((prev) => [strictComm, ...prev]);
    setSelectedCommunity(strictComm);
  };

  const handleUpdateCommunity = (updated: Community) => {
    setCommunities((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedCommunity(updated);
  };

  const handlePublishCommunityPost = (communityId: string, postData: Partial<Post> & { caption?: string }) => {
    const targetComm = communities.find((c) => c.id === communityId);
    const cleanMedia = postData.mediaUrl?.trim() || '';
    const imagesList = postData.images && postData.images.length > 0
      ? postData.images
      : cleanMedia
      ? [cleanMedia]
      : [];
    const newPost: Post = {
      id: 'post_comm_' + Date.now(),
      userId: postData.userId || (targetComm ? targetComm.id : currentUser.id),
      userName: postData.userName || targetComm?.title || currentUser.displayName,
      userAvatar: postData.userAvatar || targetComm?.avatarUrl || currentUser.avatarUrl,
      type: postData.type || 'post',
      mediaUrl: cleanMedia || imagesList[0] || '',
      images: imagesList,
      mediaType: postData.mediaType || (postData.mediaType === 'video' ? 'video' : imagesList.length > 0 ? 'image' : 'text'),
      caption: (postData.caption ?? '').trim(),
      communityId: communityId,
      communityTitle: targetComm?.title,
      music: postData.music,
      poll: postData.poll,
      attachedFile: postData.attachedFile,
      likesCount: 0,
      isLiked: false,
      viewsCount: 0,
      commentsCount: 0,
      comments: [],
      createdAt: new Date().toISOString()
    };

    setPosts((prev) => [newPost, ...prev]);
    setCommunities((prev) =>
      prev.map((c) => (c.id === communityId ? { ...c, postsCount: c.postsCount + 1 } : c))
    );
    if (selectedCommunity && selectedCommunity.id === communityId) {
      setSelectedCommunity((prev) => (prev ? { ...prev, postsCount: prev.postsCount + 1 } : null));
    }
  };

  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isCallHistoryOpen, setIsCallHistoryOpen] = useState(false);
  const [isStartCallOpen, setIsStartCallOpen] = useState(false);
  const [isInstallAppOpen, setIsInstallAppOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [globalSearchInitialQuery, setGlobalSearchInitialQuery] = useState('');
  const [activeCallSession, setActiveCallSession] = useState<CallSession | null>(null);
  const [userCallsMap, setUserCallsMap] = useState<Record<string, CallRecord[]>>(() => {
    try {
      const saved = localStorage.getItem('aurachat_userCallsMap_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        const cleaned: Record<string, CallRecord[]> = {};
        for (const uid of Object.keys(parsed)) {
          cleaned[uid] = (parsed[uid] || []).filter(
            (c: CallRecord) => c.id !== 'call_1' && c.id !== 'call_2' && c.id !== 'call_3' && !c.isMissed
          );
        }
        return cleaned;
      }
    } catch (e) {}
    return {};
  });
  const [calls, setCalls] = useState<CallRecord[]>(() => {
    try {
      localStorage.removeItem('aurachat_calls_v2');
      const savedUserRaw = localStorage.getItem('aurachat_currentUser');
      const activeUid = savedUserRaw ? JSON.parse(savedUserRaw).id : initialCurrentUser.id;
      const savedMapRaw = localStorage.getItem('aurachat_userCallsMap_v3');
      if (savedMapRaw) {
        const parsedMap = JSON.parse(savedMapRaw);
        const list: CallRecord[] = parsedMap[activeUid] || [];
        return list.filter(
          (c) => c.id !== 'call_1' && c.id !== 'call_2' && c.id !== 'call_3' && !c.isMissed
        );
      }
    } catch (e) {}
    return initialCallRecords;
  });

  // Immediately clear any leftover missed call badge from previous sessions
  useEffect(() => {
    setCalls((prev) =>
      prev.filter((c) => c.id !== 'call_1' && c.id !== 'call_2' && c.id !== 'call_3' && !c.isMissed)
    );
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('aurachat_communities_v2', JSON.stringify(communities));
    } catch (e) {}
  }, [communities]);

  useEffect(() => {
    try {
      setUserCallsMap((prev) => {
        const next = { ...prev, [currentUser.id]: calls };
        localStorage.setItem('aurachat_userCallsMap_v3', JSON.stringify(next));
        return next;
      });
    } catch (e) {}
  }, [calls, currentUser.id]);

  // Quota exceeded listener
  useEffect(() => {
    const unsub = subscribeToQuotaExceeded((exceeded) => {
      setIsQuotaExceededState(exceeded);
    });
    return () => unsub();
  }, []);

  // Real-time Cloud Firestore Sync (when online, syncs accounts, chats, channels, communities, posts, reels, stories, messages)
  useEffect(() => {
    const unsub = subscribeToCloudPlatformState((data) => {
      isIncomingCloudUpdateRef.current = true;
      const cloudAccounts = data.savedAccounts;
      if (Array.isArray(cloudAccounts) && cloudAccounts.length > 0) {
        setSavedAccounts((prev) => {
          const map = new Map(prev.map((u) => [u.id, u]));
          cloudAccounts.forEach((u: User) => map.set(u.id, u));
          return Array.from(map.values());
        });
      }
      const cloudChats = data.globalCatalogChats;
      if (Array.isArray(cloudChats) && cloudChats.length > 0) {
        setGlobalCatalogChats((prev) => {
          const map = new Map(prev.map((c) => [c.id, c]));
          cloudChats.forEach((c: Chat) => map.set(c.id, c));
          return Array.from(map.values());
        });
      }
      const cloudCommunities = data.communities;
      if (Array.isArray(cloudCommunities) && cloudCommunities.length > 0) {
        setCommunities((prev) => {
          const map = new Map(prev.map((c) => [c.id, c]));
          cloudCommunities.forEach((c: Community) => map.set(c.id, c));
          return Array.from(map.values());
        });
      }
      const cloudPosts = data.posts;
      if (Array.isArray(cloudPosts) && cloudPosts.length > 0) {
        setPosts((prev) => {
          const map = new Map(prev.map((p) => [p.id, p]));
          cloudPosts.forEach((p: Post) =>
            map.set(p.id, {
              ...p,
              createdAt: normalizeCreatedAtIso(p.createdAt, p.id)
            })
          );
          return Array.from(map.values());
        });
      }
      const cloudReels = data.reels;
      if (Array.isArray(cloudReels) && cloudReels.length > 0) {
        setReels((prev) => {
          const map = new Map(prev.map((r) => [r.id, r]));
          cloudReels.forEach((r: Post) =>
            map.set(r.id, {
              ...r,
              createdAt: normalizeCreatedAtIso(r.createdAt, r.id)
            })
          );
          return Array.from(map.values());
        });
      }
      const cloudStories = data.stories;
      if (Array.isArray(cloudStories) && cloudStories.length > 0) {
        setStories((prev) => {
          const map = new Map(prev.map((s) => [s.id, s]));
          cloudStories.forEach((s: Story) => map.set(s.id, s));
          return Array.from(map.values());
        });
      }
      const cloudMessagesMap = data.messagesMap;
      if (cloudMessagesMap && typeof cloudMessagesMap === 'object') {
        setMessagesMap((prev) => {
          const updated = { ...prev };
          let changed = false;
          Object.keys(cloudMessagesMap).forEach((chatId) => {
            const remoteMsgs = cloudMessagesMap[chatId];
            if (Array.isArray(remoteMsgs) && remoteMsgs.length > 0) {
              const existingMsgs = updated[chatId] || [];
              const map = new Map(existingMsgs.map((m) => [m.id, m]));
              remoteMsgs.forEach((m: Message) => {
                if (!m || !m.id) return;
                const prevItem = map.get(m.id);
                if (!prevItem || (prevItem.status !== 'read' && m.status === 'read')) {
                  map.set(m.id, prevItem ? { ...prevItem, ...m, status: m.status } : m);
                  changed = true;
                }
              });
              const merged = Array.from(map.values());
              if (merged.length !== existingMsgs.length || changed) {
                updated[chatId] = merged;
                changed = true;
              }
            }
          });
          return changed ? updated : prev;
        });
      }
      setTimeout(() => {
        isIncomingCloudUpdateRef.current = false;
      }, 4000);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isIncomingCloudUpdateRef.current || isFirestoreQuotaExceeded()) {
      return;
    }
    const timer = setTimeout(() => {
      if (isIncomingCloudUpdateRef.current || isFirestoreQuotaExceeded()) return;
      savePlatformStateToCloud({
        savedAccounts,
        userChatsMap,
        globalCatalogChats,
        messagesMap,
        communities,
        stories,
        posts,
        reels,
        callsMap: userCallsMap
      });
    }, 8000);
    return () => clearTimeout(timer);
  }, [savedAccounts, userChatsMap, globalCatalogChats, messagesMap, communities, stories, posts, reels, userCallsMap]);

  // Real-time Cloud Signaling listener: Phone <-> Computer calls ringing across devices and accounts
  useEffect(() => {
    const unsub = subscribeToCallSignalsFromCloud((signal) => {
      if (!signal || !signal.timestamp || Date.now() - signal.timestamp > 120000) return;

      if (signal.type === 'CALL_OFFER') {
        // Do not ring caller's own device as incoming call
        if (signal.callerId && signal.callerId === currentUser.id) return;

        // Check if target user matches currentUser (by ID, username, or display name)
        const isTargetMe =
          (signal.targetUserId && signal.targetUserId === currentUser.id) ||
          (signal.targetUsername && signal.targetUsername.toLowerCase() === currentUser.username.toLowerCase()) ||
          (signal.targetName && (
            signal.targetName.toLowerCase() === currentUser.displayName.toLowerCase() ||
            currentUser.displayName.toLowerCase().includes(signal.targetName.toLowerCase()) ||
            signal.targetName.toLowerCase().includes(currentUser.displayName.toLowerCase())
          )) ||
          (!signal.targetUserId && !signal.targetUsername); // Generic call

        if (isTargetMe) {
          setActiveCallSession((prev) => {
            if (prev) return prev;
            return {
              direction: 'incoming',
              contactName: signal.callerName || signal.callerUsername || 'Входящий звонок AuraChat',
              avatarUrl: signal.callerAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Subscriber&backgroundColor=182533',
              isVideo: Boolean(signal.isVideo),
              callId: signal.callId,
              callerUserId: signal.callerId,
              callerUsername: signal.callerUsername
            };
          });
        }
      } else if (signal.type === 'CALL_ENDED' || signal.type === 'CALL_CANCELLED') {
        setActiveCallSession((prev) => {
          if (prev && prev.callId === signal.callId) return null;
          return prev;
        });
      }
    });

    return () => unsub();
  }, [currentUser]);

  // Cross-tab signaling: when another subscriber calls from another tab, trigger real incoming call
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('applet_webrtc_call_sync');

    channel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'CALL_OFFER') {
        setActiveCallSession((prev) => {
          if (prev) return prev;
          return {
            direction: 'incoming',
            contactName: data.contactName || 'Входящий звонок AuraChat',
            avatarUrl: data.avatarUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Subscriber&backgroundColor=182533',
            isVideo: Boolean(data.isVideo),
            callId: data.callId
          };
        });
      }

      if (data.type === 'CALL_END') {
        setActiveCallSession(null);
      }
    };

    // Live cross-tab messenger sync: messages sent in one tab (e.g. manager) sync to other tab (user)
    const msgChannel = new BroadcastChannel('aurachat_live_messages_sync');
    msgChannel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'DELETE_CHAT_FOR_BOTH' && data.chatId) {
        setMessagesMap((prev) => {
          const copy = { ...prev };
          delete copy[data.chatId];
          return copy;
        });
        setChats((prev) => {
          const remaining = prev.filter((c) => c.id !== data.chatId);
          setSelectedChat((current) => (current.id === data.chatId ? remaining[0] || initialChats[0] : current));
          return remaining;
        });
        return;
      }

      if (data.type === 'CLEAR_CHAT_HISTORY' && data.chatId) {
        setMessagesMap((prev) => ({
          ...prev,
          [data.chatId]: []
        }));
        return;
      }

      if (data.type === 'NEW_POST' && data.post) {
        setPosts((prev) => (prev.some((p) => p.id === data.post.id) ? prev : [data.post, ...prev]));
        return;
      }

      if (data.type === 'NEW_REEL' && data.reel) {
        setReels((prev) => (prev.some((r) => r.id === data.reel.id) ? prev : [data.reel, ...prev]));
        return;
      }

      if (data.type === 'POST_LIKE_TOGGLE' && data.postId) {
        setPosts((prev) =>
          prev.map((p) => (p.id === data.postId ? { ...p, likesCount: data.likesCount ?? p.likesCount } : p))
        );
        setReels((prev) =>
          prev.map((r) => (r.id === data.postId ? { ...r, likesCount: data.likesCount ?? r.likesCount } : r))
        );
        return;
      }

      if (data.type === 'NEW_POST_COMMENT' && data.postId && data.comment) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === data.postId
              ? {
                  ...p,
                  commentsCount: p.commentsCount + 1,
                  comments: p.comments.some((c) => c.id === data.comment.id)
                    ? p.comments
                    : [...p.comments, data.comment]
                }
              : p
          )
        );
        setReels((prev) =>
          prev.map((r) =>
            r.id === data.postId
              ? {
                  ...r,
                  commentsCount: r.commentsCount + 1,
                  comments: r.comments.some((c) => c.id === data.comment.id)
                    ? r.comments
                    : [...r.comments, data.comment]
                }
              : r
          )
        );
        return;
      }

      if (data.type === 'DELETE_POST_COMMENT' && data.postId && data.commentId) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === data.postId
              ? {
                  ...p,
                  commentsCount: Math.max(0, p.commentsCount - 1),
                  comments: p.comments.filter((c) => c.id !== data.commentId)
                }
              : p
          )
        );
        setReels((prev) =>
          prev.map((r) =>
            r.id === data.postId
              ? {
                  ...r,
                  commentsCount: Math.max(0, r.commentsCount - 1),
                  comments: r.comments.filter((c) => c.id !== data.commentId)
                }
              : r
          )
        );
        return;
      }

      if (data.type === 'NEW_STORY' && data.story) {
        setStories((prev) => (prev.some((s) => s.id === data.story.id) ? prev : [data.story, ...prev]));
        return;
      }

      if (data.type === 'NEW_GLOBAL_CHAT' && data.chat) {
        setGlobalCatalogChats((prev) =>
          prev.some((c) => c.id === data.chat.id) ? prev : [data.chat, ...prev]
        );
        return;
      }

      if (data.type === 'USER_PRESENCE_UPDATE' && data.user) {
        const updatedPeer: User = data.user;
        setSavedAccounts((prev) => {
          const exists = prev.some((u) => u.id === updatedPeer.id);
          if (!exists) return [...prev, updatedPeer];
          return prev.map((u) => (u.id === updatedPeer.id ? { ...u, ...updatedPeer } : u));
        });
        if (updatedPeer.id === currentUser.id) {
          setCurrentUser((prev) => ({ ...prev, ...updatedPeer }));
        }
        return;
      }

      if (data.type === 'CHAT_READ_AND_ONLINE' && data.chatId) {
        if (data.readerId && data.readerId !== currentUser.id) {
          setOnlinePeerMap((prev) => ({
            ...prev,
            [data.chatId]: data.timestamp || Date.now()
          }));
          setMessagesMap((prev) => {
            const list = prev[data.chatId] || [];
            if (!list.some((m) => m.senderId === currentUser.id && m.status !== 'read')) {
              return prev;
            }
            return {
              ...prev,
              [data.chatId]: list.map((m) =>
                m.senderId === currentUser.id ? { ...m, status: 'read' } : m
              )
            };
          });
        }
        return;
      }

      if (data.type !== 'NEW_CHAT_MESSAGE' || !data.message) return;

      const incomingMsg: Message = data.message;
      const isFromOthers = incomingMsg.senderId !== currentUser.id;
      const isCurrentlyOpen = selectedChat.id === data.chatId;

      if (isFromOthers) {
        setOnlinePeerMap((prev) => ({
          ...prev,
          [data.chatId]: Date.now()
        }));
      }

      setMessagesMap((prev) => {
        const list = prev[data.chatId] || [];
        if (list.some((m) => m.id === incomingMsg.id)) return prev;
        const msgToStore: Message = isCurrentlyOpen && isFromOthers
          ? { ...incomingMsg, status: 'read' }
          : incomingMsg;
        return {
          ...prev,
          [data.chatId]: [...list, msgToStore]
        };
      });

      if (isCurrentlyOpen && isFromOthers) {
        try {
          const readCh = new BroadcastChannel('aurachat_live_messages_sync');
          readCh.postMessage({
            type: 'CHAT_READ_AND_ONLINE',
            chatId: data.chatId,
            readerId: currentUser.id,
            timestamp: Date.now()
          });
          readCh.close();
        } catch {}
      }

      setChats((prev) => {
        const exists = prev.some((c) => c.id === data.chatId);
        if (exists) {
          return prev.map((c) => {
            if (c.id !== data.chatId) return c;
            const nextUnread = isFromOthers && !isCurrentlyOpen ? (c.unreadCount || 0) + 1 : 0;
            return {
              ...c,
              lastMessage: incomingMsg.content || 'Сообщение',
              lastMessageTime: formatSmartTime(incomingMsg.createdAt || new Date()),
              unreadCount: nextUnread
            };
          });
        }
        const sender = data.senderUser;
        const newChat: Chat = {
          id: data.chatId,
          type: 'direct',
          title: sender ? sender.displayName : incomingMsg.senderName,
          avatarUrl: sender ? sender.avatarUrl : incomingMsg.senderAvatar,
          isPrivate: true,
          lastMessage: incomingMsg.content || 'Сообщение',
          lastMessageTime: formatSmartTime(incomingMsg.createdAt || new Date()),
          unreadCount: isFromOthers && !isCurrentlyOpen ? 1 : 0,
          membersCount: 2,
          members: [
            {
              userId: incomingMsg.senderId,
              displayName: sender ? sender.displayName : incomingMsg.senderName,
              username: sender ? sender.username : incomingMsg.senderName,
              avatarUrl: sender ? sender.avatarUrl : incomingMsg.senderAvatar,
              role: 'owner'
            }
          ]
        };
        return [newChat, ...prev];
      });

      // Play soft notification sound
      if (isFromOthers) {
        playNotificationSound(incomingMsg.senderName, incomingMsg.content);
      }
    };

    return () => {
      channel.close();
      msgChannel.close();
    };
  }, [currentUser.id, selectedChat.id]);

  // When user enters / selects a chat:
  // 1) Immediately clear unread counter (unreadCount: 0) so the badge disappears
  // 2) Mark incoming messages in this chat as read ('read')
  // 3) Notify sender via BroadcastChannel that we entered the chat and read the messages (2 checkmarks + online)
  useEffect(() => {
    if (!selectedChat?.id) return;
    const activeId = selectedChat.id;

    setChats((prev) => {
      const target = prev.find((c) => c.id === activeId);
      if (!target || !target.unreadCount) return prev;
      return prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c));
    });

    setMessagesMap((prev) => {
      const list = prev[activeId] || [];
      const hasUnreadFromOthers = list.some((m) => m.senderId !== currentUser.id && m.status !== 'read');
      if (!hasUnreadFromOthers) return prev;
      return {
        ...prev,
        [activeId]: list.map((m) =>
          m.senderId !== currentUser.id ? { ...m, status: 'read' } : m
        )
      };
    });

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('aurachat_live_messages_sync');
        ch.postMessage({
          type: 'CHAT_READ_AND_ONLINE',
          chatId: activeId,
          readerId: currentUser.id,
          timestamp: Date.now()
        });
        ch.close();
      }
    } catch {}
  }, [selectedChat.id, currentUser.id]);

  // User Follow / Subscription State
  const [followingUserIds, setFollowingUserIds] = useState<Record<string, boolean>>({
    'u_durov': true,
    'u_anna': true
  });
  const [selectedOtherUser, setSelectedOtherUser] = useState<ViewTargetUser | null>(null);

  const handleOpenUserProfile = (user: ViewTargetUser) => {
    setSelectedOtherUser(user);
    setActiveScreen('profile');
  };

  const handleToggleFollow = (userId: string) => {
    setFollowingUserIds((prev) => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleStartChatWithUser = (user: ViewTargetUser) => {
    setSelectedCommunity(null);
    setSelectedOtherUser(null);
    if (user.id === currentUser.id) {
      const savedChat = chats.find((c) => c.type === 'saved') || chats[0];
      setSelectedChat({ ...savedChat, unreadCount: 0 });
      setIsMobileChatOpen(true);
      setActiveScreen('chats');
      return;
    }
    let targetChat = chats.find(c => c.type === 'direct' && c.members.some(m => m.userId === user.id || m.username === user.username));
    if (!targetChat) {
      targetChat = {
        id: 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        type: 'direct',
        title: user.name,
        avatarUrl: user.avatar,
        isPrivate: true,
        unreadCount: 0,
        membersCount: 2,
        members: [
          { userId: currentUser.id, displayName: currentUser.displayName, username: currentUser.username, avatarUrl: currentUser.avatarUrl, role: 'owner' },
          { userId: user.id, displayName: user.name, username: user.username, avatarUrl: user.avatar, role: 'member' }
        ]
      };
      setChats((prev) => [targetChat!, ...prev]);
    }
    setSelectedChat({ ...targetChat, unreadCount: 0 });
    setIsMobileChatOpen(true);
    setActiveScreen('chats');
  };

  // Open Community Chat: clicking "Сообщение" in a community navigates to the community chat where you talk with the owner of that community
  const handleOpenCommunityChat = (comm: Community) => {
    playSentSound();
    setSelectedCommunity(null);
    setSelectedOtherUser(null);

    const ownerMod = comm.moderators.find((m) => m.userId === comm.ownerId || m.role === 'owner');
    const ownerName = comm.ownerName || ownerMod?.displayName || currentUser.displayName;
    const ownerUsername = comm.ownerUsername || ownerMod?.username || 'owner';
    const ownerAvatar = comm.ownerAvatar || ownerMod?.avatarUrl || comm.avatarUrl;
    const commChatId = 'chat_comm_' + comm.id;

    let targetChat = chats.find((c) => c.id === commChatId);
    if (!targetChat) {
      targetChat = {
        id: commChatId,
        type: 'direct',
        title: `Сообщения «${comm.title}» (Владелец: ${ownerName})`,
        description: `Чат сообщества «${comm.title}» — вы общаетесь напрямую с владельцем этого сообщества (${ownerName}).`,
        avatarUrl: comm.avatarUrl,
        isPrivate: true,
        membersCount: 2,
        lastMessage: `Диалог с владельцем сообщества (${ownerName})`,
        lastMessageTime: 'Только что',
        unreadCount: 0,
        members: [
          {
            userId: comm.ownerId,
            displayName: `${ownerName} (Владелец «${comm.title}»)`,
            username: ownerUsername,
            avatarUrl: ownerAvatar,
            role: 'owner',
            customTitle: 'Владелец сообщества'
          },
          {
            userId: currentUser.id,
            displayName: currentUser.displayName,
            username: currentUser.username,
            avatarUrl: currentUser.avatarUrl,
            role: 'member'
          }
        ]
      };
      setChats((prev) => [targetChat!, ...prev]);
    }

    setMessagesMap((prev) => {
      if (prev[commChatId] && prev[commChatId].length > 0) return prev;
      return {
        ...prev,
        [commChatId]: [
          {
            id: 'msg_comm_welcome_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            chatId: commChatId,
            senderId: comm.ownerId,
            senderName: `${ownerName} (Владелец «${comm.title}»)`,
            senderAvatar: ownerAvatar,
            type: 'text',
            content: `👋 Здравствуйте! Вы перешли в чат сообщества «${comm.title}». Здесь вы общаетесь напрямую с владельцем этого сообщества (${ownerName}). Напишите ваш вопрос или предложение!`,
            createdAt: new Date().toISOString(),
            status: 'read'
          }
        ]
      };
    });

    setSelectedChat({ ...targetChat, unreadCount: 0 });
    setIsMobileChatOpen(true);
    setActiveScreen('chats');
  };

  const missedCallsCount = calls.filter((c) => c.isMissed).length;

  // Send message handler (Supports text, voice memos, video notes, photos, music/audio)
  const handleSendMessage = (
    type: 'text' | 'voice' | 'video_note' | 'image' | 'audio' | 'file',
    content: string = '',
    mediaUrl?: string,
    meta?: any,
    senderOverride?: { id: string; name: string; avatar: string }
  ) => {
    const activeChatId = selectedChat.id;
    const isPeerCurrentlyOnline = Boolean(
      onlinePeerMap[activeChatId] && Date.now() - onlinePeerMap[activeChatId] < 120000
    );
    const uniqueMsgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const newMsg: Message = {
      id: uniqueMsgId,
      chatId: activeChatId,
      senderId: senderOverride ? senderOverride.id : currentUser.id,
      senderName: senderOverride ? senderOverride.name : currentUser.displayName,
      senderAvatar: senderOverride ? senderOverride.avatar : currentUser.avatarUrl,
      type: type,
      content: content || (type === 'voice' ? 'Голосовое сообщение' : 'Круглое видеосообщение'),
      mediaUrl: mediaUrl,
      mediaMeta: meta,
      createdAt: new Date().toISOString(),
      // 1 checkmark ('sent') until recipient enters the chat; 2 checkmarks ('read') if in Saved Messages or peer is actively in chat
      status: senderOverride || selectedChat.type === 'saved' || isPeerCurrentlyOnline ? 'read' : 'sent'
    };

    if (senderOverride) {
      // Interlocutor entered chat and replied -> mark interlocutor online and mark previous outgoing messages as read (2 checkmarks)
      setOnlinePeerMap((prev) => ({
        ...prev,
        [activeChatId]: Date.now()
      }));
    }

    setMessagesMap((prev) => {
      const chatMsgs = prev[activeChatId] || [];
      if (chatMsgs.some((m) => m.id === newMsg.id)) return prev;
      const updatedExisting = senderOverride
        ? chatMsgs.map((m) => (m.senderId === currentUser.id ? { ...m, status: 'read' as const } : m))
        : chatMsgs;
      return {
        ...prev,
        [activeChatId]: [...updatedExisting, newMsg]
      };
    });

    // Update last message in chat preview & keep unreadCount at 0 for active chat
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              lastMessage: type === 'video_note' ? '📹 Кружочек' : type === 'voice' ? '🎤 Голосовое сообщение' : content,
              lastMessageTime: new Date().toISOString(),
              unreadCount: 0
            }
          : c
      )
    );

    // Broadcast live message to other tabs/windows so real managers/users chat across tabs
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const msgChannel = new BroadcastChannel('aurachat_live_messages_sync');
        msgChannel.postMessage({
          type: 'NEW_CHAT_MESSAGE',
          chatId: activeChatId,
          message: newMsg,
          senderUser: currentUser
        });
        msgChannel.close();
      }
    } catch {}
  };

  const handleAddStory = (newStory: Story) => {
    setStories((prev) => [newStory, ...prev]);
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('aurachat_live_messages_sync');
        ch.postMessage({ type: 'NEW_STORY', story: newStory });
        ch.close();
      }
    } catch {}
  };

  const handleUpdateUser = (updated: Partial<User>) => {
    setCurrentUser((prev) => {
      const next = { ...prev, ...updated };
      setSavedAccounts((accs) => {
        const exists = accs.some((a) => a.id === prev.id);
        return exists ? accs.map((a) => (a.id === prev.id ? next : a)) : [...accs, next];
      });
      broadcastUserPresence(next);
      return next;
    });
  };

  // Automatic Social Network Enter / Exit Status Lifecycle:
  // - When user enters / focuses the social network -> automatically becomes "в сети" (even if previously "был в сети недавно" or "был только что в сети")
  // - When user exits / hides the social network -> automatically becomes "был(а) только что в сети", then transitions to "был(а) 1 мин назад" -> "был(а) в сети недавно"
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id) return;

    const markUserEnteredOnline = () => {
      setCurrentUser((prev) => {
        const mode = (prev.settings as any)?.presenceMode || 'auto';
        if (mode === 'manual' || prev.hideOnlineStatus) return prev;
        if (prev.isOnline === true && prev.lastSeen === 'в сети' && !(prev.settings as any)?.offlineAt) {
          return prev;
        }
        const enteredUser: User = {
          ...prev,
          isOnline: true,
          lastSeen: 'в сети',
          settings: {
            ...prev.settings,
            presenceMode: 'auto',
            offlineAt: undefined
          } as any
        };
        setSavedAccounts((accs) =>
          accs.map((a) => (a.id === enteredUser.id ? enteredUser : a))
        );
        broadcastUserPresence(enteredUser);
        return enteredUser;
      });
    };

    const markUserExitedOffline = () => {
      setCurrentUser((prev) => {
        const mode = (prev.settings as any)?.presenceMode || 'auto';
        if (mode === 'manual' || prev.hideOnlineStatus) return prev;
        const nowMs = Date.now();
        const exitedUser: User = {
          ...prev,
          isOnline: false,
          lastSeen: 'был(а) только что в сети',
          settings: {
            ...prev.settings,
            presenceMode: 'auto',
            offlineAt: nowMs
          } as any
        };
        setSavedAccounts((accs) => {
          const nextAccs = accs.map((a) => (a.id === exitedUser.id ? exitedUser : a));
          try {
            localStorage.setItem('aurachat_savedAccounts_v3', JSON.stringify(nextAccs));
            localStorage.setItem('aurachat_currentUser_v3', JSON.stringify(exitedUser));
          } catch {}
          return nextAccs;
        });
        broadcastUserPresence(exitedUser);
        return exitedUser;
      });
    };

    // Immediately upon entering the social network while logged in -> ensure status is "в сети"
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      markUserEnteredOnline();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markUserEnteredOnline();
      } else {
        markUserExitedOffline();
      }
    };

    const handleWindowFocus = () => markUserEnteredOnline();
    const handlePageHide = () => markUserExitedOffline();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    // Every 30 seconds, age offline accounts from "был(а) только что в сети" -> "был(а) 1 мин назад" -> "был(а) в сети недавно"
    const agingTimer = setInterval(() => {
      setSavedAccounts((prevAccs) =>
        prevAccs.map((acc) => {
          if (acc.id === currentUser.id && document.visibilityState === 'visible') return acc;
          const mode = (acc.settings as any)?.presenceMode || 'auto';
          const offlineAt = (acc.settings as any)?.offlineAt;
          if (mode === 'manual' || acc.hideOnlineStatus || acc.isOnline || !offlineAt) return acc;
          const diffSec = Math.floor((Date.now() - offlineAt) / 1000);
          const diffMin = Math.floor(diffSec / 60);
          const nextLastSeen =
            diffSec < 90
              ? 'был(а) только что в сети'
              : diffMin <= 5
                ? `был(а) ${diffMin} мин назад`
                : 'был(а) в сети недавно';
          if (acc.lastSeen === nextLastSeen) return acc;
          return { ...acc, lastSeen: nextLastSeen };
        })
      );
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      clearInterval(agingTimer);
    };
  }, [isLoggedIn, currentUser.id]);

  // Studio Publish Handlers
  const handlePublishReel = (rawReel: Post) => {
    const formattedReel: Post = {
      ...rawReel,
      userId: rawReel.userId || currentUser.id,
      userName: rawReel.userName || currentUser.displayName,
      userAvatar: rawReel.userAvatar || currentUser.avatarUrl,
      createdAt: normalizeCreatedAtIso(rawReel.createdAt, rawReel.id),
      viewsCount: rawReel.viewsCount ?? 1
    };

    setReels((prev) => [formattedReel, ...prev]);

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('aurachat_live_messages_sync');
        ch.postMessage({ type: 'NEW_REEL', reel: formattedReel });
        ch.close();
      }
    } catch {}

    if (!isFirestoreQuotaExceeded()) {
      savePlatformStateToCloud({
        savedAccounts,
        userChatsMap,
        globalCatalogChats,
        messagesMap,
        communities,
        stories,
        posts,
        reels: [formattedReel, ...reels],
        callsMap: userCallsMap
      });
    }

    setActiveScreen('reels');
  };

  const handlePublishPost = (rawPost: Post) => {
    const formattedPost: Post = {
      ...rawPost,
      userId: rawPost.userId || currentUser.id,
      userName: rawPost.userName || currentUser.displayName,
      userAvatar: rawPost.userAvatar || currentUser.avatarUrl,
      createdAt: normalizeCreatedAtIso(rawPost.createdAt, rawPost.id),
      viewsCount: rawPost.viewsCount ?? 1
    };

    setPosts((prev) => [formattedPost, ...prev]);

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('aurachat_live_messages_sync');
        ch.postMessage({ type: 'NEW_POST', post: formattedPost });
        ch.close();
      }
    } catch {}

    if (!isFirestoreQuotaExceeded()) {
      savePlatformStateToCloud({
        savedAccounts,
        userChatsMap,
        globalCatalogChats,
        messagesMap,
        communities,
        stories,
        posts: [formattedPost, ...posts],
        reels,
        callsMap: userCallsMap
      });
    }

    setActiveScreen('posts');
  };

  const handlePublishStory = (newStory: Story) => {
    setStories((prev) => [newStory, ...prev]);
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('aurachat_live_messages_sync');
        ch.postMessage({ type: 'NEW_STORY', story: newStory });
        ch.close();
      }
    } catch {}
  };

  // Create Group / Channel handler
  const handleCreateChat = (newChat: Chat) => {
    setChats((prev) => {
      const updated = [newChat, ...prev];
      setUserChatsMap((m) => ({ ...m, [currentUser.id]: updated }));
      return updated;
    });
    if (newChat.type === 'channel' || newChat.type === 'group') {
      setGlobalCatalogChats((prev) =>
        prev.some((c) => c.id === newChat.id) ? prev : [newChat, ...prev]
      );
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const ch = new BroadcastChannel('aurachat_live_messages_sync');
          ch.postMessage({ type: 'NEW_GLOBAL_CHAT', chat: newChat });
          ch.close();
        }
      } catch {}
    }
    setSelectedChat(newChat);
    setIsMobileChatOpen(true);
    setActiveScreen('chats');
  };

  // Update Chat handler (for Channel/Group Admins, Permissions, Ownership Transfer, Blacklist)
  const handleUpdateChat = (updatedChat: Chat) => {
    setChats((prev) => {
      const updated = prev.map((c) => (c.id === updatedChat.id ? updatedChat : c));
      setUserChatsMap((m) => ({ ...m, [currentUser.id]: updated }));
      return updated;
    });
    setSelectedChat((prev) => (prev.id === updatedChat.id ? updatedChat : prev));
  };

  // Submit Join Request (Guest joins via invite link or QR code)
  const handleRequestJoin = (chatId: string, guestUser: { userName: string; username: string; avatarUrl: string }) => {
    const newReq = {
      id: 'req_' + Date.now(),
      userId: 'usr_guest_' + Date.now(),
      userName: guestUser.userName,
      username: guestUser.username,
      userAvatar: guestUser.avatarUrl,
      requestedAt: 'Только что'
    };

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const reqs = [...(c.joinRequests || []), newReq];
          return { ...c, joinRequests: reqs };
        }
        return c;
      })
    );

    setSelectedChat((prev) => {
      if (prev.id === chatId) {
        return {
          ...prev,
          joinRequests: [...(prev.joinRequests || []), newReq]
        };
      }
      return prev;
    });
  };

  // Approve Join Request (Owner or Moderator adds member to chat)
  const handleApproveRequest = (chatId: string, req: any) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const updatedReqs = (c.joinRequests || []).filter((r) => r.id !== req.id);
          const newMember = {
            userId: req.userId,
            displayName: req.userName,
            username: req.username,
            avatarUrl: req.userAvatar,
            role: 'member' as const
          };
          return {
            ...c,
            joinRequests: updatedReqs,
            members: [...c.members, newMember],
            membersCount: c.membersCount + 1
          };
        }
        return c;
      })
    );

    setSelectedChat((prev) => {
      if (prev.id === chatId) {
        const updatedReqs = (prev.joinRequests || []).filter((r) => r.id !== req.id);
        const newMember = {
          userId: req.userId,
          displayName: req.userName,
          username: req.username,
          avatarUrl: req.userAvatar,
          role: 'member' as const
        };
        return {
          ...prev,
          joinRequests: updatedReqs,
          members: [...prev.members, newMember],
          membersCount: prev.membersCount + 1
        };
      }
      return prev;
    });

    // Send announcement to chat
    const sysMsg: Message = {
      id: 'msg_sys_join_' + Date.now(),
      chatId: chatId,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatarUrl,
      type: 'text',
      content: `🎉 ${req.userName} (@${req.username}) вступил(а) в группу по одобренной заявке.`,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read'
    };

    setMessagesMap((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), sysMsg]
    }));
  };

  // Decline Join Request
  const handleDeclineRequest = (chatId: string, reqId: string) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          return {
            ...c,
            joinRequests: (c.joinRequests || []).filter((r) => r.id !== reqId)
          };
        }
        return c;
      })
    );

    setSelectedChat((prev) => {
      if (prev.id === chatId) {
        return {
          ...prev,
          joinRequests: (prev.joinRequests || []).filter((r) => r.id !== reqId)
        };
      }
      return prev;
    });
  };

  // Create new topic handler (Enforces owner or admin role)
  const handleCreateTopic = (chatId: string, title: string, icon: string) => {
    const newTopic = {
      id: 'top_' + Date.now(),
      chatId: chatId,
      title: title,
      icon: icon,
      unreadCount: 0
    };

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const updatedTopics = [...(c.topics || []), newTopic];
          return { ...c, topics: updatedTopics };
        }
        return c;
      })
    );

    setSelectedChat((prev) => {
      if (prev.id === chatId) {
        return {
          ...prev,
          topics: [...(prev.topics || []), newTopic]
        };
      }
      return prev;
    });

    // Add a system announcement message into the new topic
    const sysMsg: Message = {
      id: 'msg_sys_' + Date.now(),
      chatId: chatId,
      topicId: newTopic.id,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatarUrl,
      type: 'text',
      content: `📌 Ветка «${icon} ${title}» создана администратором. Обсуждение открыто для участников.`,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read'
    };

    setMessagesMap((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), sysMsg]
    }));
  };

  // Add or toggle emoji reaction on message
  const handleAddReaction = (messageId: string, emoji: string) => {
    setMessagesMap((prev) => {
      const chatMsgs = prev[selectedChat.id] || [];
      const updated = chatMsgs.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = m.reactions ? [...m.reactions] : [];
        const existingIdx = currentReactions.findIndex((r) => r.emoji === emoji);

        if (existingIdx !== -1) {
          const item = currentReactions[existingIdx];
          if (item.userReacted) {
            if (item.count <= 1) {
              currentReactions.splice(existingIdx, 1);
            } else {
              currentReactions[existingIdx] = { ...item, count: item.count - 1, userReacted: false };
            }
          } else {
            currentReactions[existingIdx] = { ...item, count: item.count + 1, userReacted: true };
          }
        } else {
          currentReactions.push({ emoji, count: 1, userReacted: true });
        }
        return { ...m, reactions: currentReactions };
      });
      return { ...prev, [selectedChat.id]: updated };
    });
  };

  // Close Call and record in chat & call history
  const handleCloseCall = (durationSec?: number) => {
    if (activeCallSession) {
      const isCallAnswered = durationSec !== undefined && durationSec > 0;
      const msgText = isCallAnswered
        ? `📞 Звонок завершен (${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, '0')})`
        : activeCallSession.direction === 'incoming'
        ? '📞 Пропущенный входящий вызов'
        : '📞 Исходящий вызов завершен';
      handleSendMessage('text', msgText);

      // Record in Call History:
      // Green = Ты совершил звонок
      // Red = Ты пропустил звонок
      if (activeCallSession.direction === 'outgoing') {
        const newRecord: CallRecord = {
          id: 'call_' + Date.now(),
          contactName: activeCallSession.contactName,
          avatarUrl: activeCallSession.avatarUrl,
          direction: 'outgoing',
          status: 'completed',
          isVideo: activeCallSession.isVideo,
          durationSec: isCallAnswered ? durationSec : 45,
          timestamp: 'Только что',
          isMissed: false // ЗЕЛЁНАЯ: ты совершил звонок
        };
        setCalls((prev) => [newRecord, ...prev]);
      } else {
        // Incoming call
        if (isCallAnswered) {
          const newRecord: CallRecord = {
            id: 'call_' + Date.now(),
            contactName: activeCallSession.contactName,
            avatarUrl: activeCallSession.avatarUrl,
            direction: 'incoming',
            status: 'completed',
            isVideo: activeCallSession.isVideo,
            durationSec: durationSec,
            timestamp: 'Только что',
            isMissed: false
          };
          setCalls((prev) => [newRecord, ...prev]);
        } else {
          // Missed call
          const newRecord: CallRecord = {
            id: 'call_' + Date.now(),
            contactName: activeCallSession.contactName,
            avatarUrl: activeCallSession.avatarUrl,
            direction: 'incoming',
            status: 'missed',
            isVideo: activeCallSession.isVideo,
            durationSec: 0,
            timestamp: 'Только что',
            isMissed: true // КРАСНОЕ: ты пропустил звонок
          };
          setCalls((prev) => [newRecord, ...prev]);
        }
      }
    }
    setActiveCallSession(null);
  };

  // Leave Voicemail Handler ("автоответчик с приятным голосом, оставьте сообщение")
  const handleLeaveVoicemail = (contactName: string, durationSec: number, audioUrl?: string) => {
    const voiceBlobUrl = audioUrl || 'https://actions.google.com/sounds/v1/speech/voice_message.ogg';
    const vmMessage: Message = {
      id: 'vm_' + Date.now(),
      chatId: selectedChat.id,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatarUrl,
      type: 'voice',
      content: `🎙️ Сообщение на автоответчик для ${contactName}`,
      mediaUrl: voiceBlobUrl,
      durationSec: durationSec,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setMessagesMap((prev) => {
      const currentList = prev[selectedChat.id] || [];
      return {
        ...prev,
        [selectedChat.id]: [...currentList, vmMessage]
      };
    });

    setChats((prev) =>
      prev.map((c) =>
        c.id === selectedChat.id
          ? {
              ...c,
              lastMessage: `🎙️ Сообщение на автоответчик (${durationSec} с)`,
              lastMessageTime: 'Только что'
            }
          : c
      )
    );

    const newRecord: CallRecord = {
      id: 'call_' + Date.now(),
      contactName: contactName,
      avatarUrl: selectedChat.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=Voicemail',
      direction: 'outgoing',
      status: 'completed',
      isVideo: false,
      durationSec: durationSec,
      timestamp: 'Только что',
      isMissed: false
    };
    setCalls((prev) => [newRecord, ...prev]);
  };

  // Direct simulation of missed call (for checking user condition)
  const handleSimulateMissedCall = () => {
    const newMissed: CallRecord = {
      id: 'call_' + Date.now(),
      contactName: 'Павел Дуров',
      contactUsername: 'durov',
      avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
      direction: 'incoming',
      status: 'missed',
      isVideo: false,
      durationSec: 0,
      timestamp: 'Только что',
      isMissed: true // КРАСНОЕ: ты пропустил звонок
    };
    setCalls((prev) => [newMissed, ...prev]);
  };

  const handleMarkAllCallsAsRead = () => {
    setCalls((prev) => prev.map((c) => ({ ...c, isMissed: false })));
  };

  const handleClearCallsHistory = () => {
    setCalls([]);
  };

  const handleDeleteCall = (id: string) => {
    setCalls((prev) => prev.filter((c) => c.id !== id));
  };

  // Start Call with participant selection:
  // - If 1 participant selected -> Direct 1-on-1 call (NO group created)
  // - If >1 participants selected -> Group created automatically ("создается группа, если подключил собестников")
  const handleStartCallWithParticipants = (selectedContacts: ContactItem[], isVideo: boolean) => {
    if (!selectedContacts || selectedContacts.length === 0) return;

    if (selectedContacts.length === 1) {
      // Single contact: direct call, no group created
      const contact = selectedContacts[0];
      const callId = 'call_' + Date.now();
      setActiveCallSession({
        direction: 'outgoing',
        contactName: contact.displayName,
        avatarUrl: contact.avatarUrl,
        isVideo: isVideo,
        callId,
        targetUserId: contact.userId,
        targetUsername: contact.username
      });

      publishCallSignalToCloud({
        type: 'CALL_OFFER',
        callId,
        callerId: currentUser.id,
        callerName: currentUser.displayName,
        callerUsername: currentUser.username,
        callerAvatar: currentUser.avatarUrl,
        targetUserId: contact.userId,
        targetUsername: contact.username,
        targetName: contact.displayName,
        isVideo: Boolean(isVideo),
        timestamp: Date.now()
      });
    } else {
      // Multiple contacts: create group
      const names = selectedContacts.map((c) => c.displayName.split(' ')[0]).join(', ');
      const groupTitle = `📞 Звонок: ${names}`;
      const callId = 'call_' + Date.now();

      const newGroupChat: Chat = {
        id: 'chat_group_call_' + Date.now(),
        type: 'group',
        title: groupTitle,
        avatarUrl: selectedContacts[0].avatarUrl,
        isPrivate: true,
        inviteCode: 'call_grp_' + Date.now().toString(36),
        membersCount: selectedContacts.length + 1,
        lastMessage: `📞 Групповой ${isVideo ? 'видео' : 'аудио'}звонок начат`,
        lastMessageTime: 'Только что',
        unreadCount: 0,
        members: [
          {
            userId: currentUser.id,
            displayName: currentUser.displayName,
            username: currentUser.username,
            avatarUrl: currentUser.avatarUrl,
            role: 'owner'
          },
          ...selectedContacts.map((c) => ({
            userId: c.userId,
            displayName: c.displayName,
            username: c.username,
            avatarUrl: c.avatarUrl,
            role: 'member' as const
          }))
        ]
      };

      setChats((prev) => [newGroupChat, ...prev]);
      setSelectedChat(newGroupChat);

      setActiveCallSession({
        direction: 'outgoing',
        contactName: groupTitle,
        avatarUrl: selectedContacts[0].avatarUrl,
        isVideo: isVideo,
        callId
      });

      publishCallSignalToCloud({
        type: 'CALL_OFFER',
        callId,
        callerId: currentUser.id,
        callerName: currentUser.displayName,
        callerUsername: currentUser.username,
        callerAvatar: currentUser.avatarUrl,
        targetName: groupTitle,
        isVideo: Boolean(isVideo),
        timestamp: Date.now()
      });
    }
  };

  // Simulate Incoming Call from Pavel Durov or contact
  const handleSimulateIncomingCall = (fromName = 'Павел Дуров', isVideo = true) => {
    setActiveCallSession({
      direction: 'incoming',
      contactName: fromName,
      avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
      isVideo
    });
  };

  // Direct phone number outgoing call
  const handleStartCallToNumber = (phoneNumber: string, isVideo = false) => {
    setActiveCallSession({
      direction: 'outgoing',
      contactName: phoneNumber,
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(phoneNumber)}&backgroundColor=182533`,
      isVideo
    });
  };

  const handleAddCommunityGif = (newGif: CommunityGif) => {
    setCommunityGifs((prev) => [newGif, ...prev]);
  };

  // Share Reel video into a selected Chat
  const handleShareReelToChat = (chatId: string, reel: Post, customMsg?: string) => {
    const reelUrl = `${window.location.origin}/?reel=${reel.id}`;
    const mainMsg = customMsg 
      ? `🎬 ${customMsg}\n\n🎬 Рилс от @${reel.userName}: "${reel.caption}"\n🔗 ${reelUrl}`
      : `🎬 Смотри рилс от @${reel.userName}: "${reel.caption}"\n🔗 ${reelUrl}`;

    const newMsg: Message = {
      id: 'msg_share_' + Date.now(),
      chatId,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatarUrl,
      type: 'text',
      content: mainMsg,
      mediaUrl: reel.mediaUrl,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setMessagesMap((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg]
    }));

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              lastMessage: `🎬 Рилс от @${reel.userName}`,
              lastMessageTime: 'Только что'
            }
          : c
      )
    );
  };

  return (
    <div className="h-[100dvh] w-full max-w-[100vw] bg-[#141414] text-[#e1e3e6] flex flex-col overflow-hidden font-sans select-none pt-[env(safe-area-inset-top,0px)]">
      {/* Offline / Quota Notice Banner — Compact & Safe on Mobile */}
      {isQuotaExceededState && !isQuotaBannerDismissed && (
        <div className="bg-[#1f1a0e] border-b border-amber-600/40 text-amber-200 px-3 py-1.5 text-xs flex items-center justify-between gap-2 z-40 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 text-[11px] sm:text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
            <span className="truncate">
              AuraChat: локальный режим (квота облака исчерпана).
            </span>
            <a
              href="https://console.firebase.google.com/project/gen-lang-client-0852394880/firestore/databases/ai-studio-telegrammhybridm-0a97c053-a08d-487b-81be-fc2833f735e6/data?openUpgradeDialog=true"
              target="_blank"
              rel="noreferrer"
              className="text-[#71aaeb] hover:underline font-semibold shrink-0 inline-flex items-center gap-1 hidden xs:inline-flex"
            >
              Консоль <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={() => setIsQuotaBannerDismissed(true)}
            className="p-1 hover:bg-amber-800/40 rounded text-amber-300 hover:text-white shrink-0 cursor-pointer"
            title="Скрыть"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main AuraChat Body */}
      <div className="flex-1 min-h-0 min-w-0 w-full flex overflow-hidden">
        {/* Left Sidebar Menu */}
        <div className="hidden sm:flex flex-col justify-between py-3 px-2 bg-[#141414] border-r border-[#2e2e2e] w-16 lg:w-52 shrink-0 z-20">
          <div className="space-y-1 flex flex-col">
            {/* Brand Header: AuraChat */}
            <div
              onClick={() => setIsMainMenuOpen(true)}
              className="w-full px-2.5 py-2 mb-1 rounded-lg hover:bg-[#222222]/70 transition cursor-pointer flex items-center justify-center lg:justify-start gap-2.5"
              title="Меню AuraChat"
            >
              <div className="w-7 h-7 rounded-lg bg-[#0077FF] flex items-center justify-center text-white font-black text-xs tracking-tighter shrink-0 shadow-xs">
                AC
              </div>
              <span className="hidden lg:inline font-bold text-sm text-white tracking-tight truncate">
                AuraChat
              </span>
            </div>

            {/* Поиск (Люди, Сообщества, Каналы, Посты, Видео, Фото) */}
            <button
              onClick={() => {
                setGlobalSearchInitialQuery('');
                setIsGlobalSearchOpen(true);
              }}
              className="w-full px-2.5 py-2 rounded-lg transition cursor-pointer flex items-center justify-center lg:justify-start gap-3 text-xs font-medium text-[#e1e3e6] hover:bg-[#222222]/70"
              title="Глобальный поиск: профили людей, сообщества, каналы, посты, видео и фото"
            >
              <Search className="w-5 h-5 text-[#71aaeb] shrink-0" />
              <span className="hidden lg:inline truncate">Поиск</span>
            </button>

            {/* Моя страница */}
            <button
              onClick={() => {
                setSelectedOtherUser(null);
                setActiveScreen('profile');
              }}
              className={`w-full px-2.5 py-2 rounded-lg transition cursor-pointer flex items-center justify-center lg:justify-start gap-3 text-xs font-medium ${
                activeScreen === 'profile' && !selectedOtherUser
                  ? 'bg-[#222222] text-white font-semibold'
                  : 'text-[#e1e3e6] hover:bg-[#222222]/70'
              }`}
              title="Моя страница"
            >
              <UserIcon className="w-5 h-5 text-[#71aaeb] shrink-0" />
              <span className="hidden lg:inline truncate">Моя страница</span>
            </button>

            {/* Новости */}
            <button
              onClick={() => handleOpenPostsFeed('all')}
              className={`w-full px-2.5 py-2 rounded-lg transition cursor-pointer flex items-center justify-center lg:justify-start gap-3 text-xs font-medium ${
                activeScreen === 'posts' && postsInitialTab === 'all'
                  ? 'bg-[#222222] text-white font-semibold'
                  : 'text-[#e1e3e6] hover:bg-[#222222]/70'
              }`}
              title="Новости и лента"
            >
              <ImageIcon className="w-5 h-5 text-[#71aaeb] shrink-0" />
              <span className="hidden lg:inline truncate">Новости</span>
            </button>

            {/* Мессенджер */}
            <button
              onClick={() => setActiveScreen('chats')}
              className={`w-full px-2.5 py-2 rounded-lg transition cursor-pointer flex items-center justify-center lg:justify-start gap-3 text-xs font-medium ${
                activeScreen === 'chats'
                  ? 'bg-[#222222] text-white font-semibold'
                  : 'text-[#e1e3e6] hover:bg-[#222222]/70'
              }`}
              title="Мессенджер"
            >
              <MessageSquare className="w-5 h-5 text-[#71aaeb] shrink-0" />
              <span className="hidden lg:inline truncate">Мессенджер</span>
            </button>

            {/* Звонки */}
            <button
              onClick={() => setIsCallHistoryOpen(true)}
              className="w-full px-2.5 py-2 rounded-lg transition cursor-pointer flex items-center justify-center lg:justify-start gap-3 text-xs font-medium text-[#e1e3e6] hover:bg-[#222222]/70 relative"
              title="Звонки"
            >
              <Phone className="w-5 h-5 text-[#71aaeb] shrink-0" />
              <span className="hidden lg:inline truncate">Звонки</span>
              {missedCallsCount > 0 && (
                <span className="lg:ml-auto px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-bold">
                  {missedCallsCount}
                </span>
              )}
            </button>

            {/* Друзья / Контакты */}
            <button
              onClick={() => setIsContactsOpen(true)}
              className="w-full px-2.5 py-2 rounded-lg transition cursor-pointer flex items-center justify-center lg:justify-start gap-3 text-xs font-medium text-[#e1e3e6] hover:bg-[#222222]/70"
              title="Друзья и контакты"
            >
              <Users className="w-5 h-5 text-[#71aaeb] shrink-0" />
              <span className="hidden lg:inline truncate">Друзья</span>
            </button>

            {/* Сообщества */}
            <button
              onClick={() => handleOpenPostsFeed('communities')}
              className={`w-full px-2.5 py-2 rounded-lg transition cursor-pointer flex items-center justify-center lg:justify-start gap-3 text-xs font-medium ${
                activeScreen === 'posts' && postsInitialTab === 'communities'
                  ? 'bg-[#222222] text-white font-semibold'
                  : 'text-[#e1e3e6] hover:bg-[#222222]/70'
              }`}
              title="Список сообществ"
            >
              <Layers className="w-5 h-5 text-[#71aaeb] shrink-0" />
              <span className="hidden lg:inline truncate">Сообщества</span>
            </button>

            {/* Клипы */}
            <button
              onClick={handleOpenReelsFeed}
              className={`w-full px-2.5 py-2 rounded-lg transition cursor-pointer flex items-center justify-center lg:justify-start gap-3 text-xs font-medium ${
                activeScreen === 'reels'
                  ? 'bg-[#222222] text-white font-semibold'
                  : 'text-[#e1e3e6] hover:bg-[#222222]/70'
              }`}
              title="Клипы (Рилс)"
            >
              <Play className="w-5 h-5 text-[#71aaeb] shrink-0" />
              <span className="hidden lg:inline truncate">Клипы</span>
            </button>

            <div className="my-1.5 border-t border-[#2e2e2e]" />

            {/* Опубликовать / Быстрые действия */}
            <button
              onClick={() => setIsPlusMenuOpen(true)}
              className="w-full px-2.5 py-2 rounded-lg bg-[#222222] hover:bg-[#2c2d2e] text-[#71aaeb] transition cursor-pointer flex items-center justify-center lg:justify-start gap-3 text-xs font-semibold border border-[#2e2e2e]"
              title="Быстрые действия: Пост, Камера, QR, Новый чат, Звонки"
            >
              <Plus className="w-5 h-5 shrink-0" />
              <span className="hidden lg:inline truncate">Опубликовать</span>
            </button>
          </div>

          <div className="space-y-1 flex flex-col border-t border-[#2e2e2e] pt-2">
            {/* Архитектура и SQL */}
            <button
              onClick={() => setIsTechSpecOpen(true)}
              className="w-full px-2.5 py-2 rounded-lg text-[#939393] hover:text-white hover:bg-[#222222] transition cursor-pointer flex items-center justify-center lg:justify-start gap-3 text-xs"
              title="Архитектура, SQL DDL и Бэкенд код"
            >
              <FileCode className="w-4 h-4 text-[#71aaeb] shrink-0" />
              <span className="hidden lg:inline truncate">Архитектура</span>
            </button>

            {/* Настройки */}
            <button
              onClick={() => handleOpenSettings('profile')}
              className="w-full px-2.5 py-2 rounded-lg text-[#939393] hover:text-white hover:bg-[#222222] transition cursor-pointer flex items-center justify-center lg:justify-start gap-3 text-xs"
              title="Настройки, смена аккаунта, выход"
            >
              <Settings className="w-4 h-4 text-[#939393] shrink-0" />
              <span className="hidden lg:inline truncate">Настройки</span>
            </button>
          </div>
        </div>

        {/* --- SCREEN 1: CHATS VIEW (DEFAULT REAL MESSENGER) --- */}
        {activeScreen === 'chats' && (
          <div className="flex-1 min-w-0 min-h-0 w-full flex overflow-hidden">
            <TelegramSidebar
              chats={chats}
              selectedChatId={selectedChat.id}
              messagesMap={messagesMap}
              onlinePeerMap={onlinePeerMap}
              isMobileChatOpen={isMobileChatOpen}
              onSelectChat={(c) => {
                const cleanChat = { ...c, unreadCount: 0 };
                setSelectedChat(cleanChat);
                setChats((prev) =>
                  prev.map((item) => (item.id === c.id ? { ...item, unreadCount: 0 } : item))
                );
                setIsMobileChatOpen(true);
              }}
              stories={stories}
              onOpenStory={(s) => setActiveStoryId(s.id)}
              onAddStory={() => {
                setCameraStudioMode('story');
                setIsCameraStudioOpen(true);
              }}
              currentUser={currentUser}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenTechSpecs={() => setIsTechSpecOpen(true)}
              onOpenStudio={() => {
                setCameraStudioMode('post');
                setIsCameraStudioOpen(true);
              }}
              onOpenCreateChat={() => {
                setCreateChatDefaultType('group');
                setIsCreateChatOpen(true);
              }}
              missedCallsCount={missedCallsCount}
              onOpenCallsModal={() => setIsCallHistoryOpen(true)}
              onOpenMainMenu={() => setIsMainMenuOpen(true)}
              onOpenQRScanner={() => setIsQRScannerOpen(true)}
              onOpenPlusMenu={() => setIsPlusMenuOpen(true)}
              allUsers={savedAccounts}
              globalCatalogChats={globalCatalogChats}
              communities={communities}
              followingUserIds={followingUserIds}
              onStartDirectChatWithUser={(target) => {
                const existing = chats.find(
                  (c) =>
                    c.type === 'direct' &&
                    (c.title.toLowerCase() === target.displayName.toLowerCase() ||
                      c.members.some(
                        (m) =>
                          m.userId === target.userId ||
                          m.username.toLowerCase() === target.username.toLowerCase()
                      ))
                );
                if (existing) {
                  setSelectedChat({ ...existing, unreadCount: 0 });
                  setChats((prev) =>
                    prev.map((item) => (item.id === existing.id ? { ...item, unreadCount: 0 } : item))
                  );
                } else {
                  const newDirectChat: Chat = {
                    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                    type: 'direct',
                    title: target.displayName,
                    avatarUrl: target.avatarUrl,
                    isPrivate: true,
                    membersCount: 2,
                    lastMessage: `Диалог с @${target.username}`,
                    lastMessageTime: new Date().toISOString(),
                    unreadCount: 0,
                    members: [
                      {
                        userId: currentUser.id,
                        displayName: currentUser.displayName,
                        username: currentUser.username,
                        avatarUrl: currentUser.avatarUrl,
                        role: 'owner'
                      },
                      {
                        userId: target.userId,
                        displayName: target.displayName,
                        username: target.username,
                        avatarUrl: target.avatarUrl,
                        role: 'member'
                      }
                    ]
                  };
                  setChats((prev) => {
                    const updated = [newDirectChat, ...prev];
                    setUserChatsMap((m) => ({ ...m, [currentUser.id]: updated }));
                    return updated;
                  });
                  setSelectedChat(newDirectChat);
                }
                setIsMobileChatOpen(true);
              }}
              onJoinGlobalChat={(globalChat) => {
                setChats((prev) => {
                  if (prev.some((c) => c.id === globalChat.id)) return prev;
                  const updated = [globalChat, ...prev];
                  setUserChatsMap((m) => ({ ...m, [currentUser.id]: updated }));
                  return updated;
                });
                setSelectedChat({ ...globalChat, unreadCount: 0 });
                setIsMobileChatOpen(true);
              }}
              onSelectCommunity={(comm) => {
                setSelectedCommunity(comm);
              }}
              onOpenUserProfile={handleOpenUserProfile}
              onOpenGlobalSearch={(q) => {
                setGlobalSearchInitialQuery(q || '');
                setIsGlobalSearchOpen(true);
              }}
            />

            <div className={`flex-1 min-w-0 min-h-0 h-full w-full overflow-hidden flex flex-col ${!isMobileChatOpen ? 'hidden md:flex' : 'flex'}`}>
              <ChatArea
                chat={selectedChat}
                messages={messagesMap[selectedChat.id] || []}
                currentUser={currentUser}
                savedAccounts={savedAccounts}
                onlinePeerMap={onlinePeerMap}
                onBackMobile={() => setIsMobileChatOpen(false)}
                onSendMessage={handleSendMessage}
                onStartCall={(isVideo) => {
                  const isGroup = selectedChat.type === 'group' || selectedChat.type === 'channel';
                  const otherMember = selectedChat.members?.find((m) => m.userId !== currentUser.id);
                  const callId = 'call_' + Date.now();
                  setActiveCallSession({
                    direction: 'outgoing',
                    contactName: selectedChat.title,
                    avatarUrl: selectedChat.avatarUrl,
                    isVideo,
                    callId,
                    targetUserId: otherMember?.userId,
                    targetUsername: otherMember?.username,
                    isGroupCall: isGroup,
                    groupMembers: selectedChat.members || []
                  });

                  try {
                    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                      const channel = new BroadcastChannel('applet_webrtc_call_sync');
                      channel.postMessage({
                        type: 'CALL_OFFER',
                        contactName: currentUser.displayName,
                        avatarUrl: currentUser.avatarUrl,
                        isVideo: Boolean(isVideo),
                        callId,
                        callerId: currentUser.id,
                        callerUsername: currentUser.username,
                        targetUserId: otherMember?.userId,
                        targetUsername: otherMember?.username
                      });
                      channel.close();
                    }
                  } catch {}

                  publishCallSignalToCloud({
                    type: 'CALL_OFFER',
                    callId,
                    callerId: currentUser.id,
                    callerName: currentUser.displayName,
                    callerUsername: currentUser.username,
                    callerAvatar: currentUser.avatarUrl,
                    targetUserId: otherMember?.userId,
                    targetUsername: otherMember?.username,
                    targetName: selectedChat.title,
                    isVideo: Boolean(isVideo),
                    timestamp: Date.now()
                  });
                }}
                onOpenVideoNoteRecorder={() => setIsVideoNoteRecorderOpen(true)}
                onCreateTopic={handleCreateTopic}
                onAddReaction={handleAddReaction}
                onRequestJoin={handleRequestJoin}
                onApproveRequest={handleApproveRequest}
                onDeclineRequest={handleDeclineRequest}
                onAddCommunityGif={handleAddCommunityGif}
                onUpdateChat={handleUpdateChat}
                onOpenUserProfile={handleOpenUserProfile}
                onOpenCommunityFeed={(chat) => {
                  const comm = communities.find((c) => c.attachedChannelId === chat.id || c.attachedGroupId === chat.id) || communities[0];
                  if (comm) {
                    setSelectedCommunity(comm);
                  } else {
                    setPostsInitialTab('communities');
                    setActiveScreen('posts');
                  }
                }}
                onDeleteChatHistory={handleClearChatHistory}
                onDeleteChat={handleDeleteChat}
                onLeaveChat={handleLeaveChat}
              />
            </div>
          </div>
        )}

        {/* --- SCREEN 2: REELS VIEW (CLIPS) --- */}
        {activeScreen === 'reels' && (
          <ReelsFeed
            reels={reels}
            chats={chats}
            onBackToChats={() => setActiveScreen('chats')}
            onOpenStudio={() => {
              setCameraStudioMode('reel');
              setIsCameraStudioOpen(true);
            }}
            followingUserIds={followingUserIds}
            onToggleFollow={handleToggleFollow}
            onOpenUserProfile={handleOpenUserProfile}
            onSendToChat={handleShareReelToChat}
            savedPostIds={savedPostIds}
            onToggleSave={handleToggleSavePost}
            onToggleLikePost={handleToggleLikePost}
            onAddComment={handleAddPostComment}
            onDeleteComment={handleDeleteComment}
            onRefreshReels={handleRefreshReelsFeed}
            refreshCount={reelsRefreshCount}
          />
        )}

        {/* --- SCREEN 3: POSTS & COMMUNITIES VIEW --- */}
        {activeScreen === 'posts' && (
          <PostsFeed
            posts={posts}
            chats={chats}
            communities={communities}
            currentUserId={currentUser.id}
            initialFeedTab={postsInitialTab}
            onSelectCommunity={(comm) => setSelectedCommunity(comm)}
            onOpenCreateCommunity={() => {
              setCreateChatDefaultType('community');
              setIsCreateChatOpen(true);
            }}
            communityGifs={communityGifs}
            onBackToChats={() => setActiveScreen('chats')}
            onOpenStudio={() => {
              setCameraStudioMode('post');
              setIsCameraStudioOpen(true);
            }}
            followingUserIds={followingUserIds}
            onToggleFollow={handleToggleFollow}
            onOpenUserProfile={handleOpenUserProfile}
            onSendPostToChat={handleShareReelToChat}
            savedPostIds={savedPostIds}
            onToggleSave={handleToggleSavePost}
            onToggleLikePost={handleToggleLikePost}
            onDeleteComment={handleDeleteComment}
            onAddComment={handleAddPostComment}
            onRefreshFeed={handleRefreshPostsFeed}
            refreshCount={feedRefreshCount}
          />
        )}

        {/* --- SCREEN 4: USER & MY PROFILE (FULL VK PROFILE VIEW) --- */}
        {activeScreen === 'profile' && (
          <UserProfileView
            currentUser={currentUser}
            savedAccounts={savedAccounts}
            targetUser={selectedOtherUser}
            isFollowing={selectedOtherUser ? !!followingUserIds[selectedOtherUser.id] : false}
            onToggleFollow={handleToggleFollow}
            onStartChatWithUser={handleStartChatWithUser}
            onStartCallWithUser={(usr, isVideo) => {
              const callId = 'call_' + Date.now();
              setActiveCallSession({
                direction: 'outgoing',
                contactName: usr.name,
                avatarUrl: usr.avatar,
                isVideo,
                callId,
                targetUserId: usr.id,
                targetUsername: usr.username
              });

              publishCallSignalToCloud({
                type: 'CALL_OFFER',
                callId,
                callerId: currentUser.id,
                callerName: currentUser.displayName,
                callerUsername: currentUser.username,
                callerAvatar: currentUser.avatarUrl,
                targetUserId: usr.id,
                targetUsername: usr.username,
                targetName: usr.name,
                isVideo: Boolean(isVideo),
                timestamp: Date.now()
              });
            }}
            posts={posts}
            reels={reels}
            visitors={visitors}
            onBackToChats={() => {
              setSelectedOtherUser(null);
              setActiveScreen('chats');
            }}
            onOpenStudio={() => setIsCameraStudioOpen(true)}
            onOpenSettings={(tab) => handleOpenSettings(tab)}
            onUpdateUser={handleUpdateUser}
            onOpenUserProfile={handleOpenUserProfile}
            savedPostIds={savedPostIds}
            onToggleLikePost={handleToggleLikePost}
            onAddComment={handleAddPostComment}
            onDeleteComment={handleDeleteComment}
            onSelectChatByUser={(userId) => {
              const targetChat = chats.find((c) =>
                c.members.some((m) => m.userId === userId)
              );
              if (targetChat) {
                setSelectedChat(targetChat);
                setIsMobileChatOpen(true);
              }
              setActiveScreen('chats');
            }}
            onOpenGlobalSearch={() => {
              setGlobalSearchInitialQuery('');
              setIsGlobalSearchOpen(true);
            }}
          />
        )}
      </div>

      {/* Mobile Bottom Navigation Bar — Exactly 5 Buttons: Новости, Клипы, Чаты, Ещё (внутри Группы и сервисы), Профиль */}
      <div className="sm:hidden px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom,0px))] bg-[#1c1c1e] border-t border-[#2e2e2e] grid grid-cols-5 gap-1 items-center z-30 shrink-0">
        {/* 1. Новости */}
        <button
          onClick={() => handleOpenPostsFeed('all')}
          className={`h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all active:scale-95 cursor-pointer border ${
            activeScreen === 'posts' && postsInitialTab === 'all'
              ? 'bg-[#0077FF]/15 text-[#0077FF] border-[#0077FF]/35'
              : 'bg-transparent hover:bg-[#2a2a2d] text-[#939393] hover:text-white border-transparent'
          }`}
          title="Новости и лента"
        >
          <ImageIcon className="w-[18px] h-[18px] shrink-0" />
          <span className="leading-none truncate">Новости</span>
        </button>

        {/* 2. Клипы */}
        <button
          onClick={handleOpenReelsFeed}
          className={`h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all active:scale-95 cursor-pointer border ${
            activeScreen === 'reels'
              ? 'bg-[#0077FF]/15 text-[#0077FF] border-[#0077FF]/35'
              : 'bg-transparent hover:bg-[#2a2a2d] text-[#939393] hover:text-white border-transparent'
          }`}
          title="Клипы"
        >
          <Play className="w-[18px] h-[18px] shrink-0" />
          <span className="leading-none truncate">Клипы</span>
        </button>

        {/* 3. Чаты */}
        <button
          onClick={() => setActiveScreen('chats')}
          className={`h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all active:scale-95 cursor-pointer border ${
            activeScreen === 'chats'
              ? 'bg-[#0077FF]/15 text-[#0077FF] border-[#0077FF]/35'
              : 'bg-transparent hover:bg-[#2a2a2d] text-[#939393] hover:text-white border-transparent'
          }`}
          title="Мессенджер"
        >
          <MessageSquare className="w-[18px] h-[18px] shrink-0" />
          <span className="leading-none truncate">Чаты</span>
        </button>

        {/* 4. Ещё (заменяет кнопку «Группы», внутри находятся Группы/Сообщества и сервисы) */}
        <button
          onClick={() => setIsMoreMenuOpen(true)}
          className={`h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all active:scale-95 cursor-pointer border ${
            isMoreMenuOpen || (activeScreen === 'posts' && postsInitialTab === 'communities') || selectedCommunity !== null
              ? 'bg-[#0077FF]/15 text-[#0077FF] border-[#0077FF]/35'
              : 'bg-transparent hover:bg-[#2a2a2d] text-[#939393] hover:text-white border-transparent'
          }`}
          title="Ещё (внутри Группы, Поиск, Создать, Звонки)"
        >
          <Grid className="w-[18px] h-[18px] shrink-0" />
          <span className="leading-none truncate">Ещё</span>
        </button>

        {/* 5. Профиль */}
        <button
          onClick={() => {
            setSelectedOtherUser(null);
            setActiveScreen('profile');
          }}
          className={`h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all active:scale-95 cursor-pointer border ${
            activeScreen === 'profile' && !selectedOtherUser
              ? 'bg-[#0077FF]/15 text-[#0077FF] border-[#0077FF]/35'
              : 'bg-transparent hover:bg-[#2a2a2d] text-[#939393] hover:text-white border-transparent'
          }`}
          title="Мой профиль"
        >
          <UserIcon className="w-[18px] h-[18px] shrink-0" />
          <span className="leading-none truncate">Профиль</span>
        </button>
      </div>

      {/* Modal: «Ещё» (внутри: Группы и Сообщества, Поиск, Создать, Звонки, Контакты, Камера, Настройки) */}
      {isMoreMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-[#1e1e20] border border-[#2e2e30] rounded-t-2xl sm:rounded-2xl p-4 shadow-2xl flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#2e2e30]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0077FF]/15 text-[#0077FF] flex items-center justify-center">
                  <Grid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">Ещё</h3>
                  <p className="text-[11px] text-[#939393] mt-0.5">Сервисы и разделы AuraChat</p>
                </div>
              </div>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-[#2a2a2e] hover:bg-[#333338] text-[#939393] hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Главный блок: Группы и Сообщества (как запросил пользователь: за место кнопки группы кнопка еще, а внутри группы) */}
            <div
              onClick={() => {
                setIsMoreMenuOpen(false);
                handleOpenPostsFeed('communities');
              }}
              className="p-3.5 rounded-xl bg-linear-to-r from-[#0077FF]/25 via-[#0055CC]/15 to-[#252528] border-2 border-[#0077FF]/50 hover:border-[#0077FF] transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99] shadow-lg shadow-[#0077FF]/15"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0077FF] text-white flex items-center justify-center shadow-md shadow-[#0077FF]/35 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white group-hover:text-[#71aaeb] transition">
                      Группы и Сообщества
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full bg-[#0077FF] text-white text-[10px] font-bold">
                      {communities.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                    Лента публикаций групп, каналы, паблики и сообщества
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#71aaeb] group-hover:translate-x-0.5 transition" />
            </div>

            {/* Сетка остальных быстрых действий */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Поиск */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setGlobalSearchInitialQuery('');
                  setIsGlobalSearchOpen(true);
                }}
                className="p-3 rounded-xl bg-[#252528] hover:bg-[#2c2d30] border border-[#333338] hover:border-[#0077FF]/40 transition flex items-center gap-3 text-left cursor-pointer active:scale-95"
              >
                <div className="w-8 h-8 rounded-lg bg-[#0077FF]/20 text-[#0077FF] flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-white block truncate">Поиск</span>
                  <span className="text-[10px] text-[#939393] block truncate">Люди, видео, фото</span>
                </div>
              </button>

              {/* Создать */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setIsPlusMenuOpen(true);
                }}
                className="p-3 rounded-xl bg-[#252528] hover:bg-[#2c2d30] border border-[#333338] hover:border-emerald-500/40 transition flex items-center gap-3 text-left cursor-pointer active:scale-95"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-white block truncate">Создать</span>
                  <span className="text-[10px] text-[#939393] block truncate">Пост, клип, чат</span>
                </div>
              </button>

              {/* Звонки */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setIsCallHistoryOpen(true);
                }}
                className="p-3 rounded-xl bg-[#252528] hover:bg-[#2c2d30] border border-[#333338] hover:border-indigo-500/40 transition flex items-center gap-3 text-left cursor-pointer active:scale-95 relative"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-white block truncate">Звонки</span>
                  <span className="text-[10px] text-[#939393] block truncate">Журнал и вызовы</span>
                </div>
                {missedCallsCount > 0 && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[9px] font-bold">
                    {missedCallsCount}
                  </span>
                )}
              </button>

              {/* Друзья и контакты */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setIsContactsOpen(true);
                }}
                className="p-3 rounded-xl bg-[#252528] hover:bg-[#2c2d30] border border-[#333338] hover:border-amber-500/40 transition flex items-center gap-3 text-left cursor-pointer active:scale-95"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-white block truncate">Контакты</span>
                  <span className="text-[10px] text-[#939393] block truncate">Друзья и пользователи</span>
                </div>
              </button>

              {/* Камера / Студия */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setCameraStudioMode('post');
                  setIsCameraStudioOpen(true);
                }}
                className="p-3 rounded-xl bg-[#252528] hover:bg-[#2c2d30] border border-[#333338] hover:border-pink-500/40 transition flex items-center gap-3 text-left cursor-pointer active:scale-95"
              >
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-white block truncate">Камера</span>
                  <span className="text-[10px] text-[#939393] block truncate">Фото, кружочки</span>
                </div>
              </button>

              {/* Настройки */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  handleOpenSettings('profile');
                }}
                className="p-3 rounded-xl bg-[#252528] hover:bg-[#2c2d30] border border-[#333338] hover:border-zinc-400/40 transition flex items-center gap-3 text-left cursor-pointer active:scale-95"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-500/20 text-zinc-300 flex items-center justify-center shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-white block truncate">Настройки</span>
                  <span className="text-[10px] text-[#939393] block truncate">Профиль, аккаунты</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS & OVERLAYS --- */}

      {/* Global Search Modal (Люди, Сообщества, Каналы, Посты, Видео/Клипы, Фотографии — на ПК и Телефоне) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        initialQuery={globalSearchInitialQuery}
        currentUser={currentUser}
        allUsers={savedAccounts}
        chats={chats}
        globalCatalogChats={globalCatalogChats}
        communities={communities}
        posts={posts}
        reels={reels}
        stories={stories}
        messagesMap={messagesMap}
        followingUserIds={followingUserIds}
        onOpenUserProfile={handleOpenUserProfile}
        onStartChatWithUser={handleStartChatWithUser}
        onSelectCommunity={(comm) => setSelectedCommunity(comm)}
        onSelectChat={(targetChat) => {
          setChats((prev) => {
            if (prev.some((c) => c.id === targetChat.id)) return prev;
            const updated = [targetChat, ...prev];
            setUserChatsMap((m) => ({ ...m, [currentUser.id]: updated }));
            return updated;
          });
          setSelectedChat(targetChat);
          setIsMobileChatOpen(true);
          setActiveScreen('chats');
        }}
        onOpenReelsFeed={handleOpenReelsFeed}
        onOpenPostsFeed={(tab) => handleOpenPostsFeed(tab || 'all')}
      />

      {/* Plus Action Quick Menu (Камера, QR, Новый чат, Звонки) */}
      <PlusActionMenuModal
        isOpen={isPlusMenuOpen}
        onClose={() => setIsPlusMenuOpen(false)}
        onOpenCamera={() => setIsCameraStudioOpen(true)}
        onOpenQRScanner={() => setIsQRScannerOpen(true)}
        onOpenCreateChat={(type) => {
          setCreateChatDefaultType(type || 'group');
          setIsCreateChatOpen(true);
        }}
        onOpenCalls={() => setIsCallHistoryOpen(true)}
        onStartCallFlow={() => setIsStartCallOpen(true)}
        onOpenVideoNote={() => setIsVideoNoteRecorderOpen(true)}
        missedCallsCount={missedCallsCount}
      />

      {/* Start Call Modal (Выбор собеседников или прямой набор номера на клавиатуре) */}
      <StartCallModal
        isOpen={isStartCallOpen}
        onClose={() => setIsStartCallOpen(false)}
        onStartCallWithParticipants={handleStartCallWithParticipants}
        onStartCallToNumber={handleStartCallToNumber}
        onSimulateIncomingCall={handleSimulateIncomingCall}
        onOpenHistory={() => setIsCallHistoryOpen(true)}
        savedAccounts={savedAccounts}
        currentUserId={currentUser.id}
      />

      {/* 24h Story Viewer */}
      {activeStoryId && (
        <StoryViewerModal
          stories={stories}
          initialStoryId={activeStoryId}
          onClose={() => setActiveStoryId(null)}
        />
      )}

      {/* Camera Studio Modal: Съемка Reels, Фото-постов и Историй */}
      <CameraStudioModal
        isOpen={isCameraStudioOpen}
        currentUser={currentUser}
        initialMode={cameraStudioMode}
        onClose={() => setIsCameraStudioOpen(false)}
        onPublishReel={handlePublishReel}
        onPublishPost={handlePublishPost}
        onPublishStory={handlePublishStory}
      />

      {/* Create Story Modal fallback */}
      {isAddStoryOpen && (
        <AddStoryModal
          currentUser={currentUser}
          onClose={() => setIsAddStoryOpen(false)}
          onAddStory={handleAddStory}
        />
      )}

      {/* Settings & Privacy Modal */}
      {isSettingsOpen && (
        <SettingsModal
          user={currentUser}
          savedAccounts={savedAccounts}
          initialTab={settingsInitialTab}
          onUpdateUser={handleUpdateUser}
          onUpdateUserPin={handleUpdateCurrentUserPin}
          onSwitchUser={(newUser) => {
            handleRequestSwitchUser(newUser);
          }}
          onLogout={(forgetAccount) => {
            handleLogout(forgetAccount);
          }}
          onDeleteAccount={(userId) => {
            handleDeleteUserAccount(userId);
            setIsSettingsOpen(false);
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Technical Spec & Code Drawer (SQL DDL, Backend FastAPI/Node, Vanilla JS) */}
      <TechSpecModal
        isOpen={isTechSpecOpen}
        onClose={() => setIsTechSpecOpen(false)}
      />

      {/* Video Note («Кружочек») Camera Recorder */}
      <VideoNoteModal
        isOpen={isVideoNoteRecorderOpen}
        onClose={() => setIsVideoNoteRecorderOpen(false)}
        onSendVideoNote={(url, sec) =>
          handleSendMessage('video_note', 'Круглое видеосообщение', url, { durationSec: sec })
        }
      />

      {/* Create Chat Modal (Группа, Канал, ЛС, Сообщество) */}
      <CreateChatModal
        isOpen={isCreateChatOpen}
        currentUser={currentUser}
        defaultType={createChatDefaultType}
        chats={chats}
        onClose={() => setIsCreateChatOpen(false)}
        onCreateChat={handleCreateChat}
        onCreateCommunity={handleCreateCommunity}
      />

      {/* Community View & Management Modal */}
      <CommunityViewModal
        community={selectedCommunity}
        currentUser={currentUser}
        chats={chats}
        posts={posts}
        onClose={() => setSelectedCommunity(null)}
        onUpdateCommunity={handleUpdateCommunity}
        onPublishCommunityPost={handlePublishCommunityPost}
        onSelectChat={(chat) => {
          setSelectedChat(chat);
          setIsMobileChatOpen(true);
          setActiveScreen('chats');
        }}
        onOpenUserProfile={(targetUser) => {
          setSelectedOtherUser(targetUser);
        }}
        onMessageUser={(targetUser) => {
          handleStartChatWithUser(targetUser);
        }}
        onOpenCommunityChat={handleOpenCommunityChat}
        onToggleLikePost={handleToggleLikePost}
        onAddComment={handleAddPostComment}
        onDeleteComment={handleDeleteComment}
      />

      {/* Call History Modal (Зелёная = совершил звонок, Красная = пропустил звонок) */}
      <CallHistoryModal
        isOpen={isCallHistoryOpen}
        calls={calls}
        missedCallsCount={missedCallsCount}
        onClose={() => setIsCallHistoryOpen(false)}
        onStartCall={(contactName, avatarUrl, isVideo) => {
          setIsCallHistoryOpen(false);
          setActiveCallSession({
            direction: 'outgoing',
            contactName,
            avatarUrl,
            isVideo
          });
        }}
        onSimulateIncomingCall={(fromName, isVideo) => {
          setIsCallHistoryOpen(false);
          handleSimulateIncomingCall(fromName || 'Павел Дуров', isVideo ?? false);
        }}
        onSimulateMissedCall={handleSimulateMissedCall}
        onMarkAllAsRead={handleMarkAllCallsAsRead}
        onClearHistory={handleClearCallsHistory}
        onDeleteCall={handleDeleteCall}
      />

      {/* Main Menu Drawer (☰ Меню Telegram: Контакты, Создать чат, Звонки, Настройки, Аккаунты) */}
      <MainMenuDrawer
        isOpen={isMainMenuOpen}
        currentUser={currentUser}
        savedAccounts={savedAccounts}
        missedCallsCount={missedCallsCount}
        onClose={() => setIsMainMenuOpen(false)}
        onOpenContacts={() => setIsContactsOpen(true)}
        onOpenCallsHistory={() => setIsCallHistoryOpen(true)}
        onOpenInstallApp={() => setIsInstallAppOpen(true)}
        onOpenCreateChat={(type) => {
          setCreateChatDefaultType(type);
          setIsCreateChatOpen(true);
        }}
        onOpenSettings={(tab) => {
          handleOpenSettings(tab);
        }}
        onOpenProfile={() => setActiveScreen('profile')}
        onSwitchUser={(target) => handleRequestSwitchUser(target)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={() => handleLogout()}
        onOpenSavedMessages={() => {
          const savedChat = chats.find((c) => c.id === 'chat_direct_saved') || chats[0];
          setSelectedChat(savedChat);
          setActiveScreen('chats');
          setIsMobileChatOpen(true);
        }}
      />

      {/* Auth / Welcome / Registration & Account Switch Modal */}
      <AuthModal
        isOpen={isAuthModalOpen || !isLoggedIn}
        isLoggedIn={isLoggedIn}
        lastUser={lastLoggedUser}
        savedAccounts={savedAccounts}
        onRemoveSavedAccount={(accId) => {
          setSavedAccounts((prev) => prev.filter((a) => a.id !== accId));
        }}
        onLogin={(user) => {
          handlePinPromptSuccess(user);
        }}
        onRegister={(newUser) => {
          handleRegisterNewUser(newUser);
        }}
        onClose={isLoggedIn ? () => setIsAuthModalOpen(false) : undefined}
      />

      {/* 6-Digit PIN Prompt Modal: Вход по 6-значному ПИН-коду или создание нового кода */}
      <AccountPinPromptModal
        isOpen={Boolean(pinPromptTargetUser)}
        targetUser={pinPromptTargetUser}
        onClose={() => setPinPromptTargetUser(null)}
        onSuccess={handlePinPromptSuccess}
      />

      {/* Install App Modal (ПК / Android APK / iOS) */}
      <InstallAppModal
        isOpen={isInstallAppOpen}
        onClose={() => setIsInstallAppOpen(false)}
      />

      {/* Contacts Modal */}
      <ContactsModal
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
        savedAccounts={savedAccounts}
        currentUserId={currentUser.id}
        onStartDirectChat={(contact) => {
          setIsContactsOpen(false);
          const existing = chats.find((c) => c.title.toLowerCase() === contact.displayName.toLowerCase());
          if (existing) {
            setSelectedChat(existing);
          } else {
            const newDirectChat: Chat = {
              id: 'chat_' + Date.now(),
              type: 'direct',
              title: contact.displayName,
              avatarUrl: contact.avatarUrl,
              isPrivate: true,
              membersCount: 2,
              members: [
                {
                  userId: currentUser.id,
                  displayName: currentUser.displayName,
                  username: currentUser.username,
                  avatarUrl: currentUser.avatarUrl,
                  role: 'owner'
                },
                {
                  userId: contact.userId,
                  displayName: contact.displayName,
                  username: contact.username,
                  avatarUrl: contact.avatarUrl,
                  role: 'member'
                }
              ]
            };
            setChats((prev) => [newDirectChat, ...prev]);
            setSelectedChat(newDirectChat);
          }
          setActiveScreen('chats');
        }}
        onStartCall={(contact, isVideo) => {
          setIsContactsOpen(false);
          setActiveCallSession({
            direction: 'outgoing',
            contactName: contact.displayName,
            avatarUrl: contact.avatarUrl,
            isVideo: Boolean(isVideo)
          });
        }}
      />

      {/* QR Code Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        currentUser={currentUser}
        allChats={chats}
        onClose={() => setIsQRScannerOpen(false)}
        onJoinPublicChat={(chatId) => {
          const target = chats.find((c) => c.id === chatId);
          if (target) {
            setSelectedChat(target);
            setActiveScreen('chats');
          }
        }}
        onRequestJoinPrivateChat={(chatId, guest) => {
          handleRequestJoin(chatId, guest);
        }}
      />

      {/* Real WebRTC Call Modal with Dial Tones & Incoming Call Ringtone */}
      {activeCallSession && (
        <RealWebRTCCallModal
          session={activeCallSession}
          onClose={handleCloseCall}
          onLeaveVoicemail={handleLeaveVoicemail}
          onSendQuickResponse={(contactName, responseText) => {
            handleSendMessage('text', `💬 Быстрый ответ на звонок: «${responseText}»`);
          }}
        />
      )}
    </div>
  );
}

