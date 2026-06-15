package com.crm.config;

/**
 * Cache name constants for every {@code @Cacheable}/{@code @CacheEvict}
 * annotation in the service layer (rules.md §8.4). Using these constants
 * instead of inline string literals keeps the read ({@code @Cacheable}) and
 * write ({@code @CacheEvict}) sides of each cache in sync.
 *
 * All caches share the 24-hour TTL configured in {@link RedisConfig}.
 */
public final class CacheNames {

    /** {@code ContactService.getContactById(id)}, keyed by contact id. */
    public static final String CONTACTS = "contacts";

    /** {@code DealService.getPipeline()} — the Kanban pipeline view. */
    public static final String PIPELINE = "pipeline";

    /** {@code TagService.getAllTags()}. */
    public static final String TAGS = "tags";

    /** {@code CompanyService.getAllCompanies()}. */
    public static final String COMPANIES = "companies";

    private CacheNames() {
    }
}
