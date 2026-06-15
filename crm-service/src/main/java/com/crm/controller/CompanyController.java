package com.crm.controller;

import com.crm.dto.CompanyResponse;
import com.crm.service.CompanyService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints for reading {@link com.crm.entity.Company} records, used by the
 * company-selection control on the contact form (requirement CON-08).
 */
@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;

    /**
     * {@code GET /api/companies} — lists all companies, ordered by name.
     * Available to any authenticated user.
     *
     * @return 200 with the list of companies, or an empty list if none exist
     */
    @GetMapping
    public ResponseEntity<List<CompanyResponse>> getAllCompanies() {
        return ResponseEntity.ok(companyService.getAllCompanies());
    }
}
