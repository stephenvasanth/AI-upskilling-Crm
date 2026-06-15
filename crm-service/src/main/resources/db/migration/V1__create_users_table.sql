-- ============================================================================
-- V1: users
--
-- Application users — the CRM team members who log in. Each user has a role
-- (ADMIN or USER) that gates access to admin-only endpoints (user
-- management, tag management). "active" lets an admin disable an account
-- without deleting it, preserving ownership history on contacts, deals,
-- tasks, and activities created by/assigned to that user.
-- ============================================================================
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'USER',
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'USER'))
);
