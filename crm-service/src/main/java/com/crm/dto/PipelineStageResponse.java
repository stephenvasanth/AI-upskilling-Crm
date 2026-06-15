package com.crm.dto;

import com.crm.entity.DealStage;
import java.math.BigDecimal;
import java.util.List;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * One column of the Kanban pipeline view: a deal stage together with the
 * deals currently in it, their count, and total value (requirement DEA-05).
 *
 * {@code @Jacksonized} lets Jackson deserialize cached instances back from
 * Redis via the {@code @Builder} (the {@code pipeline} cache, rules.md §8).
 */
@Getter
@Builder
@Jacksonized
public class PipelineStageResponse {

    private final DealStage stage;
    private final long count;
    private final BigDecimal totalValue;
    private final List<DealResponse> deals;
}
