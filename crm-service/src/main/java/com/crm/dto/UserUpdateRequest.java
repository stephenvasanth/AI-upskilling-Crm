package com.crm.dto;

import com.crm.entity.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request body for {@code PUT /api/users/{id}}: updates a user's profile
 * (name, password), role, and active status (requirements AUTH-05, AUTH-06,
 * AUTH-07).
 *
 * Role and active-status changes are ADMIN-only at the controller/service
 * layer; a non-admin user updating their own profile must resubmit their
 * current role/active values.
 */
@Data
public class UserUpdateRequest {

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

    @NotNull
    private UserRole role;

    @NotNull
    private Boolean active;
}
