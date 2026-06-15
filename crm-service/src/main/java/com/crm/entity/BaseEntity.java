package com.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Common base for all JPA entities: a database-generated primary key and the
 * timestamp at which the row was first inserted.
 *
 * Not an entity itself (no {@code @Table}) — concrete entities extend this to
 * inherit "id" and "createdAt" mappings, avoiding duplication across the
 * "users", "companies", "contacts", "tags", "deals", "activities", and
 * "tasks" tables, every one of which has these two columns.
 */
@MappedSuperclass
@Getter
@Setter
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
