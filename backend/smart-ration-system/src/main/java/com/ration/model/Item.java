package com.ration.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "items")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Item {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "item_code", unique = true)
    private String itemCode;
    @Column(name = "name_en")
    private String nameEn;
    @Column(name = "name_ta")
    private String nameTa;
    @Enumerated(EnumType.STRING)
    private Category category;
    private String unit;
    @Column(name = "price_per_unit")
    private BigDecimal pricePerUnit;
    @Column(name = "subsidy_price")
    private BigDecimal subsidyPrice;
    @Column(name = "monthly_entitlement")
    private BigDecimal monthlyEntitlement;
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
    @Column(name = "image_url")
    private String imageUrl;
    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    public enum Category { Grain, Pulse, Oil, Sugar, Kerosene, Other }
}