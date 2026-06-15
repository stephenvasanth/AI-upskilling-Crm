package com.crm.controller;

import com.crm.dto.ContactCreateRequest;
import com.crm.dto.ContactResponse;
import com.crm.dto.ContactUpdateRequest;
import com.crm.dto.PageResponse;
import com.crm.service.ContactService;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints for managing {@link com.crm.entity.Contact}s (requirements CON-01
 * to CON-09). Available to any authenticated user (see
 * docs/REQUIREMENTS.md, User Roles &amp; Permissions Matrix).
 */
@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService contactService;

    /**
     * {@code GET /api/contacts?search&amp;tagId&amp;page&amp;size} — returns
     * a page of contacts, optionally filtered by free-text search (requirement
     * CON-04) and/or tag (requirement CON-05).
     *
     * @param search   a free-text search term, or absent for no search filter
     * @param tagId    a tag id to filter by, or absent for no tag filter
     * @param pageable pagination and sort information (defaults to page 0,
     *                 size 20)
     * @return 200 with a page of matching contacts, or an empty page if none
     *         match
     */
    @GetMapping
    public ResponseEntity<PageResponse<ContactResponse>> searchContacts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long tagId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(contactService.searchContacts(search, tagId, pageable));
    }

    /**
     * {@code POST /api/contacts} — creates a new contact (requirement
     * CON-01).
     *
     * @param request the new contact's details
     * @return 201 with the created contact and a {@code Location} header
     *         pointing at {@code /api/contacts/{id}}
     */
    @PostMapping
    public ResponseEntity<ContactResponse> createContact(@Valid @RequestBody ContactCreateRequest request) {
        ContactResponse created = contactService.createContact(request);
        return ResponseEntity.created(URI.create("/api/contacts/" + created.getId())).body(created);
    }

    /**
     * {@code GET /api/contacts/{id}} — returns the contact with the given id.
     * Reads through the {@code contacts} cache (see
     * {@link com.crm.config.RedisConfig}).
     *
     * @param id the contact id
     * @return 200 with the contact, or 404 if no contact with this id exists
     */
    @GetMapping("/{id}")
    public ResponseEntity<ContactResponse> getContactById(@PathVariable Long id) {
        return contactService.getContactById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * {@code PUT /api/contacts/{id}} — replaces a contact's editable fields
     * (requirement CON-02).
     *
     * @param id      the contact id
     * @param request the new field values
     * @return 200 with the updated contact
     */
    @PutMapping("/{id}")
    public ResponseEntity<ContactResponse> updateContact(@PathVariable Long id,
            @Valid @RequestBody ContactUpdateRequest request) {
        return ResponseEntity.ok(contactService.updateContact(id, request));
    }

    /**
     * {@code DELETE /api/contacts/{id}} — deletes a contact (requirement
     * CON-03).
     *
     * @param id the contact id
     * @return 204 with no body
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContact(@PathVariable Long id) {
        contactService.deleteContact(id);
        return ResponseEntity.noContent().build();
    }
}
