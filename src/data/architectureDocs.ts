export const architectureData = {
  title: 'Архитектурный проект: NovaChat (NovaChat Hybrid)',
  summary: 'Высоконагруженная распределенная архитектура для гибридной платформы обмена сообщениями и медиа-контентом с поддержкой сквозного real-time взаимодействия, WebSockets, WebRTC и оптимизированного медиа-пайплайна.',
  components: [
    {
      layer: 'Frontend (Client Layer)',
      technologies: ['React (Web)', 'React Native / Expo (iOS/Android)', 'Zustand / TanStack Query', 'WebRTC API', 'IndexedDB / WatermelonDB'],
      description: 'Кроссплатформенный клиент с офлайн-first архитектурой. Локальный кэш сообщений и медиа в IndexedDB/SQLite. Синхронизация через WebSocket RPC. WebRTC PeerConnection для P2P-звонков и SFU-конференций.',
      features: [
        'Медиа-плеер Reels с preloading следующего сегмента видео (HLS/DASH)',
        'Stories viewer с таймером авто-ротации и pre-caching',
        'Аудио-рекордер и видео-граббер для круглых видеосообщений («кружочки») через MediaRecorder API (H.264 / Opus / WebM)',
        'Оптимистичные UI-мутации для отправки сообщений (optimistic updates)'
      ]
    },
    {
      layer: 'API Gateway & Backend Core',
      technologies: ['Python FastAPI / Node.js (TypeScript)', 'Uvicorn / Node Cluster', 'Redis (Sessions & Rate Limiting)', 'Pydantic / Zod'],
      description: 'REST / RPC API шлюз для аутентификации по OTP, управления профилями, генерации pre-signed S3 ссылок и администрирования групп/каналов.',
      features: [
        'Эндпоинты генерации и валидации 6-значных OTP с защитой от брутфорса (Token Bucket rate limiter в Redis)',
        'Выпуск короткоживущих Access JWT (15 мин) и Refresh JWT (30 дней) в HttpOnly Cookie / Header',
        'Модель прав доступа RBAC: Владелец, Администратор, Участник, Подписчик каналов',
        'Privacy Engine: маскирование статуса online/offline и номеров телефонов на уровне SQL/ORM сериализаторов'
      ]
    },
    {
      layer: 'Real-Time & Media Signaling',
      technologies: ['WebSockets (ws / FastAPI WebSockets)', 'Redis Pub/Sub & Streams', 'WebRTC Signaling', 'LiveKit / Mediasoup (SFU)'],
      description: 'Масштабируемый шлюз двусторонней связи. Удержание постоянных соединений с клиентами, рассылка сообщений по комнатам и топикам через Redis Pub/Sub шину.',
      features: [
        'WebSocket Heartbeat / Ping-Pong механизм обнаружения обрыва связи каждые 30 секунд',
        'Подписка на каналы чатов и топиков (topic threads) с точечным роутингом событий',
        'Обмен SDP-офферами/ответами и ICE-кандидатами для 1-on-1 и групповых звонков',
        'Presence-сервис (онлайн/офлайн/печатает) с учетом персональных настроек скрытности пользователей'
      ]
    },
    {
      layer: 'Data Storage & CDN Pipeline',
      technologies: ['PostgreSQL 16+', 'Redis 7.x (Cluster)', 'AWS S3 / MinIO / Cloudflare R2', 'Cloudflare CDN / AWS CloudFront'],
      description: 'Реляционная СУБД для консистентных связей, документов и сообщений. In-Memory кэш для OTP и сессий. S3 совместимое объектное хранилище с CDN для медиа.',
      features: [
        'Партиционирование таблицы messages по range (месяцы) для удержания индексов в RAM',
        'Автоматический жизненный цикл Stories: S3 Lifecycle Rule удаляет объекты через 24 часа + Cron/Postgres TTL worker',
        'Pre-signed URLs для прямой загрузки файлов клиентом минуя бэкенд (прямой S3 multipart upload)',
        'FFmpeg воркеры для транскодирования видео в HLS/MP4 (720p/1080p) и генерации WebP превью'
      ]
    }
  ],
  dataFlow: [
    {
      step: '1. Авторизация (OTP Flow)',
      detail: 'Клиент отправляет Phone/Email -> Сервер генерирует криптографически стойкий 6-значный OTP -> Хранит SHA-256 хэш в Redis с TTL=300с -> Отправляет через SMS/Email шлюз -> При валидации сверяет хэш и генерирует JWT Access/Refresh токены.'
    },
    {
      step: '2. Real-Time месседжинг',
      detail: 'Клиент подключается к WS с JWT в handshake-заголовке -> Сервер валидирует токен -> Клиент подписывается на chat_id -> При отправке сообщение пишется в Postgres, публикуется в Redis Pub/Sub и доставляется всем активным сокетам комнаты.'
    },
    {
      step: '3. Stories & Reels пайплайн',
      detail: 'Клиент запрашивает pre-signed PUT URL в S3 -> Загружает видео напрямую -> Сервер получает S3 Event Notification -> Запускает FFmpeg (сжатие, нарезка HLS) -> Запись создается с expires_at = NOW() + 24 HOURS для Stories.'
    },
    {
      step: '4. WebRTC звонки',
      detail: 'Инициатор шлет WS-сообщение "call_offer" (SDP) -> Сигнальный сервер пересылает адресату -> Адресат отвечает "call_answer" -> Стороны обмениваются ICE-кандидатами -> Устанавливается прямое P2P соединение (SRTP) или переключение на TURN/SFU.'
    }
  ]
};
