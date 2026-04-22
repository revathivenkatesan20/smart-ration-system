package com.ration.controller;

import com.ration.model.*;
import com.ration.repository.*;
import com.ration.security.JwtUtil;
import com.ration.service.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/shop-admin")
public class ShopAdminController {

    @Autowired private JwtUtil jwtUtil;
    @Autowired private TokenService tokenService;
    @Autowired private ShopRepository shopRepository;
    @Autowired private StockRepository stockRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private TokenRepository tokenRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private ProcurementRequestRepository procurementRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private AdminRepository adminRepository;
    @Autowired private FirebaseMessagingService firebaseService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private com.ration.service.AuthService authService;

    @PostMapping("/procurement/request")
    public ResponseEntity<?> requestProcurement(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> req) {
        try {
            // Get shopId from body if provided, otherwise extract from JWT
            Long shopId;
            if (req.get("shopId") != null) {
                shopId = Long.valueOf(req.get("shopId").toString());
            } else {
                shopId = extractShopId(authHeader);
            }
            Long itemId = Long.valueOf(req.get("itemId").toString());
            Object qtyObj = req.get("requestedQuantity") != null ? req.get("requestedQuantity") : req.get("quantity");
            if (qtyObj == null) throw new RuntimeException("Missing required field: requestedQuantity");
            BigDecimal quantity = new BigDecimal(qtyObj.toString());

            Shop shop = shopRepository.findById(shopId).orElseThrow();
            Item item = itemRepository.findById(itemId).orElseThrow();

            ProcurementRequest pr = new ProcurementRequest();
            pr.setShop(shop);
            pr.setItem(item);
            pr.setRequestedQuantity(quantity);
            pr.setStatus(ProcurementRequest.RequestStatus.Pending);
            procurementRepository.save(pr);

            // Create notification for systemic tracking (admin)
            Notification n = new Notification();
            n.setTitleEn("Procurement Requested");
            n.setTitleTa("கொள்முதல் கோரப்பட்டது");
            n.setMessageEn("Request for " + quantity + " " + item.getUnit() + " of " + item.getNameEn() + " submitted.");
            n.setMessageTa(quantity + " " + item.getUnit() + " " + item.getNameTa() + " கொள்முதல் கோரிக்கை சமர்ப்பிக்கப்பட்டது.");
            n.setType(Notification.NotifType.Stock);
            n.setSentAt(java.time.LocalDateTime.now());
            notificationRepository.save(n);
            System.out.println("✅ Procurement notification saved.");

            // Notify SuperAdmins via Push Notification
            try {
                List<Admin> superAdmins = adminRepository.findByRole(Admin.AdminRole.SuperAdmin);
                for (Admin sa : superAdmins) {
                    if (sa.getFcmToken() != null && !sa.getFcmToken().isEmpty()) {
                        firebaseService.sendNotification(
                            sa.getFcmToken(),
                            "🚨 New Procurement Request",
                            shop.getName() + " requested restock of " + item.getNameEn()
                        );
                    }
                }
            } catch (Exception pushEx) {
                System.err.println("Failed to notify SuperAdmins: " + pushEx.getMessage());
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Procurement request submitted"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/procurement/list/{shopId}")
    public ResponseEntity<?> getShopProcurements(@PathVariable Long shopId) {
        return ResponseEntity.ok(procurementRepository.findByShopIdAndStatus(shopId, ProcurementRequest.RequestStatus.Pending));
    }

    @GetMapping("/procurement/history/{shopId}")
    public ResponseEntity<?> getShopProcurementHistory(@PathVariable Long shopId) {
        try {
            List<ProcurementRequest> all = procurementRepository.findAll().stream()
                .filter(pr -> pr.getShop().getId().equals(shopId))
                .sorted(Comparator.comparing(ProcurementRequest::getRequestDate).reversed())
                .toList();

            List<Map<String, Object>> result = new ArrayList<>();
            for (ProcurementRequest pr : all) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", pr.getId());
                map.put("itemName", pr.getItem().getNameEn());
                map.put("itemNameTa", pr.getItem().getNameTa() != null ? pr.getItem().getNameTa() : pr.getItem().getNameEn());
                map.put("itemUnit", pr.getItem().getUnit());
                map.put("requestedQuantity", pr.getRequestedQuantity());
                map.put("status", pr.getStatus().name());
                map.put("requestDate", pr.getRequestDate() != null ? pr.getRequestDate().toString() : "");
                map.put("fulfilledDate", pr.getFulfilledDate() != null ? pr.getFulfilledDate().toString() : "");
                result.add(map);
            }
            return ResponseEntity.ok(Map.of("success", true, "data", result));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/procurement/my-history")
    public ResponseEntity<?> getMyProcurementHistory(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long shopId = extractShopId(authHeader);
            List<ProcurementRequest> all = procurementRepository.findAll().stream()
                .filter(pr -> pr.getShop() != null && pr.getShop().getId().equals(shopId))
                .sorted(Comparator.comparing(pr -> pr.getRequestDate() != null ? pr.getRequestDate() : LocalDateTime.MIN, Comparator.reverseOrder()))
                .toList();

            List<Map<String, Object>> result = new ArrayList<>();
            for (ProcurementRequest pr : all) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", pr.getId());
                map.put("itemName", pr.getItem() != null ? pr.getItem().getNameEn() : "Unknown");
                map.put("itemNameTa", pr.getItem() != null && pr.getItem().getNameTa() != null ? pr.getItem().getNameTa() : (pr.getItem() != null ? pr.getItem().getNameEn() : ""));
                map.put("itemUnit", pr.getItem() != null ? pr.getItem().getUnit() : "");
                map.put("requestedQuantity", pr.getRequestedQuantity());
                map.put("status", pr.getStatus().name());
                map.put("requestDate", pr.getRequestDate() != null ? pr.getRequestDate().toString() : "");
                map.put("fulfilledDate", pr.getFulfilledDate() != null ? pr.getFulfilledDate().toString() : "");
                result.add(map);
            }
            return ResponseEntity.ok(Map.of("success", true, "data", result));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }


    private Long extractShopId(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.isTokenValid(token)) {
                return jwtUtil.extractUserId(token);
            }
        }
        throw new RuntimeException("Not authenticated");
    }

