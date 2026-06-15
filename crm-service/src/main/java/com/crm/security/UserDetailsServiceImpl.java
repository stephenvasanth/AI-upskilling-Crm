package com.crm.security;

import com.crm.entity.User;
import com.crm.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Loads a {@link User} by email and adapts it to Spring Security's
 * {@link UserDetails} for authentication and {@code @PreAuthorize} role
 * checks (requirements AUTH-01, NFR-S02).
 *
 * The email is used as the Spring Security "username". A deactivated account
 * ({@link User#isActive()} == {@code false}) is reported as disabled so
 * Spring Security rejects authentication for it (requirement AUTH-05).
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Loads the user with the given email and adapts it to a
     * {@link UserDetails}.
     *
     * @param email the email address (Spring Security "username")
     * @return Spring Security user details for the matching {@link User},
     *         with a single {@code ROLE_<role>} authority and
     *         {@code enabled} reflecting {@link User#isActive()}
     * @throws UsernameNotFoundException if no user with this email exists
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("No user with email " + email));

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPasswordHash())
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
                .disabled(!user.isActive())
                .build();
    }
}
