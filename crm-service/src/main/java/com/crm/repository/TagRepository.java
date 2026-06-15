package com.crm.repository;

import com.crm.entity.Tag;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data repository for {@link Tag}.
 */
public interface TagRepository extends JpaRepository<Tag, Long> {

    /**
     * Returns all tags ordered alphabetically by name.
     *
     * Backs the {@code tags} cache (24h TTL, see rules.md Caching Strategy
     * section) used to render tag chips and the tag-assignment UI
     * (requirements TAG-03, CON-09).
     *
     * @return all tags ordered by name, or an empty list if none exist
     */
    List<Tag> findAllByOrderByNameAsc();

    /**
     * Checks whether a tag with the given name already exists.
     *
     * Used to reject duplicate tag names before hitting the uq_tags_name
     * constraint (requirement TAG-01).
     *
     * @param name the tag name to check
     * @return {@code true} if a tag with this name exists, {@code false}
     *         otherwise
     */
    boolean existsByName(String name);
}
