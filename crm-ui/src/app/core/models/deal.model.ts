/** Pipeline stage of a deal (crm-service `entity/DealStage.java`). */
export type DealStage = 'LEAD' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';

/**
 * Public view of a deal, with its contact/owner associations flattened.
 * Mirrors `DealResponse`.
 */
export interface DealResponse {
  id: number;
  title: string;
  value: number;
  stage: DealStage;
  closeDate: string | null;
  contactId: number | null;
  contactName: string | null;
  ownerId: number;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

/** Request body for `POST /api/deals`. Mirrors `DealCreateRequest`. */
export interface DealCreateRequest {
  title: string;
  value: number;
  stage: DealStage;
  closeDate?: string | null;
  contactId?: number | null;
  ownerId: number;
}

/**
 * Request body for `PUT /api/deals/{id}`: a full replacement of the deal's
 * editable fields. Mirrors `DealUpdateRequest`.
 */
export type DealUpdateRequest = DealCreateRequest;

/** Request body for `PATCH /api/deals/{id}/stage`. Mirrors `DealStageUpdateRequest`. */
export interface DealStageUpdateRequest {
  stage: DealStage;
}

/**
 * One column of the Kanban pipeline view: a deal stage together with the
 * deals currently in it, their count, and total value. Mirrors `PipelineStageResponse`.
 */
export interface PipelineStageResponse {
  stage: DealStage;
  count: number;
  totalValue: number;
  deals: DealResponse[];
}

/** Response returned by `GET /api/deals/pipeline`. Mirrors `PipelineResponse`. */
export interface PipelineResponse {
  stages: PipelineStageResponse[];
}
