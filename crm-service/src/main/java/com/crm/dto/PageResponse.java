package com.crm.dto;

import java.util.List;
import lombok.Builder;
import lombok.Getter;
import org.springframework.data.domain.Page;

/**
 * Generic paged list wrapper returned by list endpoints that accept
 * {@code page}/{@code size} query parameters (rules.md §11).
 *
 * @param <T> the type of each element in {@link #getContent()}
 */
@Getter
@Builder
public class PageResponse<T> {

    private final List<T> content;
    private final int page;
    private final int size;
    private final long totalElements;
    private final int totalPages;

    /**
     * Builds a {@link PageResponse} from a Spring Data {@link Page}.
     *
     * @param page the page to wrap, with content already mapped to {@code T}
     * @param <T>  the element type
     * @return the paged response
     */
    public static <T> PageResponse<T> from(Page<T> page) {
        return PageResponse.<T>builder()
                .content(page.getContent())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }
}
