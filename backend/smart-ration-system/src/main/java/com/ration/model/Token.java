package com.ration.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "tokens")
@Data
public class Token {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token_number", unique = true)
    private String tokenNumber;

    @Column(name = "local_token_number")
    private String localTokenNumber;

    @Column(name = "display_token")
    private String displayToken;

    @Column(name = "ration_card_number")
    private String rationCardNumber;

    // user relationship (nullable)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    private User user;

    // shop relationship (nullable)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = true)
    private Shop shop;

    @Column(name = "token_date")
    private LocalDate tokenDate;

    @Column(name = "time_slot_start")
    private LocalTime timeSlotStart;

    @Column(name = "time_slot_end")
    private LocalTime timeSlotEnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private TokenStatus status = TokenStatus.Confirmed;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_mode")
    private PaymentMode paymentMode = PaymentMode.Cash;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status")
    private PaymentStatus paymentStatus = PaymentStatus.Pending;

    @Column(name = "total_amount")
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "qr_code_data", columnDefinition = "TEXT")
    private String qrCodeData;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_three_month_bundle")
    private Boolean isThreeMonthBundle = false;

    public enum TokenStatus { Pending, Confirmed, Collected, Expired, Cancelled }
    public enum PaymentMode { Online, Cash }
    public enum PaymentStatus { Pending, Paid, Failed }
}