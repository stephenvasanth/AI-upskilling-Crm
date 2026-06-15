package com.crm.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Issues and validates the JWTs used for stateless authentication
 * (requirement AUTH-02: tokens expire after 24 hours).
 *
 * The signing key and expiration are read from {@code jwt.secret} and
 * {@code jwt.expiration-ms} (application.yml); in a deployed environment
 * {@code jwt.secret} must be supplied via the {@code JWT_SECRET} environment
 * variable, never the local-dev default (rules.md §12).
 */
@Component
public class JwtUtil {

    private final SecretKey signingKey;
    private final long expirationMs;

    public JwtUtil(@Value("${jwt.secret}") String secret, @Value("${jwt.expiration-ms}") long expirationMs) {
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.expirationMs = expirationMs;
    }

    /**
     * Generates a signed JWT for the given user.
     *
     * @param email the user's email address, stored as the token subject and
     *              used by {@link #extractEmail(String)} to identify the
     *              authenticated user on subsequent requests
     * @return a signed JWT valid for {@code jwt.expiration-ms} milliseconds
     *         from now
     */
    public String generateToken(String email) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMs)))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Extracts the email address (subject) from a JWT.
     *
     * @param token the JWT
     * @return the email address embedded in the token
     * @throws JwtException if the token is malformed, expired, or has an
     *         invalid signature
     */
    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    /**
     * Checks whether the given JWT is well-formed, signed with this
     * application's key, and not expired.
     *
     * @param token the JWT to validate
     * @return {@code true} if the token is valid, {@code false} otherwise
     */
    public boolean isTokenValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    /**
     * Parses and verifies the signature of a JWT, returning its claims.
     *
     * @param token the JWT to parse
     * @return the verified claims (payload) of the token
     * @throws JwtException if the token is malformed, expired, or has an
     *         invalid signature
     */
    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
