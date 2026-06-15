package com.crm.entity;

/**
 * Pipeline stage of a {@link Deal}, visualised as Kanban columns on the Deal
 * Board (requirement DEA-03). Maps to the "stage" column of the "deals"
 * table (CHECK constraint chk_deals_stage).
 *
 * Stages are ordered as listed: a deal normally progresses from
 * {@link #LEAD} through to either {@link #CLOSED_WON} or
 * {@link #CLOSED_LOST}.
 */
public enum DealStage {

    /** A new, unqualified opportunity. */
    LEAD,

    /** The opportunity has been validated as a real prospect. */
    QUALIFIED,

    /** A proposal has been sent to the prospect. */
    PROPOSAL,

    /** Terms are being discussed/negotiated. */
    NEGOTIATION,

    /** The deal was won. */
    CLOSED_WON,

    /** The deal was lost. */
    CLOSED_LOST
}
