-- ============================================================================
-- V5: deals
--
-- Sales opportunities ("deals") that progress through a fixed pipeline of
-- stages, visualised as a Kanban board (see docs/DESIGN.md, Deals - Kanban
-- Pipeline section). Each deal has exactly one owner and optionally links to
-- one contact.
--
-- Stage values (requirement DEA-03, in pipeline order):
--   LEAD -> QUALIFIED -> PROPOSAL -> NEGOTIATION -> CLOSED_WON / CLOSED_LOST
--
-- Relationships:
--  - contact_id -> contacts.id (optional; SET NULL if the contact is deleted)
--  - owner_id   -> users.id (required)
-- ============================================================================
CREATE TABLE deals (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(255)  NOT NULL,
    value       NUMERIC(14,2) NOT NULL DEFAULT 0,
    stage       VARCHAR(20)   NOT NULL DEFAULT 'LEAD',
    close_date  DATE,
    contact_id  BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    owner_id    BIGINT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_deals_stage CHECK (stage IN ('LEAD','QUALIFIED','PROPOSAL','NEGOTIATION','CLOSED_WON','CLOSED_LOST')),
    CONSTRAINT chk_deals_value_non_negative CHECK (value >= 0)
);

CREATE INDEX idx_deals_stage ON deals (stage);
CREATE INDEX idx_deals_contact_id ON deals (contact_id);
CREATE INDEX idx_deals_owner_id ON deals (owner_id);
