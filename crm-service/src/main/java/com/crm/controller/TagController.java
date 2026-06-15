package com.crm.controller;

import com.crm.dto.TagCreateRequest;
import com.crm.dto.TagResponse;
import com.crm.service.TagService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints for managing {@link com.crm.entity.Tag}s (requirements TAG-01 to
 * TAG-03).
 */
@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    /**
     * {@code GET /api/tags} — lists all tags, ordered by name (requirement
     * TAG-03). Available to any authenticated user.
     *
     * @return 200 with the list of tags, or an empty list if none exist
     */
    @GetMapping
    public ResponseEntity<List<TagResponse>> getAllTags() {
        return ResponseEntity.ok(tagService.getAllTags());
    }

    /**
     * {@code POST /api/tags} — creates a new tag (requirement TAG-01).
     * Requires the {@code ADMIN} role.
     *
     * @param request the new tag's details
     * @return 201 with the created tag and a {@code Location} header
     *         pointing at {@code /api/tags/{id}}
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TagResponse> createTag(@Valid @RequestBody TagCreateRequest request) {
        TagResponse created = tagService.createTag(request);
        return ResponseEntity.created(URI.create("/api/tags/" + created.getId())).body(created);
    }

    /**
     * {@code DELETE /api/tags/{id}} — deletes a tag (requirement TAG-02).
     * Requires the {@code ADMIN} role.
     *
     * @param id the tag id
     * @return 204 with no body
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteTag(@PathVariable Long id) {
        tagService.deleteTag(id);
        return ResponseEntity.noContent().build();
    }
}
