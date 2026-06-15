package com.crm.service;

import com.crm.dto.ActivityCreateRequest;
import com.crm.dto.ActivityResponse;
import com.crm.dto.PageResponse;
import com.crm.entity.Activity;
import com.crm.entity.Contact;
import com.crm.entity.Deal;
import com.crm.exception.ResourceNotFoundException;
import com.crm.repository.ActivityRepository;
import com.crm.repository.ContactRepository;
import com.crm.repository.DealRepository;
import com.crm.security.CurrentUserProvider;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business logic for logging and browsing {@link Activity}s (requirements
 * ACT-01 to ACT-05).
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final ContactRepository contactRepository;
    private final DealRepository dealRepository;
    private final CurrentUserProvider currentUserProvider;

    /**
     * Returns a page of activities, most recent first, optionally restricted
     * to those linked to a single contact or a single deal (requirements
     * ACT-03, ACT-05). If both filters are provided, the contact filter
     * takes precedence.
     *
     * @param contactId a contact id to filter by, or {@code null} for no
     *                  contact filter
     * @param dealId    a deal id to filter by, or {@code null} for no deal
     *                  filter
     * @param pageable  pagination information
     * @return a page of matching activities, or an empty page if none match
     */
    public PageResponse<ActivityResponse> getActivities(Long contactId, Long dealId, Pageable pageable) {
        Page<Activity> page;
        if (contactId != null) {
            page = activityRepository.findByContactIdOrderByCreatedAtDesc(contactId, pageable);
        } else if (dealId != null) {
            page = activityRepository.findByDealIdOrderByCreatedAtDesc(dealId, pageable);
        } else {
            page = activityRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return PageResponse.from(page.map(ActivityResponse::from));
    }

    /**
     * Returns the 10 most recently logged activities, for the dashboard's
     * "Recent activities" widget (requirement DSH-01).
     *
     * @return up to 10 activities, most recent first, or an empty list if
     *         none exist
     */
    public List<ActivityResponse> getRecentActivities() {
        return activityRepository.findTop10ByOrderByCreatedAtDesc().stream()
                .map(ActivityResponse::from)
                .toList();
    }

    /**
     * Logs a new activity against a contact and/or a deal (requirement
     * ACT-01). "createdBy" is set to the currently authenticated user.
     *
     * @param request the activity to log
     * @return the created activity
     * @throws IllegalArgumentException if both {@code contactId} and
     *         {@code dealId} are {@code null} — an activity must be about
     *         something (constraint chk_activities_linked_to_something,
     *         rules.md §6)
     * @throws ResourceNotFoundException if {@code contactId}/{@code dealId}
     *         are set but do not match an existing contact/deal
     */
    @Transactional
    public ActivityResponse createActivity(ActivityCreateRequest request) {
        if (request.getContactId() == null && request.getDealId() == null) {
            throw new IllegalArgumentException("An activity must be linked to a contact or a deal");
        }

        Activity activity = new Activity();
        activity.setType(request.getType());
        activity.setSubject(request.getSubject());
        activity.setBody(request.getBody());
        activity.setCreatedBy(currentUserProvider.getCurrentUser());

        if (request.getContactId() != null) {
            Contact contact = contactRepository.findById(request.getContactId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Contact " + request.getContactId() + " not found"));
            activity.setContact(contact);
        }

        if (request.getDealId() != null) {
            Deal deal = dealRepository.findById(request.getDealId())
                    .orElseThrow(() -> new ResourceNotFoundException("Deal " + request.getDealId() + " not found"));
            activity.setDeal(deal);
        }

        Activity saved = activityRepository.save(activity);
        log.info("Logged {} activity '{}' (id={})", saved.getType(), saved.getSubject(), saved.getId());
        return ActivityResponse.from(saved);
    }

    /**
     * Deletes an activity.
     *
     * @param id the activity id
     * @throws ResourceNotFoundException if no activity with this id exists
     */
    @Transactional
    public void deleteActivity(Long id) {
        if (!activityRepository.existsById(id)) {
            throw new ResourceNotFoundException("Activity " + id + " not found");
        }
        activityRepository.deleteById(id);
        log.info("Deleted activity {}", id);
    }
}
