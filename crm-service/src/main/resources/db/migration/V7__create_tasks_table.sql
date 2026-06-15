-- ============================================================================
-- V7: tasks
--
-- To-do items assigned to a user, optionally linked to a contact and/or a
-- deal (e.g. "Follow up with John Smith about the Acme deal").
--
-- Relationships:
--  - contact_id  -> contacts.id (nullable; SET NULL if the contact is deleted)
--  - deal_id     -> deals.id (nullable; SET NULL if the deal is deleted)
--  - assignee_id -> users.id (required — who the task is assigned to)
-- ============================================================================
CREATE TABLE tasks (
    id           BIGSERIAL PRIMARY KEY,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    due_date     DATE,
    completed    BOOLEAN NOT NULL DEFAULT FALSE,
    contact_id   BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    deal_id      BIGINT REFERENCES deals(id) ON DELETE SET NULL,
    assignee_id  BIGINT NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_assignee_id ON tasks (assignee_id);
CREATE INDEX idx_tasks_due_date ON tasks (due_date);
CREATE INDEX idx_tasks_contact_id ON tasks (contact_id);
CREATE INDEX idx_tasks_deal_id ON tasks (deal_id);
CREATE INDEX idx_tasks_completed ON tasks (completed);
