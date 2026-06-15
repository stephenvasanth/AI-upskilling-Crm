package com.crm.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Writes the structured JSON error body (rules.md §7, requirement NFR-R01)
 * for authentication/authorisation failures raised by the security filter
 * chain — i.e. before {@code GlobalExceptionHandler} would otherwise see
 * them.
 *
 * Used by {@link RestAuthenticationEntryPoint} (401) and
 * {@link RestAccessDeniedHandler} (403).
 */
final class SecurityResponseWriter {

    private SecurityResponseWriter() {
    }

    /**
     * Writes a JSON error body with the given status, error reason, and
     * message to the response.
     *
     * @param request      the request that failed authentication/authorisation,
     *                     used to populate the "path" field
     * @param response     the response to write the error body to
     * @param objectMapper the mapper used to serialise the error body
     * @param status       the HTTP status code to set on the response
     * @param error        the short error reason (e.g. "Unauthorized")
     * @param message      a human-readable description of the failure
     * @throws IOException if writing to the response fails
     */
    static void write(HttpServletRequest request, HttpServletResponse response, ObjectMapper objectMapper,
            int status, String error, String message) throws IOException {

        response.setStatus(status);
        response.setContentType("application/json");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status);
        body.put("error", error);
        body.put("message", message);
        body.put("path", request.getRequestURI());

        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
