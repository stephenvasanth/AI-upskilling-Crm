package com.crm.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.Duration;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

/**
 * Configures the Redis-backed {@link CacheManager} used by every
 * {@code @Cacheable} cache in the application (requirement NFR-P03).
 *
 * All caches share a single 24-hour TTL and a JSON value serializer; see
 * rules.md, Caching Strategy section (§8) for the full cache-first,
 * evict-on-write policy that services must follow.
 */
@Configuration
public class RedisConfig {

    /** Global TTL applied to every cache (see rules.md §8.2). */
    public static final long DEFAULT_TTL_HOURS = 24;

    /**
     * Builds the {@link RedisCacheManager} used for all {@code @Cacheable}
     * caches in the application, applying a single 24-hour TTL and a JSON
     * value serializer to every cache.
     *
     * @param connectionFactory the Redis connection factory
     * @return a cache manager with a uniform 24-hour TTL
     */
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // Cached response DTOs (ContactResponse, DealResponse, PipelineResponse, ...)
        // carry java.time.Instant/LocalDate fields; JavaTimeModule lets Jackson
        // (de)serialize them as part of the cache value.
        ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

        // Without default typing, GenericJackson2JsonRedisSerializer writes plain
        // JSON with no type info, so a cache hit deserializes DTOs as
        // LinkedHashMap instead of the original class, causing a
        // ClassCastException when @Cacheable casts the cached value back to its
        // declared return type. Activating default typing embeds an "@class"
        // property so cached values round-trip to their original type.
        objectMapper.activateDefaultTyping(
                BasicPolymorphicTypeValidator.builder().allowIfBaseType(Object.class).build(),
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY);

        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(DEFAULT_TTL_HOURS))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer(objectMapper)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    }
}
