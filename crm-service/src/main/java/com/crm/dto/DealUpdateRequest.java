package com.crm.dto;

import com.crm.entity.DealStage;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Data;

/**
 * Request body for {@code PUT /api/deals/{id}} (requirement DEA-06): a full
 * replacement of the deal's editable fields.
 */
@Data
public class DealUpdateRequest {

    @NotBlank
    @Size(max = 255)
    private String title;

    @NotNull
    @DecimalMin(value = "0.0")
    private BigDecimal value;

    @NotNull
    private DealStage stage;

    private LocalDate closeDate;

    private Long contactId;

    @NotNull
    private Long ownerId;
}
