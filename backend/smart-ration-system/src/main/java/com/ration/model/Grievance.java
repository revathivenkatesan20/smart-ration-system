package com.ration.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "grievances")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Grievance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private String category; // e.g., STOCK, TOKEN, PROFILE, GENERAL
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    private GrievanceStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    
    @Column(columnDefinition = "TEXT")
    private String adminRemarks;

    public enum GrievanceStatus {
        OPEN, IN_PROGRESS, RESOLVED, CLOSED
    }
}
