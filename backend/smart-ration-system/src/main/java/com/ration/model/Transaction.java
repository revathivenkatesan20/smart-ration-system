package com.ration.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
@Data
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_number", unique = true)
    private String transactionNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "token_id")
    private Token token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "amount")
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_mode")
    private PaymentMode paymentMode;

    @Column(name = "payment_gateway_ref")
    private String paymentGatewayRef;

    // Legacy column that exists as NOT NULL in the actual MySQL schema
    @Column(name = "transaction_ref")
    private String transactionRef = java.util.UUID.randomUUID().toString();

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private TransactionStatus status = TransactionStatus.Pending;

    @Column(name = "transaction_at")
    private LocalDateTime transactionAt;

    public enum PaymentMode { UPI, Card, Cash }
    public enum TransactionStatus { Success, Failed, Pending, Refunded }
}