package com.ration.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "admins")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Admin {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true)
    private String username;
    @Column(name = "password_hash")
    private String passwordHash;
    private String name;
    private String email;
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AdminRole role = AdminRole.ShopAdmin;
    @ManyToOne @JoinColumn(name = "shop_id")
    private Shop shop;
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
    @Column(name = "last_login")
    private LocalDateTime lastLogin;
    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "fcm_token")
    private String fcmToken;

    public enum AdminRole { SuperAdmin, ShopAdmin, DistrictAdmin }
}