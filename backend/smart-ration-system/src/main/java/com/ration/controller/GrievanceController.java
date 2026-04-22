package com.ration.controller;

import com.ration.model.Grievance;
import com.ration.model.User;
import com.ration.repository.GrievanceRepository;
import com.ration.repository.UserRepository;
import com.ration.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user/grievances")
public class GrievanceController {

    @Autowired private GrievanceRepository grievanceRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtUtil jwtUtil;

    @GetMapping("/admin/all")
    public List<Grievance> getAllGrievances() {
        return grievanceRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> submitGrievance(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> body) {
        try {
            String token = authHeader.substring(7);
            String card = jwtUtil.extractSubject(token);
            User user = userRepository.findByRationCardNumber(card).orElse(null);
            
            if (user == null) return ResponseEntity.ok(Map.of("success", false, "message", "User not found"));

            Grievance g = Grievance.builder()
                .user(user)
                .category(body.getOrDefault("category", "GENERAL"))
                .title(body.getOrDefault("title", "No Title"))
                .description(body.getOrDefault("description", ""))
                .status(Grievance.GrievanceStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .build();

            grievanceRepository.save(g);
            return ResponseEntity.ok(Map.of("success", true, "message", "Grievance submitted successfully"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getMyGrievances(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.substring(7);
            String card = jwtUtil.extractSubject(token);
            User user = userRepository.findByRationCardNumber(card).orElse(null);
            
            if (user == null) return ResponseEntity.ok(Map.of("success", false, "data", List.of()));

            return ResponseEntity.ok(Map.of("success", true, "data", grievanceRepository.findByUserIdOrderByCreatedAtDesc(user.getId())));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "data", List.of()));
        }
    }
}
