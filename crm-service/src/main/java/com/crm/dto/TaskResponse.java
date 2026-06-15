package com.crm.dto;

import com.crm.entity.Contact;
import com.crm.entity.Deal;
import com.crm.entity.Task;
import com.crm.entity.User;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;

/**
 * Public view of a {@link Task}, flattening its {@link Contact},
 * {@link Deal}, and {@link User} (assignee) associations (requirements
 * TSK-01 to TSK-06).
 */
@Getter
@Builder
public class TaskResponse {

    private final Long id;
    private final String title;
    private final String description;
    private final LocalDate dueDate;
    private final boolean completed;
    private final Long contactId;
    private final String contactName;
    private final Long dealId;
    private final String dealTitle;
    private final Long assigneeId;
    private final String assigneeName;
    private final Instant createdAt;
    private final Instant updatedAt;

    /**
     * Builds a {@link TaskResponse} from a {@link Task} entity.
     *
     * @param task the entity to map
     * @return the mapped response
     */
    public static TaskResponse from(Task task) {
        Contact contact = task.getContact();
        Deal deal = task.getDeal();
        User assignee = task.getAssignee();
        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .dueDate(task.getDueDate())
                .completed(task.isCompleted())
                .contactId(contact != null ? contact.getId() : null)
                .contactName(contact != null ? contact.getFirstName() + " " + contact.getLastName() : null)
                .dealId(deal != null ? deal.getId() : null)
                .dealTitle(deal != null ? deal.getTitle() : null)
                .assigneeId(assignee.getId())
                .assigneeName(assignee.getFirstName() + " " + assignee.getLastName())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}
