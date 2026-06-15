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
 * Request body for {@code POST /api/deals} (requirement DEA-01).
 */
@Data
public class DealCreateRequest {

    @NotBlank
    @Size(max = 255)
    private String title;

    @NotNull
    @DecimalMin(value = "0.0")
    private BigDecimal value = BigDecimal.ZERO;

    @NotNull
    private DealStage stage = DealStage.LEAD;

    private LocalDate closeDate;

    private Long contactId;

    @NotNull
    private Long ownerId;
}
