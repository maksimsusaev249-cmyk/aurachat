/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import { syncAccountToCloud, savePlatformStateToCloud, subscribeToCloudPlatformState } from './firebase';
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
  Search
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
    try {
      const savedMapRaw = localStorage.getItem('aurachat_userChatsMap_v2');
      const savedUserRaw = localStorage.getItem('aurachat_currentUser');
      const activeUid = savedUserRaw ? JSON.parse(savedUserRaw).id : initialCurrentUser.id;
      if (savedMapRaw) {
        const parsedMap = JSON.parse(savedMapRaw);
        if (parsedMap[activeUid] && parsedMap[activeUid].length > 0) {
          return parsedMap[activeUid];
        }
      }
      const saved = localStorage.getItem('aurachat_active_chats_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return initialChats;
  });
  const [globalCatalogChats, setGlobalCatalogChats] = useState<Chat[]>(() => {
    try {
      const saved = localStorage.getItem('aurachat_global_chats_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialChats;
  });
  const [selectedChat, setSelectedChat] = useState<Chat>(() => chats[0] || initialChats[0]);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(() => {
    try {
      const saved = localStorage.getItem('aurachat_messagesMap_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialMessages;
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
      const saved = localStorage.getItem('aurachat_user_reels_v2');
      if (saved) {
        const parsed: Post[] = JSON.parse(saved);
        return parsed
          .filter((r) => r.mediaUrl && !r.mediaUrl.startsWith('blob:'))
          .map((r) => ({
            ...r,
            mediaType: isVideoMedia(r.mediaUrl, r.mediaType) ? 'video' : 'image'
          }));
      }
    } catch (e) {}
    return getRefreshedReelsFeed(initialReels, visitCycle);
  });
  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem('aurachat_user_posts_v2');
      if (saved) {
        const parsed: Post[] = JSON.parse(saved);
        return parsed
          .filter((p) => !p.mediaUrl || !p.mediaUrl.startsWith('blob:'))
          .map((p) => ({
            ...p,
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
    } catch (e) {}
  }, [reels]);

  useEffect(() => {
    try {
      localStorage.setItem('aurachat_user_posts_v2', JSON.stringify(posts));
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
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextLiked = !p.isLiked;
        return {
          ...p,
          isLiked: nextLiked,
          likesCount: Math.max(0, p.likesCount + (nextLiked ? 1 : -1))
        };
      })
    );
    setReels((prev) =>
      prev.map((r) => {
        if (r.id !== postId) return r;
        const nextLiked = !r.isLiked;
        return {
          ...r,
          isLiked: nextLiked,
          likesCount: Math.max(0, r.likesCount + (nextLiked ? 1 : -1))
        };
      })
    );
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
  };

  // Modals & Calls
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [isAddStoryOpen, setIsAddStoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('profile');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [lastLoggedUser, setLastLoggedUser] = useState<User | null>(initialCurrentUser);
  const [savedAccounts, setSavedAccounts] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('aurachat_savedAccounts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      initialCurrentUser,
      {
        id: 'u_durov',
        displayName: 'Павел Дуров',
        username: 'durov',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
        phone: '+7 (999) 777-00-01',
        bio: 'Основатель AuraChat. Свобода общения и шифрование.'
      },
      {
        id: 'u_anna',
        displayName: 'Анна Смирнова (UX/UI)',
        username: 'anna_tech',
        avatarUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95',
        phone: '+7 (999) 333-22-11',
        bio: 'Lead UI/UX Designer at AuraChat.'
      }
    ];
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
    return {
      usr_me: initialChats,
      u_durov: initialChats,
      u_anna: initialChats
    };
  });

  // User authentication and session state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('aurachat_isLoggedIn');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });

  // LocalStorage persistence Effects
  useEffect(() => {
    try {
      localStorage.setItem('aurachat_currentUser', JSON.stringify(currentUser));
      syncAccountToCloud(currentUser);
    } catch (e) {}
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('aurachat_savedAccounts', JSON.stringify(savedAccounts));
    } catch (e) {}
  }, [savedAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem('aurachat_isLoggedIn', JSON.stringify(isLoggedIn));
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

  // Switch Account Handler
  const handleSwitchUser = (targetUser: User) => {
    // 1. Save current account's chats and calls into maps
    setUserChatsMap((prev) => ({
      ...prev,
      [currentUser.id]: chats
    }));
    setUserCallsMap((prev) => ({
      ...prev,
      [currentUser.id]: calls
    }));

    setCurrentUser(targetUser);
    setLastLoggedUser(targetUser);

    // 2. Load target user's chats (if new account -> only [savedChat]) and calls (if new account -> [])
    const targetChats = userChatsMap[targetUser.id] || [createSavedMessagesChat(targetUser)];
    setChats(targetChats);
    setSelectedChat(targetChats[0]);
    const targetCalls = (userCallsMap[targetUser.id] || []).filter(
      (c) => c.id !== 'call_1' && c.id !== 'call_2' && c.id !== 'call_3'
    );
    setCalls(targetCalls);
    setIsMobileChatOpen(false);
  };

  // Complete Logout Handler ("надо полностью выйти из аккаунта")
  const handleLogout = (forgetAccount: boolean = false) => {
    // 1. Save current account chats
    setUserChatsMap((prev) => ({
      ...prev,
      [currentUser.id]: chats
    }));

    if (forgetAccount) {
      setSavedAccounts((prev) => prev.filter((a) => a.id !== currentUser.id));
      setLastLoggedUser(null);
    } else {
      setLastLoggedUser(currentUser);
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

  const handlePublishCommunityPost = (communityId: string, postData: Partial<Post> & { caption: string }) => {
    const targetComm = communities.find((c) => c.id === communityId);
    const cleanMedia = postData.mediaUrl?.trim() || '';
    const newPost: Post = {
      id: 'post_comm_' + Date.now(),
      userId: postData.userId || (targetComm ? targetComm.id : currentUser.id),
      userName: postData.userName || targetComm?.title || currentUser.displayName,
      userAvatar: postData.userAvatar || targetComm?.avatarUrl || currentUser.avatarUrl,
      type: postData.type || 'post',
      mediaUrl: cleanMedia,
      mediaType: postData.mediaType || (cleanMedia ? 'image' : 'text'),
      caption: postData.caption,
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
      createdAt: 'Только что'
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

  // Real-time Cloud Firestore Sync (when online, syncs accounts, chats, channels, communities, posts, reels, stories)
  useEffect(() => {
    const unsub = subscribeToCloudPlatformState((data) => {
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
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
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
    }, 1200);
    return () => clearTimeout(timer);
  }, [savedAccounts, userChatsMap, globalCatalogChats, messagesMap, communities, stories, posts, reels, userCallsMap]);

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
            contactName: data.contactName || 'Входящий звонок',
            avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Subscriber&backgroundColor=182533',
            isVideo: Boolean(data.isVideo),
            callId: data.callId
          };
        });
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

      if (data.type !== 'NEW_CHAT_MESSAGE' || !data.message) return;

      const incomingMsg: Message = data.message;
      setMessagesMap((prev) => {
        const list = prev[data.chatId] || [];
        if (list.some((m) => m.id === incomingMsg.id)) return prev;
        return {
          ...prev,
          [data.chatId]: [...list, incomingMsg]
        };
      });

      setChats((prev) =>
        prev.map((c) =>
          c.id === data.chatId
            ? {
                ...c,
                lastMessage: incomingMsg.content || 'Сообщение',
                lastMessageTime: 'Только что'
              }
            : c
        )
      );

      // Play soft notification sound
      playNotificationSound(incomingMsg.senderName, incomingMsg.content);
    };

    return () => {
      channel.close();
      msgChannel.close();
    };
  }, []);

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
      setSelectedChat(savedChat);
      setIsMobileChatOpen(true);
      setActiveScreen('chats');
      return;
    }
    let targetChat = chats.find(c => c.type === 'direct' && c.members.some(m => m.userId === user.id || m.username === user.username));
    if (!targetChat) {
      targetChat = {
        id: 'chat_' + Date.now(),
        type: 'direct',
        title: user.name,
        avatarUrl: user.avatar,
        isPrivate: true,
        membersCount: 2,
        members: [
          { userId: currentUser.id, displayName: currentUser.displayName, username: currentUser.username, avatarUrl: currentUser.avatarUrl, role: 'owner' },
          { userId: user.id, displayName: user.name, username: user.username, avatarUrl: user.avatar, role: 'member' }
        ]
      };
      setChats((prev) => [targetChat!, ...prev]);
    }
    setSelectedChat(targetChat);
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
            id: 'msg_comm_welcome_' + Date.now(),
            chatId: commChatId,
            senderId: comm.ownerId,
            senderName: `${ownerName} (Владелец «${comm.title}»)`,
            senderAvatar: ownerAvatar,
            type: 'text',
            content: `👋 Здравствуйте! Вы перешли в чат сообщества «${comm.title}». Здесь вы общаетесь напрямую с владельцем этого сообщества (${ownerName}). Напишите ваш вопрос или предложение!`,
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'read'
          }
        ]
      };
    });

    setSelectedChat(targetChat);
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
    const newMsg: Message = {
      id: 'msg_' + Date.now(),
      chatId: activeChatId,
      senderId: senderOverride ? senderOverride.id : currentUser.id,
      senderName: senderOverride ? senderOverride.name : currentUser.displayName,
      senderAvatar: senderOverride ? senderOverride.avatar : currentUser.avatarUrl,
      type: type,
      content: content || (type === 'voice' ? 'Голосовое сообщение' : 'Круглое видеосообщение'),
      mediaUrl: mediaUrl,
      mediaMeta: meta,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: senderOverride ? 'read' : 'sent'
    };

    setMessagesMap((prev) => {
      const chatMsgs = prev[activeChatId] || [];
      return {
        ...prev,
        [activeChatId]: [...chatMsgs, newMsg]
      };
    });

    // Update last message in chat preview
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              lastMessage: type === 'video_note' ? '📹 Кружочек' : type === 'voice' ? '🎤 Голосовое сообщение' : content,
              lastMessageTime: 'Только что'
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
      setSavedAccounts((accs) =>
        accs.map((a) => (a.id === prev.id ? next : a))
      );
      return next;
    });
  };

  // Studio Publish Handlers
  const handlePublishReel = (newReel: Post) => {
    setReels((prev) => [newReel, ...prev]);
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('aurachat_live_messages_sync');
        ch.postMessage({ type: 'NEW_REEL', reel: newReel });
        ch.close();
      }
    } catch {}
    setActiveScreen('reels');
  };

  const handlePublishPost = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('aurachat_live_messages_sync');
        ch.postMessage({ type: 'NEW_POST', post: newPost });
        ch.close();
      }
    } catch {}
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
      setActiveCallSession({
        direction: 'outgoing',
        contactName: contact.displayName,
        avatarUrl: contact.avatarUrl,
        isVideo: isVideo
      });
    } else {
      // Multiple contacts: create group
      const names = selectedContacts.map((c) => c.displayName.split(' ')[0]).join(', ');
      const groupTitle = `📞 Звонок: ${names}`;

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
        isVideo: isVideo
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
    <div className="h-[100dvh] w-full max-w-[100vw] bg-[#141414] text-[#e1e3e6] flex flex-col overflow-hidden font-sans select-none">
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
              isMobileChatOpen={isMobileChatOpen}
              onSelectChat={(c) => {
                setSelectedChat(c);
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
                  setSelectedChat(existing);
                } else {
                  const newDirectChat: Chat = {
                    id: 'chat_' + Date.now(),
                    type: 'direct',
                    title: target.displayName,
                    avatarUrl: target.avatarUrl,
                    isPrivate: true,
                    membersCount: 2,
                    lastMessage: `Диалог с @${target.username}`,
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
                setSelectedChat(globalChat);
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
                onBackMobile={() => setIsMobileChatOpen(false)}
                onSendMessage={handleSendMessage}
                onStartCall={(isVideo) =>
                  setActiveCallSession({
                    direction: 'outgoing',
                    contactName: selectedChat.title,
                    avatarUrl: selectedChat.avatarUrl,
                    isVideo
                  })
                }
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
            targetUser={selectedOtherUser}
            isFollowing={selectedOtherUser ? !!followingUserIds[selectedOtherUser.id] : false}
            onToggleFollow={handleToggleFollow}
            onStartChatWithUser={handleStartChatWithUser}
            onStartCallWithUser={(usr, isVideo) => {
              setActiveCallSession({
                direction: 'outgoing',
                contactName: usr.name,
                avatarUrl: usr.avatar,
                isVideo
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

      {/* Mobile Bottom Navigation Bar — Symmetrical 7-Column Grid with Search on Phone */}
      <div className="sm:hidden px-2 py-1.5 bg-[#1c1c1e] border-t border-[#2e2e2e] grid grid-cols-7 gap-1 items-center z-30 shrink-0">
        <button
          onClick={() => {
            setGlobalSearchInitialQuery('');
            setIsGlobalSearchOpen(true);
          }}
          className="h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all active:scale-95 cursor-pointer border bg-transparent hover:bg-[#2a2a2d] text-[#71aaeb] hover:text-white border-transparent"
          title="Поиск людей, сообществ, видео и фото"
        >
          <Search className="w-[18px] h-[18px] shrink-0" />
          <span className="leading-none truncate">Поиск</span>
        </button>

        <button
          onClick={() => handleOpenPostsFeed('all')}
          className={`h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all active:scale-95 cursor-pointer border ${
            activeScreen === 'posts' && postsInitialTab === 'all'
              ? 'bg-[#0077FF]/15 text-[#0077FF] border-[#0077FF]/35'
              : 'bg-transparent hover:bg-[#2a2a2d] text-[#939393] hover:text-white border-transparent'
          }`}
        >
          <ImageIcon className="w-[18px] h-[18px] shrink-0" />
          <span className="leading-none truncate">Новости</span>
        </button>

        <button
          onClick={handleOpenReelsFeed}
          className={`h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all active:scale-95 cursor-pointer border ${
            activeScreen === 'reels'
              ? 'bg-[#0077FF]/15 text-[#0077FF] border-[#0077FF]/35'
              : 'bg-transparent hover:bg-[#2a2a2d] text-[#939393] hover:text-white border-transparent'
          }`}
        >
          <Play className="w-[18px] h-[18px] shrink-0" />
          <span className="leading-none truncate">Клипы</span>
        </button>

        <button
          onClick={() => setActiveScreen('chats')}
          className={`h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all active:scale-95 cursor-pointer border ${
            activeScreen === 'chats'
              ? 'bg-[#0077FF]/15 text-[#0077FF] border-[#0077FF]/35'
              : 'bg-transparent hover:bg-[#2a2a2d] text-[#939393] hover:text-white border-transparent'
          }`}
        >
          <MessageSquare className="w-[18px] h-[18px] shrink-0" />
          <span className="leading-none truncate">Чаты</span>
        </button>

        <button
          onClick={() => setIsPlusMenuOpen(true)}
          className="h-12 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] text-white flex flex-col items-center justify-center gap-1 text-[10px] font-semibold cursor-pointer transition-all active:scale-95 shadow-md shadow-[#0077FF]/25 border border-[#0077FF]"
          title="Сервисы и создание"
        >
          <Plus className="w-[18px] h-[18px] stroke-[2.5] shrink-0" />
          <span className="leading-none truncate">Создать</span>
        </button>

        <button
          onClick={() => handleOpenPostsFeed('communities')}
          className={`h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all active:scale-95 cursor-pointer border ${
            activeScreen === 'posts' && postsInitialTab === 'communities'
              ? 'bg-[#0077FF]/15 text-[#0077FF] border-[#0077FF]/35'
              : 'bg-transparent hover:bg-[#2a2a2d] text-[#939393] hover:text-white border-transparent'
          }`}
        >
          <Layers className="w-[18px] h-[18px] shrink-0" />
          <span className="leading-none truncate">Группы</span>
        </button>

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
        >
          <UserIcon className="w-[18px] h-[18px] shrink-0" />
          <span className="leading-none truncate">Профиль</span>
        </button>
      </div>

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
        lastUser={lastLoggedUser || currentUser}
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

