package com.ration.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "notifications")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne @JoinColumn(name = "token_id")
    private Token token;

    @Column(name = "title_en")
    private String titleEn;

    @Column(name = "title_ta")
    private String titleTa;

    @Column(name = "message_en", columnDefinition = "TEXT")
    private String messageEn;

    @Column(name = "message_ta", columnDefinition = "TEXT")
    private String messageTa;

    @Enumerated(EnumType.STRING)
    private NotifType type = NotifType.System;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @Column(name = "sent_at")
    private LocalDateTime sentAt = LocalDateTime.now();

    public enum NotifType { Token, Stock, System, Payment }
}