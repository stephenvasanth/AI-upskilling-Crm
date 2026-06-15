package com.crm.entity;

/**
 * Type of interaction recorded by an {@link Activity} (requirement ACT-01).
 * Maps to the "type" column of the "activities" table (CHECK constraint
 * chk_activities_type).
 */
public enum ActivityType {

    /** A phone call with a contact. */
    CALL,

    /** An email exchange with a contact. */
    EMAIL,

    /** An in-person or virtual meeting. */
    MEETING,

    /** A free-form note not tied to a specific interaction channel. */
    NOTE
}
