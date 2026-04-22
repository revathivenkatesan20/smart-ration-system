package com.ration.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "change_requests")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ChangeRequest {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "request_type")
    private String requestType;  // PHONE, ADDRESS, NAME, FAMILY_MEMBER, HEAD_OF_FAMILY, OTHER

    @Column(name = "field_name")
    private String fieldName;    // human-readable field label

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;  // optional free-text from user

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "admin_remarks", columnDefinition = "TEXT")
    private String adminRemarks;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    public enum Status { PENDING, APPROVED, REJECTED }
}
