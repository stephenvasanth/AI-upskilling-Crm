package com.crm.exception;

/**
 * Thrown when an operation that requires an entity to exist (update, delete,
 * or a foreign-key reference such as an owner/assignee/company id) targets an
 * id that does not exist.
 *
 * Mapped to HTTP 404 by {@link GlobalExceptionHandler} (rules.md §7). Not
 * used for "not found" on a plain read — see rules.md §8.1, which requires
 * returning an empty result instead.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
