package com.ration.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "shops")
@Data
public class Shop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shop_code", unique = true)
    private String shopCode;

    @Column(name = "name")
    private String name;

    @Column(name = "address")
    private String address;

    @Column(name = "pincode")
    private String pincode;

    @Column(name = "district")
    private String district;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "contact_number")
    private String contactNumber;

    @Column(name = "manager_name")
    private String managerName;

    @Column(name = "opening_time")
    private String openingTime;

    @Column(name = "closing_time")
    private String closingTime;

    @Column(name = "morning_open")
    private String morningOpen = "09:00";

    @Column(name = "morning_close")
    private String morningClose = "13:00";

    @Column(name = "afternoon_open")
    private String afternoonOpen = "14:00";

    @Column(name = "afternoon_close")
    private String afternoonClose = "18:00";

    @Column(name = "weekly_holiday")
    private String weeklyHoliday = "FRIDAY";

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "admin_password")
    private String adminPassword = "shop123";

    @Column(name = "admin_otp")
    private String adminOtp;

    @Column(name = "is_open")
    private Boolean isOpen = true;

    @Column(name = "closure_reason")
    private String closureReason; // e.g., 'GOVT_HOLIDAY', 'PERSONAL_LEAVE'

    @Column(name = "notice_en")
    private String noticeEn;

    @Column(name = "notice_ta")
    private String noticeTa;
}
