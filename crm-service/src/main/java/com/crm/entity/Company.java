package com.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A company (organisation) that one or more {@link Contact}s may belong to.
 * Maps to the "companies" table.
 *
 * Relationships:
 *  - One company has many contacts (Contact.company); a company is optional
 *    on a contact.
 *  - "createdBy" references the {@link User} who added this company record;
 *    set to {@code null} if that user is later deleted (ON DELETE SET NULL).
 *
 * Notes:
 *  - "name" is not unique; duplicate company names are allowed.
 */
@Entity
@Table(name = "companies")
@Getter
@Setter
@NoArgsConstructor
public class Company extends AuditableEntity {

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "industry", length = 100)
    private String industry;

    @Column(name = "website", length = 255)
    private String website;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "address", length = 500)
    private String address;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
}
