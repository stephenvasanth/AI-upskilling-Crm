import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/page.model';
import { TaskCreateRequest, TaskResponse, TaskUpdateRequest } from '../models/task.model';

const BASE_URL = `${environment.apiUrl}/tasks`;

/** Optional filters/pagination/sorting for {@link TaskService.getTasks}. */
export interface TaskListParams {
  assigneeId?: number;
  completed?: boolean;
  page?: number;
  size?: number;
  /** Spring `sort` syntax, e.g. `'dueDate,asc'`. */
  sort?: string;
}

/**
 * HTTP access for the `/api/tasks` resource (requirements TSK-01 to TSK-06).
 */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);

  /**
   * Loads a page of tasks, optionally filtered by assignee or completion
   * status (`GET /api/tasks?assigneeId&completed&page&size`).
   *
   * @param params optional assigneeId/completed/page/size filters
   * @returns the matching page of tasks
   */
  getTasks(params: TaskListParams = {}): Observable<PageResponse<TaskResponse>> {
    let httpParams = new HttpParams();
    if (params.assigneeId !== undefined) {
      httpParams = httpParams.set('assigneeId', params.assigneeId);
    }
    if (params.completed !== undefined) {
      httpParams = httpParams.set('completed', params.completed);
    }
    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page);
    }
    if (params.size !== undefined) {
      httpParams = httpParams.set('size', params.size);
    }
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    return this.http.get<PageResponse<TaskResponse>>(BASE_URL, { params: httpParams });
  }

  /**
   * Creates a new task (`POST /api/tasks`, requirement TSK-01).
   *
   * @param request the new task's field values
   * @returns the created task
   */
  createTask(request: TaskCreateRequest): Observable<TaskResponse> {
    return this.http.post<TaskResponse>(BASE_URL, request);
  }

  /**
   * Replaces a task's editable fields (`PUT /api/tasks/{id}`, requirement
   * TSK-03).
   *
   * @param id the task id to update
   * @param request the new field values
   * @returns the updated task
   */
  updateTask(id: number, request: TaskUpdateRequest): Observable<TaskResponse> {
    return this.http.put<TaskResponse>(`${BASE_URL}/${id}`, request);
  }

  /**
   * Toggles a task's completed state (`PATCH /api/tasks/{id}/toggle`).
   *
   * @param id the task id to toggle
   * @returns the updated task
   */
  toggleTask(id: number): Observable<TaskResponse> {
    return this.http.patch<TaskResponse>(`${BASE_URL}/${id}/toggle`, {});
  }

  /**
   * Deletes a task (`DELETE /api/tasks/{id}`).
   *
   * @param id the task id to delete
   */
  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
