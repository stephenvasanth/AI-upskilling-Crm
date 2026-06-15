/**
 * Public view of a task, with its contact/deal/assignee associations
 * flattened. Mirrors `TaskResponse`.
 */
export interface TaskResponse {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  contactId: number | null;
  contactName: string | null;
  dealId: number | null;
  dealTitle: string | null;
  assigneeId: number;
  assigneeName: string;
  createdAt: string;
  updatedAt: string;
}

/** Request body for `POST /api/tasks`. Mirrors `TaskCreateRequest`. */
export interface TaskCreateRequest {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  contactId?: number | null;
  dealId?: number | null;
  assigneeId: number;
}

/**
 * Request body for `PUT /api/tasks/{id}`: a full replacement of the task's
 * editable fields. Mirrors `TaskUpdateRequest`.
 */
export type TaskUpdateRequest = TaskCreateRequest;
