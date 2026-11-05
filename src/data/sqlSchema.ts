export const sqlDDL = `-- ============================================================================
-- NOVACHAT: HYBRID TELEGRAM x INSTAGRAM PLATFORM DATABASE DDL (PostgreSQL 16+)
-- ============================================================================

-- Включение расширений для генерации UUID и криптографических функций
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ И ПРИВАТНОСТИ (USERS)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    -- Настройки приватности
    is_private BOOLEAN NOT NULL DEFAULT FALSE,          -- Скрытый профиль (только одобренные подписчики)
    hide_contacts BOOLEAN NOT NULL DEFAULT FALSE,        -- Скрытие номера/email от незнакомцев
    hide_online_status BOOLEAN NOT NULL DEFAULT FALSE,   -- Скрытие статуса "в сети" и "был недавно"
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_auth_identity CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_phone ON users (phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_email ON users (email) WHERE email IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. ТАБЛИЦА ВРЕМЕННЫХ OTP-КОДОВ (OTP_VERIFICATIONS)
-- ----------------------------------------------------------------------------
CREATE TABLE otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target VARCHAR(255) NOT NULL,                        -- Phone или Email
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('phone', 'email')),
    code_hash VARCHAR(128) NOT NULL,                    -- SHA-256 хэш 6-значного OTP
    attempts_left INT NOT NULL DEFAULT 3,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_target ON otp_verifications (target, is_used, expires_at);

-- ----------------------------------------------------------------------------
-- 3. ТАБЛИЦА ЧАТОВ И КАНАЛОВ (CHATS)
-- ----------------------------------------------------------------------------
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group', 'channel')),
    title VARCHAR(150),                                 -- Название для групп и каналов
    about TEXT,
    avatar_url TEXT,
    is_private BOOLEAN NOT NULL DEFAULT TRUE,           -- Публичный или приватный канал/группа
    invite_code VARCHAR(32) UNIQUE,                     -- Уникальная инвайт-ссылка novachat.app/join/...
    has_topics BOOLEAN NOT NULL DEFAULT FALSE,          -- Включены ли ветки-топики
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,   -- Требуется ли одобрение заявки владельцем/модером
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chats_type ON chats (type);
CREATE INDEX idx_chats_invite_code ON chats (invite_code) WHERE invite_code IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3.1. ТАБЛИЦА ЗАЯВОК НА ВСТУПЛЕНИЕ В ПРИВАТНЫЕ ГРУППЫ/КАНАЛЫ (JOIN REQUESTS)
-- ----------------------------------------------------------------------------
CREATE TABLE chat_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    UNIQUE (chat_id, user_id)
);

CREATE INDEX idx_join_requests_chat ON chat_join_requests (chat_id, status);

-- ----------------------------------------------------------------------------
-- 4. УЧАСТНИКИ ЧАТОВ И РОЛИ (CHAT_MEMBERS)
-- ----------------------------------------------------------------------------
CREATE TABLE chat_members (
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    custom_title VARCHAR(50),                           -- Кастомная плашка, например: "Tech Lead", "Модератор"
    permissions JSONB NOT NULL DEFAULT '{
        "can_send_messages": true,
        "can_send_media": true,
        "can_add_users": false,
        "can_pin_messages": false,
        "can_manage_topics": false
    }'::jsonb,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_chat_members_user ON chat_members (user_id);

-- ----------------------------------------------------------------------------
-- 5. ТОПИКИ / ТЕМЫ ВНУТРИ ЧАТОВ (CHAT_TOPICS)
-- ----------------------------------------------------------------------------
CREATE TABLE chat_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    icon_emoji VARCHAR(10) DEFAULT '💬',
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_topics_chat ON chat_topics (chat_id);

-- ----------------------------------------------------------------------------
-- 6. ТАБЛИЦА СООБЩЕНИЙ (MESSAGES)
-- ----------------------------------------------------------------------------
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES chat_topics(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN (
        'text', 'photo', 'video', 'voice', 'video_note', 'file', 'system'
    )),
    content TEXT,                                       -- Текст или подпись к медиа
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ
);

-- Составной индекс для быстрой подгрузки истории сообщений по времени
CREATE INDEX idx_messages_chat_created ON messages (chat_id, created_at DESC);
CREATE INDEX idx_messages_topic_created ON messages (topic_id, created_at DESC) WHERE topic_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 7. МЕДИАФАЙЛЫ (MEDIA)
-- ----------------------------------------------------------------------------
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN (
        'image', 'video', 'voice', 'video_note', 'document'
    )),
    url TEXT NOT NULL,                                  -- S3 / CDN постоянный URL
    thumbnail_url TEXT,
    duration_sec INT,                                   -- Длительность для аудио/видео/кружочков
    width INT,
    height INT,
    size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_message ON media (message_id) WHERE message_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 8. СОЦИАЛЬНЫЙ КОНТЕНТ: ПОСТЫ, REELS И STORIES (POSTS & STORIES)
-- ----------------------------------------------------------------------------
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('post', 'reel', 'story')),
    caption TEXT,
    media_id UUID REFERENCES media(id) ON DELETE RESTRICT,
    views_count BIGINT NOT NULL DEFAULT 0,
    likes_count BIGINT NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    -- Для Stories: автоматически истекают через 24 часа!
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Быстрая фильтрация активных историй (Stories), которые не истекли
CREATE INDEX idx_active_stories ON posts (author_id, expires_at)
WHERE type = 'story' AND expires_at > NOW();

CREATE INDEX idx_reels_created ON posts (created_at DESC)
WHERE type = 'reel';

-- ----------------------------------------------------------------------------
-- 9. ВЕТКИ КОММЕНТАРИЕВ ДЛЯ ПОСТОВ (POST_COMMENTS / THREADS)
-- ----------------------------------------------------------------------------
CREATE TABLE post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE, -- Древовидные ветки (Threads)
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post_parent ON post_comments (post_id, parent_comment_id, created_at ASC);
`;
