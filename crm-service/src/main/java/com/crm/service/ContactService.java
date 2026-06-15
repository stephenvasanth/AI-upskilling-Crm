package com.crm.service;

import com.crm.config.CacheNames;
import com.crm.dto.ContactCreateRequest;
import com.crm.dto.ContactResponse;
import com.crm.dto.ContactUpdateRequest;
import com.crm.dto.PageResponse;
import com.crm.entity.Company;
import com.crm.entity.Contact;
import com.crm.entity.Tag;
import com.crm.entity.User;
import com.crm.exception.ResourceNotFoundException;
import com.crm.repository.CompanyRepository;
import com.crm.repository.ContactRepository;
import com.crm.repository.TagRepository;
import com.crm.repository.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business logic for managing {@link Contact}s (requirements CON-01 to
 * CON-09).
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ContactService {

    private final ContactRepository contactRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final TagRepository tagRepository;

    /**
     * Returns a page of contacts, optionally filtered by a free-text search
     * across first name, last name, email, and company name (requirement
     * CON-04), and/or by a single tag (requirement CON-05).
     *
     * @param search   a free-text search term, or {@code null}/blank for no
     *                 search filter
     * @param tagId    a tag id to filter by, or {@code null} for no tag
     *                 filter
     * @param pageable pagination and sort information
     * @return a page of matching contacts, or an empty page if none match
     */
    public PageResponse<ContactResponse> searchContacts(String search, Long tagId, Pageable pageable) {
        Specification<Contact> spec = buildSpecification(search, tagId);
        Page<Contact> page = contactRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(ContactResponse::from));
    }

    /**
     * Builds the dynamic filter used by {@link #searchContacts}.
     *
     * @param search the free-text search term, or {@code null}/blank for no
     *               search filter
     * @param tagId  a tag id to filter by, or {@code null} for no tag filter
     * @return a specification combining the requested filters; matches every
     *         contact if both arguments are absent
     */
    private Specification<Contact> buildSpecification(String search, Long tagId) {
        Specification<Contact> spec = Specification.where(null);

        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> {
                query.distinct(true);
                Join<Contact, Company> company = root.join("company", JoinType.LEFT);
                return cb.or(
                        cb.like(cb.lower(root.get("firstName")), pattern),
                        cb.like(cb.lower(root.get("lastName")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("email"), "")), pattern),
                        cb.like(cb.lower(company.get("name")), pattern));
            });
        }

        if (tagId != null) {
            spec = spec.and((root, query, cb) -> {
                query.distinct(true);
                Join<Contact, Tag> tags = root.join("tags", JoinType.INNER);
                return cb.equal(tags.get("id"), tagId);
            });
        }

        return spec;
    }

    /**
     * Returns the contact with the given id.
     *
     * Reads through the {@code contacts} cache, keyed by id (see
     * {@link com.crm.config.RedisConfig}).
     *
     * @param id the contact id
     * @return the contact, or {@link Optional#empty()} if no contact with
     *         this id exists (in cache or in the database)
     */
    @Cacheable(cacheNames = CacheNames.CONTACTS, key = "#id")
    public Optional<ContactResponse> getContactById(Long id) {
        return contactRepository.findById(id).map(ContactResponse::from);
    }

    /**
     * Creates a new contact (requirement CON-01).
     *
     * @param request the new contact's details
     * @return the created contact
     * @throws ResourceNotFoundException if {@code ownerId} does not match an
     *         existing user, {@code companyId} is set but does not match an
     *         existing company, or any id in {@code tagIds} does not match
     *         an existing tag
     */
    @Transactional
    public ContactResponse createContact(ContactCreateRequest request) {
        Contact contact = new Contact();
        applyFields(contact, request.getFirstName(), request.getLastName(), request.getEmail(),
                request.getPhone(), request.getTitle(), request.getCompanyId(), request.getOwnerId(),
                request.getTagIds());

        Contact saved = contactRepository.save(contact);
        log.info("Created contact {} {} (id={})", saved.getFirstName(), saved.getLastName(), saved.getId());
        return ContactResponse.from(saved);
    }

    /**
     * Updates an existing contact (requirement CON-02) and evicts its entry
     * in the {@code contacts} cache so the next read reflects the change.
     *
     * @param id      the contact id
     * @param request the new field values
     * @return the updated contact
     * @throws ResourceNotFoundException if no contact with this id exists,
     *         {@code ownerId} does not match an existing user,
     *         {@code companyId} is set but does not match an existing
     *         company, or any id in {@code tagIds} does not match an
     *         existing tag
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.CONTACTS, key = "#id")
    public ContactResponse updateContact(Long id, ContactUpdateRequest request) {
        Contact contact = contactRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contact " + id + " not found"));

        applyFields(contact, request.getFirstName(), request.getLastName(), request.getEmail(),
                request.getPhone(), request.getTitle(), request.getCompanyId(), request.getOwnerId(),
                request.getTagIds());

        Contact saved = contactRepository.save(contact);
        log.info("Updated contact {}", saved.getId());
        return ContactResponse.from(saved);
    }

    /**
     * Deletes a contact (requirement CON-03) and evicts its entry in the
     * {@code contacts} cache.
     *
     * Activities logged against this contact are cascade-deleted with it;
     * deals and tasks that reference it have their contact reference set to
     * {@code null} rather than being deleted (see the V3/V5/V6/V7 migration
     * foreign-key definitions).
     *
     * @param id the contact id
     * @throws ResourceNotFoundException if no contact with this id exists
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.CONTACTS, key = "#id")
    public void deleteContact(Long id) {
        if (!contactRepository.existsById(id)) {
            throw new ResourceNotFoundException("Contact " + id + " not found");
        }
        contactRepository.deleteById(id);
        log.info("Deleted contact {}", id);
    }

    /**
     * Applies create/update field values to a contact entity, resolving its
     * owner, company, and tag references.
     *
     * @param contact   the contact entity to mutate (new or existing)
     * @param firstName the contact's first name
     * @param lastName  the contact's last name
     * @param email     the contact's email address, or {@code null}
     * @param phone     the contact's phone number, or {@code null}
     * @param title     the contact's job title, or {@code null}
     * @param companyId the id of the company to link, or {@code null} to
     *                  leave the contact unaffiliated
     * @param ownerId   the id of the user who owns this contact
     * @param tagIds    the ids of the tags to assign to this contact, or
     *                  {@code null}/empty for none
     * @throws ResourceNotFoundException if {@code ownerId} does not match an
     *         existing user, {@code companyId} is set but does not match an
     *         existing company, or any id in {@code tagIds} does not match
     *         an existing tag
     */
    private void applyFields(Contact contact, String firstName, String lastName, String email, String phone,
            String title, Long companyId, Long ownerId, Set<Long> tagIds) {
        contact.setFirstName(firstName);
        contact.setLastName(lastName);
        contact.setEmail(email);
        contact.setPhone(phone);
        contact.setTitle(title);

        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User " + ownerId + " not found"));
        contact.setOwner(owner);

        if (companyId != null) {
            Company company = companyRepository.findById(companyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Company " + companyId + " not found"));
            contact.setCompany(company);
        } else {
            contact.setCompany(null);
        }

        Set<Tag> tags = new HashSet<>();
        if (tagIds != null) {
            for (Long tagId : tagIds) {
                Tag tag = tagRepository.findById(tagId)
                        .orElseThrow(() -> new ResourceNotFoundException("Tag " + tagId + " not found"));
                tags.add(tag);
            }
        }
        contact.setTags(tags);
    }
}