    @PostMapping("/login")
    public ResponseEntity<?> shopAdminLogin(
            @RequestBody Map<String, String> req) {
        String username = req.getOrDefault("username", "");
        String password = req.getOrDefault("password", "");

        Shop shop = null;
        
        // 1. Try parsing as numeric ID or shop_admin_ID
        try {
            Long shopId = null;
            if (username.contains("_")) {
                String[] parts = username.split("_");
                String lastPart = parts[parts.length - 1];
                shopId = Long.parseLong(lastPart);
            } else {
                shopId = Long.parseLong(username);
            }
            shop = shopRepository.findById(shopId).orElse(null);
        } catch (Exception e) {}

        // 2. Try searching by Shop Code if not found
        if (shop == null) {
            shop = shopRepository.findByShopCode(username).orElse(null);
        }

        if (shop == null) {
            return ResponseEntity.ok(Map.of("success", false, "message", "Shop not found. Use ID (e.g. 4) or Shop Code."));
        }

        String storedPass = shop.getAdminPassword();
        if (storedPass == null) storedPass = "shop123";

        boolean isMatch = false;
        try {
            isMatch = passwordEncoder.matches(password, storedPass);
        } catch (Exception e) {}

        // 3. Smart Fallback for plain-text (handles default "shop123" in DB)
        // If matches failed, but it equals plain text AND stored is not a bcrypt hash
        if (!isMatch && password.equals(storedPass) && !storedPass.startsWith("$2")) {
            isMatch = true;
            // Upgrade to BCrypt automatically for future logins
            shop.setAdminPassword(passwordEncoder.encode(password));
            shopRepository.save(shop);
        }

        if (!isMatch) {
            return ResponseEntity.ok(Map.of("success", false, "message", "Invalid login credentials"));
        }
        
        Long finalShopId = shop.getId();

        String shopName = shop.getName() != null ? shop.getName() : "Shop " + finalShopId;

        String token = jwtUtil.generateToken(
            username, "SHOP_ADMIN", finalShopId);

        Map<String, Object> data = new HashMap<>();
        data.put("token", token);
        data.put("role", "SHOP_ADMIN");
        data.put("shopId", finalShopId);
        data.put("shopName", shopName);
        data.put("name", shopName + " Admin");

        return ResponseEntity.ok(Map.of("success", true, "data", data));
    }

