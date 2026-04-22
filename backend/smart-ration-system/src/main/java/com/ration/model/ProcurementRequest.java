package com.ration.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "procurement_requests")
@Data
public class ProcurementRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "shop_id")
    private Shop shop;

    @ManyToOne
    @JoinColumn(name = "item_id")
    private Item item;

    private BigDecimal requestedQuantity;
    
    @Enumerated(EnumType.STRING)
    private RequestStatus status = RequestStatus.Pending;

    private LocalDateTime requestDate = LocalDateTime.now();
    private LocalDateTime fulfilledDate;

    public enum RequestStatus {
        Pending, Fulfilled, Cancelled
    }
}
