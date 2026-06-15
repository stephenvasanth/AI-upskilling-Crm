package com.crm.exception;

/**
 * Thrown when a write would violate a uniqueness or business-rule constraint
 * (e.g. a duplicate user email or tag name).
 *
 * Mapped to HTTP 409 by {@link GlobalExceptionHandler} (rules.md §7).
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
