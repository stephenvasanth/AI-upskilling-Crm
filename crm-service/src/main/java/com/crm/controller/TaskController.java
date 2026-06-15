package com.crm.controller;

import com.crm.dto.PageResponse;
import com.crm.dto.TaskCreateRequest;
import com.crm.dto.TaskResponse;
import com.crm.dto.TaskUpdateRequest;
import com.crm.service.TaskService;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints for managing {@link com.crm.entity.Task}s (requirements TSK-01 to
 * TSK-06). Available to any authenticated user (see docs/REQUIREMENTS.md,
 * User Roles &amp; Permissions Matrix).
 */
@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    /**
     * {@code GET /api/tasks?assigneeId&amp;completed&amp;page&amp;size} —
     * returns a page of tasks, optionally filtered by assignee and/or
     * completion status (requirement TSK-04).
     *
     * @param assigneeId a user id to filter by, or absent for no assignee
     *                   filter
     * @param completed  a completion status to filter by, or absent for no
     *                   completion filter
     * @param pageable   pagination and sort information (defaults to page 0,
     *                   size 20)
     * @return 200 with a page of matching tasks, or an empty page if none
     *         match
     */
    @GetMapping
    public ResponseEntity<PageResponse<TaskResponse>> getTasks(
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Boolean completed,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(taskService.getTasks(assigneeId, completed, pageable));
    }

    /**
     * {@code POST /api/tasks} — creates a new task (requirement TSK-01).
     *
     * @param request the new task's details
     * @return 201 with the created task and a {@code Location} header
     *         pointing at {@code /api/tasks/{id}}
     */
    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody TaskCreateRequest request) {
        TaskResponse created = taskService.createTask(request);
        return ResponseEntity.created(URI.create("/api/tasks/" + created.getId())).body(created);
    }

    /**
     * {@code PUT /api/tasks/{id}} — replaces a task's editable fields
     * (requirement TSK-03).
     *
     * @param id      the task id
     * @param request the new field values
     * @return 200 with the updated task
     */
    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable Long id, @Valid @RequestBody TaskUpdateRequest request) {
        return ResponseEntity.ok(taskService.updateTask(id, request));
    }

    /**
     * {@code PATCH /api/tasks/{id}/toggle} — flips a task's completion flag
     * (requirement TSK-02).
     *
     * @param id the task id
     * @return 200 with the updated task
     */
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<TaskResponse> toggleCompleted(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.toggleCompleted(id));
    }

    /**
     * {@code DELETE /api/tasks/{id}} — deletes a task (requirement TSK-03).
     *
     * @param id the task id
     * @return 204 with no body
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}
