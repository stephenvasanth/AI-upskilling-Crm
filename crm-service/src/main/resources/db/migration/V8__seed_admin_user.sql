-- ============================================================================
-- V8: seed admin user
--
-- Creates the initial ADMIN account so the application has at least one user
-- who can log in and create further users/tags.
--
-- Credentials: admin@crm.local / admin123 (BCrypt, strength 12).
-- Change this password after first login outside of local development.
-- ============================================================================
INSERT INTO users (first_name, last_name, email, password_hash, role, active)
VALUES (
    'Admin',
    'User',
    'admin@crm.local',
    '$2a$12$2KnneKg0sEcZ1oo0QshBiOqRiaaiTZignOG0VjF8ldbrtDwt8jndO',
    'ADMIN',
    TRUE
);
