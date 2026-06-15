package com.crm.service;

import com.crm.dto.LoginRequest;
import com.crm.dto.LoginResponse;
import com.crm.dto.UserResponse;
import com.crm.entity.User;
import com.crm.repository.UserRepository;
import com.crm.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business logic for authenticating users and issuing JWTs (requirement
 * AUTH-01).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    /**
     * Authenticates a user by email and password and issues a signed JWT.
     *
     * Delegates credential checking (including the BCrypt comparison and the
     * "active" flag, see {@link com.crm.security.UserDetailsServiceImpl}) to
     * the {@link AuthenticationManager}.
     *
     * @param request the login credentials
     * @return the issued token and the authenticated user's profile
     * @throws AuthenticationException if the email/password combination is
     *         invalid or the account is deactivated; mapped to a generic 401
     *         by {@link com.crm.exception.GlobalExceptionHandler} so failed
     *         logins never reveal which part of the credentials was wrong
     *         (requirement AUTH-08)
     */
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + request.getEmail()));

        String token = jwtUtil.generateToken(user.getEmail());
        log.info("User {} logged in", user.getEmail());

        return LoginResponse.builder()
                .token(token)
                .user(UserResponse.from(user))
                .build();
    }
}
