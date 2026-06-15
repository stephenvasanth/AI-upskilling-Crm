package com.crm.repository;

import com.crm.entity.Contact;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * Spring Data repository for {@link Contact}.
 *
 * Extends {@link JpaSpecificationExecutor} so {@code ContactService} can
 * compose the optional "search" (name/email/company, requirement CON-04) and
 * "tag" (requirement CON-05) filters for the paginated contacts list
 * ({@code GET /api/contacts?search&page&size}) without a combinatorial
 * explosion of derived query methods.
 */
public interface ContactRepository extends JpaRepository<Contact, Long>, JpaSpecificationExecutor<Contact> {

    /**
     * Returns all contacts belonging to the given company.
     *
     * Backs the company detail view's associated-contacts list (requirement
     * COM-03).
     *
     * @param companyId the company id
     * @return contacts linked to this company, or an empty list if none exist
     */
    List<Contact> findByCompanyId(Long companyId);
}
