package com.crm.repository;

import com.crm.entity.Activity;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data repository for {@link Activity}.
 */
public interface ActivityRepository extends JpaRepository<Activity, Long> {

    /**
     * Returns activities linked to the given contact, most recent first.
     *
     * Backs the per-contact activity feed ({@code GET
     * /api/activities?contactId}, requirements ACT-03, CON-07).
     *
     * @param contactId the contact id
     * @param pageable  pagination information
     * @return a page of activities for this contact, or an empty page if
     *         none exist
     */
    Page<Activity> findByContactIdOrderByCreatedAtDesc(Long contactId, Pageable pageable);

    /**
     * Returns activities linked to the given deal, most recent first.
     *
     * Backs the per-deal activity feed ({@code GET /api/activities?dealId},
     * requirement ACT-03).
     *
     * @param dealId   the deal id
     * @param pageable pagination information
     * @return a page of activities for this deal, or an empty page if none
     *         exist
     */
    Page<Activity> findByDealIdOrderByCreatedAtDesc(Long dealId, Pageable pageable);

    /**
     * Returns all activities, most recent first.
     *
     * Backs the global activity feed ({@code GET /api/activities} with no
     * filter, requirement ACT-05).
     *
     * @param pageable pagination information
     * @return a page of activities, or an empty page if none exist
     */
    Page<Activity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Returns the 10 most recently logged activities.
     *
     * Backs the dashboard's "Recent activities" widget (requirement DSH-01).
     *
     * @return up to 10 activities, most recent first, or an empty list if
     *         none exist
     */
    List<Activity> findTop10ByOrderByCreatedAtDesc();
}
