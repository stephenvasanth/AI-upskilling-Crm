package com.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A sales opportunity progressing through a fixed pipeline of stages,
 * visualised as a Kanban board (requirements DEA-01 to DEA-08; see
 * docs/DESIGN.md, Deals - Kanban Pipeline section). Maps to the "deals"
 * table.
 *
 * Relationships:
 *  - "contact" optionally links to a {@link Contact}; set to {@code null} if
 *    the contact is later deleted (ON DELETE SET NULL).
 *  - "owner" is the {@link User} responsible for the deal (required).
 *  - One deal has many {@link Activity}s and {@link Task}s.
 *
 * Notes:
 *  - "value" must be non-negative (constraint chk_deals_value_non_negative)
 *    and defaults to zero.
 *  - "stage" defaults to {@link DealStage#LEAD} and is restricted to the
 *    values of {@link DealStage} (constraint chk_deals_stage).
 */
@Entity
@Table(name = "deals")
@Getter
@Setter
@NoArgsConstructor
public class Deal extends AuditableEntity {

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "value", nullable = false, precision = 14, scale = 2)
    private BigDecimal value = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage", nullable = false, length = 20)
    private DealStage stage = DealStage.LEAD;

    @Column(name = "close_date")
    private LocalDate closeDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id")
    private Contact contact;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;
}
