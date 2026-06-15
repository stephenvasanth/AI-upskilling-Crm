package com.crm.dto;

import com.crm.entity.Contact;
import com.crm.entity.Deal;
import com.crm.entity.DealStage;
import com.crm.entity.User;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * Public view of a {@link Deal}, flattening its {@link Contact} and
 * {@link User} (owner) associations (requirements DEA-01 to DEA-08).
 *
 * {@code @Jacksonized} lets Jackson deserialize cached instances back from
 * Redis via the {@code @Builder} (nested in the {@code pipeline} cache,
 * rules.md §8).
 */
@Getter
@Builder
@Jacksonized
public class DealResponse {

    private final Long id;
    private final String title;
    private final BigDecimal value;
    private final DealStage stage;
    private final LocalDate closeDate;
    private final Long contactId;
    private final String contactName;
    private final Long ownerId;
    private final String ownerName;
    private final Instant createdAt;
    private final Instant updatedAt;

    /**
     * Builds a {@link DealResponse} from a {@link Deal} entity.
     *
     * @param deal the entity to map
     * @return the mapped response
     */
    public static DealResponse from(Deal deal) {
        Contact contact = deal.getContact();
        User owner = deal.getOwner();
        return DealResponse.builder()
                .id(deal.getId())
                .title(deal.getTitle())
                .value(deal.getValue())
                .stage(deal.getStage())
                .closeDate(deal.getCloseDate())
                .contactId(contact != null ? contact.getId() : null)
                .contactName(contact != null ? contact.getFirstName() + " " + contact.getLastName() : null)
                .ownerId(owner.getId())
                .ownerName(owner.getFirstName() + " " + owner.getLastName())
                .createdAt(deal.getCreatedAt())
                .updatedAt(deal.getUpdatedAt())
                .build();
    }
}
