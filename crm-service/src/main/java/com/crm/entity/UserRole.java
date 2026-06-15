package com.crm.entity;

/**
 * Role assigned to a {@link User}, gating access to admin-only endpoints
 * (user management, tag management — see docs/REQUIREMENTS.md, User Roles &
 * Permissions Matrix). Maps to the "role" column of the "users" table
 * (CHECK constraint chk_users_role).
 */
public enum UserRole {

    /** Full access, including user and tag management. */
    ADMIN,

    /** Standard access: contacts, companies, deals, activities, tasks. */
    USER
}
