/**
 * Generic paged list returned by list endpoints that accept `page`/`size`
 * query parameters. Mirrors `PageResponse<T>` (crm-service `dto/PageResponse.java`).
 */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
