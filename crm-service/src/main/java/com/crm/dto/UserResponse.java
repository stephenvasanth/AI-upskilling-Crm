package com.crm.dto;

import com.crm.entity.User;
import com.crm.entity.UserRole;
import java.time.Instant;
import lombok.Builder;
import lombok.Getter;

/**
 * Public view of a {@link User}, excluding the password hash (rules.md §12).
 */
@Getter
@Builder
public class UserResponse {

    private final Long id;
    private final String firstName;
    private final String lastName;
    private final String email;
    private final UserRole role;
    private final boolean active;
    private final Instant createdAt;

    /**
     * Builds a {@link UserResponse} from a {@link User} entity.
     *
     * @param user the entity to map
     * @return the mapped response, never including the password hash
     */
    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .role(user.getRole())
                .active(user.isActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
