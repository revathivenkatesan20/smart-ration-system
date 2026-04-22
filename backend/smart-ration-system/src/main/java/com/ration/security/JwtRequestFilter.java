package com.ration.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtRequestFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        final String authorizationHeader = request.getHeader("Authorization");
        
        // --- DEBUG LOGGING ---
        if (request.getRequestURI().startsWith("/api/")) {
            System.out.println("🔍 Incoming Request: " + request.getMethod() + " " + request.getRequestURI());
            if (authorizationHeader != null) {
                System.out.println("🎫 Auth Header Found: " + (authorizationHeader.length() > 20 ? 
                    authorizationHeader.substring(0, 15) + "..." : authorizationHeader));
            } else {
                System.out.println("🎫 No Auth Header found.");
            }
        }

        String username = null;
        String jwt = null;
        String role = null;

        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7).trim();
            try {
                if (jwtUtil.isTokenValid(jwt)) {
                    username = jwtUtil.extractSubject(jwt);
                    role = jwtUtil.extractRole(jwt);
                    System.out.println("🔐 JWT Parsed: User=" + username + ", ClaimRole=" + role);
                } else {
                    System.out.println("⚠️ JWT Validation Failed: The token signature or structure is invalid.");
                }
            } catch (io.jsonwebtoken.ExpiredJwtException e) {
                System.out.println("❌ JWT Error: Token Expired at " + e.getClaims().getExpiration());
            } catch (io.jsonwebtoken.security.SignatureException e) {
                System.out.println("❌ JWT Error: Signature mismatch. Token was likely generated with an old secret.");
            } catch (Exception e) {
                System.out.println("❌ JWT Error: " + e.getClass().getSimpleName() + " - " + e.getMessage() + " for URI: " + request.getRequestURI());
                if (jwt != null) System.out.println("📦 Problematic Token Ends With: ..." + (jwt.length() > 10 ? jwt.substring(jwt.length() - 10) : jwt));
            }
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            // Force ROLE_ prefix and ensure it's not null and UPPERCASE
            String finalRole = (role != null) ? role.toUpperCase() : "USER";
            String authority = finalRole.startsWith("ROLE_") ? finalRole : "ROLE_" + finalRole;
            
            System.out.println("🛡️ Security Check: Mapping role '" + role + "' to authority '" + authority + "'");
            
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    username, null, Collections.singletonList(new SimpleGrantedAuthority(authority)));
            
            // --- DIAGNOSTIC HEADERS ---
            response.setHeader("X-Security-Role", role);
            response.setHeader("X-Security-Authority", authority);
            response.setHeader("X-Security-Status", "Authorized");
            
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            System.out.println("🛡️ Security Accepted: User " + username + " with " + authority);
            response.setHeader("X-Debug-Filter-Success", "true");
            response.setHeader("X-Debug-User", username);
        } else if (username == null) {
            response.setHeader("X-Security-Status", "Anonymous-or-Token-Invalid");
            response.setHeader("X-Debug-Filter-Success", "false");
            response.setHeader("X-Debug-Status", "User-Null-or-Auth-Exists");
        }
        
        chain.doFilter(request, response);
    }
}
