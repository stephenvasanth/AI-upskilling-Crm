package com.crm.config;

import com.crm.security.JwtAuthenticationFilter;
import com.crm.security.RestAccessDeniedHandler;
import com.crm.security.RestAuthenticationEntryPoint;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Configures stateless JWT-based authentication and authorisation for all
 * {@code /api/**} endpoints (requirements AUTH-01 to AUTH-09, NFR-S01 to
 * NFR-S04).
 *
 * - {@code /api/auth/login} is the only endpoint open to unauthenticated
 *   requests; every other endpoint requires a valid JWT (NFR-S01).
 * - {@link JwtAuthenticationFilter} runs ahead of
 *   {@link UsernamePasswordAuthenticationFilter} to populate the security
 *   context from the {@code Authorization} header.
 * - {@code @PreAuthorize} on individual controller methods enforces
 *   ADMIN-only endpoints (NFR-S02, see rules.md §12).
 * - CORS is restricted to the origin(s) configured in
 *   {@code cors.allowed-origins} (NFR-S03).
 * - {@link RestAuthenticationEntryPoint} (401) and
 *   {@link RestAccessDeniedHandler} (403) ensure security-layer rejections
 *   use the correct status code and the structured JSON error body required
 *   by rules.md §7 / NFR-R01, instead of Spring Security's default 403-for-
 *   everything behaviour.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RestAuthenticationEntryPoint restAuthenticationEntryPoint;
    private final RestAccessDeniedHandler restAccessDeniedHandler;
    private final List<String> allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
            RestAuthenticationEntryPoint restAuthenticationEntryPoint,
            RestAccessDeniedHandler restAccessDeniedHandler,
            @Value("#{'${cors.allowed-origins}'.split(',')}") List<String> allowedOrigins) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.restAuthenticationEntryPoint = restAuthenticationEntryPoint;
        this.restAccessDeniedHandler = restAccessDeniedHandler;
        this.allowedOrigins = allowedOrigins;
    }

    /**
     * Builds the security filter chain: stateless sessions, CORS, a public
     * login endpoint, and the {@link JwtAuthenticationFilter} ahead of
     * Spring Security's default username/password filter.
     *
     * @param http the security configuration builder
     * @return the configured filter chain
     * @throws Exception if the underlying {@link HttpSecurity} builder fails
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(restAuthenticationEntryPoint)
                        .accessDeniedHandler(restAccessDeniedHandler))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/login").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Restricts cross-origin requests on {@code /api/**} to the configured
     * frontend origin(s) (requirement NFR-S03, property
     * {@code cors.allowed-origins}).
     *
     * @return the CORS configuration applied to every {@code /api/**} route
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    /**
     * BCrypt password encoder with strength 12 (rules.md §12), used to hash
     * passwords on registration and verify them on login (requirement
     * AUTH-03).
     *
     * @return a {@link BCryptPasswordEncoder} with strength 12
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /**
     * Exposes the {@link AuthenticationManager} that Spring Security builds
     * from the registered {@code UserDetailsService} and
     * {@link #passwordEncoder()} beans, used by {@code AuthService} to verify
     * login credentials (requirement AUTH-01).
     *
     * @param config the authentication configuration auto-built by Spring
     *               Security from the registered {@code UserDetailsService}
     *               and {@code PasswordEncoder} beans
     * @return the application's authentication manager
     * @throws Exception if Spring Security fails to build the manager
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
