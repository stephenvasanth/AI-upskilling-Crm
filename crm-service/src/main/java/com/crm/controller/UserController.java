package com.crm.controller;

import com.crm.dto.UserResponse;
import com.crm.dto.UserSelfUpdateRequest;
import com.crm.dto.UserUpdateRequest;
import com.crm.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints for managing {@link com.crm.entity.User} accounts (requirements
 * AUTH-04 to AUTH-07).
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * {@code GET /api/users} — lists all users, ordered by name (requirement
     * AUTH-04, "view all users"; also backs the owner-selection control on
     * the contact form, requirement CON-01). Available to any authenticated
     * user.
     *
     * @return 200 with the list of users, or an empty list if none exist
     */
    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    /**
     * {@code GET /api/users/me} — returns the authenticated user's own
     * profile (requirement AUTH-07). Available to any authenticated user.
     *
     * @return 200 with the authenticated user's profile
     */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getOwnProfile() {
        return ResponseEntity.ok(userService.getOwnProfile());
    }

    /**
     * {@code PUT /api/users/me} — updates the authenticated user's own name
     * and, optionally, password (requirement AUTH-07). Role and active status
     * cannot be changed via this endpoint. Available to any authenticated
     * user.
     *
     * @param request the new profile field values
     * @return 200 with the updated profile
     */
    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateOwnProfile(@Valid @RequestBody UserSelfUpdateRequest request) {
        return ResponseEntity.ok(userService.updateOwnProfile(request));
    }

    /**
     * {@code GET /api/users/{id}} — returns the user with the given id.
     * Available to any authenticated user.
     *
     * @param id the user id
     * @return 200 with the user, or 404 if no user with this id exists
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return userService.getUserById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * {@code PUT /api/users/{id}} — updates a user's profile, role, and
     * active status (requirements AUTH-05, AUTH-06). Requires the
     * {@code ADMIN} role.
     *
     * @param id      the user id
     * @param request the new field values
     * @return 200 with the updated user
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }
}
