package com.crm.security;

import com.crm.entity.User;
import com.crm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Resolves the {@link User} entity for the currently authenticated principal.
 *
 * {@link UserDetailsServiceImpl} uses the user's email as the Spring Security
 * "username"; this component re-loads the full {@link User} entity from that
 * email so services can stamp "createdBy"/author fields with the acting user
 * (e.g. {@code TagService.createTag}, {@code ActivityService.createActivity}).
 */
@Component
@RequiredArgsConstructor
public class CurrentUserProvider {

    private final UserRepository userRepository;

    /**
     * Returns the {@link User} entity for the currently authenticated
     * principal.
     *
     * @return the authenticated user
     * @throws IllegalStateException if no authentication is present in the
     *         security context, or its principal name no longer corresponds
     *         to a user (neither should happen for a request that passed
     *         through {@code JwtAuthenticationFilter})
     */
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new IllegalStateException("No authenticated user in security context");
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + email));
    }
}
