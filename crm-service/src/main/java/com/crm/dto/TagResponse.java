package com.crm.dto;

import com.crm.entity.Tag;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * Public view of a {@link Tag} (requirement TAG-03).
 *
 * {@code @Jacksonized} lets Jackson deserialize cached instances back from
 * Redis via the {@code @Builder}, since the fields below are {@code final}
 * and have no setters (rules.md §8).
 */
@Getter
@Builder
@Jacksonized
public class TagResponse {

    private final Long id;
    private final String name;
    private final String color;

    /**
     * Builds a {@link TagResponse} from a {@link Tag} entity.
     *
     * @param tag the entity to map
     * @return the mapped response
     */
    public static TagResponse from(Tag tag) {
        return TagResponse.builder()
                .id(tag.getId())
                .name(tag.getName())
                .color(tag.getColor())
                .build();
    }
}
