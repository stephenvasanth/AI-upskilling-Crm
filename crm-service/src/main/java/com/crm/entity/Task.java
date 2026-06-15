package com.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * An actionable to-do item with a due date and assignee, optionally linked
 * to a {@link Contact} and/or a {@link Deal} (requirements TSK-01 to
 * TSK-06). Maps to the "tasks" table.
 *
 * Relationships:
 *  - "contact" and "deal" are both optional; set to {@code null} if the
 *    linked record is later deleted (ON DELETE SET NULL).
 *  - "assignee" is the {@link User} responsible for completing the task
 *    (required).
 *
 * Notes:
 *  - "completed" defaults to {@code false} and is toggled via TSK-02.
 */
@Entity
@Table(name = "tasks")
@Getter
@Setter
@NoArgsConstructor
public class Task extends AuditableEntity {

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "completed", nullable = false)
    private boolean completed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id")
    private Contact contact;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deal_id")
    private Deal deal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id", nullable = false)
    private User assignee;
}
