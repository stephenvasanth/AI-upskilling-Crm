package com.crm.controller;

import com.crm.dto.DealCreateRequest;
import com.crm.dto.DealResponse;
import com.crm.dto.DealStageUpdateRequest;
import com.crm.dto.DealUpdateRequest;
import com.crm.dto.PipelineResponse;
import com.crm.service.DealService;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints for managing {@link com.crm.entity.Deal}s and the Kanban pipeline
 * view (requirements DEA-01 to DEA-08). Available to any authenticated user
 * (see docs/REQUIREMENTS.md, User Roles &amp; Permissions Matrix).
 */
@RestController
@RequestMapping("/api/deals")
@RequiredArgsConstructor
public class DealController {

    private final DealService dealService;

    /**
     * {@code GET /api/deals/pipeline} — returns the Kanban pipeline view: one
     * entry per pipeline stage, each with its deals, count, and total value
     * (requirements DEA-02, DEA-05). Reads through the {@code pipeline} cache
     * (see {@link com.crm.config.RedisConfig}).
     *
     * @return 200 with the pipeline
     */
    @GetMapping("/pipeline")
    public ResponseEntity<PipelineResponse> getPipeline() {
        return ResponseEntity.ok(dealService.getPipeline());
    }

    /**
     * {@code POST /api/deals} — creates a new deal (requirement DEA-01).
     *
     * @param request the new deal's details
     * @return 201 with the created deal and a {@code Location} header
     *         pointing at {@code /api/deals/{id}}
     */
    @PostMapping
    public ResponseEntity<DealResponse> createDeal(@Valid @RequestBody DealCreateRequest request) {
        DealResponse created = dealService.createDeal(request);
        return ResponseEntity.created(URI.create("/api/deals/" + created.getId())).body(created);
    }

    /**
     * {@code PUT /api/deals/{id}} — replaces a deal's editable fields
     * (requirement DEA-06).
     *
     * @param id      the deal id
     * @param request the new field values
     * @return 200 with the updated deal
     */
    @PutMapping("/{id}")
    public ResponseEntity<DealResponse> updateDeal(@PathVariable Long id, @Valid @RequestBody DealUpdateRequest request) {
        return ResponseEntity.ok(dealService.updateDeal(id, request));
    }

    /**
     * {@code PATCH /api/deals/{id}/stage} — moves a deal to a new pipeline
     * stage, e.g. via drag-and-drop on the Kanban board (requirements DEA-03,
     * DEA-04).
     *
     * @param id      the deal id
     * @param request the target stage
     * @return 200 with the updated deal
     */
    @PatchMapping("/{id}/stage")
    public ResponseEntity<DealResponse> updateStage(@PathVariable Long id,
            @Valid @RequestBody DealStageUpdateRequest request) {
        return ResponseEntity.ok(dealService.updateStage(id, request));
    }

    /**
     * {@code DELETE /api/deals/{id}} — deletes a deal (requirement DEA-08).
     *
     * @param id the deal id
     * @return 204 with no body
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDeal(@PathVariable Long id) {
        dealService.deleteDeal(id);
        return ResponseEntity.noContent().build();
    }
}
