package com.crm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import lombok.Data;

/**
 * Request body for {@code PUT /api/tasks/{id}} (requirement TSK-03): a full
 * replacement of the task's editable fields.
 */
@Data
public class TaskUpdateRequest {

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
