package com.crm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.HashSet;
import java.util.Set;
import lombok.Data;

/**
 * Request body for {@code PUT /api/contacts/{id}} (requirement CON-02): a
 * full replacement of the contact's editable fields.
 */
@Data
public class ContactUpdateRequest {

    @NotBlank
    @Size(max = 100)
    private String firstName;

    @NotBlank
    @Size(max = 100)
    private String lastName;

    @Email
    @Size(max = 255)
    private String email;

    @Size(max = 50)
    private String phone;

    @Size(max = 150)
    private String title;

    /** Optional company to link this contact to (requirement CON-08). */
    private Long companyId;

    @NotNull
    private Long ownerId;

    /** Ids of tags to assign to this contact (requirement CON-09). */
    private Set<Long> tagIds = new HashSet<>();
}
