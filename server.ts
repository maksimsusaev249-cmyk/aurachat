import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const DB_FILE_PATH = path.resolve(__dirname, '.aurachat-shared-db.json');

// --- PostgreSQL Database Integration ---
const pgConnectionString = process.env.DATABASE_URL;
let pgPool: pg.Pool | null = null;

if (pgConnectionString) {
  try {
    pgPool = new Pool({
      connectionString: pgConnectionString,
      ssl: isProd ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    console.log('🐘 PostgreSQL pool initialized with DATABASE_URL');
  } catch (err) {
    console.warn('⚠️ Could not initialize PostgreSQL pool:', err);
  }
}

async function initPostgresTables() {
  if (!pgPool) return;
  try {
    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          display_name VARCHAR(255) NOT NULL,
          username VARCHAR(255) NOT NULL,
          avatar_url TEXT,
          phone VARCHAR(100),
          email VARCHAR(255),
          password_hash TEXT,
          pin_code VARCHAR(50),
          bio TEXT,
          is_online BOOLEAN DEFAULT true,
          last_seen VARCHAR(100) DEFAULT 'в сети',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS conversations (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(50) NOT NULL DEFAULT 'direct',
          title VARCHAR(255) NOT NULL,
          description TEXT,
          avatar_url TEXT,
          is_private BOOLEAN DEFAULT false,
          is_secret BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS conversation_members (
          conversation_id VARCHAR(255) REFERENCES conversations(id) ON DELETE CASCADE,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) DEFAULT 'member',
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (conversation_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS messages (
          id VARCHAR(255) PRIMARY KEY,
          conversation_id VARCHAR(255) REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          sender_name VARCHAR(255),
          sender_avatar TEXT,
          type VARCHAR(50) DEFAULT 'text',
          content TEXT NOT NULL,
          media_url TEXT,
          status VARCHAR(50) DEFAULT 'sent',
          is_edited BOOLEAN DEFAULT false,
          is_deleted BOOLEAN DEFAULT false,
          topic_id VARCHAR(255),
          media_meta JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS message_status (
          message_id VARCHAR(255) REFERENCES messages(id) ON DELETE CASCADE,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(50) DEFAULT 'delivered',
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (message_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS community_videos (
          id VARCHAR(255) PRIMARY KEY,
          community_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          user_avatar TEXT,
          type VARCHAR(50) DEFAULT 'video',
          title VARCHAR(255) NOT NULL,
          description TEXT,
          media_url TEXT NOT NULL,
          cover_url TEXT,
          playlist VARCHAR(255) DEFAULT 'Общие',
          category VARCHAR(100) DEFAULT 'Развлечения',
          privacy VARCHAR(50) DEFAULT 'public',
          views_count INT DEFAULT 0,
          likes_count INT DEFAULT 0,
          comments JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE community_videos ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Развлечения';
        ALTER TABLE community_videos ADD COLUMN IF NOT EXISTS privacy VARCHAR(50) DEFAULT 'public';

        CREATE TABLE IF NOT EXISTS video_watch_positions (
          user_id VARCHAR(255) NOT NULL,
          video_id VARCHAR(255) NOT NULL,
          position_sec INT DEFAULT 0,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, video_id)
        );
      `);
      console.log('✅ PostgreSQL tables (users, conversations, conversation_members, messages, message_status, community_videos, video_watch_positions) initialized successfully');
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn('⚠️ Error creating PostgreSQL tables:', err);
  }
}

// Call PostgreSQL initializer asynchronously
initPostgresTables();

// --- PostgreSQL Data Access Helpers ---
async function dbUpsertUser(u: any) {
  if (!pgPool || !u || !u.id) return;
  try {
    await pgPool.query(
      `INSERT INTO users (id, display_name, username, avatar_url, phone, email, bio, is_online, last_seen, pin_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         username = EXCLUDED.username,
         avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
         phone = COALESCE(EXCLUDED.phone, users.phone),
         email = COALESCE(EXCLUDED.email, users.email),
         bio = COALESCE(EXCLUDED.bio, users.bio),
         is_online = EXCLUDED.is_online,
         last_seen = EXCLUDED.last_seen,
         pin_code = COALESCE(EXCLUDED.pin_code, users.pin_code)`,
      [
        u.id,
        u.displayName || u.name || u.username || 'Пользователь',
        u.username || `user_${u.id}`,
        u.avatarUrl || u.avatar || null,
        u.phone || null,
        u.email || null,
        u.bio || null,
        u.isOnline ?? true,
        u.lastSeen || 'в сети',
        u.pinCode || null
      ]
    );
  } catch (e) {
    console.warn('Postgres user upsert notice:', e);
  }
}

async function dbUpsertConversation(chat: any, memberUserIds: string[] = []) {
  if (!pgPool || !chat || !chat.id) return;
  try {
    await pgPool.query(
      `INSERT INTO conversations (id, type, title, description, avatar_url, is_private, is_secret, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = COALESCE(EXCLUDED.description, conversations.description),
         avatar_url = COALESCE(EXCLUDED.avatar_url, conversations.avatar_url),
         updated_at = NOW()`,
      [
        chat.id,
        chat.type || 'direct',
        chat.title || 'Чат',
        chat.description || null,
        chat.avatarUrl || null,
        chat.isPrivate ?? false,
        chat.isSecretChat ?? false
      ]
    );

    for (const uid of memberUserIds) {
      if (!uid) continue;
      await pgPool.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT (conversation_id, user_id) DO NOTHING`,
        [chat.id, uid]
      );
    }
  } catch (e) {
    console.warn('Postgres conversation upsert notice:', e);
  }
}

async function dbInsertMessage(msg: any) {
  if (!pgPool || !msg || !msg.id || !msg.chatId || !msg.senderId) return;
  try {
    // Ensure user exists
    await dbUpsertUser({
      id: msg.senderId,
      displayName: msg.senderName,
      avatarUrl: msg.senderAvatar
    });

    // Ensure conversation exists
    await dbUpsertConversation({ id: msg.chatId, title: 'Переписка' }, [msg.senderId]);

    const createdAtIso = msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString();

    await pgPool.query(
      `INSERT INTO messages (id, conversation_id, sender_id, sender_name, sender_avatar, type, content, media_url, status, topic_id, media_meta, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       ON CONFLICT (id) DO UPDATE SET
         content = EXCLUDED.content,
         status = EXCLUDED.status,
         media_url = COALESCE(EXCLUDED.media_url, messages.media_url),
         updated_at = NOW()`,
      [
        msg.id,
        msg.chatId,
        msg.senderId,
        msg.senderName || 'Пользователь',
        msg.senderAvatar || null,
        msg.type || 'text',
        msg.content || '',
        msg.mediaUrl || null,
        msg.status || 'sent',
        msg.topicId || null,
        msg.mediaMeta ? JSON.stringify(msg.mediaMeta) : null,
        createdAtIso
      ]
    );

    await pgPool.query(
      `INSERT INTO message_status (message_id, user_id, status, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (message_id, user_id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()`,
      [msg.id, msg.senderId, msg.status || 'sent']
    );
  } catch (e) {
    console.warn('Postgres insert message notice:', e);
  }
}

async function dbUpdateMessageStatus(messageId: string, chatId: string, userId: string, status: string) {
  if (!pgPool || !messageId) return;
  try {
    await pgPool.query(
      `UPDATE messages SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, messageId]
    );

    if (userId) {
      await pgPool.query(
        `INSERT INTO message_status (message_id, user_id, status, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (message_id, user_id) DO UPDATE SET status = $3, updated_at = NOW()`,
        [messageId, userId, status]
      );
    }
  } catch (e) {
    console.warn('Postgres update message status notice:', e);
  }
}

async function dbGetMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
  if (!pgPool) return [];
  try {
    const res = await pgPool.query(
      `SELECT id, conversation_id as "chatId", sender_id as "senderId", sender_name as "senderName",
              sender_avatar as "senderAvatar", type, content, media_url as "mediaUrl",
              status, topic_id as "topicId", media_meta as "mediaMeta",
              created_at as "createdAt", is_edited as "isEdited", is_deleted as "isDeleted"
       FROM messages
       WHERE conversation_id = $1 AND is_deleted = false
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [chatId, limit, offset]
    );
    return res.rows.map((row) => ({
      ...row,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString()
    }));
  } catch (e) {
    console.warn('Postgres get messages notice:', e);
    return [];
  }
}

async function dbSearchMessages(queryText: string, userId: string, chatId?: string, limit: number = 30): Promise<any[]> {
  if (!pgPool) return [];
  try {
    const searchPattern = `%${queryText}%`;
    let sql = `
      SELECT m.id, m.conversation_id as "chatId", m.sender_id as "senderId", m.sender_name as "senderName",
             m.sender_avatar as "senderAvatar", m.type, m.content, m.media_url as "mediaUrl",
             m.status, m.topic_id as "topicId", m.media_meta as "mediaMeta",
             m.created_at as "createdAt"
      FROM messages m
      JOIN conversation_members cm ON m.conversation_id = cm.conversation_id
      WHERE cm.user_id = $1
        AND m.is_deleted = false
        AND (m.content ILIKE $2 OR m.sender_name ILIKE $2)
    `;
    const params: any[] = [userId, searchPattern];

    if (chatId) {
      params.push(chatId);
      sql += ` AND m.conversation_id = $${params.length}`;
    }

    sql += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const res = await pgPool.query(sql, params);
    return res.rows.map((row) => ({
      ...row,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString()
    }));
  } catch (e) {
    console.warn('Postgres search messages notice:', e);
    return [];
  }
}

async function dbInsertCommunityVideo(vid: any) {
  if (!pgPool || !vid || !vid.id || !vid.communityId || !vid.mediaUrl) return;
  try {
    await pgPool.query(
      `INSERT INTO community_videos (id, community_id, user_id, user_name, user_avatar, type, title, description, media_url, cover_url, playlist, category, privacy, views_count, likes_count, comments, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         cover_url = EXCLUDED.cover_url,
         playlist = EXCLUDED.playlist,
         category = EXCLUDED.category,
         privacy = EXCLUDED.privacy`,
      [
        vid.id,
        vid.communityId,
        vid.userId,
        vid.userName || 'Участник',
        vid.userAvatar || null,
        vid.type || 'video',
        vid.title || 'Видеозапись',
        vid.description || null,
        vid.mediaUrl,
        vid.coverUrl || null,
        vid.playlist || 'Общие',
        vid.category || 'Развлечения',
        vid.privacy || 'public',
        vid.viewsCount || 0,
        vid.likesCount || 0,
        JSON.stringify(vid.comments || [])
      ]
    );
  } catch (e) {
    console.warn('Postgres insert community video notice:', e);
  }
}

async function dbGetCommunityVideos(communityId: string): Promise<any[]> {
  if (!pgPool || !communityId) return [];
  try {
    const res = await pgPool.query(
      `SELECT id, community_id as "communityId", user_id as "userId", user_name as "userName",
              user_avatar as "userAvatar", type, title, description, media_url as "mediaUrl",
              cover_url as "coverUrl", playlist, category, privacy,
              views_count as "viewsCount", likes_count as "likesCount",
              comments, created_at as "createdAt"
       FROM community_videos
       WHERE community_id = $1
       ORDER BY created_at DESC`,
      [communityId]
    );
    return res.rows.map((row) => ({
      ...row,
      privacy: row.privacy || 'public',
      playlist: row.playlist || 'Общие',
      category: row.category || 'Развлечения',
      comments: typeof row.comments === 'string' ? JSON.parse(row.comments) : row.comments || [],
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString()
    }));
  } catch (e) {
    console.warn('Postgres get community videos notice:', e);
    return [];
  }
}

async function dbLikeCommunityVideo(videoId: string, increment: boolean = true) {
  if (!pgPool || !videoId) return;
  try {
    await pgPool.query(
      `UPDATE community_videos SET likes_count = GREATEST(0, likes_count + $1) WHERE id = $2`,
      [increment ? 1 : -1, videoId]
    );
  } catch (e) {
    console.warn('Postgres like community video notice:', e);
  }
}

async function dbCommentCommunityVideo(videoId: string, comment: any) {
  if (!pgPool || !videoId || !comment) return;
  try {
    await pgPool.query(
      `UPDATE community_videos
       SET comments = COALESCE(comments, '[]'::jsonb) || $1::jsonb
       WHERE id = $2`,
      [JSON.stringify([comment]), videoId]
    );
  } catch (e) {
    console.warn('Postgres comment community video notice:', e);
  }
}

async function dbViewCommunityVideo(videoId: string) {
  if (!pgPool || !videoId) return;
  try {
    await pgPool.query(
      `UPDATE community_videos SET views_count = views_count + 1 WHERE id = $1`,
      [videoId]
    );
  } catch (e) {
    console.warn('Postgres view community video notice:', e);
  }
}




interface ServerPlatformState {
  savedAccounts: any[];
  userChatsMap: Record<string, any[]>;
  globalCatalogChats: any[];
  messagesMap: Record<string, any[]>;
  communities: any[];
  stories: any[];
  posts: any[];
  reels: any[];
  callsMap: Record<string, any[]>;
  deletedIds: string[];
  updatedAt: number;
}

const defaultServerState: ServerPlatformState = {
  savedAccounts: [],
  userChatsMap: {},
  globalCatalogChats: [],
  messagesMap: {},
  communities: [],
  stories: [],
  posts: [],
  reels: [],
  callsMap: {},
  deletedIds: [],
  updatedAt: Date.now()
};

const MOCK_USER_IDS = new Set([
  'usr_me',
  'usr_durov',
  'u_durov',
  'usr_elena',
  'usr_mark',
  'usr_alex',
  'usr_sofia',
  'u_anna',
  'usr_spammer_1',
  'usr_troll_1'
]);

export function isMockOrSyntheticUser(u: any): boolean {
  if (!u) return true;
  const id = String(u.id || u.userId || '').trim();
  const uname = String(u.username || '').trim().toLowerCase();
  if (!id) return true;
  if (MOCK_USER_IDS.has(id)) return true;
  if (id.startsWith('peer_') || id.startsWith('usr_')) return true;
  if (
    uname === 'alex_dev' ||
    uname === 'durov' ||
    uname === 'elena_ux' ||
    uname === 'mark_arch' ||
    uname === 'alex_ops' ||
    uname === 'sofia_live'
  ) {
    return true;
  }
  return false;
}

function loadServerState(): ServerPlatformState {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      const deletedIds: string[] = Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [];
      const deletedSet = new Set(deletedIds);
      const cleanAccounts = Array.isArray(parsed.savedAccounts)
        ? parsed.savedAccounts.filter((u: any) => !isMockOrSyntheticUser(u))
        : [];
      return {
        ...defaultServerState,
        ...parsed,
        savedAccounts: cleanAccounts,
        userChatsMap: parsed.userChatsMap && typeof parsed.userChatsMap === 'object' ? parsed.userChatsMap : {},
        globalCatalogChats: Array.isArray(parsed.globalCatalogChats)
          ? parsed.globalCatalogChats.filter((c: any) => c && !deletedSet.has(c.id))
          : [],
        messagesMap: parsed.messagesMap && typeof parsed.messagesMap === 'object' ? parsed.messagesMap : {},
        communities: Array.isArray(parsed.communities)
          ? parsed.communities.filter((c: any) => c && !deletedSet.has(c.id))
          : [],
        stories: Array.isArray(parsed.stories)
          ? parsed.stories.filter((s: any) => s && !deletedSet.has(s.id))
          : [],
        posts: Array.isArray(parsed.posts)
          ? parsed.posts.filter((p: any) => p && !deletedSet.has(p.id))
          : [],
        reels: Array.isArray(parsed.reels)
          ? parsed.reels.filter((r: any) => r && !deletedSet.has(r.id))
          : [],
        callsMap: parsed.callsMap && typeof parsed.callsMap === 'object' ? parsed.callsMap : {},
        deletedIds
      };
    }
  } catch (err) {
    console.warn('Could not load .aurachat-shared-db.json, starting fresh:', err);
  }
  return { ...defaultServerState };
}

let serverState: ServerPlatformState = loadServerState();
let latestCallSignal: any = null;
let callSignalSeq = 0;
const callSignalsHistory: any[] = [];
let saveDebounceTimer: NodeJS.Timeout | null = null;

function persistServerStateToDisk() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(serverState, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to persist shared DB:', err);
    }
  }, 300);
}

// Connected SSE clients for instant real-time multi-user sync
const sseClients = new Set<express.Response>();

function broadcastSseEvent(eventType: string, payload: any) {
  const dataString = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach((clientRes) => {
    try {
      clientRes.write(dataString);
    } catch {
      sseClients.delete(clientRes);
    }
  });
}

// Helper: merge real registered user accounts without creating fake peer_* or mock accounts
function mergeUsersAndExtractDirectory(state: ServerPlatformState, incomingUsers?: any[]): any[] {
  const byId = new Map<string, any>();
  const usernameToId = new Map<string, string>();

  const upsertUser = (u: any) => {
    if (!u || isMockOrSyntheticUser(u)) return;
    const rawId = String(u.id || u.userId || '').trim();
    const rawUsername = String(u.username || '')
      .trim()
      .replace(/^@/, '');
    const rawName = String(u.displayName || u.name || rawUsername || '').trim();
    if (!rawId || (!rawUsername && !rawName)) return;

    const normUsername = (rawUsername || rawName.toLowerCase().replace(/\s+/g, '_')).toLowerCase();
    const existingId = byId.has(rawId) ? rawId : usernameToId.get(normUsername);
    const targetId = existingId || rawId;
    const prev = byId.get(targetId);

    if (!prev) {
      const created = {
        id: targetId,
        displayName: rawName || rawUsername || 'Пользователь',
        username: rawUsername || normUsername || `user_${targetId.slice(-4)}`,
        avatarUrl:
          u.avatarUrl ||
          u.avatar ||
          `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(rawName || targetId)}&backgroundColor=182533`,
        phone: u.phone || undefined,
        email: u.email || undefined,
        bio: u.bio || 'Пользователь AuraChat',
        isOnline: u.isOnline ?? true,
        lastSeen: u.lastSeen || 'в сети',
        pinCode: u.pinCode,
        hasPin: u.hasPin,
        password: u.password,
        settings: u.settings,
        hideOnlineStatus: u.hideOnlineStatus,
        hideContacts: u.hideContacts,
        isPrivate: u.isPrivate
      };
      byId.set(targetId, created);
      if (created.username) {
        usernameToId.set(created.username.toLowerCase(), targetId);
      }
    } else {
      const merged = {
        ...prev,
        ...u,
        id: prev.id,
        displayName: u.displayName || prev.displayName,
        username: u.username || prev.username,
        avatarUrl: u.avatarUrl || prev.avatarUrl,
        phone: u.phone || prev.phone,
        email: u.email || prev.email,
        bio: u.bio || prev.bio,
        pinCode: u.pinCode !== undefined ? u.pinCode : prev.pinCode,
        hasPin: u.hasPin !== undefined ? u.hasPin : prev.hasPin,
        password: u.password || prev.password
      };
      byId.set(targetId, merged);
      if (merged.username) {
        usernameToId.set(merged.username.toLowerCase(), targetId);
      }
    }
  };

  // 1. Existing real server accounts
  (state.savedAccounts || []).forEach((u) => upsertUser(u));

  // 2. Incoming real accounts from client
  if (Array.isArray(incomingUsers)) {
    incomingUsers.forEach((u) => upsertUser(u));
  }

  return Array.from(byId.values());
}

function mergeArrayById(existingList: any[] = [], incomingList: any[] = [], deletedSet?: Set<string>): any[] {
  const map = new Map<string, any>();
  existingList.forEach((item) => {
    if (item && item.id && (!deletedSet || !deletedSet.has(item.id))) {
      map.set(item.id, item);
    }
  });
  incomingList.forEach((item) => {
    if (item && item.id && (!deletedSet || !deletedSet.has(item.id))) {
      const prev = map.get(item.id);
      if (!prev) {
        map.set(item.id, item);
      } else {
        const prevTime = typeof prev.updatedAt === 'number' ? prev.updatedAt : 0;
        const nextTime = typeof item.updatedAt === 'number' ? item.updatedAt : 0;
        if (nextTime >= prevTime) {
          map.set(item.id, { ...prev, ...item });
        }
      }
    }
  });
  return Array.from(map.values());
}

function purgeDeletedFromServerState(deletedSet: Set<string>) {
  if (deletedSet.size === 0) return;

  serverState.posts = (serverState.posts || []).filter((p) => p && !deletedSet.has(p.id));
  serverState.reels = (serverState.reels || []).filter((r) => r && !deletedSet.has(r.id));
  serverState.stories = (serverState.stories || []).filter((s) => s && !deletedSet.has(s.id));
  serverState.communities = (serverState.communities || []).filter((c) => c && !deletedSet.has(c.id));
  serverState.globalCatalogChats = (serverState.globalCatalogChats || []).filter((c) => c && !deletedSet.has(c.id));

  Object.keys(serverState.messagesMap || {}).forEach((chatId) => {
    if (deletedSet.has(chatId) || deletedSet.has(`clear_${chatId}`)) {
      serverState.messagesMap[chatId] = [];
    } else if (Array.isArray(serverState.messagesMap[chatId])) {
      serverState.messagesMap[chatId] = serverState.messagesMap[chatId].filter(
        (m) => m && !deletedSet.has(m.id)
      );
    }
  });

  Object.keys(serverState.userChatsMap || {}).forEach((uid) => {
    if (Array.isArray(serverState.userChatsMap[uid])) {
      serverState.userChatsMap[uid] = serverState.userChatsMap[uid].filter(
        (c) => c && !deletedSet.has(c.id) && !deletedSet.has(`userchat_${uid}_${c.id}`)
      );
    }
  });

  Object.keys(serverState.callsMap || {}).forEach((uid) => {
    if (deletedSet.has(`clear_calls_${uid}`)) {
      serverState.callsMap[uid] = [];
    } else if (Array.isArray(serverState.callsMap[uid])) {
      serverState.callsMap[uid] = serverState.callsMap[uid].filter(
        (call) => call && !deletedSet.has(call.id)
      );
    }
  });
}

function mergePlatformState(incoming: Partial<ServerPlatformState>) {
  // 0. Merge deletedIds tombstones first
  const deletedSet = new Set<string>(serverState.deletedIds || []);
  if (Array.isArray(incoming.deletedIds)) {
    incoming.deletedIds.forEach((id) => {
      if (id && typeof id === 'string') deletedSet.add(id);
    });
  }
  serverState.deletedIds = Array.from(deletedSet).slice(-5000);

  // 1. Merge userChatsMap
  if (incoming.userChatsMap && typeof incoming.userChatsMap === 'object') {
    Object.keys(incoming.userChatsMap).forEach((uid) => {
      const incomingChats = incoming.userChatsMap![uid];
      if (Array.isArray(incomingChats)) {
        const existingChats = serverState.userChatsMap[uid] || [];
        serverState.userChatsMap[uid] = mergeArrayById(existingChats, incomingChats, deletedSet).filter(
          (c) => !deletedSet.has(`userchat_${uid}_${c.id}`)
        );
      }
    });
  }

  // 2. Merge globalCatalogChats, communities, stories, posts, reels
  if (Array.isArray(incoming.globalCatalogChats)) {
    serverState.globalCatalogChats = mergeArrayById(
      serverState.globalCatalogChats,
      incoming.globalCatalogChats,
      deletedSet
    );
  }
  if (Array.isArray(incoming.communities)) {
    serverState.communities = mergeArrayById(serverState.communities, incoming.communities, deletedSet);
  }
  if (Array.isArray(incoming.stories)) {
    serverState.stories = mergeArrayById(serverState.stories, incoming.stories, deletedSet);
  }
  if (Array.isArray(incoming.posts)) {
    serverState.posts = mergeArrayById(serverState.posts, incoming.posts, deletedSet);
  }
  if (Array.isArray(incoming.reels)) {
    serverState.reels = mergeArrayById(serverState.reels, incoming.reels, deletedSet);
  }

  // 3. Merge messagesMap
  if (incoming.messagesMap && typeof incoming.messagesMap === 'object') {
    Object.keys(incoming.messagesMap).forEach((chatId) => {
      const incomingMsgs = incoming.messagesMap![chatId];
      if (Array.isArray(incomingMsgs)) {
        const existingMsgs = serverState.messagesMap[chatId] || [];
        serverState.messagesMap[chatId] = mergeArrayById(existingMsgs, incomingMsgs, deletedSet);
      }
    });
  }

  // 4. Merge callsMap
  if (incoming.callsMap && typeof incoming.callsMap === 'object') {
    Object.keys(incoming.callsMap).forEach((uid) => {
      const incomingCalls = incoming.callsMap![uid];
      if (Array.isArray(incomingCalls)) {
        const existingCalls = serverState.callsMap[uid] || [];
        serverState.callsMap[uid] = mergeArrayById(existingCalls, incomingCalls, deletedSet);
      }
    });
  }

  // Purge any newly added tombstones from all lists
  purgeDeletedFromServerState(deletedSet);

  // 5. Merge savedAccounts & harvest any missing users from chats/messages/posts
  serverState.savedAccounts = mergeUsersAndExtractDirectory(serverState, incoming.savedAccounts);
  serverState.updatedAt = Date.now();

  persistServerStateToDisk();
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // --- 1. Real-Time SSE Stream (/api/events) ---
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders?.();

    sseClients.add(res);

    // Send initial authoritative platform state immediately on connect
    res.write(`event: PLATFORM_STATE\ndata: ${JSON.stringify(serverState)}\n\n`);

    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // --- 2. Get Shared Platform State (/api/platform-state) ---
  app.get('/api/platform-state', (_req, res) => {
    serverState.savedAccounts = mergeUsersAndExtractDirectory(serverState);
    res.json(serverState);
  });

  // --- 3. Update & Merge Shared Platform State (/api/platform-state) ---
  app.post('/api/platform-state', (req, res) => {
    try {
      const incoming = req.body || {};
      mergePlatformState(incoming);
      broadcastSseEvent('PLATFORM_STATE', serverState);
      res.json({ ok: true, updatedAt: serverState.updatedAt, usersCount: serverState.savedAccounts.length });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  // --- 3.1. Permanent Item Deletion Endpoint (/api/delete-item) ---
  app.post('/api/delete-item', (req, res) => {
    try {
      const { ids, clearChatId, clearCallsUserId } = req.body || {};
      const deletedSet = new Set<string>(serverState.deletedIds || []);
      if (Array.isArray(ids)) {
        ids.forEach((id: any) => {
          if (id && typeof id === 'string') deletedSet.add(id);
        });
      }
      if (clearChatId && typeof clearChatId === 'string') {
        serverState.messagesMap[clearChatId] = [];
      }
      if (clearCallsUserId && typeof clearCallsUserId === 'string') {
        serverState.callsMap[clearCallsUserId] = [];
      }
      serverState.deletedIds = Array.from(deletedSet).slice(-5000);
      purgeDeletedFromServerState(deletedSet);
      serverState.updatedAt = Date.now();
      persistServerStateToDisk();
      broadcastSseEvent('PLATFORM_STATE', serverState);
      res.json({ ok: true, deletedIds: serverState.deletedIds });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  // --- 4. Sync / Register Single User Account Immediately (/api/users/sync) ---
  app.post('/api/users/sync', (req, res) => {
    try {
      const { user, userChats } = req.body || {};
      if (user) {
        mergePlatformState({
          savedAccounts: [user],
          ...(userChats && user.id ? { userChatsMap: { [user.id]: userChats } } : {})
        });
        if (pgPool) {
          dbUpsertUser(user);
          if (Array.isArray(userChats)) {
            userChats.forEach((c: any) => dbUpsertConversation(c, [user.id]));
          }
        }
        broadcastSseEvent('PLATFORM_STATE', serverState);
      }
      res.json({ ok: true, users: serverState.savedAccounts });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  // --- 4.1. Server-Side Message Sending (/api/messages) ---
  app.post('/api/messages', async (req, res) => {
    try {
      const authUserId = (req.headers['x-user-id'] as string) || req.body?.senderId;
      const msg = req.body || {};

      if (!msg || !msg.chatId || !msg.senderId) {
        res.status(400).json({ error: 'Missing required parameters: chatId and senderId' });
        return;
      }

      if (authUserId && authUserId !== msg.senderId) {
        res.status(403).json({ error: 'Forbidden: senderId does not match authorization header' });
        return;
      }

      const formattedMsg = {
        id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        chatId: String(msg.chatId),
        topicId: msg.topicId || undefined,
        senderId: String(msg.senderId),
        senderName: String(msg.senderName || 'Пользователь'),
        senderAvatar: String(msg.senderAvatar || ''),
        type: msg.type || 'text',
        content: String(msg.content || ''),
        mediaUrl: msg.mediaUrl || undefined,
        mediaMeta: msg.mediaMeta || undefined,
        createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
        status: msg.status || 'sent'
      };

      // 1. Persist to PostgreSQL database (if DATABASE_URL configured)
      await dbInsertMessage(formattedMsg);

      // 2. Persist to in-memory/JSON platform state
      const chatId = formattedMsg.chatId;
      const existingMsgs = serverState.messagesMap[chatId] || [];
      if (!existingMsgs.some((m) => m.id === formattedMsg.id)) {
        serverState.messagesMap[chatId] = [...existingMsgs, formattedMsg];
        serverState.updatedAt = Date.now();
        persistServerStateToDisk();
      }

      // 3. Real-time broadcast to all connected clients via SSE
      broadcastSseEvent('NEW_MESSAGE', {
        chatId,
        message: formattedMsg,
        senderId: formattedMsg.senderId
      });

      broadcastSseEvent('PLATFORM_STATE', serverState);

      res.status(201).json({ ok: true, message: formattedMsg });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  // --- 4.2. Get Message History with Pagination (/api/messages) ---
  app.get('/api/messages', async (req, res) => {
    try {
      const chatId = String(req.query.chatId || '').trim();
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
      const offset = Math.max(0, Number(req.query.offset || 0));

      if (!chatId) {
        res.status(400).json({ error: 'Missing query parameter: chatId' });
        return;
      }

      // Try database query first
      let messagesList = await dbGetMessages(chatId, limit, offset);

      // Fallback to server state if database returns no records
      if (!messagesList || messagesList.length === 0) {
        const memoryMsgs = serverState.messagesMap[chatId] || [];
        messagesList = memoryMsgs.slice(offset, offset + limit);
      }

      res.json({
        chatId,
        messages: messagesList,
        total: (serverState.messagesMap[chatId] || []).length || messagesList.length,
        limit,
        offset
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  // --- 4.3. Update Real Message Status (/api/messages/status) ---
  app.post('/api/messages/status', async (req, res) => {
    try {
      const { messageId, chatId, userId, status } = req.body || {};
      const authUserId = (req.headers['x-user-id'] as string) || userId;

      if (!messageId || !chatId || !status) {
        res.status(400).json({ error: 'Missing required parameters: messageId, chatId, status' });
        return;
      }

      const validStatuses = new Set(['sending', 'sent', 'delivered', 'read']);
      if (!validStatuses.has(status)) {
        res.status(400).json({ error: 'Invalid message status value' });
        return;
      }

      // Update in PostgreSQL
      await dbUpdateMessageStatus(messageId, chatId, authUserId, status);

      // Update in server memory state
      const chatMsgs = serverState.messagesMap[chatId];
      if (Array.isArray(chatMsgs)) {
        serverState.messagesMap[chatId] = chatMsgs.map((m) =>
          m.id === messageId ? { ...m, status } : m
        );
        serverState.updatedAt = Date.now();
        persistServerStateToDisk();
      }

      // Real-time broadcast status change
      broadcastSseEvent('MESSAGE_STATUS', {
        messageId,
        chatId,
        userId: authUserId,
        status,
        timestamp: Date.now()
      });

      res.json({ ok: true, messageId, chatId, status });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  // --- 4.4. Server-Side Message Search (/api/messages/search) ---
  app.get('/api/messages/search', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const userId = (req.headers['x-user-id'] as string) || String(req.query.userId || '').trim();
      const chatId = String(req.query.chatId || '').trim();
      const limit = Math.min(50, Math.max(1, Number(req.query.limit || 30)));

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: missing user authorization for message search' });
        return;
      }

      if (!q) {
        res.json({ messages: [] });
        return;
      }

      // Database search with access check
      let results = await dbSearchMessages(q, userId, chatId, limit);

      // In-memory fallback search if database yields no records
      if (!results || results.length === 0) {
        const queryLower = q.toLowerCase();
        const found: any[] = [];
        const userChats = serverState.userChatsMap[userId] || serverState.globalCatalogChats || [];
        const allowedChatIds = new Set(userChats.map((c: any) => c.id));

        Object.keys(serverState.messagesMap || {}).forEach((cId) => {
          if (chatId && cId !== chatId) return;
          // Security check: restrict search to user's chats or global chats
          if (allowedChatIds.size > 0 && !allowedChatIds.has(cId) && !cId.startsWith('chat_comm_')) {
            return;
          }
          const msgs = serverState.messagesMap[cId] || [];
          msgs.forEach((m: any) => {
            if (!m || m.isDeleted) return;
            const content = String(m.content || '').toLowerCase();
            const senderName = String(m.senderName || '').toLowerCase();
            if (content.includes(queryLower) || senderName.includes(queryLower)) {
              found.push(m);
            }
          });
        });
        results = found.slice(0, limit);
      }

      res.json({ query: q, messages: results, count: results.length });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  // --- 4.5. Get User Conversations (/api/conversations) ---
  app.get('/api/conversations', (req, res) => {
    try {
      const userId = (req.headers['x-user-id'] as string) || String(req.query.userId || '').trim();
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: missing user authorization' });
        return;
      }
      const userChats = serverState.userChatsMap[userId] || serverState.globalCatalogChats || [];
      res.json({ conversations: userChats });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  // --- 4.6. Community Videos & Reels Endpoints (/api/community-videos) ---
  app.get('/api/community-videos', async (req, res) => {
    try {
      const communityId = String(req.query.communityId || '').trim();
      if (!communityId) {
        res.status(400).json({ error: 'Missing communityId parameter' });
        return;
      }
      let videos = await dbGetCommunityVideos(communityId);
      if (!videos || videos.length === 0) {
        const stateMap = (serverState as any).communityVideosMap || {};
        videos = stateMap[communityId] || [];
      }
      res.json({ videos });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  app.post('/api/community-videos', async (req, res) => {
    try {
      const vid = req.body || {};
      if (!vid.communityId || !vid.userId || !vid.mediaUrl || !vid.title) {
        res.status(400).json({ error: 'Missing required parameters for community video' });
        return;
      }

      const formattedVid = {
        id: vid.id || `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        communityId: String(vid.communityId),
        userId: String(vid.userId),
        userName: String(vid.userName || 'Участник'),
        userAvatar: String(vid.userAvatar || ''),
        type: vid.type === 'reel' ? 'reel' : 'video',
        title: String(vid.title),
        description: String(vid.description || ''),
        mediaUrl: String(vid.mediaUrl),
        coverUrl: vid.coverUrl || undefined,
        playlist: String(vid.playlist || 'Общие'),
        category: String(vid.category || 'Развлечения'),
        privacy: vid.privacy === 'private' || vid.privacy === 'unlisted' ? vid.privacy : 'public',
        viewsCount: Number(vid.viewsCount || 0),
        likesCount: Number(vid.likesCount || 0),
        comments: Array.isArray(vid.comments) ? vid.comments : [],
        createdAt: vid.createdAt ? new Date(vid.createdAt).toISOString() : new Date().toISOString()
      };

      await dbInsertCommunityVideo(formattedVid);

      // Memory fallback store
      if (!(serverState as any).communityVideosMap) {
        (serverState as any).communityVideosMap = {};
      }
      const existing = (serverState as any).communityVideosMap[formattedVid.communityId] || [];
      (serverState as any).communityVideosMap[formattedVid.communityId] = [formattedVid, ...existing.filter((v: any) => v.id !== formattedVid.id)];
      serverState.updatedAt = Date.now();
      persistServerStateToDisk();

      broadcastSseEvent('COMMUNITY_VIDEO_NEW', { video: formattedVid });

      res.status(201).json({ ok: true, video: formattedVid });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  app.delete('/api/community-videos', async (req, res) => {
    try {
      const communityId = String(req.query.communityId || '').trim();
      if (!communityId) {
        res.status(400).json({ error: 'Missing communityId parameter' });
        return;
      }
      if (pgPool) {
        await pgPool.query(`DELETE FROM community_videos WHERE community_id = $1`, [communityId]);
      }
      if ((serverState as any).communityVideosMap) {
        delete (serverState as any).communityVideosMap[communityId];
        persistServerStateToDisk();
      }
      broadcastSseEvent('COMMUNITY_VIDEOS_CLEARED', { communityId });
      res.json({ success: true, cleared: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  app.put('/api/community-videos', async (req, res) => {
    try {
      const vid = req.body || {};
      if (!vid.id) {
        res.status(400).json({ error: 'Missing video id' });
        return;
      }
      await dbInsertCommunityVideo(vid);
      const map = (serverState as any).communityVideosMap || {};
      for (const cid of Object.keys(map)) {
        map[cid] = map[cid].map((v: any) => (v.id === vid.id ? { ...v, ...vid } : v));
      }
      persistServerStateToDisk();
      broadcastSseEvent('COMMUNITY_VIDEO_UPDATED', { video: vid });
      res.json({ ok: true, video: vid });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  app.delete('/api/community-videos/one', async (req, res) => {
    try {
      const videoId = String(req.query.videoId || '').trim();
      if (!videoId) {
        res.status(400).json({ error: 'Missing videoId parameter' });
        return;
      }
      if (pgPool) {
        await pgPool.query(`DELETE FROM community_videos WHERE id = $1`, [videoId]);
      }
      const map = (serverState as any).communityVideosMap || {};
      for (const cid of Object.keys(map)) {
        map[cid] = map[cid].filter((v: any) => v.id !== videoId);
      }
      persistServerStateToDisk();
      broadcastSseEvent('COMMUNITY_VIDEO_DELETED', { videoId });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  app.post('/api/community-videos/like', async (req, res) => {
    try {
      const { videoId, increment } = req.body || {};
      if (!videoId) {
        res.status(400).json({ error: 'Missing videoId' });
        return;
      }
      await dbLikeCommunityVideo(videoId, increment ?? true);
      res.json({ ok: true, videoId, liked: increment ?? true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  app.post('/api/community-videos/comment', async (req, res) => {
    try {
      const { videoId, comment } = req.body || {};
      if (!videoId || !comment) {
        res.status(400).json({ error: 'Missing videoId or comment' });
        return;
      }
      await dbCommentCommunityVideo(videoId, comment);
      res.json({ ok: true, videoId, comment });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  app.post('/api/community-videos/view', async (req, res) => {
    try {
      const { videoId } = req.body || {};
      if (!videoId) {
        res.status(400).json({ error: 'Missing videoId' });
        return;
      }
      await dbViewCommunityVideo(videoId);
      res.json({ ok: true, videoId });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  app.get('/api/community-videos/watch-position', async (req, res) => {
    try {
      const videoId = String(req.query.videoId || '').trim();
      const userId = String(req.query.userId || req.headers['x-user-id'] || '').trim();
      if (!videoId || !userId) {
        res.status(400).json({ error: 'Missing videoId or userId' });
        return;
      }
      let positionSec = 0;
      if (pgPool) {
        const row = await pgPool.query(
          'SELECT position_sec FROM video_watch_positions WHERE user_id = $1 AND video_id = $2',
          [userId, videoId]
        );
        if (row.rows.length > 0) {
          positionSec = Number(row.rows[0].position_sec || 0);
        }
      }
      res.json({ videoId, userId, positionSec });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  app.post('/api/community-videos/watch-position', async (req, res) => {
    try {
      const { videoId, userId, positionSec } = req.body || {};
      if (!videoId || !userId) {
        res.status(400).json({ error: 'Missing videoId or userId' });
        return;
      }
      const pos = Math.max(0, Math.floor(Number(positionSec || 0)));
      if (pgPool) {
        await pgPool.query(
          `INSERT INTO video_watch_positions (user_id, video_id, position_sec, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id, video_id) DO UPDATE SET
             position_sec = EXCLUDED.position_sec,
             updated_at = NOW()`,
          [userId, videoId, pos]
        );
      }
      res.json({ ok: true, videoId, userId, positionSec: pos });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || String(err) });
    }
  });


  // --- 5. Global Shared Users Directory & Search (/api/users & /api/users/search) ---
  const handleUsersSearch = (req: express.Request, res: express.Response) => {
    const allUsers = mergeUsersAndExtractDirectory(serverState);
    serverState.savedAccounts = allUsers;
    const q = String(req.query.q || '')
      .trim()
      .toLowerCase()
      .replace(/^@/, '');
    if (!q) {
      res.json({ users: allUsers });
      return;
    }
    const digitsOnly = q.replace(/\D/g, '');
    const filtered = allUsers.filter((u) => {
      const name = String(u.displayName || '').toLowerCase();
      const uname = String(u.username || '').toLowerCase();
      const phone = String(u.phone || '').toLowerCase();
      const email = String(u.email || '').toLowerCase();
      const id = String(u.id || '').toLowerCase();
      if (
        name.includes(q) ||
        uname.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        id.includes(q)
      ) {
        return true;
      }
      if (digitsOnly.length >= 3) {
        if (name.includes(digitsOnly) || uname.includes(digitsOnly) || phone.replace(/\D/g, '').includes(digitsOnly)) {
          return true;
        }
      }
      return false;
    });
    res.json({ users: filtered });
  };

  app.get('/api/users', handleUsersSearch);
  app.get('/api/users/search', handleUsersSearch);

  app.delete('/api/users/:id', (req, res) => {
    const targetId = String(req.params.id || '').trim();
    if (targetId) {
      serverState.savedAccounts = (serverState.savedAccounts || []).filter((u) => u.id !== targetId);
      delete serverState.userChatsMap[targetId];
      delete serverState.callsMap[targetId];
      serverState.updatedAt = Date.now();
      persistServerStateToDisk();
      broadcastSseEvent('PLATFORM_STATE', serverState);
    }
    res.json({ ok: true, users: serverState.savedAccounts });
  });

  // --- 6. Real-Time WebRTC Call Signaling via Shared Server (/api/call-signal) ---
  app.post('/api/call-signal', (req, res) => {
    callSignalSeq += 1;
    const now = Date.now();
    const signalItem = {
      ...(req.body || {}),
      seq: callSignalSeq,
      signalId: req.body?.signalId || `sig_${now}_${callSignalSeq}`,
      timestamp: now
    };
    latestCallSignal = signalItem;
    // Keep non-frame signaling history in the queue so SDP/ICE/state signals are never dropped
    if (signalItem.type !== 'LIVE_VIDEO_FRAME') {
      callSignalsHistory.push(signalItem);
      if (callSignalsHistory.length > 80) {
        callSignalsHistory.splice(0, callSignalsHistory.length - 80);
      }
    }
    broadcastSseEvent('CALL_SIGNAL', signalItem);
    res.json({ ok: true, seq: callSignalSeq });
  });

  app.get('/api/call-signal', (req, res) => {
    const sinceSeq = Number(req.query.sinceSeq || 0);
    const cutoff = Date.now() - 120000;
    const signals = callSignalsHistory.filter(
      (s) => s && s.timestamp >= cutoff && (sinceSeq > 0 ? s.seq > sinceSeq : true)
    );
    res.json({
      signal: latestCallSignal,
      signals,
      seq: callSignalSeq
    });
  });

  // API Route: /api/download (Proxy media files for direct browser download)
  app.get('/api/download', async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      const rawName = (req.query.name as string) || 'download';

      if (!targetUrl) {
        res.status(400).send('Missing url parameter');
        return;
      }

      const response = await fetch(targetUrl);
      if (!response.ok) {
        res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
        return;
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(rawName)}"`);
      res.setHeader('Access-Control-Allow-Origin', '*');

      const arrayBuffer = await response.arrayBuffer();
      res.status(200).send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      res.status(500).send(`Error: ${err?.message || String(err)}`);
    }
  });

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'custom'
      });
      app.use(vite.middlewares);

      app.get('*', async (req, res, next) => {
        try {
          const url = req.originalUrl;
          const indexPath = path.resolve(__dirname, 'index.html');
          if (fs.existsSync(indexPath)) {
            let template = fs.readFileSync(indexPath, 'utf-8');
            template = await vite.transformIndexHtml(url, template);
            res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          } else {
            next();
          }
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
    } catch (e) {
      console.warn('Vite dev middleware fallback', e);
    }
  }

  // Determine dist folder accurately whether running server.ts directly or running compiled dist/server.js
  const isInsideDist = __dirname.endsWith('dist') || (fs.existsSync(path.join(__dirname, 'index.html')) && fs.existsSync(path.join(__dirname, 'assets')));
  const distPath = isInsideDist ? __dirname : path.resolve(__dirname, 'dist');

  console.log(`📁 Serving static assets from: ${distPath}`);

  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));

    // SPA Fallback: serve dist/index.html for all non-asset routes
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        const rootIndex = path.resolve(__dirname, 'index.html');
        if (fs.existsSync(rootIndex)) {
          res.sendFile(rootIndex);
        } else {
          res.status(404).send('AuraChat dist/index.html not found');
        }
      }
    });
  } else {
    app.get('*', (req, res) => {
      const rootIndex = path.resolve(__dirname, 'index.html');
      if (fs.existsSync(rootIndex)) {
        res.sendFile(rootIndex);
      } else {
        res.status(404).send('AuraChat index.html not found');
      }
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 AuraChat Shared Server running on port ${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

createServer();

