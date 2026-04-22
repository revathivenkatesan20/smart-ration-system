package com.ration.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "members")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Member {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    private String name;
    private Integer age;
    @Enumerated(EnumType.STRING)
    private Gender gender;
    private String relation;
    @Column(name = "aadhaar_number")
    private String aadhaarNumber;
    @Column(name = "is_head")
    @Builder.Default
    private Boolean isHead = false;
    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    public enum Gender { Male, Female, Other }
}