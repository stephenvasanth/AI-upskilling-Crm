package com.crm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import lombok.Data;

/**
 * Request body for {@code POST /api/tasks} (requirement TSK-01).
 */
@Data
public class TaskCreateRequest {

    @NotBlank
    @Size(max = 255)
    private String title;

    private String description;

    private LocalDate dueDate;

    private Long contactId;

    private Long dealId;

    @NotNull
    private Long assigneeId;
}
