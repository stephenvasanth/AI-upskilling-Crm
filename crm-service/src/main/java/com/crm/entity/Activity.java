package com.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A logged interaction (call, email, meeting, or note) against a
 * {@link Contact} and/or a {@link Deal} (requirements ACT-01 to ACT-05).
 * Maps to the "activities" table.
 *
 * Relationships:
 *  - "contact" and "deal" are both optional, but at least one must be set
 *    (constraint chk_activities_linked_to_something); both cascade-delete
 *    with their parent (ON DELETE CASCADE).
 *  - "createdBy" is the {@link User} who logged the activity (required).
 *
 * Notes:
 *  - "type" is restricted to the values of {@link ActivityType} (constraint
 *    chk_activities_type).
 *  - The "activities" table has no "updated_at" column (immutable after
 *    creation), so this extends {@link BaseEntity} rather than
 *    {@link AuditableEntity}.
 */
@Entity
@Table(name = "activities")
@Getter
@Setter
@NoArgsConstructor
public class Activity extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private ActivityType type;

    @Column(name = "subject", nullable = false, length = 255)
    private String subject;

    @Column(name = "body", columnDefinition = "TEXT")
    private String body;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id")
    private Contact contact;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deal_id")
    private Deal deal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;
}
