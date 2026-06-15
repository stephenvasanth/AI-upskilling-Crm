/** Type of interaction recorded by an activity (crm-service `entity/ActivityType.java`). */
export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';

/**
 * Public view of an activity, with its contact/deal/author associations
 * flattened. Mirrors `ActivityResponse`.
 */
export interface ActivityResponse {
  id: number;
  type: ActivityType;
  subject: string;
  body: string | null;
  contactId: number | null;
  contactName: string | null;
  dealId: number | null;
  dealTitle: string | null;
  createdById: number;
  createdByName: string;
  createdAt: string;
}

/**
 * Request body for `POST /api/activities`. At least one of `contactId`/`dealId`
 * must be set (enforced server-side). Mirrors `ActivityCreateRequest`.
 */
export interface ActivityCreateRequest {
  type: ActivityType;
  subject: string;
  body?: string | null;
  contactId?: number | null;
  dealId?: number | null;
}
