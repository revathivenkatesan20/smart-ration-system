package com.ration.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsConfigurationSource;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtRequestFilter jwtRequestFilter;

    @Value("${cors.allowed.origins:http://localhost:3000,http://localhost:3001}")
    private String allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Public Endpoints
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/auth/**")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/public/**")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/stock/shop/**")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/tokens/monthly-quota")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/shop-admin/login")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/shop-admin/forgot-password/**")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/error")).permitAll()

                // Admin & Shop-Admin Authorities
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/admin/**")).hasAnyAuthority("ROLE_ADMIN", "ROLE_SUPERADMIN", "ADMIN", "SUPERADMIN")
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/shop-admin/**")).hasAnyAuthority("ROLE_SHOP_ADMIN", "SHOP_ADMIN")

                // Authenticated Endpoints
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/user/**")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/tokens/**")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/stock/**")).authenticated()
                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"success\":false,\"message\":\"Unauthorized: Please log in.\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"success\":false,\"message\":\"Forbidden: Access denied.\"}");
                })
            );

        http.addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Parse allowed origins from env variable (comma-separated)
        List<String> origins = Arrays.asList(allowedOrigins.split(","));
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}