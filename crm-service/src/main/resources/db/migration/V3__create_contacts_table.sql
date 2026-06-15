-- ============================================================================
-- V3: contacts
--
-- People the team sells to / talks to. Each contact has exactly one owner
-- (the user responsible for the relationship) and optionally belongs to one
-- company. Deals, activities, and tasks may reference a contact.
--
-- Relationships:
--  - company_id -> companies.id (optional; SET NULL if the company is deleted)
--  - owner_id   -> users.id (required)
--
-- Note: the contact_tags many-to-many join table is created in V4, after the
-- tags table exists, since it has foreign keys into both contacts and tags.
-- ============================================================================
CREATE TABLE contacts (
    id          BIGSERIAL PRIMARY KEY,
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(255),
    phone       VARCHAR(50),
    title       VARCHAR(150),
    company_id  BIGINT REFERENCES companies(id) ON DELETE SET NULL,
    owner_id    BIGINT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_company_id ON contacts (company_id);
CREATE INDEX idx_contacts_owner_id ON contacts (owner_id);
CREATE INDEX idx_contacts_email ON contacts (email);
CREATE INDEX idx_contacts_name ON contacts (last_name, first_name);
