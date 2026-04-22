package com.ration.controller;

import com.ration.model.Admin;
import com.ration.model.ChangeRequest;
import com.ration.model.User;
import com.ration.repository.AdminRepository;
import com.ration.repository.ChangeRequestRepository;
import com.ration.repository.UserRepository;
import com.ration.security.JwtUtil;
import com.ration.service.AuthService;
import com.ration.service.FirebaseMessagingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
public class ChangeRequestController {

    @Autowired private ChangeRequestRepository changeRequestRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private AdminRepository adminRepository;
    @Autowired private FirebaseMessagingService firebaseService;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private AuthService authService;

    /** Submit a new change request (requires JWT) */
    @PostMapping("/api/user/change-request")
    public ResponseEntity<?> submitRequest(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {
        try {
            String card = extractCard(authHeader);
            if (card == null)
                return ResponseEntity.ok(Map.of("success", false, "message", "Unauthorized"));

            User user = userRepository.findByRationCardNumber(card)
                .orElse(null);
            if (user == null)
                return ResponseEntity.ok(Map.of("success", false, "message", "User not found"));

            String newValue = body.getOrDefault("newValue", "").toString().trim();
            String requestType = body.getOrDefault("requestType", "OTHER").toString();

            // Mobile validation (Strict 10 digits and uniqueness)
            if ("PHONE".equalsIgnoreCase(requestType) || "Mobile Number".equalsIgnoreCase(requestType)) {
                if (!newValue.matches("\\d{10}")) {
                    return ResponseEntity.ok(Map.of("success", false, "message", "Error: Mobile number must be exactly 10 digits."));
                }
                Optional<User> existing = userRepository.findByMobileNumber(newValue);
                if (existing.isPresent() && !existing.get().getId().equals(user.getId())) {
                    return ResponseEntity.ok(Map.of("success", false, "message", 
                        "Registration Error: This mobile number is already active for another ration card."));
                }
            }

            ChangeRequest cr = ChangeRequest.builder()
                .user(user)
                .requestType(requestType)
                .fieldName(body.getOrDefault("fieldName", "").toString())
                .oldValue(body.getOrDefault("oldValue", "").toString())
                .newValue(newValue)
                .description(body.getOrDefault("description", "").toString())
                .status(ChangeRequest.Status.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

            changeRequestRepository.save(cr);

            // Notify SuperAdmins via Push Notification
            try {
                List<Admin> superAdmins = adminRepository.findByRole(Admin.AdminRole.SuperAdmin);
                for (Admin sa : superAdmins) {
                    if (sa.getFcmToken() != null) {
                        firebaseService.sendNotification(
                            sa.getFcmToken(),
                            "🔔 New Change Request",
                            "User " + user.getHeadOfFamily() + " requested to change " + cr.getFieldName()
                        );
                    }
                }
            } catch (Exception pushEx) {
                System.err.println("Failed to nudge SuperAdmins: " + pushEx.getMessage());
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Request submitted successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /** Get user's own change request history */
    @GetMapping("/api/user/change-requests")
    public ResponseEntity<?> getMyRequests(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String card = extractCard(authHeader);
            if (card == null)
                return ResponseEntity.ok(Map.of("success", false, "message", "Unauthorized"));

            User user = userRepository.findByRationCardNumber(card).orElse(null);
            if (user == null)
                return ResponseEntity.ok(Map.of("success", false, "data", List.of()));

            List<ChangeRequest> requests =
                changeRequestRepository.findByUserIdOrderByCreatedAtDesc(user.getId());

            List<Map<String, Object>> result = new ArrayList<>();
            for (ChangeRequest cr : requests) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", cr.getId());
                map.put("requestType", cr.getRequestType());
                map.put("fieldName", cr.getFieldName());
                map.put("oldValue", cr.getOldValue());
                map.put("newValue", cr.getNewValue());
                map.put("description", cr.getDescription());
                map.put("status", cr.getStatus().name());
                map.put("adminRemarks", cr.getAdminRemarks());
                map.put("createdAt", cr.getCreatedAt() != null ? cr.getCreatedAt().toString() : "");
                map.put("resolvedAt", cr.getResolvedAt() != null ? cr.getResolvedAt().toString() : null);
                result.add(map);
            }
            return ResponseEntity.ok(Map.of("success", true, "data", result));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Map.of("success", false, "data", List.of()));
        }
    }

    /** Send OTP for change request verification */
    @PostMapping("/api/user/change-request/send-otp")
    public ResponseEntity<?> sendOtpForChange(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            String card = extractCard(authHeader);
            if (card == null)
                return ResponseEntity.ok(Map.of("success", false, "message", "Unauthorized"));

            User user = userRepository.findByRationCardNumber(card).orElse(null);
            if (user == null)
                return ResponseEntity.ok(Map.of("success", false, "message", "User not found"));

            // Early uniqueness check if body is provided
            if (body != null && body.containsKey("requestType") && body.containsKey("newValue")) {
                String type = body.get("requestType").toString();
                String val = body.get("newValue").toString().trim();
                if ("PHONE".equalsIgnoreCase(type) || "Mobile Number".equalsIgnoreCase(type)) {
                    // Length check
                    if (!val.matches("\\d{10}")) {
                        return ResponseEntity.ok(Map.of("success", false, "message", "Error: Mobile number must be exactly 10 digits."));
                    }
                    Optional<User> existing = userRepository.findByMobileNumber(val);
                    if (existing.isPresent() && !existing.get().getId().equals(user.getId())) {
                        return ResponseEntity.ok(Map.of("success", false, "message", 
                            "Error: Mobile number '" + val + "' is already registered with another account."));
                    }
                }
            }

            // Reuse the existing OTP mechanism
            String otp = String.format("%06d", new Random().nextInt(999999));
            user.setOtpCode(otp);
            user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
            userRepository.save(user);

            // In debug mode, print OTP to console
            System.out.println("📱 Change Request OTP for " + user.getMobileNumber() + ": " + otp);

            boolean isDebug = authService.isDebugMode();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "OTP sent to your registered mobile number",
                "otp", isDebug ? otp : "",  // expose only in debug mode
                "debug", isDebug
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /** Verify OTP for change request */
    @PostMapping("/api/user/change-request/verify-otp")
    public ResponseEntity<?> verifyOtpForChange(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {
        try {
            String card = extractCard(authHeader);
            if (card == null)
                return ResponseEntity.ok(Map.of("success", false, "message", "Unauthorized"));

            User user = userRepository.findByRationCardNumber(card).orElse(null);
            if (user == null)
                return ResponseEntity.ok(Map.of("success", false, "message", "User not found"));

            String inputOtp = body.getOrDefault("otp", "").toString().trim();

            if (authService.isDebugMode()) {
                // Debug: accept any 6-digit OTP
                return ResponseEntity.ok(Map.of("success", true, "verified", true));
            }

            if (user.getOtpCode() == null || !user.getOtpCode().equals(inputOtp))
                return ResponseEntity.ok(Map.of("success", false, "message", "Invalid OTP"));

            if (user.getOtpExpiry() == null || LocalDateTime.now().isAfter(user.getOtpExpiry()))
                return ResponseEntity.ok(Map.of("success", false, "message", "OTP expired. Please request again."));

            // Clear OTP
            user.setOtpCode(null);
            user.setOtpExpiry(null);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("success", true, "verified", true));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    private String extractCard(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.isTokenValid(token)) return null;
        return jwtUtil.extractSubject(token);
    }
}
