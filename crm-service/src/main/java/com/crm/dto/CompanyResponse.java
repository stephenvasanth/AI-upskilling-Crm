package com.crm.dto;

import com.crm.entity.Company;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * Public view of a {@link Company}, used by the company-selection control on
 * the contact form (requirement CON-08).
 *
 * {@code @Jacksonized} lets Jackson deserialize cached instances back from
 * Redis via the {@code @Builder} (the {@code companies} cache, rules.md §8).
 */
@Getter
@Builder
@Jacksonized
public class CompanyResponse {

    private final Long id;
    private final String name;

    /**
     * Builds a {@link CompanyResponse} from a {@link Company} entity.
     *
     * @param company the entity to map
     * @return the mapped response
     */
    public static CompanyResponse from(Company company) {
        return CompanyResponse.builder()
                .id(company.getId())
                .name(company.getName())
                .build();
    }
}
