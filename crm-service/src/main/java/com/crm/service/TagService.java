package com.crm.service;

import com.crm.config.CacheNames;
import com.crm.dto.TagCreateRequest;
import com.crm.dto.TagResponse;
import com.crm.entity.Tag;
import com.crm.exception.ConflictException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.repository.TagRepository;
import com.crm.security.CurrentUserProvider;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business logic for managing {@link Tag}s (requirements TAG-01 to TAG-03).
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TagService {

    private final TagRepository tagRepository;
    private final CurrentUserProvider currentUserProvider;

    /**
     * Returns all tags, ordered by name.
     *
     * Reads through the {@code tags} cache for 24 hours (see
     * {@link com.crm.config.RedisConfig}).
     *
     * @return the list of tags, or an empty list if none exist
     */
    @Cacheable(cacheNames = CacheNames.TAGS)
    public List<TagResponse> getAllTags() {
        // Collectors.toList() (not Stream.toList()) — see rules.md §8.5.
        return tagRepository.findAllByOrderByNameAsc().stream()
                .map(TagResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Creates a new tag and invalidates the {@code tags} cache so the new
     * tag is visible on the next read (requirement TAG-01). "createdBy" is
     * set to the currently authenticated user.
     *
     * @param request the tag to create
     * @return the created tag
     * @throws ConflictException if a tag with this name already exists
     *         (constraint uq_tags_name)
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.TAGS, allEntries = true)
    public TagResponse createTag(TagCreateRequest request) {
        if (tagRepository.existsByName(request.getName())) {
            throw new ConflictException("A tag named '" + request.getName() + "' already exists");
        }

        Tag tag = new Tag();
        tag.setName(request.getName());
        tag.setColor(request.getColor());
        tag.setCreatedBy(currentUserProvider.getCurrentUser());

        Tag saved = tagRepository.save(tag);
        log.info("Created tag '{}' (id={})", saved.getName(), saved.getId());
        return TagResponse.from(saved);
    }

    /**
     * Deletes a tag and invalidates the {@code tags} cache. The tag is
     * automatically removed from every contact it was assigned to (ON DELETE
     * CASCADE on contact_tags, requirement TAG-02).
     *
     * @param id the tag id
     * @throws ResourceNotFoundException if no tag with this id exists
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.TAGS, allEntries = true)
    public void deleteTag(Long id) {
        if (!tagRepository.existsById(id)) {
            throw new ResourceNotFoundException("Tag " + id + " not found");
        }
        tagRepository.deleteById(id);
        log.info("Deleted tag {}", id);
    }
}
