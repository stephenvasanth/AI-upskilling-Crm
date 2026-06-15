package com.crm.dto;

import com.crm.entity.DealStage;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request body for {@code PATCH /api/deals/{id}/stage} (requirement DEA-04):
 * moves a deal to a new pipeline stage.
 */
@Data
public class DealStageUpdateRequest {

    @NotNull
    private DealStage stage;
}
