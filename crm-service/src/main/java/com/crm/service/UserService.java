package com.crm.service;

import com.crm.dto.UserCreateRequest;
import com.crm.dto.UserResponse;
import com.crm.dto.UserSelfUpdateRequest;
import com.crm.dto.UserUpdateRequest;
import com.crm.entity.User;
import com.crm.exception.ConflictException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.repository.UserRepository;
import com.crm.security.CurrentUserProvider;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business logic for managing {@link User} accounts (requirements AUTH-04 to
 * AUTH-07).
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserProvider currentUserProvider;

    /**
     * Returns all users, ordered by first name then last name.
     *
     * @return the list of users, or an empty list if none exist
     */
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll(Sort.by("firstName", "lastName")).stream()
                .map(UserResponse::from)
                .toList();
    }

    /**
     * Returns the user with the given id.
     *
     * @param id the user id
     * @return the user, or {@link Optional#empty()} if no user with this id
     *         exists
     */
    public Optional<UserResponse> getUserById(Long id) {
        return userRepository.findById(id).map(UserResponse::from);
    }

    /**
     * Creates a new team member account (requirement AUTH-04). The plaintext
     * password is hashed with {@code BCryptPasswordEncoder(12)} before
     * storage and never logged.
     *
     * @param request the new user's details
     * @return the created user
     * @throws ConflictException if a user with this email already exists
     *         (constraint uq_users_email)
     */
    @Transactional
    public UserResponse createUser(UserCreateRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("A user with email '" + request.getEmail() + "' already exists");
        }

        User user = new User();
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setActive(true);

        User saved = userRepository.save(user);
        log.info("Created user {} (id={}, role={})", saved.getEmail(), saved.getId(), saved.getRole());
        return UserResponse.from(saved);
    }

    /**
     * Updates an existing user's profile, role, and active flag (requirements
     * AUTH-05, AUTH-06, AUTH-07). If {@code request.getPassword()} is
     * non-blank it is re-hashed and replaces the stored password; otherwise
     * the existing password is left unchanged.
     *
     * @param id      the user id
     * @param request the new field values
     * @return the updated user
     * @throws ResourceNotFoundException if no user with this id exists
     */
    @Transactional
    public UserResponse updateUser(Long id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User " + id + " not found"));

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setRole(request.getRole());
        user.setActive(request.getActive());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        User saved = userRepository.save(user);
        log.info("Updated user {} (id={}, active={}, role={})", saved.getEmail(), saved.getId(), saved.isActive(),
                saved.getRole());
        return UserResponse.from(saved);
    }

    /**
     * Returns the currently authenticated user's own profile (requirement
     * AUTH-07).
     *
     * @return the authenticated user's profile
     */
    public UserResponse getOwnProfile() {
        return UserResponse.from(currentUserProvider.getCurrentUser());
    }

    /**
     * Updates the currently authenticated user's own first and last name and,
     * optionally, password (requirement AUTH-07). Role and active status are
     * left unchanged — only an ADMIN can change those, via {@link #updateUser}.
     *
     * @param request the new profile field values
     * @return the updated profile
     */
    @Transactional
    public UserResponse updateOwnProfile(UserSelfUpdateRequest request) {
        User user = currentUserProvider.getCurrentUser();
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        User saved = userRepository.save(user);
        log.info("User {} updated their own profile", saved.getEmail());
        return UserResponse.from(saved);
    }
}
