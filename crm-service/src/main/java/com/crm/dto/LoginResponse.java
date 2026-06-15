package com.crm.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * Response returned by {@code POST /api/auth/login}: a signed JWT and the
 * authenticated user's profile (requirement AUTH-01).
 */
@Getter
@Builder
public class LoginResponse {

    private final String token;
    private final UserResponse user;
}
