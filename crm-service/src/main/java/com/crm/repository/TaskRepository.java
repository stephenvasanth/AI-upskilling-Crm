package com.crm.repository;

import com.crm.entity.Task;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * Spring Data repository for {@link Task}.
 *
 * Extends {@link JpaSpecificationExecutor} so {@code TaskService} can compose
 * the optional "assigneeId" and "completed" filters ({@code GET
 * /api/tasks?assigneeId&completed}, requirement TSK-04) without a
 * combinatorial explosion of derived query methods.
 */
public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    /**
     * Returns all tasks linked to the given contact.
     *
     * Backs the contact detail view's linked-tasks list (requirement
     * CON-07).
     *
     * @param contactId the contact id
     * @return tasks linked to this contact, or an empty list if none exist
     */
    List<Task> findByContactId(Long contactId);

    /**
     * Returns all tasks linked to the given deal.
     *
     * Backs the deal detail view's linked-tasks list.
     *
     * @param dealId the deal id
     * @return tasks linked to this deal, or an empty list if none exist
     */
    List<Task> findByDealId(Long dealId);

    /**
     * Returns the incomplete tasks assigned to the given user, ordered by
     * due date (earliest first).
     *
     * Backs the personal dashboard "My open tasks" widget (requirement
     * TSK-06).
     *
     * @param assigneeId the assignee's user id
     * @return incomplete tasks assigned to this user ordered by due date, or
     *         an empty list if none exist
     */
    List<Task> findByAssigneeIdAndCompletedFalseOrderByDueDateAsc(Long assigneeId);
}
