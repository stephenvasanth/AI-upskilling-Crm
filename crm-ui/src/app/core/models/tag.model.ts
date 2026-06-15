/** Public view of a tag. Mirrors `TagResponse`. */
export interface TagResponse {
  id: number;
  name: string;
  color: string;
}

/** Request body for `POST /api/tags` (ADMIN only). Mirrors `TagCreateRequest`. */
export interface TagCreateRequest {
  name: string;
  /** 7-character hex colour code, e.g. `#FF5733`. */
  color: string;
}
