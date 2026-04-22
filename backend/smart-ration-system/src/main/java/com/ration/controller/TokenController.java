package com.ration.controller;

import com.ration.service.TokenService;
import com.ration.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tokens")
public class TokenController {

    @Autowired private TokenService tokenService;
    @Autowired private JwtUtil jwtUtil;

    @GetMapping("/monthly-quota")
    public ResponseEntity<Map<String, Object>> getMonthlyQuota(
            @RequestParam String rationCardNumber,
            @RequestParam(required = false, defaultValue = "false") boolean isThreeMonth) {
        Map<Long, Map<String, Object>> quota = tokenService.getMonthlyQuotaEnriched(rationCardNumber, isThreeMonth);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", quota
        ));
    }



    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generateToken(
            @RequestBody Map<String, Object> request,
            @RequestHeader(value="Authorization", required=false) String authHeader) {
        
        String rationCardNumber = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.isTokenValid(token)) {
                rationCardNumber = jwtUtil.extractSubject(token);
            }
        }

        try {
            Map<String, Object> response = tokenService.generateToken(request, rationCardNumber);
            
            // If service returned an error flag, respond with success=false
            if (Boolean.TRUE.equals(response.get("error"))) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", response.getOrDefault("message", "Failed to generate token")
                ));
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", response
            ));
        } catch (Exception e) {
            System.out.println("❌ TokenController FAILED: " + e.getMessage());
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", e.getMessage() != null ? e.getMessage() : "Failed to generate token"
            ));
        }

    }

    @GetMapping("/my-tokens")
    public ResponseEntity<Map<String, Object>> getMyTokens(
            @RequestHeader(value="Authorization") String authHeader) {
        String rationCardNumber = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String jwt = authHeader.substring(7);
            if (jwtUtil.isTokenValid(jwt)) {
                rationCardNumber = jwtUtil.extractSubject(jwt);
            }
        }
        
        List<Map<String, Object>> tokens = tokenService.getUserTokens(rationCardNumber);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", tokens
        ));
    }

    @PutMapping("/{tokenNumber}/cancel")
    public ResponseEntity<Map<String, Object>> cancelToken(
            @PathVariable String tokenNumber) {
        boolean success = tokenService.cancelToken(tokenNumber);
        return ResponseEntity.ok(Map.of(
            "success", success,
            "message", success ? "Token cancelled" : "Failed to cancel token. Make sure the token number is correct."
        ));
    }

    @PutMapping("/{tokenNumber}/collect")
    public ResponseEntity<Map<String, Object>> collectToken(
            @PathVariable String tokenNumber) {
        boolean success = tokenService.collectToken(tokenNumber);
        return ResponseEntity.ok(Map.of(
            "success", success,
            "message", success ? "Token collected successfully" : "Failed to collect token"
        ));
    }
}