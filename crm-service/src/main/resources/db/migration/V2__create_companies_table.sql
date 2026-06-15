-- ============================================================================
-- V2: companies
--
-- Organisations that contacts can belong to (e.g. "Acme Corp"). A company is
-- optional on a contact — not every contact has to be associated with an
-- organisation.
--
-- Relationships:
--  - contacts.company_id -> companies.id (many contacts per company, V3)
--  - created_by -> users.id (the user who added this company record)
-- ============================================================================
CREATE TABLE companies (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    industry    VARCHAR(100),
    website     VARCHAR(255),
    phone       VARCHAR(50),
    address     VARCHAR(500),
    created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_name ON companies (name);
