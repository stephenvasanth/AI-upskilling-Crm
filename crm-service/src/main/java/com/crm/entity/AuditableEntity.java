package com.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Extends {@link BaseEntity} with an "updatedAt" timestamp for entities whose
 * table tracks the last-modified time ("users", "companies", "contacts",
 * "deals", "tasks"). Entities without an "updated_at" column ("tags",
 * "activities" — both immutable after creation) extend {@link BaseEntity}
 * directly instead.
 */
@MappedSuperclass
@Getter
@Setter
public abstract class AuditableEntity extends BaseEntity {

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
