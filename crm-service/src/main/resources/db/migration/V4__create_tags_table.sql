-- ============================================================================
-- V4: tags, contact_tags
--
-- tags: short labels (with a colour) that can be attached to contacts (e.g.
-- "VIP", "Cold Lead"). The full tag list is cached for 24h as a collection
-- (see crm-service/rules.md, Caching Strategy section) since it rarely
-- changes and is read often.
--
-- contact_tags: many-to-many join table between contacts and tags. Created
-- here (not in V3) because it has foreign keys into both contacts (V3) and
-- tags (this migration) — both must exist first.
--
-- Relationships:
--  - tags.created_by -> users.id (the user who created the tag)
--  - contact_tags.contact_id -> contacts.id
--  - contact_tags.tag_id     -> tags.id
-- ============================================================================
CREATE TABLE tags (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    color       VARCHAR(7)  NOT NULL,
    created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tags_name UNIQUE (name)
);

CREATE TABLE contact_tags (
    contact_id  BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    tag_id      BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (contact_id, tag_id)
);

CREATE INDEX idx_contact_tags_tag_id ON contact_tags (tag_id);
