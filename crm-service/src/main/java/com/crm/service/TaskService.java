package com.crm.service;

import com.crm.dto.PageResponse;
import com.crm.dto.TaskCreateRequest;
import com.crm.dto.TaskResponse;
import com.crm.dto.TaskUpdateRequest;
import com.crm.entity.Contact;
import com.crm.entity.Deal;
import com.crm.entity.Task;
import com.crm.entity.User;
import com.crm.exception.ResourceNotFoundException;
import com.crm.repository.ContactRepository;
import com.crm.repository.DealRepository;
import com.crm.repository.TaskRepository;
import com.crm.repository.UserRepository;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business logic for managing {@link Task}s (requirements TSK-01 to TSK-06).
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TaskService {

    private final TaskRepository taskRepository;
    private final ContactRepository contactRepository;
    private final DealRepository dealRepository;
    private final UserRepository userRepository;

    /**
     * Returns a page of tasks, optionally filtered by assignee and/or
     * completion status (requirement TSK-04).
     *
     * @param assigneeId a user id to filter by, or {@code null} for no
     *                   assignee filter
     * @param completed  a completion status to filter by, or {@code null}
     *                   for no completion filter
     * @param pageable   pagination and sort information
     * @return a page of matching tasks, or an empty page if none match
     */
    public PageResponse<TaskResponse> getTasks(Long assigneeId, Boolean completed, Pageable pageable) {
        Specification<Task> spec = Specification.where(null);

        if (assigneeId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("assignee").get("id"), assigneeId));
        }
        if (completed != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("completed"), completed));
        }

        Page<Task> page = taskRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(TaskResponse::from));
    }

    /**
     * Returns the incomplete tasks assigned to the given user, ordered by
     * due date (earliest first), for the personal dashboard's "My open
     * tasks" widget (requirement TSK-06).
     *
     * @param assigneeId the assignee's user id
     * @return incomplete tasks assigned to this user ordered by due date, or
     *         an empty list if none exist
     */
    public List<TaskResponse> getOpenTasksForAssignee(Long assigneeId) {
        return taskRepository.findByAssigneeIdAndCompletedFalseOrderByDueDateAsc(assigneeId).stream()
                .map(TaskResponse::from)
                .toList();
    }

    /**
     * Creates a new task (requirement TSK-01).
     *
     * @param request the new task's details
     * @return the created task
     * @throws ResourceNotFoundException if {@code assigneeId} does not match
     *         an existing user, or {@code contactId}/{@code dealId} are set
     *         but do not match an existing contact/deal
     */
    @Transactional
    public TaskResponse createTask(TaskCreateRequest request) {
        Task task = new Task();
        applyFields(task, request.getTitle(), request.getDescription(), request.getDueDate(),
                request.getContactId(), request.getDealId(), request.getAssigneeId());

        Task saved = taskRepository.save(task);
        log.info("Created task '{}' (id={})", saved.getTitle(), saved.getId());
        return TaskResponse.from(saved);
    }

    /**
     * Replaces an existing task's editable fields (requirement TSK-03).
     *
     * @param id      the task id
     * @param request the new field values
     * @return the updated task
     * @throws ResourceNotFoundException if no task with this id exists,
     *         {@code assigneeId} does not match an existing user, or
     *         {@code contactId}/{@code dealId} are set but do not match an
     *         existing contact/deal
     */
    @Transactional
    public TaskResponse updateTask(Long id, TaskUpdateRequest request) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task " + id + " not found"));

        applyFields(task, request.getTitle(), request.getDescription(), request.getDueDate(),
                request.getContactId(), request.getDealId(), request.getAssigneeId());

        Task saved = taskRepository.save(task);
        log.info("Updated task {}", saved.getId());
        return TaskResponse.from(saved);
    }

    /**
     * Flips a task's completion flag (requirement TSK-02).
     *
     * @param id the task id
     * @return the updated task
     * @throws ResourceNotFoundException if no task with this id exists
     */
    @Transactional
    public TaskResponse toggleCompleted(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task " + id + " not found"));

        task.setCompleted(!task.isCompleted());

        Task saved = taskRepository.save(task);
        log.info("Task {} completed={}", saved.getId(), saved.isCompleted());
        return TaskResponse.from(saved);
    }

    /**
     * Deletes a task.
     *
     * @param id the task id
     * @throws ResourceNotFoundException if no task with this id exists
     */
    @Transactional
    public void deleteTask(Long id) {
        if (!taskRepository.existsById(id)) {
            throw new ResourceNotFoundException("Task " + id + " not found");
        }
        taskRepository.deleteById(id);
        log.info("Deleted task {}", id);
    }

    /**
     * Applies create/update field values to a task entity, resolving its
     * assignee, contact, and deal references.
     *
     * @param task        the task entity to mutate (new or existing)
     * @param title       the task title
     * @param description a free-form description, or {@code null}
     * @param dueDate     the due date, or {@code null}
     * @param contactId   the id of the contact to link, or {@code null} to
     *                    leave the task unlinked from any contact
     * @param dealId      the id of the deal to link, or {@code null} to
     *                    leave the task unlinked from any deal
     * @param assigneeId  the id of the user this task is assigned to
     * @throws ResourceNotFoundException if {@code assigneeId} does not match
     *         an existing user, or {@code contactId}/{@code dealId} are set
     *         but do not match an existing contact/deal
     */
    private void applyFields(Task task, String title, String description, LocalDate dueDate, Long contactId,
            Long dealId, Long assigneeId) {
        task.setTitle(title);
        task.setDescription(description);
        task.setDueDate(dueDate);

        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new ResourceNotFoundException("User " + assigneeId + " not found"));
        task.setAssignee(assignee);

        if (contactId != null) {
            Contact contact = contactRepository.findById(contactId)
                    .orElseThrow(() -> new ResourceNotFoundException("Contact " + contactId + " not found"));
            task.setContact(contact);
        } else {
            task.setContact(null);
        }

        if (dealId != null) {
            Deal deal = dealRepository.findById(dealId)
                    .orElseThrow(() -> new ResourceNotFoundException("Deal " + dealId + " not found"));
            task.setDeal(deal);
        } else {
            task.setDeal(null);
        }
    }
}
