package com.ration.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "special_benefits")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpecialBenefit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name_en")
    private String nameEn;

    @Column(name = "name_ta")
    private String nameTa;

    @Column(columnDefinition = "TEXT")
    private String descriptionEn;

    @Column(columnDefinition = "TEXT")
    private String descriptionTa;

    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    // Comma-separated or simple text for what it includes
    private String items; 

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
