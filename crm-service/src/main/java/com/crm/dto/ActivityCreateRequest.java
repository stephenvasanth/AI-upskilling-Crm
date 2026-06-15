package com.crm.dto;

import com.crm.entity.ActivityType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request body for {@code POST /api/activities} (requirement ACT-01).
 *
 * At least one of {@code contactId}/{@code dealId} must be set; this
 * cross-field rule is enforced in the service layer (rules.md §6).
 */
@Data
public class ActivityCreateRequest {

    @NotNull
    private ActivityType type;

    @NotBlank
    @Size(max = 255)
    private String subject;

    private String body;

    private Long contactId;

    private Long dealId;
}
