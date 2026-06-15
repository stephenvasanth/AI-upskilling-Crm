package com.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * An application user — a CRM team member who logs in. Maps to the "users"
 * table.
 *
 * Relationships:
 *  - One user owns many {@link Contact}s (Contact.owner) and {@link Deal}s
 *    (Deal.owner).
 *  - One user is assigned many {@link Task}s (Task.assignee).
 *  - One user authors many {@link Activity}s (Activity.createdBy).
 *  - One user may create many {@link Company}s and {@link Tag}s
 *    (Company.createdBy, Tag.createdBy).
 *
 * Notes:
 *  - "email" is unique (constraint uq_users_email) and used as the login
 *    identifier.
 *  - "role" gates access to admin-only endpoints (user management, tag
 *    management — see {@link UserRole}).
 *  - "active" lets an admin deactivate (soft-delete) an account without
 *    deleting it, preserving ownership history on records created by or
 *    assigned to this user (requirement AUTH-05).
 */
@Entity
@Table(name = "users", uniqueConstraints = @UniqueConstraint(name = "uq_users_email", columnNames = "email"))
@Getter
@Setter
@NoArgsConstructor
public class User extends AuditableEntity {

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private UserRole role = UserRole.USER;

    @Column(name = "active", nullable = false)
    private boolean active = true;
}
