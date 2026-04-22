package com.ration.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock")
@Data
public class Stock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "shop_id")
    private Shop shop;

    @ManyToOne
    @JoinColumn(name = "item_id")
    private Item item;

    @Column(name = "quantity_available")
    private BigDecimal quantityAvailable;

    @Column(name = "threshold_min")
    private BigDecimal thresholdMin;

    @Column(name = "status")
    private String status;

    public String getStatus() {
    return status;
}

    @Column(name = "last_restocked_at")
    private LocalDateTime lastRestockedAt;

    @Column(name = "last_restocked_quantity")
    private BigDecimal lastRestockedQuantity;
}