    @PostMapping("/forgot-password/send-otp")
    public ResponseEntity<?> forgotPasswordOtp(@RequestBody Map<String, String> req) {
        String username = req.getOrDefault("username", "");
        try {
            String[] parts = username.split("_");
            Long shopId = Long.parseLong(parts[parts.length - 1]);
            Shop shop = shopRepository.findById(shopId).orElse(null);
            if (shop == null || shop.getContactNumber() == null) {
                return ResponseEntity.ok(Map.of("success", false, "message", "Shop not found or no contact number available"));
            }

            // Generate Mock OTP
            String otp = String.format("%06d", new Random().nextInt(999999));
            shop.setAdminOtp(otp);
            shopRepository.save(shop);

            // Send OTP via MSG91
            authService.sendRegistrationOtp(shop.getContactNumber(), otp);

            System.out.println("✅ MSG91 OTP triggered for shop " + shopId);

            return ResponseEntity.ok(Map.of("success", true, "message", "OTP sent successfully via MSG91", "otp", authService.isDebugMode() ? otp : "SENT"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", "Error: " + e.getMessage()));
        }
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<?> forgotPasswordReset(@RequestBody Map<String, String> req) {
        String username = req.getOrDefault("username", "");
        String otp = req.getOrDefault("otp", "");
        String newPassword = req.getOrDefault("newPassword", "");

        try {
            String[] parts = username.split("_");
            Long shopId = Long.parseLong(parts[parts.length - 1]);
            Shop shop = shopRepository.findById(shopId).orElse(null);
            if (shop == null) {
                return ResponseEntity.ok(Map.of("success", false, "message", "Shop not found"));
            }

            if (shop.getAdminOtp() == null || !shop.getAdminOtp().equals(otp)) {
                return ResponseEntity.ok(Map.of("success", false, "message", "Invalid or expired OTP"));
            }

            // Reset password and clear OTP
            shop.setAdminPassword(passwordEncoder.encode(newPassword));
            shop.setAdminOtp(null);
            shopRepository.save(shop);

            return ResponseEntity.ok(Map.of("success", true, "message", "Password reset successfully"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", "Error resetting password"));
        }
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long shopId = extractShopId(authHeader);
            Shop shop = shopRepository.findById(shopId).orElseThrow();

            List<Token> shopTokens = tokenRepository.findByShopId(shopId);
            long totalTokens = shopTokens.size();
            long confirmedTokens = shopTokens.stream()
                .filter(t -> "Confirmed".equals(t.getStatus().toString()))
                .count();
            long collectedTokens = shopTokens.stream()
                .filter(t -> "Collected".equals(t.getStatus().toString()))
                .count();
            long cancelledTokens = shopTokens.stream()
                .filter(t -> "Cancelled".equals(t.getStatus().toString()))
                .count();

            long totalUsers = userRepository.findByAssignedShopId(shopId).size();

            List<Stock> stockList = stockRepository.findByShopId(shopId);
            long lowStockCount = stockList.stream()
                .filter(s -> "Low".equals(s.getStatus()) || "Out of Stock".equals(s.getStatus()))
                .count();

            BigDecimal revenue = BigDecimal.ZERO;
            try {
                revenue = transactionRepository.findAll().stream()
                    .filter(tx -> tx.getToken() != null
                        && tx.getToken().getShop() != null
                        && shopId.equals(tx.getToken().getShop().getId()))
                    .map(tx -> tx.getAmount() != null ? tx.getAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            } catch (Exception e) {
                System.out.println("Revenue calc error: " + e.getMessage());
            }

            Map<String, Object> data = new HashMap<>();
            data.put("shopId", shopId);
            data.put("shopName", shop.getName());
            data.put("shopAddress", shop.getAddress() != null ? shop.getAddress() : "");
            data.put("managerName", shop.getManagerName() != null ? shop.getManagerName() : "");
            data.put("openingTime", shop.getOpeningTime() != null ? shop.getOpeningTime() : "09:00");
            data.put("closingTime", shop.getClosingTime() != null ? shop.getClosingTime() : "17:00");
            data.put("morningOpen", shop.getMorningOpen());
            data.put("morningClose", shop.getMorningClose());
            data.put("afternoonOpen", shop.getAfternoonOpen());
            data.put("afternoonClose", shop.getAfternoonClose());
            data.put("weeklyHoliday", shop.getWeeklyHoliday());
            data.put("totalUsers", totalUsers);
            data.put("totalTokens", totalTokens);
            data.put("confirmedTokens", confirmedTokens);
            data.put("collectedTokens", collectedTokens);
            data.put("cancelledTokens", cancelledTokens);
            data.put("lowStockAlerts", lowStockCount);
            data.put("revenue", revenue);
            data.put("isOpen", shop.getIsOpen());
            data.put("closureReason", shop.getClosureReason());
            data.put("noticeEn", shop.getNoticeEn());
            data.put("noticeTa", shop.getNoticeTa());

            return ResponseEntity.ok(Map.of("success", true, "data", data));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "search", required = false) String search) {
        try {
            Long shopId = extractShopId(authHeader);
            List<Map<String, Object>> result = new ArrayList<>();
            List<User> users;
            if (search != null && !search.trim().isEmpty()) {
                Optional<User> uOpt = userRepository.findByRationCardNumber(search.trim().toUpperCase());
                users = uOpt.map(Collections::singletonList).orElse(Collections.emptyList());
            } else {
                users = userRepository.findByAssignedShopId(shopId);
            }
            
            users.forEach(u -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", u.getId());
                map.put("rationCard", u.getRationCardNumber());
                map.put("name", u.getHeadOfFamily() != null ? u.getHeadOfFamily() : "");
                map.put("mobile", u.getMobileNumber() != null ? u.getMobileNumber() : "");
                map.put("cardType", u.getCardType() != null ? u.getCardType() : "PHH");
                map.put("district", u.getDistrict() != null ? u.getDistrict() : "");
                map.put("active", Boolean.TRUE.equals(u.getIsActive()));
                map.put("currentShop", u.getAssignedShop() != null ? u.getAssignedShop().getName() : "Not assigned");
                map.put("currentShopId", u.getAssignedShop() != null ? u.getAssignedShop().getId() : null);
                map.put("govtShop", u.getGovtShop() != null ? u.getGovtShop().getName() : "Not assigned");
                map.put("govtShopId", u.getGovtShop() != null ? u.getGovtShop().getId() : null);
                result.add(map);
            });
            return ResponseEntity.ok(Map.of("success", true, "data", result));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "data", List.of()));
        }
    }

    @GetMapping("/user/{rationCardNumber}/usage")
    public ResponseEntity<?> getUserUsage(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String rationCardNumber) {
        try {
            extractShopId(authHeader); // authenticates shop admin
            
            Map<Long, BigDecimal> remainingQuota = tokenService.getMonthlyQuota(rationCardNumber.toUpperCase().trim());
            List<Map<String, Object>> tokens = tokenService.getUserTokens(rationCardNumber.toUpperCase().trim());
            
            Map<String, Object> data = new HashMap<>();
            data.put("remainingQuota", remainingQuota);
            data.put("tokens", tokens);
            
            return ResponseEntity.ok(Map.of("success", true, "data", data));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/tokens")
    public ResponseEntity<?> getTokens(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long shopId = extractShopId(authHeader);
            List<Map<String, Object>> result = new ArrayList<>();
            tokenRepository.findByShopId(shopId).forEach(t -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", t.getId());
                map.put("tokenNumber", t.getTokenNumber());
                map.put("number", t.getTokenNumber());
                map.put("localTokenNumber", t.getLocalTokenNumber());
                map.put("status", t.getStatus().toString());
                map.put("paymentMode", t.getPaymentMode() != null ? t.getPaymentMode().toString() : "Cash");
                map.put("paymentStatus", t.getPaymentStatus() != null ? t.getPaymentStatus().toString() : "Pending");
                map.put("totalAmount", t.getTotalAmount() != null ? t.getTotalAmount() : BigDecimal.ZERO);
                map.put("amount", t.getTotalAmount() != null ? t.getTotalAmount() : BigDecimal.ZERO);
                map.put("tokenDate", t.getTokenDate() != null ? t.getTokenDate().toString() : "");
                map.put("timeSlotStart", t.getTimeSlotStart() != null ? t.getTimeSlotStart().toString() : "");
                map.put("timeSlotEnd", t.getTimeSlotEnd() != null ? t.getTimeSlotEnd().toString() : "");
                map.put("slot",
                    (t.getTimeSlotStart() != null ? t.getTimeSlotStart().toString() : "")
                    + " - "
                    + (t.getTimeSlotEnd() != null ? t.getTimeSlotEnd().toString() : ""));
                map.put("user", t.getUser() != null ? t.getUser().getHeadOfFamily() : "Guest");
                map.put("rationCardNumber", t.getRationCardNumber() != null ? t.getRationCardNumber() : "");
                result.add(map);
            });
            return ResponseEntity.ok(Map.of("success", true, "data", result));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "data", List.of()));
        }
    }

