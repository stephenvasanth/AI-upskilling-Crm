package com.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A coloured label that can be attached to one or more {@link Contact}s
 * (e.g. "VIP", "Cold Lead" — requirement TAG-01). Maps to the "tags" table.
 *
 * Relationships:
 *  - Many-to-many with {@link Contact} via the "contact_tags" join table
 *    (see {@link Contact#getTags()}); deleting a tag removes it from all
 *    contacts automatically (ON DELETE CASCADE on contact_tags, requirement
 *    TAG-02).
 *  - "createdBy" references the {@link User} who created the tag; set to
 *    {@code null} if that user is later deleted (ON DELETE SET NULL).
 *
 * Notes:
 *  - "name" is unique (constraint uq_tags_name).
 *  - "color" is a 7-character hex colour code (e.g. "#FF5733").
 *  - The "tags" table has no "updated_at" column (immutable after creation
 *    other than deletion), so this extends {@link BaseEntity} rather than
 *    {@link AuditableEntity}.
 */
@Entity
@Table(name = "tags", uniqueConstraints = @UniqueConstraint(name = "uq_tags_name", columnNames = "name"))
@Getter
@Setter
@NoArgsConstructor
public class Tag extends BaseEntity {

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "color", nullable = false, length = 7)
    private String color;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
}
