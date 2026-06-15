-- ============================================================================
-- V6: activities
--
-- A timeline/log of interactions (calls, emails, meetings, notes) related to
-- a contact and/or a deal. Powers the Activity Feed and per-contact/per-deal
-- history.
--
-- Relationships:
--  - contact_id -> contacts.id (nullable; CASCADE delete with the contact)
--  - deal_id    -> deals.id (nullable; CASCADE delete with the deal)
--  - created_by -> users.id (required — who logged the activity)
--
-- An activity must be about something: at least one of contact_id / deal_id
-- must be set (enforced by chk_activities_linked_to_something).
-- ============================================================================
CREATE TABLE activities (
    id          BIGSERIAL PRIMARY KEY,
    type        VARCHAR(20)  NOT NULL,
    subject     VARCHAR(255) NOT NULL,
    body        TEXT,
    contact_id  BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    deal_id     BIGINT REFERENCES deals(id) ON DELETE CASCADE,
    created_by  BIGINT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_activities_type CHECK (type IN ('CALL','EMAIL','MEETING','NOTE')),
    CONSTRAINT chk_activities_linked_to_something CHECK (contact_id IS NOT NULL OR deal_id IS NOT NULL)
);

CREATE INDEX idx_activities_contact_id ON activities (contact_id);
CREATE INDEX idx_activities_deal_id ON activities (deal_id);
CREATE INDEX idx_activities_created_at ON activities (created_at DESC);
