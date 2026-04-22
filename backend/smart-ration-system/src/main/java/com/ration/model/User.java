package com.ration.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ration_card_number", unique = true)
    private String rationCardNumber;

    @Column(name = "head_of_family")
    private String headOfFamily;

    @Column(name = "mobile_number")
    private String mobileNumber;

    @Column(name = "email")
    private String email;

    @Column(name = "address")
    private String address;

    @Column(name = "pincode")
    private String pincode;

    @Column(name = "district")
    private String district;

    @Column(name = "card_type")
    private String cardType;

    @ManyToOne
    @JoinColumn(name = "assigned_shop_id")
    private Shop assignedShop;

    @ManyToOne
    @JoinColumn(name = "govt_shop_id")
    private Shop govtShop;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "otp_code")
    private String otpCode;

    @Column(name = "otp_expiry")
    private LocalDateTime otpExpiry;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "total_members")
    private Integer totalMembers;

    @Column(name = "gas_cylinders")
    private Integer gasCylinders = 0;

    @Column(name = "is_urban")
    private Boolean isUrban = false;

    @Column(name = "family_members_list", columnDefinition = "TEXT")
    private String familyMembersList;

    @Column(name = "last_otp_sent_at")
    private LocalDateTime lastOtpSentAt;

    @Column(name = "fcm_token")
    private String fcmToken;
}