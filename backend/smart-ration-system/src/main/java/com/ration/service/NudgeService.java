package com.ration.service;

import com.ration.model.*;
import com.ration.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class NudgeService {

    @Autowired private UserRepository userRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private TokenRepository tokenRepository;
    @Autowired @Lazy private TokenService tokenService;
    @Autowired private FirebaseMessagingService firebaseService;

    /**
     * Sends nudges to users who haven't finished their quota for a specific item
     * when that item's stock is low in their assigned shop.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendLowStockNudges(Stock stock) {
        try {
            Item item = stock.getItem();
            Shop shop = stock.getShop();
            if (item == null || shop == null) return;

            List<User> shopUsers = userRepository.findByAssignedShopId(shop.getId());
            int nudgeCount = 0;

            for (User user : shopUsers) {
                // Check if user has quota left for this item
                Map<Long, BigDecimal> remaining = tokenService.getMonthlyQuota(user.getRationCardNumber());
                BigDecimal left = remaining.getOrDefault(item.getId(), BigDecimal.ZERO);

                if (left.compareTo(BigDecimal.ZERO) > 0) {
                    Notification n = new Notification();
                    n.setUser(user);
                    n.setTitleEn("Low Stock Nudge! ⏳");
                    n.setTitleTa("இருப்பு குறைவு எச்சரிக்கை! ⏳");
                    n.setMessageEn(String.format("Hurry! Only %s %s of %s left at %s. You haven't finished your monthly quota yet.", 
                        stock.getQuantityAvailable(), item.getUnit(), item.getNameEn(), shop.getName()));
                    n.setMessageTa(String.format("சீக்கிரம்! %s %s மட்டுமே இருப்பு உள்ளது. உங்கள் மாதாந்திர ஒதுக்கீட்டை இன்னும் முடிக்கவில்லை.",
                        stock.getQuantityAvailable(), item.getUnit()));
                    n.setType(Notification.NotifType.Stock);
                    n.setSentAt(LocalDateTime.now());
                    notificationRepository.save(n);

                    // Push Notification
                    if (user.getFcmToken() != null && !user.getFcmToken().isEmpty()) {
                        firebaseService.sendNotification(user.getFcmToken(), n.getTitleEn(), n.getMessageEn());
                    }
                    nudgeCount++;
                }
            }
            System.out.println("📢 Sent low stock nudges to " + nudgeCount + " users for " + item.getNameEn());
        } catch (Exception e) {
            System.err.println("Error sending low stock nudges: " + e.getMessage());
        }
    }

    /**
     * Sends nudges to users with remaining quota as the month end approaches.
     */
    public void sendMonthEndNudges() {
        try {
            List<User> allUsers = userRepository.findAll();
            int monthEndCount = 0;

            for (User user : allUsers) {
                Map<Long, BigDecimal> remaining = tokenService.getMonthlyQuota(user.getRationCardNumber());
                boolean hasRemaining = remaining.values().stream()
                    .anyMatch(v -> v.compareTo(BigDecimal.ZERO) > 0);

                if (hasRemaining) {
                    Notification n = new Notification();
                    n.setUser(user);
                    n.setTitleEn("Month End Reminder! 🗓️");
                    n.setTitleTa("மாத இறுதி நினைவூட்டல்! 🗓️");
                    n.setMessageEn("The month is ending soon! Don't forget to collect your remaining ration items.");
                    n.setMessageTa("மாதம் முடியப்போகிறது! உங்கள் மீதமுள்ள ரேஷன் பொருட்களை வாங்க மறக்காதீர்கள்.");
                    n.setType(Notification.NotifType.System);
                    n.setSentAt(LocalDateTime.now());
                    notificationRepository.save(n);

                    // Push Notification
                    if (user.getFcmToken() != null && !user.getFcmToken().isEmpty()) {
                        firebaseService.sendNotification(user.getFcmToken(), n.getTitleEn(), n.getMessageEn());
                    }
                    monthEndCount++;
                }
            }
            System.out.println("🗓️ Sent month-end nudges to " + monthEndCount + " users.");
        } catch (Exception e) {
            System.err.println("Error sending month-end nudges: " + e.getMessage());
        }
    }
    /**
     * Sends reminders to users whose tokens start in 10-15 minutes.
     * Runs every 5 minutes.
     */
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 300000)
    public void checkTokensAndRemind() {
        try {
            java.time.LocalDate today = java.time.LocalDate.now();
            java.time.LocalTime now = java.time.LocalTime.now();
            java.time.LocalTime targetTime = now.plusMinutes(15);
            
            List<Token> allToday = tokenRepository.findAll().stream()
                .filter(t -> today.equals(t.getTokenDate()))
                .filter(t -> t.getStatus() == Token.TokenStatus.Confirmed || t.getStatus() == Token.TokenStatus.Pending)
                .collect(Collectors.toList());

            int remindsSent = 0;
            for (Token t : allToday) {
                if (t.getTimeSlotStart() != null && t.getUser() != null) {
                    if (t.getTimeSlotStart().isAfter(now) && !t.getTimeSlotStart().isAfter(targetTime)) {
                        Notification n = new Notification();
                        n.setUser(t.getUser());
                        n.setTitleEn("Departure Reminder! 🛵");
                        n.setTitleTa("புறப்படத் தயார்! 🛵");
                        n.setMessageEn("Your token " + t.getTokenNumber() + " starts in less than 15 minutes. Please head to the shop soon!");
                        n.setMessageTa("உங்கள் டோக்கன் " + t.getTokenNumber() + " இன்னும் 15 நிமிடங்களில் தொடங்குகிறது. விரைவில் கடைக்குச் செல்லுங்கள்!");
                        n.setType(Notification.NotifType.Token);
                        n.setSentAt(LocalDateTime.now());
                        notificationRepository.save(n);

                        // Push Notification
                        if (t.getUser().getFcmToken() != null && !t.getUser().getFcmToken().isEmpty()) {
                            firebaseService.sendNotification(t.getUser().getFcmToken(), n.getTitleEn(), n.getMessageEn());
                        }
                        remindsSent++;
                    }
                }
            }
            if (remindsSent > 0) System.out.println("⏰ Sent " + remindsSent + " departure reminders.");
        } catch (Exception e) {
            System.err.println("Error in checkTokensAndRemind: " + e.getMessage());
        }
    }
}
