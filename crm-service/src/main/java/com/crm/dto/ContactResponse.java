package com.crm.dto;

import com.crm.entity.Company;
import com.crm.entity.Contact;
import com.crm.entity.User;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * Public view of a {@link Contact}, flattening its {@link Company} and
 * {@link User} (owner) associations and listing its tags, sorted by name
 * (requirements CON-01 to CON-09).
 *
 * {@code @Jacksonized} lets Jackson deserialize cached instances back from
 * Redis via the {@code @Builder} (the {@code contacts} cache, rules.md §8).
 */
@Getter
@Builder
@Jacksonized
public class ContactResponse {

    private final Long id;
    private final String firstName;
    private final String lastName;
    private final String email;
    private final String phone;
    private final String title;
    private final Long companyId;
    private final String companyName;
    private final Long ownerId;
    private final String ownerName;
    private final List<TagResponse> tags;
    private final Instant createdAt;
    private final Instant updatedAt;

    /**
     * Builds a {@link ContactResponse} from a {@link Contact} entity.
     *
     * @param contact the entity to map
     * @return the mapped response
     */
    public static ContactResponse from(Contact contact) {
        Company company = contact.getCompany();
        User owner = contact.getOwner();
        return ContactResponse.builder()
                .id(contact.getId())
                .firstName(contact.getFirstName())
                .lastName(contact.getLastName())
                .email(contact.getEmail())
                .phone(contact.getPhone())
                .title(contact.getTitle())
                .companyId(company != null ? company.getId() : null)
                .companyName(company != null ? company.getName() : null)
                .ownerId(owner.getId())
                .ownerName(owner.getFirstName() + " " + owner.getLastName())
                .tags(contact.getTags().stream()
                        .map(TagResponse::from)
                        .sorted(Comparator.comparing(TagResponse::getName))
                        .toList())
                .createdAt(contact.getCreatedAt())
                .updatedAt(contact.getUpdatedAt())
                .build();
    }
}
