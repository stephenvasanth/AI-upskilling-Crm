import { TagResponse } from './tag.model';

/**
 * Public view of a contact, with its company/owner associations flattened
 * and its tags sorted by name. Mirrors `ContactResponse`.
 */
export interface ContactResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  companyId: number | null;
  companyName: string | null;
  ownerId: number;
  ownerName: string;
  tags: TagResponse[];
  createdAt: string;
  updatedAt: string;
}

/** Request body for `POST /api/contacts`. Mirrors `ContactCreateRequest`. */
export interface ContactCreateRequest {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  companyId?: number | null;
  ownerId: number;
  tagIds?: number[];
}

/**
 * Request body for `PUT /api/contacts/{id}`: a full replacement of the
 * contact's editable fields. Mirrors `ContactUpdateRequest`.
 */
export type ContactUpdateRequest = ContactCreateRequest;
