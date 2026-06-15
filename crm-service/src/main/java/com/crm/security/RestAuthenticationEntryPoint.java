package com.crm.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/**
 * Returns a structured 401 JSON error body (rules.md §7) for requests to
 * protected endpoints that carry no JWT, or an invalid/expired one
 * (requirement NFR-S01).
 */
@Component
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    /**
     * Writes the 401 error body for an unauthenticated request to a
     * protected endpoint.
     *
     * @param request       the request that failed authentication
     * @param response      the response to write the error body to
     * @param authException the exception raised by the security filter chain
     * @throws IOException if writing to the response fails
     */
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException authException) throws IOException {
        SecurityResponseWriter.write(request, response, objectMapper, HttpStatus.UNAUTHORIZED.value(),
                HttpStatus.UNAUTHORIZED.getReasonPhrase(), "Authentication required");
    }
}
