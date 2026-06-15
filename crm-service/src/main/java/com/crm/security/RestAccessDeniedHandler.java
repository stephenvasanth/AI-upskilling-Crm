package com.crm.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/**
 * Returns a structured 403 JSON error body (rules.md §7) for authenticated
 * requests that lack the role required for the endpoint (requirement
 * NFR-S02, e.g. a USER calling an ADMIN-only endpoint).
 */
@Component
@RequiredArgsConstructor
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    /**
     * Writes the 403 error body for an authenticated request denied by a
     * {@code @PreAuthorize} role check.
     *
     * @param request                the request that was denied
     * @param response               the response to write the error body to
     * @param accessDeniedException the exception raised by the method
     *                               security interceptor
     * @throws IOException if writing to the response fails
     */
    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
            AccessDeniedException accessDeniedException) throws IOException {
        SecurityResponseWriter.write(request, response, objectMapper, HttpStatus.FORBIDDEN.value(),
                HttpStatus.FORBIDDEN.getReasonPhrase(), "You do not have permission to access this resource");
    }
}
