package com.crm.controller;

import com.crm.dto.ActivityCreateRequest;
import com.crm.dto.ActivityResponse;
import com.crm.dto.PageResponse;
import com.crm.service.ActivityService;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints for logging and browsing {@link com.crm.entity.Activity}s
 * (requirements ACT-01 to ACT-05). Available to any authenticated user (see
 * docs/REQUIREMENTS.md, User Roles &amp; Permissions Matrix).
 */
@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    /**
     * {@code GET /api/activities?contactId&amp;dealId&amp;page&amp;size} —
     * returns a page of activities, most recent first, optionally restricted
     * to a single contact (requirement ACT-03) or deal. If both
     * {@code contactId} and {@code dealId} are provided, the contact filter
     * takes precedence (requirement ACT-05 for the unfiltered global feed).
     *
     * @param contactId a contact id to filter by, or absent for no contact
     *                  filter
     * @param dealId    a deal id to filter by, or absent for no deal filter
     * @param pageable  pagination information (defaults to page 0, size 20)
     * @return 200 with a page of matching activities, or an empty page if
     *         none match
     */
    @GetMapping
    public ResponseEntity<PageResponse<ActivityResponse>> getActivities(
            @RequestParam(required = false) Long contactId,
            @RequestParam(required = false) Long dealId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(activityService.getActivities(contactId, dealId, pageable));
    }

    /**
     * {@code POST /api/activities} — logs a new activity against a contact
     * and/or a deal (requirements ACT-01, ACT-02). The author is set to the
     * authenticated user.
     *
     * @param request the activity to log
     * @return 201 with the created activity and a {@code Location} header
     *         pointing at {@code /api/activities/{id}}
     */
    @PostMapping
    public ResponseEntity<ActivityResponse> createActivity(@Valid @RequestBody ActivityCreateRequest request) {
        ActivityResponse created = activityService.createActivity(request);
        return ResponseEntity.created(URI.create("/api/activities/" + created.getId())).body(created);
    }

    /**
     * {@code DELETE /api/activities/{id}} — deletes an activity (requirement
     * ACT-04).
     *
     * @param id the activity id
     * @return 204 with no body
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteActivity(@PathVariable Long id) {
        activityService.deleteActivity(id);
        return ResponseEntity.noContent().build();
    }
}
