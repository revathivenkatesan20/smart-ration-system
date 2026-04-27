package com.ration.service;

import com.ration.model.*;
import com.ration.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.UUID;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.*;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class TokenService {

    private static LocalDate simulatedDate = null;

    public static void setSimulatedDate(LocalDate date) {
        simulatedDate = date;
        System.out.println("⏰ System Date Simulated to: " + date);
    }

    public static void resetSimulation() {
        simulatedDate = null;
        System.out.println("⏰ System Date reset to Real-Time.");
    }

    private LocalDate getCurrentDate() {
        return simulatedDate != null ? simulatedDate : LocalDate.now();
    }


    @Autowired private TokenRepository tokenRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ShopRepository shopRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private TokenItemRepository tokenItemRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private StockService stockService;
    @Autowired private NudgeService nudgeService;
    @Autowired private MemberRepository memberRepository;
    @Autowired private SpecialBenefitRepository benefitRepository;
    @Autowired private FirebaseMessagingService firebaseService;

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> generateToken(
            Map<String, Object> request, String rationCardNumber) {

        // Global Token ID will be generated using the database sequence during save
        String tokenNumber = "TKN-RESERVING"; 
        String displayToken = "USR-RESERVING";
        String transactionNumber = "TXN-RESERVING";

        try {
            // ── Activation Check ──
            User linkedUser = null;
            if (rationCardNumber != null) {
                linkedUser = userRepository.findByRationCardNumber(rationCardNumber).orElse(null);
            }
            if (linkedUser != null && !Boolean.TRUE.equals(linkedUser.getIsActive())) {
                throw new RuntimeException("Your ration card has been deactivated. Please contact the government via the Grievances section to request activation.");
            }

            // ── Get Shop ──
            Long shopId = 1L;
            try {
                shopId = Long.valueOf(request.get("shopId").toString());
            } catch (Exception ignored) {}

            Shop shop = shopRepository.findById(shopId)
                .orElse(shopRepository.findAll().get(0));

            // ── Real-time Status Verification (2026 Rules) ──
            validateShopRealTimeStatus(shop);

            // ── Time Slot (Real Time for Today) ──
            LocalDate tokenDate = LocalDate.now();
            List<Token> pendingForToday = tokenRepository.findByShopId(shop.getId()).stream()
                .filter(st -> st.getTokenDate().equals(tokenDate))
                .filter(st -> st.getStatus() == Token.TokenStatus.Confirmed || st.getStatus() == Token.TokenStatus.Pending)
                .collect(Collectors.toList());
            
            int waitMinsInitial = pendingForToday.size() * 6;
            LocalTime exactStart = LocalTime.now().plusMinutes(waitMinsInitial);
            int minuteRounded = (exactStart.getMinute() / 5) * 5; // Round down to nearest 5 min
            LocalTime slotStart = LocalTime.of(exactStart.getHour(), minuteRounded);
            LocalTime slotEnd = slotStart.plusMinutes(30);

            // ── Parse Items & Bundle ──
            List<Map<String, Object>> itemsList = null;
            boolean bundle3Month = Boolean.TRUE.equals(request.get("isThreeMonthBundle"));
            try {
                itemsList = (List<Map<String, Object>>) request.get("items");
            } catch (Exception e) {
                System.out.println("Items parse error: " + e.getMessage());
            }

            // ── Quota Check (with shared Rice & Bundle support) ──
            Map<Long, Map<String, Object>> fullQuota = getMonthlyQuotaEnriched(rationCardNumber, bundle3Month);
            
            boolean requestHasBenefit = false;
            if (itemsList != null) {
                for (Map<String, Object> iMap : itemsList) {
                    try {
                        if (Long.valueOf(iMap.get("itemId").toString()) >= 1000L) {
                            requestHasBenefit = true;
                            break;
                        }
                    } catch (Exception ignored) {}
                }
            }

            // ── NEW: Duplicate Active Token Check (2026 Rules) ──
            List<Token> activeTokens = tokenRepository.findByRationCardNumberOrderByCreatedAtDesc(rationCardNumber)
                .stream()
                .filter(t -> t.getStatus() == Token.TokenStatus.Confirmed || t.getStatus() == Token.TokenStatus.Pending)
                .collect(Collectors.toList());

            if (itemsList != null) {
                BigDecimal combinedRiceRequested = BigDecimal.ZERO;
                BigDecimal combinedRiceRemaining = BigDecimal.ZERO;
                if (itemsList != null) {
                    for (Map<String, Object> iMap : itemsList) {
                        try {
                            if (Long.valueOf(iMap.get("itemId").toString()) >= 1000L) {
                                requestHasBenefit = true;
                                break;
                            }
                        } catch (Exception ignored) {}
                    }
                }

                for (Map<String, Object> itm : itemsList) {
                    Long itemId = Long.valueOf(itm.get("itemId").toString());
                    BigDecimal requestedQty = new BigDecimal(itm.get("quantity").toString());
                    
                    // a) Check for existing active token to APPEND
                    Token existingToken = null;
                    if (!requestHasBenefit) {
                        for (Token activeT : activeTokens) {
                            // Only append if it's NOT a benefit token
                            boolean isBenefitToken = activeT.getQrCodeData() != null && activeT.getQrCodeData().contains("|BENEFIT:");
                            if (!isBenefitToken && activeT.getShop() != null && activeT.getShop().getId().equals(shop.getId()) && 
                                activeT.getTokenDate() != null && activeT.getTokenDate().equals(tokenDate)) {
                                existingToken = activeT;
                                break;
                            }
                        }
                    }

                    if (existingToken != null) {
                        System.out.println("🔄 Found active token " + existingToken.getTokenNumber() + ". Appending items instead of creating new.");
                        // We will handle the actual append after quota and total calc
                    } else {
                        // If no active token for SAME SHOP, check for others (Standard prevention)
                        for (Token activeT : activeTokens) {
                            List<TokenItem> activeItems = tokenItemRepository.findByTokenId(activeT.getId());
                            for (TokenItem ai : activeItems) {
                                 boolean isRiceRequest = itemId < 1000L && itemRepository.findById(itemId).map(i -> i.getNameEn().toLowerCase().contains("rice")).orElse(false);
                                 boolean isRiceActive = ai.getItem() != null && ai.getItem().getNameEn().toLowerCase().contains("rice");
                                 
                                 if (ai.getItem().getId().equals(itemId)) {
                                     throw new RuntimeException("Duplicate Token Error: You already have an active token for " + ai.getItem().getNameEn() + ". Please collect or cancel it first.");
                                 }
                                 if (isRiceRequest && isRiceActive) {
                                     throw new RuntimeException("Shared Quota Error: You already have an active token for Rice. Please collect or cancel it before generating another rice token.");
                                 }
                            }
                        }
                    }

                    if (itemId >= 1000L) continue; // Skip further quota validation for special benefits here (handled by entry null check)

                    Item item = itemRepository.findById(itemId).orElseThrow();
                    String name = item.getNameEn().toLowerCase();
                    
                    Map<String, Object> entry = fullQuota.getOrDefault(itemId, null);
                    if (entry == null) continue; 
                    
                    BigDecimal remaining = (BigDecimal) entry.get("remaining");

                    if (name.contains("rice")) {
                        combinedRiceRequested = combinedRiceRequested.add(requestedQty);
                        combinedRiceRemaining = remaining; 
                    } else {
                        if (requestedQty.compareTo(remaining) > 0) {
                            throw new RuntimeException("Requested quantity for " + item.getNameEn() + " exceeds available monthly quota (" + remaining + " left)");
                        }
                    }
                }
                
                if (combinedRiceRequested.compareTo(combinedRiceRemaining) > 0) {
                    throw new RuntimeException("Total Rice (Raw + Boiled) exceeds available monthly quota (" + combinedRiceRemaining + " left)");
                }
            }


            // ── Calculate Total with TNPDS Pricing Overrides ──
            BigDecimal total = BigDecimal.ZERO;
            if (itemsList != null) {
                for (Map<String, Object> itm : itemsList) {
                    try {
                        Long itemId = Long.valueOf(itm.get("itemId").toString());
                        if (itemId >= 1000L) continue; // Special Benefits are free

                        BigDecimal qty = new BigDecimal(itm.get("quantity").toString());
                        Item item = itemRepository.findById(itemId).orElseThrow();
                        String name = item.getNameEn().toLowerCase();
                        
                        BigDecimal price = item.getSubsidyPrice() != null ? item.getSubsidyPrice() : BigDecimal.ZERO;
                        
                        // TNPDS Price Overrides
                        if (name.contains("rice") || name.contains("wheat")) price = BigDecimal.ZERO;
                        else if (name.contains("sugar")) price = new BigDecimal("25.0");
                        else if (name.contains("dal")) price = new BigDecimal("30.0");
                        else if (name.contains("oil")) price = new BigDecimal("25.0");
                        else if (name.contains("kerosene")) price = new BigDecimal("15.0");

                        total = total.add(price.multiply(qty));
                    } catch (Exception e) {
                        System.out.println("Amount calc error: " + e.getMessage());
                    }
                }
            }


                // ── CHECK FOR APPEND (Find existing again to be sure) ──
                Token existing = null;
                if (!requestHasBenefit) {
                    for (Token at : activeTokens) {
                        boolean isBenefitToken = at.getQrCodeData() != null && at.getQrCodeData().contains("|BENEFIT:");
                        if (!isBenefitToken && at.getShop() != null && at.getShop().getId().equals(shop.getId()) && 
                            at.getTokenDate() != null && at.getTokenDate().equals(tokenDate)) {
                            existing = at;
                            break;
                        }
                    }
                }

            Token saved;
            if (existing != null) {
                saved = tokenRepository.saveAndFlush(existing);
                System.out.println("✅ Items appended to Token: " + existing.getTokenNumber());
                tokenNumber = existing.getTokenNumber();
                displayToken = existing.getDisplayToken() != null ? existing.getDisplayToken() : "USR-PENDING";
            } else {
                // ── Sequential Local Token (S[ID]-[Num]) ──
                long shopTokenCount = tokenRepository.countByShopIdAndTokenDate(shop.getId(), tokenDate);
                String localTokenNumber = "S" + shop.getId() + "-" + (shopTokenCount + 1);

                // ── Build Token ──
                Token token = new Token();
                token.setLocalTokenNumber(localTokenNumber);
                token.setShop(shop);
                token.setRationCardNumber(rationCardNumber);
                token.setTokenDate(tokenDate);
                token.setTimeSlotStart(slotStart);
                token.setTimeSlotEnd(slotEnd);
                token.setStatus(Token.TokenStatus.Confirmed);
                token.setPaymentMode(
                    "Cash".equals(request.get("paymentMode"))
                        ? Token.PaymentMode.Cash
                        : Token.PaymentMode.Online);
                token.setPaymentStatus(Token.PaymentStatus.Pending);
                token.setTotalAmount(total);
                token.setIsThreeMonthBundle(bundle3Month); 
                token.setCreatedAt(LocalDateTime.now());
                if (linkedUser != null) token.setUser(linkedUser);
                
                // Temporary placeholder to satisfy NOT NULL unique constraint
                token.setTokenNumber("TEMP-" + UUID.randomUUID().toString().substring(0, 8));

                saved = tokenRepository.saveAndFlush(token);
                
                // ── 1. Global Token ID (Sequential) ──
                tokenNumber = String.format("TKN-%06d", saved.getId());
                saved.setTokenNumber(tokenNumber);

                // ── 2. User Display Token (USR-[USER_ID]-[COUNT]) ──
                long userTokenCount = tokenRepository.countByRationCardNumber(rationCardNumber);
                displayToken = String.format("USR-%d-%02d", 
                    linkedUser != null ? linkedUser.getId() : 0, 
                    userTokenCount);
                saved.setDisplayToken(displayToken);

                // ── Update QR Data ──
                saved = tokenRepository.saveAndFlush(saved);
                System.out.println("✅ Token Created: " + tokenNumber + " | Display: " + displayToken);
            }

            // ── 3. Transaction ID (Independent Sequential) ──
            try {
                Transaction tx;
                List<Transaction> existingTxs = transactionRepository.findByTokenId(saved.getId());
                if (!existingTxs.isEmpty()) {
                    tx = existingTxs.get(0);
                } else {
                    tx = new Transaction();
                    tx.setToken(saved);
                    if (linkedUser != null) tx.setUser(linkedUser);
                    
                    // Temporary placeholder to satisfy NOT NULL unique constraint
                    tx.setTransactionNumber("TEMP-" + UUID.randomUUID().toString().substring(0, 8));
                    
                    BigDecimal finalAmt = saved.getTotalAmount() != null ? saved.getTotalAmount() : BigDecimal.ZERO;
                    tx.setAmount(finalAmt);
                    tx.setPaymentMode(
                        "Cash".equals(request.get("paymentMode"))
                            ? Transaction.PaymentMode.Cash
                            : Transaction.PaymentMode.UPI);
                    tx.setStatus(Transaction.TransactionStatus.Success);
                    tx.setTransactionAt(LocalDateTime.now());
                    
                    // Reserve Transaction Primary Key first
                    tx = transactionRepository.saveAndFlush(tx);
                    transactionNumber = String.format("TXN-%06d", tx.getId());
                    tx.setTransactionNumber(transactionNumber);
                }
                
                transactionRepository.saveAndFlush(tx);
                transactionNumber = tx.getTransactionNumber();
                System.out.println("✅ Transaction Synced: " + transactionNumber);
            } catch (Exception te) {
                System.out.println("⚠️ Transaction Sync Error: " + te.getMessage());
            }

            // ── Build Final QR Code (Contains ALL ID Identifiers) ──
            String finalQrData = "TKN:" + tokenNumber 
                + "|UID:" + (linkedUser != null ? linkedUser.getId() : "0")
                + "|USR:" + displayToken 
                + "|TXN:" + transactionNumber
                + "|LOCAL:" + saved.getLocalTokenNumber()
                + "|SHOP:" + shop.getName()
                + "|DATE:" + tokenDate
                + "|AMT:" + saved.getTotalAmount();
            
            // Track benefits in metadata for quota check
            StringBuilder qrWrapper = new StringBuilder(finalQrData);
            if (itemsList != null) {
                for (Map<String, Object> itm : itemsList) {
                    try {
                        Long itemId = Long.valueOf(itm.get("itemId").toString());
                        if (itemId >= 1000L) {
                            qrWrapper.append("|BENEFIT:").append(itemId);
                        }
                    } catch (Exception ignored) {}
                }
            }
            saved.setQrCodeData(qrWrapper.toString());
            saved = tokenRepository.saveAndFlush(saved);
            System.out.println("✅ Token saved: " + tokenNumber
                + " for " + rationCardNumber);

            // ── Save Token Items ──
            if (itemsList != null && !itemsList.isEmpty()) {
                int savedCount = 0;
                for (Map<String, Object> itm : itemsList) {
                    try {
                        Long itemId = Long.valueOf(
                            itm.get("itemId").toString());
                        BigDecimal qty = new BigDecimal(
                            itm.get("quantity").toString());
                        Optional<Item> foundItem =
                            itemRepository.findById(itemId);
                        if (foundItem.isPresent()) {
                            Item item = foundItem.get();
                            TokenItem ti = new TokenItem();
                            ti.setToken(saved);
                            ti.setItem(item);
                            ti.setQuantity(qty);
                            BigDecimal price =
                                item.getSubsidyPrice() != null
                                ? item.getSubsidyPrice()
                                : BigDecimal.ZERO;
                            ti.setPricePerUnit(price);
                            ti.setTotalPrice(price.multiply(qty));
                            tokenItemRepository.save(ti);
                            
                            // Deduct the requested quantity from the shop's live inventory
                            stockService.decreaseStock(shop.getId(), item.getId(), qty);
                            
                            savedCount++;
                        }
                    } catch (Exception e) {
                        System.out.println("TokenItem error: "
                            + e.getMessage());
                        e.printStackTrace();
                    }
                }
                System.out.println("✅ Token items saved: "
                    + savedCount + " items");
            } else {
                System.out.println("⚠️ No items in request");
            }

            // ── Save Notification ──
            try {
                if (linkedUser != null) {
                    Notification n = new Notification();
                    n.setUser(linkedUser);
                    n.setToken(saved);
                    n.setTitleEn("Token Generated!");
                    n.setTitleTa("டோக்கன் உருவாக்கப்பட்டது!");
                    n.setMessageEn("Token " + tokenNumber
                        + " confirmed for "
                        + slotStart + " - " + slotEnd
                        + " today at " + shop.getName());
                    n.setMessageTa(
                        "உங்கள் டோக்கன் இன்று உறுதிப்படுத்தப்பட்டது.");
                    n.setType(Notification.NotifType.Token);
                    n.setIsRead(false);
                    n.setSentAt(LocalDateTime.now());
                    notificationRepository.save(n);
                    System.out.println("✅ Notification saved");
                    // Trigger Push Notification
                    if (linkedUser.getFcmToken() != null && !linkedUser.getFcmToken().isEmpty()) {
                        firebaseService.sendNotification(
                            linkedUser.getFcmToken(),
                            "🎫 Token Generated!",
                            "Your token " + saved.getLocalTokenNumber() + " is confirmed for " + slotStart + " - " + slotEnd + " at " + shop.getName()
                        );
                    }
                }
            } catch (Exception e) {
                System.out.println("Notification error: " + e.getMessage());
            }

            // ── Queue Metadata ──
            List<Token> allShopTokensForDay = tokenRepository.findByShopId(shop.getId()).stream()
                .filter(st -> st.getTokenDate().equals(tokenDate))
                .filter(st -> st.getStatus() == Token.TokenStatus.Confirmed || st.getStatus() == Token.TokenStatus.Pending)
                .sorted(Comparator.comparing(Token::getCreatedAt))
                .collect(Collectors.toList());
            
            int position = 0;
            for (Token st : allShopTokensForDay) {
                if (st.getId().equals(saved.getId())) break;
                position++;
            }
            int waitMins = position * 6;

            // ── Response (Returning all 3 identifiers) ──
            Map<String, Object> resp = new HashMap<>();
            resp.put("tokenNumber", tokenNumber);
            resp.put("displayToken", displayToken);
            resp.put("transactionNumber", transactionNumber);
            resp.put("localTokenNumber", saved.getLocalTokenNumber());
            resp.put("timeSlotStart", slotStart.toString());
            resp.put("timeSlotEnd", slotEnd.toString());
            resp.put("tokenDate", tokenDate.toString());
            resp.put("shopName", shop.getName());
            resp.put("shopAddress", shop.getAddress());
            resp.put("totalAmount", total);
            resp.put("peopleAhead", position);
            resp.put("estimatedWaitMins", waitMins);
            return resp;

        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("❌ Token FAILED: " + e.getMessage());
            throw new RuntimeException(e.getMessage() != null ? e.getMessage() : "Failed to generate token", e);
        }
    }

    public List<Map<String, Object>> getUserTokens(String rationCardNumber) {
        try {
            List<Token> tokens;
            if (rationCardNumber != null &&
                !rationCardNumber.isEmpty()) {
                String card = rationCardNumber.toUpperCase().trim();
                tokens = tokenRepository
                    .findByRationCardNumberOrderByCreatedAtDesc(card);
                System.out.println("📋 Tokens for "
                    + card + ": " + tokens.size());
            } else {
                tokens = tokenRepository.findAllOrderByCreatedAtDesc();
            }

            List<Map<String, Object>> result = new ArrayList<>();
            for (Token t : tokens) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", t.getId());
                map.put("tokenNumber", t.getTokenNumber());
                map.put("localTokenNumber", t.getLocalTokenNumber());
                map.put("status", t.getStatus().toString());
                map.put("tokenDate", t.getTokenDate() != null ?
                    t.getTokenDate().toString() : "");
                map.put("timeSlotStart",
                    t.getTimeSlotStart() != null ?
                    t.getTimeSlotStart().toString() : "");
                map.put("timeSlotEnd",
                    t.getTimeSlotEnd() != null ?
                    t.getTimeSlotEnd().toString() : "");
                map.put("shopName", t.getShop() != null ?
                    t.getShop().getName() : "");
                map.put("totalAmount", t.getTotalAmount());
                map.put("amount", t.getTotalAmount());
                map.put("paymentMode",
                    t.getPaymentMode() != null ?
                    t.getPaymentMode().toString() : "Cash");
                map.put("isThreeMonthBundle", t.getIsThreeMonthBundle());

                List<TokenItem> tokenItems = tokenItemRepository.findByTokenId(t.getId());
                List<Map<String, Object>> itemsList = new ArrayList<>();
                for (TokenItem ti : tokenItems) {
                    Map<String, Object> itemMap = new HashMap<>();
                    itemMap.put("id", ti.getItem().getId());
                    itemMap.put("nameEn", ti.getItem().getNameEn());
                    itemMap.put("nameTa", ti.getItem().getNameTa());
                    itemMap.put("quantity", ti.getQuantity());
                    itemMap.put("price", ti.getPricePerUnit());
                    itemMap.put("total", ti.getTotalPrice());
                    itemsList.add(itemMap);
                }
                map.put("items", itemsList);

                // ── Queue & ETA Logic ──
                if (t.getStatus() == Token.TokenStatus.Confirmed || t.getStatus() == Token.TokenStatus.Pending) {
                    List<Token> allShopTokensForDay = tokenRepository.findByShopId(t.getShop().getId()).stream()
                        .filter(st -> st.getTokenDate().equals(t.getTokenDate()))
                        .filter(st -> st.getStatus() == Token.TokenStatus.Confirmed || st.getStatus() == Token.TokenStatus.Pending)
                        .sorted(Comparator.comparing(Token::getCreatedAt))
                        .collect(Collectors.toList());
                    
                    int position = 0;
                    for (Token st : allShopTokensForDay) {
                        if (st.getId().equals(t.getId())) break;
                        position++;
                    }
                    map.put("peopleAhead", position);
                    map.put("estimatedWaitMins", position * 6); // 6 mins per person as per user feedback
                }

                result.add(map);
            }
            return result;
        } catch (Exception e) {
            System.out.println("getUserTokens error: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public List<Map<String, Object>> getAllTokens() {
        try {
            List<Token> tokens =
                tokenRepository.findAllOrderByCreatedAtDesc();
            List<Map<String, Object>> result = new ArrayList<>();
            for (Token t : tokens) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", t.getId());
                map.put("number", t.getTokenNumber());
                map.put("tokenNumber", t.getTokenNumber());
                map.put("localTokenNumber", t.getLocalTokenNumber());
                map.put("status", t.getStatus().toString());
                map.put("tokenDate", t.getTokenDate() != null ?
                    t.getTokenDate().toString() : "");
                map.put("timeSlotStart",
                    t.getTimeSlotStart() != null ?
                    t.getTimeSlotStart().toString() : "");
                map.put("timeSlotEnd",
                    t.getTimeSlotEnd() != null ?
                    t.getTimeSlotEnd().toString() : "");
                map.put("slot",
                    (t.getTimeSlotStart() != null ?
                        t.getTimeSlotStart().toString() : "")
                    + " - " +
                    (t.getTimeSlotEnd() != null ?
                        t.getTimeSlotEnd().toString() : ""));
                map.put("date", t.getTokenDate() != null ?
                    t.getTokenDate().toString() : "");
                map.put("shopName", t.getShop() != null ?
                    t.getShop().getName() : "Not Assigned");
                map.put("shop", t.getShop() != null ?
                    t.getShop().getName() : "Not Assigned");
                map.put("totalAmount", t.getTotalAmount());
                map.put("amount", t.getTotalAmount());
                map.put("paymentStatus",
    t.getPaymentStatus() != null
    ? t.getPaymentStatus().toString() : "Pending");
                map.put("paymentMode",
                    t.getPaymentMode() != null ?
                    t.getPaymentMode().toString() : "Cash");
                map.put("isThreeMonthBundle", t.getIsThreeMonthBundle());
                map.put("user", t.getUser() != null ?
                    t.getUser().getHeadOfFamily() : "Guest");
                map.put("member", t.getUser() != null ?
                    t.getUser().getHeadOfFamily() : "Guest");
                map.put("rationCardNumber",
                    t.getRationCardNumber());
                result.add(map);
            }
            return result;
        } catch (Exception e) {
            System.out.println("getAllTokens error: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public boolean cancelToken(String tokenNumber) {
        try {
            // Support both UUID and local token number (S5-3)
            Optional<Token> tokenOpt = tokenRepository.findByTokenNumber(tokenNumber);
            if (tokenOpt.isEmpty()) {
                tokenOpt = tokenRepository.findAll().stream()
                    .filter(t -> tokenNumber.equals(t.getLocalTokenNumber()))
                    .findFirst();
            }

            return tokenOpt.map(t -> {
                t.setStatus(Token.TokenStatus.Cancelled);
                tokenRepository.save(t);
                System.out.println("✅ Cancelled: " + tokenNumber);
                return true;
            }).orElse(false);
        } catch (Exception e) {
            System.out.println("❌ cancelToken error: " + e.getMessage());
            return false;
        }
    }

    public boolean collectToken(String tokenNumber) {
        try {
            Optional<Token> tokenOpt = tokenRepository.findByTokenNumber(tokenNumber);
            if (tokenOpt.isEmpty()) {
                tokenOpt = tokenRepository.findAll().stream()
                    .filter(t -> tokenNumber.equals(t.getLocalTokenNumber()))
                    .findFirst();
            }

            if (tokenOpt.isPresent()) {
                Token t = tokenOpt.get();
                t.setStatus(Token.TokenStatus.Collected);
                if (t.getPaymentMode() != null) {
                    t.setPaymentStatus(Token.PaymentStatus.Paid);
                }
                tokenRepository.save(t);
                
                // Save Final Transaction Receipt
                try {
                    Transaction tx = new Transaction();
                    tx.setTransactionNumber("COL-" + System.currentTimeMillis());
                    tx.setToken(t);
                    tx.setUser(t.getUser());
                    tx.setAmount(t.getTotalAmount());
                    tx.setPaymentMode(t.getPaymentMode() == Token.PaymentMode.Cash 
                        ? Transaction.PaymentMode.Cash : Transaction.PaymentMode.UPI);
                    tx.setStatus(Transaction.TransactionStatus.Success);
                    tx.setTransactionAt(LocalDateTime.now());
                    transactionRepository.save(tx);
                    System.out.println("✅ Final Transaction Saved: " + tx.getTransactionNumber());
                } catch (Exception te) {
                    System.out.println("⚠️ Transaction Receipt error: " + te.getMessage());
                }

                // Decrease stock
                List<TokenItem> items = tokenItemRepository.findByTokenId(t.getId());
                for (TokenItem item : items) {
                    stockService.decreaseStock(t.getShop().getId(), item.getItem().getId(), item.getQuantity());
                }

                System.out.println("✅ Collected & Stock Updated: " + tokenNumber);
                
                // Notify user via Push Notification (Digital Receipt)
                if (t.getUser() != null && t.getUser().getFcmToken() != null && !t.getUser().getFcmToken().isEmpty()) {
                    firebaseService.sendNotification(
                        t.getUser().getFcmToken(),
                        "✅ Items Collected!",
                        "You have successfully collected your ration items. Amount: ₹" + t.getTotalAmount()
                    );
                }

                // If it's near month end, maybe send reminders to others
                if (LocalDate.now().getDayOfMonth() > 25) {
                    nudgeService.sendMonthEndNudges();
                }

                return true;
            }
            System.out.println("❌ Not found: " + tokenNumber);
            return false;
        } catch (Exception e) {
            System.out.println("collectToken error: "
                + e.getMessage());
            return false;
        }
    }

    /**
     * Real-time verification of shop status based on 2026 TN timing rules.
     */
    private void validateShopRealTimeStatus(Shop shop) {
        // Master Manual Switch — log but never block token generation
        if (Boolean.FALSE.equals(shop.getIsOpen())) {
            String reason = shop.getClosureReason();
            if (reason != null && !reason.trim().isEmpty()) {
                System.out.println("⚠️ Shop " + shop.getName() + " is marked CLOSED by Admin (" + reason + "). Allowing token pre-generation.");
            } else {
                System.out.println("⚠️ Shop " + shop.getName() + " is marked CLOSED (no reason given). Bypassing.");
            }
            // Do NOT throw — beneficiaries can pre-generate tokens even when shop is closed
            return;
        }

        // Skip timing enforcement during simulation
        if (simulatedDate != null) {
            System.out.println("⏰ Date simulation active (" + simulatedDate + "). Bypassing strict timing enforcement.");
            return;
        }

        LocalDateTime nowDT = LocalDateTime.now();

        String holiday = shop.getWeeklyHoliday() != null ? shop.getWeeklyHoliday() : "FRIDAY";
        if (nowDT.getDayOfWeek().toString().equalsIgnoreCase(holiday)) {
            System.out.println("⚠️ Shop " + shop.getName() + " is on weekly holiday (" + holiday + "). Allowing token pre-generation.");
            return;
        }

        LocalTime mOpen = LocalTime.parse(shop.getMorningOpen() != null ? shop.getMorningOpen() : "09:00");
        LocalTime mClose = LocalTime.parse(shop.getMorningClose() != null ? shop.getMorningClose() : "13:00");
        LocalTime aOpen = LocalTime.parse(shop.getAfternoonOpen() != null ? shop.getAfternoonOpen() : "14:00");
        LocalTime aClose = LocalTime.parse(shop.getAfternoonClose() != null ? shop.getAfternoonClose() : "18:00");

        String district = shop.getDistrict() != null ? shop.getDistrict().toLowerCase() : "";
        String shopName = shop.getName() != null ? shop.getName().toLowerCase() : "";
        String shopAddr = shop.getAddress() != null ? shop.getAddress().toLowerCase() : "";

        boolean isUrbanArea = district.contains("chennai") || district.contains("urban") ||
                             shopName.contains("velachery") || shopAddr.contains("chennai") ||
                             shopAddr.contains("velachery") || district.contains("corporation");

        if (isUrbanArea) {
            mOpen = LocalTime.parse("08:30");
            mClose = LocalTime.parse("12:30");
            aOpen = LocalTime.parse("15:00");
            aClose = LocalTime.parse("19:00");
        }

        LocalTime now = nowDT.toLocalTime();
        boolean morning = !now.isBefore(mOpen) && !now.isAfter(mClose);
        boolean afternoon = !now.isBefore(aOpen) && !now.isAfter(aClose);

        if (!morning && !afternoon) {
            System.out.println("⚠️ Shop " + shop.getName() + " is outside operating hours (" + mOpen + "-" + mClose + ", " + aOpen + "-" + aClose + "). Allowing token pre-generation.");
            // Do NOT throw — tokens can be pre-generated at any time
        }
    }


    private LocalDate getToday() {
        return simulatedDate != null ? simulatedDate : LocalDate.now();
    }

    /**
     * Returns enriched quota per item with keys: max, remaining, price, cardType, units
     */
    public Map<Long, Map<String, Object>> getMonthlyQuotaEnriched(String rationCardNumber, boolean isThreeMonth) {
        Map<Long, Map<String, Object>> result = new HashMap<>();
        try {
            List<Item> allItems = itemRepository.findAll();

            // Default TNPDS prices
            java.util.function.Function<String, BigDecimal> tnpdsPrice = (name) -> {
                if (name.contains("rice") || name.contains("wheat")) return BigDecimal.ZERO;
                if (name.contains("sugar")) return new BigDecimal("25.0");
                if (name.contains("dal") || name.contains("pulse") || name.contains("paruppu")) return new BigDecimal("30.0");
                if (name.contains("oil")) return new BigDecimal("25.0");
                if (name.contains("kerosene")) return new BigDecimal("15.0");
                // Rice and Wheat are always FREE in TN PDS 2026
                if (name.contains("rice") || name.contains("wheat")) return BigDecimal.ZERO;
                return BigDecimal.ZERO;
            };

            // Fall-back: no user resolved
            if (rationCardNumber == null || rationCardNumber.isEmpty()) {
                for (Item item : allItems) {
                    String name = item.getNameEn().toLowerCase();
                    BigDecimal max = item.getMonthlyEntitlement();
                    result.put(item.getId(), Map.of(
                        "max", max, "remaining", max,
                        "price", tnpdsPrice.apply(name),
                        "cardType", "UNKNOWN", "units", 1.0
                    ));
                }
                return result;
            }

            Optional<User> userOpt = userRepository.findByRationCardNumber(rationCardNumber);
            if (userOpt.isEmpty()) {
                for (Item item : allItems) {
                    String name = item.getNameEn().toLowerCase();
                    BigDecimal max = item.getMonthlyEntitlement();
                    result.put(item.getId(), Map.of(
                        "max", max, "remaining", max,
                        "price", tnpdsPrice.apply(name),
                        "cardType", "UNKNOWN", "units", 1.0
                    ));
                }
                return result;
            }

            User user = userOpt.get();
            String cardType = (user.getCardType() != null ? user.getCardType() : "PHH").trim().toUpperCase();

            // 1. Calculate Units (Adult=1, Child<12=0.5)
            List<com.ration.model.Member> members = memberRepository.findByUserId(user.getId());
            double units = 1.0;
            if (members != null) {
                for (com.ration.model.Member m : members) {
                    if (m.getIsHead()) continue;
                    units += (m.getAge() != null && m.getAge() < 12) ? 0.5 : 1.0;
                }
            }

            // 2. Card-specific max limits (TNPDS 2026 Rules)
            BigDecimal riceMax, sugarMax, dalMax, oilMax, wheatMax, keroseneMax;
            
            if (cardType.contains("AAY") || cardType.contains("AY") || cardType.contains("ANTYODAYA")) {
                // AAY: Fixed 35kg Rice
                riceMax   = new BigDecimal("35.0");
                sugarMax  = BigDecimal.valueOf(Math.min(2.0, units * 0.5)).setScale(1, java.math.RoundingMode.HALF_UP);
                dalMax    = new BigDecimal("1.0");
                oilMax    = new BigDecimal("1.0");
                wheatMax  = new BigDecimal("10.0");
            } else if (cardType.contains("-S") || cardType.contains("SUGAR")) {
                // Sugar Cards: No Rice, +3kg extra Sugar
                riceMax   = BigDecimal.ZERO;
                sugarMax  = BigDecimal.valueOf(Math.min(5.0, 3.0 + units * 0.5)).setScale(1, java.math.RoundingMode.HALF_UP);
                dalMax    = new BigDecimal("1.0");
                oilMax    = new BigDecimal("1.0");
                wheatMax  = new BigDecimal("10.0");
            } else if (cardType.contains("-NC") || cardType.contains("NO COMMODITY")) {
                // No Commodity Cards
                riceMax = sugarMax = dalMax = oilMax = wheatMax = BigDecimal.ZERO;
            } else {
                // PERMISSIVE DEFAULT: PHH / NPHH / RICE CARD / PRIORITY / NON-PRIORITY
                // Any card not explicitly restricted gets standard rice.
                riceMax   = BigDecimal.valueOf(Math.max(12.0, Math.min(20.0, units * 5.0))).setScale(1, java.math.RoundingMode.HALF_UP);
                sugarMax  = BigDecimal.valueOf(Math.min(2.0, units * 0.5)).setScale(1, java.math.RoundingMode.HALF_UP);
                dalMax    = new BigDecimal("1.0");
                oilMax    = new BigDecimal("1.0");
                wheatMax  = new BigDecimal("10.0");
            }

            // Apply 3-month multiplier for eligible products
            if (isThreeMonth) {
                riceMax = riceMax.multiply(new BigDecimal("3"));
                sugarMax = sugarMax.multiply(new BigDecimal("3"));
                dalMax = dalMax.multiply(new BigDecimal("3"));
                oilMax = oilMax.multiply(new BigDecimal("3"));
                wheatMax = wheatMax.multiply(new BigDecimal("3"));
            }

            // 3. Kerosene based on LPG and Geography (Rural/Urban)
            int gas = user.getGasCylinders() != null ? user.getGasCylinders() : 0;
            boolean isUrban = Boolean.TRUE.equals(user.getIsUrban());
            
            if ("NPHH-NC".equals(cardType)) {
                keroseneMax = BigDecimal.ZERO;
            } else if (gas == 0) {
                // No Gas: 10L (Urban/Chennai) / 5L (Rural) as per 2026 TN PDS rules
                keroseneMax = new BigDecimal(isUrban ? "10.0" : "5.0");
            } else if (gas == 1) {
                keroseneMax = new BigDecimal("3.0");
            } else {
                keroseneMax = BigDecimal.ZERO;
            }

            // 4. Build max map keyed by itemId
            Map<Long, BigDecimal> maxMap = new HashMap<>();
            for (Item item : allItems) {
                String name = (item.getNameEn() != null ? item.getNameEn() : "").toLowerCase();
                String nameTa = (item.getNameTa() != null ? item.getNameTa() : "").toLowerCase();
                
                if (name.contains("rice") || nameTa.contains("அரிசி"))     maxMap.put(item.getId(), riceMax);
                else if (name.contains("sugar"))    maxMap.put(item.getId(), sugarMax);
                else if (name.contains("dal"))      maxMap.put(item.getId(), dalMax);
                else if (name.contains("oil"))      maxMap.put(item.getId(), oilMax);
                else if (name.contains("wheat"))    maxMap.put(item.getId(), wheatMax);
                else if (name.contains("kerosene")) maxMap.put(item.getId(), keroseneMax);
                else                                maxMap.put(item.getId(), item.getMonthlyEntitlement());
            }

            // 5. Compute remaining by subtracting this month's purchases
            Map<Long, BigDecimal> remainingMap = new HashMap<>(maxMap);
            LocalDate today = getCurrentDate();
            LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();
            LocalDateTime endOfMonth = YearMonth.from(today).atEndOfMonth().atTime(LocalTime.MAX);
            List<Token> tokens = tokenRepository.findByRationCardNumberOrderByCreatedAtDesc(rationCardNumber)
                .stream()
                .filter(t -> t.getCreatedAt() != null && !t.getCreatedAt().isBefore(startOfMonth)
                          && !t.getCreatedAt().isAfter(endOfMonth)
                          && t.getStatus() != Token.TokenStatus.Cancelled
                          && t.getStatus() != Token.TokenStatus.Expired)
                .collect(Collectors.toList());

            if (!tokens.isEmpty()) {
                List<TokenItem> tokenItems = tokenItemRepository.findByTokenIdIn(
                    tokens.stream().map(Token::getId).collect(Collectors.toList()));
                BigDecimal combinedRiceConsumed = BigDecimal.ZERO;
                for (TokenItem ti : tokenItems) {
                    String name = ti.getItem() != null && ti.getItem().getNameEn() != null ? ti.getItem().getNameEn().toLowerCase() : "";
                    if (name.contains("rice")) {
                        combinedRiceConsumed = combinedRiceConsumed.add(ti.getQuantity());
                    } else {
                        Long id = ti.getItem().getId();
                        remainingMap.put(id, remainingMap.getOrDefault(id, BigDecimal.ZERO)
                            .subtract(ti.getQuantity()).max(BigDecimal.ZERO));
                    }
                }
                BigDecimal finalRiceConsumed = combinedRiceConsumed;
                for (Item item : allItems) {
                    if (item.getNameEn().toLowerCase().contains("rice") || item.getNameTa().contains("அரிசி")) {
                        remainingMap.put(item.getId(),
                            remainingMap.getOrDefault(item.getId(), BigDecimal.ZERO)
                                .subtract(finalRiceConsumed).max(BigDecimal.ZERO));
                    }
                }
            }

            // 6. Build enriched result
            final double finalUnits = units;
            for (Item item : allItems) {
                String name = item.getNameEn().toLowerCase();
                BigDecimal max = maxMap.get(item.getId());
                BigDecimal remaining = remainingMap.get(item.getId());
                Map<String, Object> entry = new HashMap<>();
                entry.put("max", max);
                entry.put("remaining", remaining);
                entry.put("price", tnpdsPrice.apply(name));
                entry.put("cardType", cardType);
                entry.put("units", finalUnits);
                result.put(item.getId(), entry);
            }

            // 7. Inject Special Government Benefits (Gift Hampers)
            // Check active tokens to determine if benefit has already been claimed
            List<Token> activeTokensForBenefit = tokenRepository.findByRationCardNumberOrderByCreatedAtDesc(rationCardNumber)
                .stream()
                .filter(t -> t.getStatus() == Token.TokenStatus.Confirmed || t.getStatus() == Token.TokenStatus.Pending || t.getStatus() == Token.TokenStatus.Collected)
                .collect(Collectors.toList());
            
            List<Long> claimedBenefitIds = new ArrayList<>();
            for (Token activeT : activeTokensForBenefit) {
                // 1. Check metadata in QR Code (New Marker System)
                if (activeT.getQrCodeData() != null) {
                    String[] parts = activeT.getQrCodeData().split("\\|");
                    for (String part : parts) {
                        if (part.startsWith("BENEFIT:")) {
                            try {
                                claimedBenefitIds.add(Long.parseLong(part.substring(8)));
                            } catch (Exception ignored) {}
                        }
                    }
                }
                
                // 2. Fallback: Check TokenItems (Legacy/Real Items)
                List<TokenItem> activeItems = tokenItemRepository.findByTokenId(activeT.getId());
                for (TokenItem ai : activeItems) {
                    if (ai.getItem() != null && ai.getItem().getId() >= 1000L) {
                        claimedBenefitIds.add(ai.getItem().getId());
                    }
                }
            }

            benefitRepository.findByIsActiveTrue().forEach(benefit -> {
                BigDecimal benefitItemId = null; // Find matching item if benefit maps to an item
                // Check if this benefit has an active/collected token
                boolean alreadyClaimed = claimedBenefitIds.contains(1000L + benefit.getId()) || claimedBenefitIds.contains(benefit.getId());
                BigDecimal remaining = alreadyClaimed ? BigDecimal.ZERO : new BigDecimal("1.0");
                
                Map<String, Object> entry = new HashMap<>();
                entry.put("max", new BigDecimal("1.0"));
                entry.put("remaining", remaining);
                entry.put("price", BigDecimal.ZERO); // Always free
                entry.put("cardType", cardType);
                entry.put("units", finalUnits);
                entry.put("isSpecialBenefit", true);
                entry.put("nameEn", benefit.getNameEn());
                entry.put("nameTa", benefit.getNameTa());
                entry.put("alreadyClaimed", alreadyClaimed);
                // Use a negative ID or a prefix to distinguish special benefits in the list
                result.put(1000L + benefit.getId(), entry); 
            });

        } catch (Exception e) {
            System.out.println("Quota enriched error: " + e.getMessage());
            e.printStackTrace();
        }
        return result;
    }

    /**
     * Legacy method used internally by generateToken for quota validation.
     * Returns remaining quota per item.
     */
    public Map<Long, BigDecimal> getMonthlyQuota(String rationCardNumber) {
        Map<Long, BigDecimal> quota = new HashMap<>();
        getMonthlyQuotaEnriched(rationCardNumber, false).forEach((id, entry) ->
            quota.put(id, (BigDecimal) entry.get("remaining"))
        );
        return quota;
    }


}