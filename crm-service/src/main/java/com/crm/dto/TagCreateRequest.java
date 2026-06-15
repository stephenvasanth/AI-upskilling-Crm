package com.crm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request body for {@code POST /api/tags} (ADMIN only, requirement TAG-01).
 */
@Data
public class TagCreateRequest {

    @NotBlank
    @Size(max = 50)
    private String name;

    /** 7-character hex colour code, e.g. {@code #FF5733}. */
    @NotBlank
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$")
    private String color;
}
