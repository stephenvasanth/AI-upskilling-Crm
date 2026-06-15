package com.crm.repository;

import com.crm.entity.Deal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data repository for {@link Deal}.
 */
public interface DealRepository extends JpaRepository<Deal, Long> {

    /**
     * Returns all deals ordered by stage, then most-recently-created first
     * within each stage.
     *
     * Backs the Kanban pipeline view ({@code GET /api/deals/pipeline},
     * requirements DEA-02, DEA-05): the service groups the result by
     * {@link com.crm.entity.DealStage} to build each column's card list,
     * count, and total value.
     *
     * @return all deals ordered by stage and creation time, or an empty list
     *         if none exist
     */
    List<Deal> findAllByOrderByStageAscCreatedAtDesc();

    /**
     * Returns all deals linked to the given contact.
     *
     * Backs the contact detail view's linked-deals list (requirement
     * CON-07).
     *
     * @param contactId the contact id
     * @return deals linked to this contact, or an empty list if none exist
     */
    List<Deal> findByContactId(Long contactId);
}
