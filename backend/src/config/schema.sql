-- Smart Study Material Exchange Platform — PostgreSQL schema
-- Derived from Section 3.4 (Database Design) of the SDD.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector; -- pgvector, for semantic search embeddings

-- =========================================================
-- USERS  (base for Student / Admin via role column)
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name         VARCHAR(150) NOT NULL,
  email             VARCHAR(150) UNIQUE NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  role              VARCHAR(20)  NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  department        VARCHAR(100),
  student_id        VARCHAR(50),
  avatar_url        TEXT,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned         BOOLEAN NOT NULL DEFAULT FALSE,
  otp_code          VARCHAR(10),
  otp_expires_at    TIMESTAMPTZ,
  telegram_chat_id  VARCHAR(50) UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- BOOKS  (marketplace listings)
-- =========================================================
CREATE TABLE IF NOT EXISTS books (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  author          VARCHAR(150),
  department      VARCHAR(100),
  semester        VARCHAR(50),
  course_code     VARCHAR(50),
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  predicted_price NUMERIC(10,2),
  condition       VARCHAR(20) CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
  description     TEXT,
  images          TEXT[] DEFAULT '{}',
  status          VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'removed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_books_search ON books USING GIN (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(author,'') || ' ' || coalesce(course_code,''))
);

-- =========================================================
-- EXCHANGE REQUESTS
-- =========================================================
CREATE TABLE IF NOT EXISTS exchange_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id         UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  requester_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offered_book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  cash_amount     NUMERIC(10,2) DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'countered', 'accepted', 'rejected', 'cancelled')),
  message         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- NOTES / YOUTUBE NOTES / QUIZZES
-- =========================================================
CREATE TABLE IF NOT EXISTS notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploader_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  course_code     VARCHAR(50),
  department      VARCHAR(100),
  semester        VARCHAR(50),
  file_url        TEXT,
  source_type     VARCHAR(20) NOT NULL DEFAULT 'upload' CHECK (source_type IN ('upload', 'youtube')),
  raw_text        TEXT,
  summary         TEXT,
  embedding       vector(1536),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_embedding ON notes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS youtube_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id         UUID NOT NULL UNIQUE REFERENCES notes(id) ON DELETE CASCADE,
  video_url       TEXT NOT NULL,
  video_title     VARCHAR(300),
  transcript      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quizzes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(200),
  score           INTEGER,
  total_questions INTEGER,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id         UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  options         JSONB NOT NULL DEFAULT '[]',
  correct_option  INTEGER NOT NULL,
  student_answer  INTEGER,
  is_correct      BOOLEAN,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- MESSAGES
-- =========================================================
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT,
  attachment_url  TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (sender_id, receiver_id, created_at);

-- =========================================================
-- RATINGS  (polymorphic: target is a Book or a User)
-- =========================================================
CREATE TABLE IF NOT EXISTS ratings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rater_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type     VARCHAR(10) NOT NULL CHECK (target_type IN ('book', 'user')),
  target_id       UUID NOT NULL,
  score           INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- NOTIFICATIONS / TELEGRAM SESSIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS telegram_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  chat_id         VARCHAR(50) UNIQUE,
  link_code       VARCHAR(10),
  linked_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(30) NOT NULL, -- message | exchange_request | rating | system
  title           VARCHAR(200) NOT NULL,
  body            TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- ADVERTISEMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS advertisements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(200) NOT NULL,
  image_url       TEXT,
  link_url        TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  impressions     INTEGER NOT NULL DEFAULT 0,
  clicks          INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- REPORTS (content moderation)
-- =========================================================
CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type     VARCHAR(20) NOT NULL CHECK (target_type IN ('book', 'note', 'user', 'message')),
  target_id       UUID NOT NULL,
  reason          TEXT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- Trigger: auto-update updated_at
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','books','exchange_requests','notes'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I;', t);
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t);
  END LOOP;
END $$;
