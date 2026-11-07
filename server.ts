import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const DB_FILE_PATH = path.resolve(__dirname, '.aurachat-shared-db.json');

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
        broadcastSseEvent('PLATFORM_STATE', serverState);
      }
      res.json({ ok: true, users: serverState.savedAccounts });
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

