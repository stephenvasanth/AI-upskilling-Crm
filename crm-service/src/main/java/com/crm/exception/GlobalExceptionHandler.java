package com.crm.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Converts every exception raised by a controller or service into the
 * structured JSON error body required by rules.md §7 / requirement NFR-R01:
 *
 * <pre>
 * {
 *   "timestamp": "2026-06-14T10:00:00Z",
 *   "status": 404,
 *   "error": "Not Found",
 *   "message": "Contact 42 not found",
 *   "path": "/api/contacts/42"
 * }
 * </pre>
 *
 * No raw stack trace, SQL error, or internal exception message ever reaches
 * the client.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Handles a missing entity on a write path (update/delete/FK reference).
     *
     * @param ex      the exception, whose message is safe to return to the client
     * @param request the failed request, used to populate the "path" field
     * @return a 404 response with the structured error body
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(ResourceNotFoundException ex,
            HttpServletRequest request) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request);
    }

    /**
     * Handles a write that violates a uniqueness or business-rule constraint.
     *
     * @param ex      the exception, whose message is safe to return to the client
     * @param request the failed request, used to populate the "path" field
     * @return a 409 response with the structured error body
     */
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(ConflictException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    /**
     * Handles a failed login (bad credentials or a deactivated account) with
     * a single generic message, never revealing which part of the
     * credentials was wrong (requirement AUTH-08).
     *
     * @param ex      the authentication failure raised by {@code AuthenticationManager}
     * @param request the failed request, used to populate the "path" field
     * @return a 401 response with the structured error body
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthentication(AuthenticationException ex,
            HttpServletRequest request) {
        return buildResponse(HttpStatus.UNAUTHORIZED, "Invalid email or password", request);
    }

    /**
     * Handles {@code @Valid} request body validation failures, joining every
     * field error into a single human-readable message.
     *
     * @param ex      the exception raised by Bean Validation
     * @param request the failed request, used to populate the "path" field
     * @return a 400 response with the structured error body
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex,
            HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return buildResponse(HttpStatus.BAD_REQUEST, message, request);
    }

    /**
     * Handles a request body that cannot be parsed (malformed JSON, wrong
     * type for a field, etc.).
     *
     * @param ex      the exception raised while reading the request body
     * @param request the failed request, used to populate the "path" field
     * @return a 400 response with the structured error body
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadable(HttpMessageNotReadableException ex,
            HttpServletRequest request) {
        return buildResponse(HttpStatus.BAD_REQUEST, "Malformed request body", request);
    }

    /**
     * Handles a service-layer business-rule violation that does not warrant
     * its own exception type (e.g. a cross-field validation rule such as
     * "an activity must be linked to a contact or a deal", rules.md §6).
     *
     * @param ex      the exception, whose message is safe to return to the client
     * @param request the failed request, used to populate the "path" field
     * @return a 400 response with the structured error body
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex,
            HttpServletRequest request) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    /**
     * Catch-all for any exception not handled above. Logs the full exception
     * for diagnosis but returns only a generic message to the client (rules.md
     * §7: never leak internal exception details).
     *
     * @param ex      the unexpected exception
     * @param request the failed request, used to populate the "path" field
     * @return a 500 response with the structured error body
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception processing {} {}", request.getMethod(), request.getRequestURI(), ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred", request);
    }

    /**
     * Builds the structured error body shared by every handler in this class.
     *
     * @param status  the HTTP status to set on the response
     * @param message a human-readable description of the failure
     * @param request the failed request, used to populate the "path" field
     * @return the response entity with status and body populated
     */
    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message,
            HttpServletRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        body.put("path", request.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }
}
