package com.crm.dto;

import java.util.List;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * Response returned by {@code GET /api/deals/pipeline}: every pipeline stage
 * as a Kanban column, in pipeline order (requirement DEA-02).
 *
 * {@code @Jacksonized} lets Jackson deserialize cached instances back from
 * Redis via the {@code @Builder} (the {@code pipeline} cache, rules.md §8).
 */
@Getter
@Builder
@Jacksonized
public class PipelineResponse {

    private final List<PipelineStageResponse> stages;
}
