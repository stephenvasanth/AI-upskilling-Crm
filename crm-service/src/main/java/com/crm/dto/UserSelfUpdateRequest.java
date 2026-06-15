package com.crm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request body for {@code PUT /api/users/me} (requirement AUTH-07): lets the
 * authenticated user update their own name and, optionally, password.
 *
 * Role and active status cannot be changed via this endpoint — those remain
 * ADMIN-only via {@link UserUpdateRequest} on {@code PUT /api/users/{id}}.
 */
@Data
public class UserSelfUpdateRequest {

    @NotBlank
    @Size(max = 100)
    private String firstName;

    @NotBlank
    @Size(max = 100)
    private String lastName;

    /**
     * New plain-text password (minimum 8 characters, requirement NFR-S04),
     * or {@code null} to leave the password unchanged.
     */
    @Size(min = 8)
    private String password;
}
