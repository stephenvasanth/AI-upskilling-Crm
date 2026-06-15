package com.crm.controller;

import com.crm.dto.LoginRequest;
import com.crm.dto.LoginResponse;
import com.crm.dto.UserCreateRequest;
import com.crm.dto.UserResponse;
import com.crm.service.AuthService;
import com.crm.service.UserService;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Authentication and account-provisioning endpoints (requirements AUTH-01,
 * AUTH-04).
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    /**
     * {@code POST /api/auth/login} — authenticates a user and issues a JWT
     * (requirement AUTH-01). Open to unauthenticated requests (see
     * {@link com.crm.config.SecurityConfig}).
     *
     * @param request the login credentials
     * @return 200 with the issued token and the authenticated user's profile
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * {@code POST /api/auth/register} — creates a new team member account
     * (requirement AUTH-04). Requires the {@code ADMIN} role.
     *
     * @param request the new user's details
     * @return 201 with the created user and a {@code Location} header
     *         pointing at {@code /api/users/{id}}
     */
    @PostMapping("/register")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody UserCreateRequest request) {
        UserResponse created = userService.createUser(request);
        return ResponseEntity.created(URI.create("/api/users/" + created.getId())).body(created);
    }
}
