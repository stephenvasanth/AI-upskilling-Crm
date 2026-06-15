package com.crm.repository;

import com.crm.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data repository for {@link User}.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Returns the user with the given email address.
     *
     * The email is the login identifier (requirement AUTH-01) and is unique
     * across all users (constraint uq_users_email).
     *
     * @param email the email address to look up
     * @return the matching user, or {@link Optional#empty()} if no user has
     *         this email
     */
    Optional<User> findByEmail(String email);

    /**
     * Checks whether a user with the given email address already exists.
     *
     * Used to reject duplicate registrations before hitting the
     * uq_users_email constraint (requirement AUTH-04).
     *
     * @param email the email address to check
     * @return {@code true} if a user with this email exists, {@code false}
     *         otherwise
     */
    boolean existsByEmail(String email);
}
