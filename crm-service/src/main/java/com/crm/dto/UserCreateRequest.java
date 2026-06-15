package com.crm.dto;

import com.crm.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request body for {@code POST /api/auth/register} (ADMIN only, requirement
 * AUTH-04): creates a new team member account.
 */
@Data
public class UserCreateRequest {

    @NotBlank
    @Size(max = 100)
    private String firstName;

    @NotBlank
    @Size(max = 100)
    private String lastName;

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    /**
     * Plain-text password; hashed with {@code BCryptPasswordEncoder(12)}
     * before storage (rules.md §12). Must be at least 8 characters
     * (requirement NFR-S04).
     */
    @NotBlank
    @Size(min = 8)
    private String password;

    @NotNull
    private UserRole role;
}
