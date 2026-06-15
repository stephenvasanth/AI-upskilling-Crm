package com.crm.service;

import com.crm.config.CacheNames;
import com.crm.dto.DealCreateRequest;
import com.crm.dto.DealResponse;
import com.crm.dto.DealStageUpdateRequest;
import com.crm.dto.DealUpdateRequest;
import com.crm.dto.PipelineResponse;
import com.crm.dto.PipelineStageResponse;
import com.crm.entity.Contact;
import com.crm.entity.Deal;
import com.crm.entity.DealStage;
import com.crm.entity.User;
import com.crm.exception.ResourceNotFoundException;
import com.crm.repository.ContactRepository;
import com.crm.repository.DealRepository;
import com.crm.repository.UserRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business logic for managing {@link Deal}s and the Kanban pipeline view
 * (requirements DEA-01 to DEA-08).
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DealService {

    private final DealRepository dealRepository;
    private final ContactRepository contactRepository;
    private final UserRepository userRepository;

    /**
     * Returns the Kanban pipeline view: one entry per {@link DealStage}, in
     * pipeline order, each with its deals (most-recently-created first),
     * count, and total value (requirements DEA-02, DEA-05).
     *
     * Reads through the {@code pipeline} cache for 24 hours (see
     * {@link com.crm.config.RedisConfig}).
     *
     * @return the pipeline, with one stage entry for every
     *         {@link DealStage} (including stages with no deals)
     */
    @Cacheable(cacheNames = CacheNames.PIPELINE)
    public PipelineResponse getPipeline() {
        List<Deal> deals = dealRepository.findAllByOrderByStageAscCreatedAtDesc();
        Map<DealStage, List<Deal>> byStage = deals.stream()
                .collect(Collectors.groupingBy(Deal::getStage));

        List<PipelineStageResponse> stages = new ArrayList<>();
        for (DealStage stage : DealStage.values()) {
            List<Deal> stageDeals = byStage.getOrDefault(stage, List.of());
            BigDecimal totalValue = stageDeals.stream()
                    .map(Deal::getValue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            stages.add(PipelineStageResponse.builder()
                    .stage(stage)
                    .count(stageDeals.size())
                    .totalValue(totalValue)
                    .deals(stageDeals.stream().map(DealResponse::from).toList())
                    .build());
        }

        return PipelineResponse.builder().stages(stages).build();
    }

    /**
     * Creates a new deal (requirement DEA-01) and invalidates the
     * {@code pipeline} cache so the new deal appears on the next read.
     *
     * @param request the new deal's details
     * @return the created deal
     * @throws ResourceNotFoundException if {@code ownerId} does not match an
     *         existing user, or {@code contactId} is set but does not match
     *         an existing contact
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.PIPELINE, allEntries = true)
    public DealResponse createDeal(DealCreateRequest request) {
        Deal deal = new Deal();
        deal.setTitle(request.getTitle());
        deal.setValue(request.getValue());
        deal.setStage(request.getStage());
        deal.setCloseDate(request.getCloseDate());
        deal.setOwner(findUser(request.getOwnerId()));
        deal.setContact(resolveContact(request.getContactId()));

        Deal saved = dealRepository.save(deal);
        log.info("Created deal '{}' (id={}, stage={})", saved.getTitle(), saved.getId(), saved.getStage());
        return DealResponse.from(saved);
    }

    /**
     * Replaces an existing deal's editable fields (requirement DEA-06) and
     * invalidates the {@code pipeline} cache.
     *
     * @param id      the deal id
     * @param request the new field values
     * @return the updated deal
     * @throws ResourceNotFoundException if no deal with this id exists,
     *         {@code ownerId} does not match an existing user, or
     *         {@code contactId} is set but does not match an existing
     *         contact
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.PIPELINE, allEntries = true)
    public DealResponse updateDeal(Long id, DealUpdateRequest request) {
        Deal deal = dealRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Deal " + id + " not found"));

        deal.setTitle(request.getTitle());
        deal.setValue(request.getValue());
        deal.setStage(request.getStage());
        deal.setCloseDate(request.getCloseDate());
        deal.setOwner(findUser(request.getOwnerId()));
        deal.setContact(resolveContact(request.getContactId()));

        Deal saved = dealRepository.save(deal);
        log.info("Updated deal {} (stage={})", saved.getId(), saved.getStage());
        return DealResponse.from(saved);
    }

    /**
     * Moves a deal to a new pipeline stage, e.g. via drag-and-drop on the
     * Kanban board (requirements DEA-03, DEA-04), and invalidates the
     * {@code pipeline} cache.
     *
     * @param id      the deal id
     * @param request the target stage
     * @return the updated deal
     * @throws ResourceNotFoundException if no deal with this id exists
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.PIPELINE, allEntries = true)
    public DealResponse updateStage(Long id, DealStageUpdateRequest request) {
        Deal deal = dealRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Deal " + id + " not found"));

        deal.setStage(request.getStage());

        Deal saved = dealRepository.save(deal);
        log.info("Moved deal {} to stage {}", saved.getId(), saved.getStage());
        return DealResponse.from(saved);
    }

    /**
     * Deletes a deal and invalidates the {@code pipeline} cache.
     *
     * Activities logged against this deal are cascade-deleted with it; tasks
     * that reference it have their deal reference set to {@code null} rather
     * than being deleted (see the V6/V7 migration foreign-key definitions).
     *
     * @param id the deal id
     * @throws ResourceNotFoundException if no deal with this id exists
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.PIPELINE, allEntries = true)
    public void deleteDeal(Long id) {
        if (!dealRepository.existsById(id)) {
            throw new ResourceNotFoundException("Deal " + id + " not found");
        }
        dealRepository.deleteById(id);
        log.info("Deleted deal {}", id);
    }

    /**
     * Looks up the user that must exist for a deal's owner reference.
     *
     * @param userId the user id
     * @return the user entity
     * @throws ResourceNotFoundException if no user with this id exists
     */
    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User " + userId + " not found"));
    }

    /**
     * Resolves a deal's optional contact reference.
     *
     * @param contactId the contact id, or {@code null} if the deal is not
     *                  linked to a contact
     * @return the contact entity, or {@code null} if {@code contactId} is
     *         {@code null}
     * @throws ResourceNotFoundException if {@code contactId} is non-null but
     *         does not match an existing contact
     */
    private Contact resolveContact(Long contactId) {
        if (contactId == null) {
            return null;
        }
        return contactRepository.findById(contactId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact " + contactId + " not found"));
    }
}
