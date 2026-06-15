package com.crm.service;

import com.crm.config.CacheNames;
import com.crm.dto.CompanyResponse;
import com.crm.entity.Company;
import com.crm.repository.CompanyRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business logic for reading {@link Company} records, used by the
 * company-selection control on the contact form (requirement CON-08).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompanyService {

    private final CompanyRepository companyRepository;

    /**
     * Returns all companies, ordered by name.
     *
     * Reads through the {@code companies} cache for 24 hours (see
     * {@link com.crm.config.RedisConfig}).
     *
     * @return the list of companies, or an empty list if none exist
     */
    @Cacheable(cacheNames = CacheNames.COMPANIES)
    public List<CompanyResponse> getAllCompanies() {
        // Collectors.toList() (not Stream.toList()) — see rules.md §8.5.
        return companyRepository.findAllByOrderByNameAsc().stream()
                .map(CompanyResponse::from)
                .collect(Collectors.toList());
    }
}