    @GetMapping("/stock")
    public ResponseEntity<?> getStock(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long shopId = extractShopId(authHeader);
            List<Map<String, Object>> result = new ArrayList<>();
            stockRepository.findByShopId(shopId).forEach(s -> {
                if (s.getItem() == null) return;
                Map<String, Object> map = new HashMap<>();
                map.put("stockId", s.getId());
                map.put("itemId", s.getItem().getId());
                map.put("nameEn", s.getItem().getNameEn());
                map.put("nameTa", s.getItem().getNameTa());
                map.put("quantityAvailable", s.getQuantityAvailable());
                map.put("thresholdMin", s.getThresholdMin());
                map.put("status", s.getStatus() != null ? s.getStatus() : "Available");
                map.put("unit", s.getItem().getUnit());
                result.add(map);
            });
            return ResponseEntity.ok(Map.of("success", true, "data", result));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "data", List.of()));
        }
    }

    @PutMapping("/stock/update")
    public ResponseEntity<?> updateStock(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> req) {
        try {
            Long shopId = extractShopId(authHeader);
            Long stockId = Long.valueOf(req.get("stockId").toString());
            BigDecimal qty = new BigDecimal(req.get("quantity").toString());

            stockRepository.findById(stockId).ifPresent(s -> {
                if (shopId.equals(s.getShop().getId())) {
                    s.setQuantityAvailable(qty);
                    stockRepository.save(s);
                    System.out.println("Stock updated: " + s.getItem().getNameEn() + " = " + qty);

                    BigDecimal threshold = s.getThresholdMin() != null
                        ? s.getThresholdMin() : BigDecimal.valueOf(50);

                    if (qty.compareTo(threshold) <= 0) {
                        try {
                            Notification alert = new Notification();
                            alert.setTitleEn("Low Stock Alert - " + s.getShop().getName());
                            alert.setTitleTa("குறைவான இருப்பு எச்சரிக்கை");
                            alert.setMessageEn(s.getItem().getNameEn()
                                + " is low (" + qty + " " + s.getItem().getUnit()
                                + ") at " + s.getShop().getName() + ". Please restock.");
                            alert.setMessageTa(s.getItem().getNameEn() + " இருப்பு குறைவாக உள்ளது.");
                            alert.setType(Notification.NotifType.Stock);
                            alert.setIsRead(false);
                            alert.setSentAt(LocalDateTime.now());
                            notificationRepository.save(alert);
                            System.out.println("Low stock alert saved for super admin.");

                            // Send push notification to all SuperAdmins
                            adminRepository.findAll().stream()
                                .filter(a -> a.getRole() == Admin.AdminRole.SuperAdmin && a.getFcmToken() != null)
                                .forEach(admin -> {
                                    firebaseService.sendNotification(
                                        admin.getFcmToken(),
                                        "⚠️ Low Stock: " + s.getShop().getName(),
                                        s.getItem().getNameEn() + " is at " + qty + " " + s.getItem().getUnit()
                                    );
                                });

                        } catch (Exception ne) {
                            System.out.println("Alert error: " + ne.getMessage());
                        }
                    }
                }
            });

            return ResponseEntity.ok(Map.of("success", true, "message", "Stock updated"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/reports")
    public ResponseEntity<?> getReports(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long shopId = extractShopId(authHeader);
            List<Token> tokens = tokenRepository.findByShopId(shopId);

            long collected = tokens.stream()
                .filter(t -> "Collected".equals(t.getStatus().toString())).count();
            long confirmed = tokens.stream()
                .filter(t -> "Confirmed".equals(t.getStatus().toString())).count();
            long cancelled = tokens.stream()
                .filter(t -> "Cancelled".equals(t.getStatus().toString())).count();

            BigDecimal totalRevenue = tokens.stream()
                .filter(t -> "Collected".equals(t.getStatus().toString()))
                .map(t -> t.getTotalAmount() != null ? t.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            List<Map<String, Object>> tokenList = new ArrayList<>();
            tokens.forEach(t -> {
                Map<String, Object> map = new HashMap<>();
                map.put("tokenNumber", t.getTokenNumber());
                map.put("localTokenNumber", t.getLocalTokenNumber());
                map.put("status", t.getStatus().toString());
                map.put("date", t.getTokenDate() != null ? t.getTokenDate().toString() : "");
                map.put("amount", t.getTotalAmount() != null ? t.getTotalAmount() : BigDecimal.ZERO);
                map.put("paymentMode", t.getPaymentMode() != null ? t.getPaymentMode().toString() : "Cash");
                map.put("paymentStatus", t.getPaymentStatus() != null ? t.getPaymentStatus().toString() : "Pending");
                map.put("user", t.getUser() != null ? t.getUser().getHeadOfFamily() : "Guest");
                tokenList.add(map);
            });

            Map<String, Object> data = new HashMap<>();
            data.put("totalTokens", tokens.size());
            data.put("collected", collected);
            data.put("confirmed", confirmed);
            data.put("cancelled", cancelled);
            data.put("totalRevenue", totalRevenue);
            data.put("tokens", tokenList);

            return ResponseEntity.ok(Map.of("success", true, "data", data));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/ai-insights")
    public ResponseEntity<?> getAiInsights(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "Accept-Language", required = false) String langHeader) {
        try {
            String lang = (langHeader != null && langHeader.contains("ta")) ? "ta" : "en";
            System.out.println("🤖 AI Insights Request. Resolved Lang: " + lang);
            Long shopId = extractShopId(authHeader);
            List<Token> tokens = tokenRepository.findByShopId(shopId);
            List<Stock> stockList = stockRepository.findByShopId(shopId);

            Map<String, Long> dayCount = new HashMap<>();
            tokens.forEach(t -> {
                if (t.getTokenDate() != null) {
                    String day = t.getTokenDate().getDayOfWeek().toString();
                    dayCount.merge(day, 1L, Long::sum);
                }
            });

            String peakDay = dayCount.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("Monday");

            List<Map<String, Object>> itemDemand = new ArrayList<>();
            stockList.forEach(s -> {
                if (s.getItem() == null) return;
                Map<String, Object> item = new HashMap<>();
                item.put("itemName", s.getItem().getNameEn());
                item.put("itemNameTa", s.getItem().getNameTa() != null ? s.getItem().getNameTa() : s.getItem().getNameEn());
                item.put("currentStock", s.getQuantityAvailable());
                item.put("unit", s.getItem().getUnit());

                BigDecimal qty = s.getQuantityAvailable() != null ? s.getQuantityAvailable() : BigDecimal.ZERO;
                BigDecimal baseThreshold = s.getThresholdMin() != null ? s.getThresholdMin() : BigDecimal.valueOf(100);
                
                // Item-specific multipliers for TN PDS 2026
                String name = s.getItem().getNameEn().toLowerCase();
                BigDecimal multiplier = name.contains("rice") ? BigDecimal.valueOf(4.0) : 
                                       (name.contains("sugar") || name.contains("dal")) ? BigDecimal.valueOf(3.0) : 
                                       BigDecimal.valueOf(2.0);
                
                BigDecimal recommended = baseThreshold.multiply(multiplier).setScale(1, java.math.RoundingMode.HALF_UP);
                BigDecimal adequateKg = recommended.subtract(qty).max(BigDecimal.ZERO).setScale(1, java.math.RoundingMode.HALF_UP);
                
                String prediction;
                if (qty.compareTo(baseThreshold) <= 0) prediction = "Restock Urgently";
                else if (qty.compareTo(recommended.multiply(BigDecimal.valueOf(0.6))) <= 0) prediction = "Monitor Demand";
                else prediction = lang.equals("ta") ? "ஆரோக்கியமானது" : "Adequate stock";

                item.put("prediction", prediction);
                item.put("recommendedStock", recommended);
                item.put("adequateKg", adequateKg);
                itemDemand.add(item);
            });


            long collectionRate = tokens.isEmpty() ? 0
                : (tokens.stream()
                    .filter(t -> "Collected".equals(t.getStatus().toString()))
                    .count() * 100) / tokens.size();

            // Actionable, localized recommendations
            String recEn, recTa;
            if (collectionRate < 50) {
                recEn = "Low collection rate detected. Recommended: Trigger SMS reminders to beneficiaries before " + peakDay + ".";
                recTa = "சேகரிப்பு விகிதம் குறைவாக உள்ளது. " + peakDay + "-க்கு முன்னதாக பயனாளிகளுக்கு SMS நினைவூட்டல்களை அனுப்ப பரிந்துரைக்கப்படுகிறது.";
            } else if (peakDay.contains("SATURDAY") || peakDay.contains("SUNDAY")) {
                recEn = "High weekend demand predicted. Ensure Pulse and Sugar stocks are ready by local Thursday noon.";
                recTa = "வார இறுதியில் அதிக தேவை கணிக்கப்பட்டுள்ளது. பருப்பு மற்றும் சர்க்கரை இருப்புகளை வியாழன் மதியத்திற்குள் தயார் செய்வதை உறுதிப்படுத்தவும்.";
            } else {
                recEn = "Steady demand pattern. Monitor " + peakDay + " peak and maintain current stock levels.";
                recTa = "நிலையான தேவை முறை. " + peakDay + " உச்சத்தைக் கண்காணித்து தற்போதைய இருப்பு நிலைகளைப் பராமரிக்கவும்.";
            }

            Map<String, Object> data = new HashMap<>();
            data.put("peakDay", peakDay);
            data.put("collectionRate", collectionRate);
            data.put("totalTokens", tokens.size());
            data.put("itemDemand", itemDemand);
            data.put("recommendation", lang != null && lang.equals("ta") ? recTa : recEn);
            data.put("recommendationEn", recEn);
            data.put("recommendationTa", recTa);

            return ResponseEntity.ok(Map.of("success", true, "data", data));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/update-status")
    public ResponseEntity<?> updateShopStatus(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> req) {
        try {
            Long shopId = extractShopId(authHeader);
            Shop shop = shopRepository.findById(shopId).orElseThrow();

            if (req.containsKey("isOpen")) shop.setIsOpen((Boolean) req.get("isOpen"));
            if (req.containsKey("closureReason")) shop.setClosureReason((String) req.get("closureReason"));
            if (req.containsKey("noticeEn")) shop.setNoticeEn((String) req.get("noticeEn"));
            if (req.containsKey("noticeTa")) shop.setNoticeTa((String) req.get("noticeTa"));

            shopRepository.save(shop);
            
            // 📡 Broadcast Status Change via Firebase
            try {
                String statusMsg = Boolean.TRUE.equals(shop.getIsOpen()) ? "Shop is now OPEN!" : "Shop is temporarily CLOSED: " + shop.getClosureReason();
                if (firebaseService != null) {
                    firebaseService.sendTopicNotification("shop_" + shopId, "Shop Status Updated", statusMsg);
                    System.out.println("📡 Notification sent to shop_" + shopId + ": " + statusMsg);
                }
            } catch (Exception e) {
                System.err.println("❌ Failed to broadcast shop status: " + e.getMessage());
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Shop status updated"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long shopId = extractShopId(authHeader);
            return shopRepository.findById(shopId).map(s -> {
                Map<String, Object> data = new HashMap<>();
                data.put("id", s.getId());
                data.put("name", s.getName());
                data.put("shopCode", s.getShopCode() != null ? s.getShopCode() : "");
                data.put("address", s.getAddress() != null ? s.getAddress() : "");
                data.put("district", s.getDistrict() != null ? s.getDistrict() : "");
                data.put("pincode", s.getPincode() != null ? s.getPincode() : "");
                data.put("managerName", s.getManagerName() != null ? s.getManagerName() : "");
                data.put("contactNumber", s.getContactNumber() != null ? s.getContactNumber() : "");
                data.put("openingTime", s.getOpeningTime() != null ? s.getOpeningTime() : "09:00");
                data.put("closingTime", s.getClosingTime() != null ? s.getClosingTime() : "17:00");
                data.put("isActive", s.getIsActive());
                data.put("isOpen", s.getIsOpen());
                return ResponseEntity.ok(Map.of("success", true, "data", data));
            }).orElse(ResponseEntity.ok(Map.of("success", false, "message", "Shop not found")));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PutMapping("/update-profile")
    public ResponseEntity<?> updateProfile(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> req) {
        try {
            Long shopId = extractShopId(authHeader);
            Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("Shop not found"));

            if (req.containsKey("managerName"))
                shop.setManagerName(req.get("managerName").toString());
            if (req.containsKey("contactNumber"))
                shop.setContactNumber(req.get("contactNumber").toString());
            if (req.containsKey("address"))
                shop.setAddress(req.get("address").toString());
            if (req.containsKey("district"))
                shop.setDistrict(req.get("district").toString());
            if (req.containsKey("pincode"))
                shop.setPincode(req.get("pincode").toString());
            if (req.containsKey("openingTime"))
                shop.setOpeningTime(req.get("openingTime").toString());
            if (req.containsKey("closingTime"))
                shop.setClosingTime(req.get("closingTime").toString());

            shopRepository.save(shop);
            System.out.println("✅ Shop profile updated for shopId=" + shopId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Profile updated successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/update-fcm-token")
    @Transactional
    public ResponseEntity<?> updateFcmToken(@RequestBody Map<String, String> req) {
        String username = req.get("username");
        String fcmToken = req.get("fcmToken");
        
        return adminRepository.findByUsername(username)
            .map(admin -> {
                admin.setFcmToken(fcmToken);
                adminRepository.save(admin);
                return ResponseEntity.ok(Map.of("success", true, "message", "FCM token updated"));
            })
            .orElse(ResponseEntity.ok(Map.of("success", false, "message", "Admin not found")));
    }
}