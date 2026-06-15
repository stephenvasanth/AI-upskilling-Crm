package com.crm.repository;

import com.crm.entity.Company;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data repository for {@link Company}.
 */
public interface CompanyRepository extends JpaRepository<Company, Long> {

    /**
     * Returns all companies ordered alphabetically by name.
     *
     * Backs the companies list view (requirements COM-01, COM-02) and the
     * company-selection control on the contact form (requirement CON-08).
     *
     * @return all companies ordered by name, or an empty list if none exist
     */
    List<Company> findAllByOrderByNameAsc();
}
