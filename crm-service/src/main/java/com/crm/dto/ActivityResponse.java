package com.crm.dto;

import com.crm.entity.Activity;
import com.crm.entity.ActivityType;
import com.crm.entity.Contact;
import com.crm.entity.Deal;
import com.crm.entity.User;
import java.time.Instant;
import lombok.Builder;
import lombok.Getter;

/**
 * Public view of an {@link Activity}, flattening its {@link Contact},
 * {@link Deal}, and {@link User} (author) associations (requirements ACT-01
 * to ACT-05).
 */
@Getter
@Builder
public class ActivityResponse {

    private final Long id;
    private final ActivityType type;
    private final String subject;
    private final String body;
    private final Long contactId;
    private final String contactName;
    private final Long dealId;
    private final String dealTitle;
    private final Long createdById;
    private final String createdByName;
    private final Instant createdAt;

    /**
     * Builds an {@link ActivityResponse} from an {@link Activity} entity.
     *
     * @param activity the entity to map
     * @return the mapped response
     */
    public static ActivityResponse from(Activity activity) {
        Contact contact = activity.getContact();
        Deal deal = activity.getDeal();
        User createdBy = activity.getCreatedBy();
        return ActivityResponse.builder()
                .id(activity.getId())
                .type(activity.getType())
                .subject(activity.getSubject())
                .body(activity.getBody())
                .contactId(contact != null ? contact.getId() : null)
                .contactName(contact != null ? contact.getFirstName() + " " + contact.getLastName() : null)
                .dealId(deal != null ? deal.getId() : null)
                .dealTitle(deal != null ? deal.getTitle() : null)
                .createdById(createdBy.getId())
                .createdByName(createdBy.getFirstName() + " " + createdBy.getLastName())
                .createdAt(activity.getCreatedAt())
                .build();
    }
}
