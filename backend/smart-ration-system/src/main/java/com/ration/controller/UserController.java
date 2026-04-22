package com.ration.controller;

import com.ration.model.Member;
import com.ration.model.User;
import com.ration.repository.UserRepository;
import com.ration.repository.MemberRepository;
import com.ration.repository.NotificationRepository;
import com.ration.repository.TransactionRepository;
import com.ration.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
private TransactionRepository transactionRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private com.ration.repository.ShopRepository shopRepository;

    @Autowired
    private com.ration.repository.SpecialBenefitRepository benefitRepository;

    @Autowired
    private com.ration.repository.TokenItemRepository tokenItemRepository;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(
            @RequestHeader(value="Authorization",
                required=false) String authHeader) {
        try {
            System.out.println("=== PROFILE REQUEST ===");
            System.out.println("Auth header: " + authHeader);

            String rationCardNumber = null;

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                boolean valid = jwtUtil.isTokenValid(token);
                System.out.println("Token valid: " + valid);

                if (valid) {
                    rationCardNumber = jwtUtil.extractSubject(token);
                    System.out.println("JWT subject: " + rationCardNumber);
                }
            }

            if (rationCardNumber == null || rationCardNumber.isEmpty()) {
                System.out.println("❌ No ration card from JWT");
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "No token provided"));
            }

            // Try exact match first
            Optional<User> userOpt = userRepository
                .findByRationCardNumber(rationCardNumber);
            System.out.println("Exact match found: " + userOpt.isPresent());

            // Try uppercase if not found
            if (!userOpt.isPresent()) {
                String upper = rationCardNumber.toUpperCase().trim();
                System.out.println("Trying uppercase: " + upper);
                userOpt = userRepository.findByRationCardNumber(upper);
                System.out.println("Uppercase match: " + userOpt.isPresent());
            }

            // List all users for debug
            if (!userOpt.isPresent()) {
                System.out.println("All users in DB:");
                userRepository.findAll().forEach(u ->
                    System.out.println("  - '" + u.getRationCardNumber()
                        + "' id=" + u.getId()));
            }

            if (userOpt.isPresent()) {
                User u = userOpt.get();
                System.out.println("✅ User found: " + u.getHeadOfFamily());
                System.out.println("   Shop: " + (u.getAssignedShop() != null ?
                    u.getAssignedShop().getName() : "NULL"));

                Map<String, Object> data = new HashMap<>();
                data.put("id", u.getId());
                data.put("rationCardNumber", u.getRationCardNumber());
                data.put("name", u.getHeadOfFamily());
                data.put("headOfFamily", u.getHeadOfFamily());
                data.put("mobileNumber", u.getMobileNumber());
                data.put("cardType", u.getCardType() != null ?
                    u.getCardType() : "BPL");
                data.put("district", u.getDistrict());
                data.put("address", u.getAddress());
                data.put("pincode", u.getPincode());
                data.put("gasCylinders", u.getGasCylinders());
                data.put("familyMembersList", u.getFamilyMembersList() != null ? u.getFamilyMembersList() : "");
                data.put("isUrban", Boolean.TRUE.equals(u.getIsUrban()));
                data.put("shopId", u.getAssignedShop() != null ?
                    u.getAssignedShop().getId() : null);
                data.put("shopDistrict", u.getAssignedShop() != null ?
                    u.getAssignedShop().getDistrict() : "");
                data.put("shopName", u.getAssignedShop() != null ?
                    u.getAssignedShop().getName() : "");
                data.put("shopAddress", u.getAssignedShop() != null ?
                    u.getAssignedShop().getAddress() : "");
                data.put("shopOpeningTime", u.getAssignedShop() != null ?
                    u.getAssignedShop().getOpeningTime() : "9:00 AM");
                data.put("shopClosingTime", u.getAssignedShop() != null ?
                    u.getAssignedShop().getClosingTime() : "5:00 PM");
                data.put("morningOpen", u.getAssignedShop() != null ? 
                    u.getAssignedShop().getMorningOpen() : "09:00");
                data.put("morningClose", u.getAssignedShop() != null ? 
                    u.getAssignedShop().getMorningClose() : "13:00");
                data.put("afternoonOpen", u.getAssignedShop() != null ? 
                    u.getAssignedShop().getAfternoonOpen() : "14:00");
                data.put("afternoonClose", u.getAssignedShop() != null ? 
                    u.getAssignedShop().getAfternoonClose() : "18:00");
                data.put("weeklyHoliday", u.getAssignedShop() != null ? 
                    u.getAssignedShop().getWeeklyHoliday() : "FRIDAY");
                data.put("shopManagerName", u.getAssignedShop() != null ?
                    u.getAssignedShop().getManagerName() : "");
                data.put("isOpen", u.getAssignedShop() != null ?
                    (u.getAssignedShop().getIsOpen() != null ? u.getAssignedShop().getIsOpen() : true) : true);
                data.put("shopIsOpen", u.getAssignedShop() != null ?
                    (u.getAssignedShop().getIsOpen() != null ? u.getAssignedShop().getIsOpen() : true) : true);
                data.put("shopNoticeEn", u.getAssignedShop() != null ?
                    u.getAssignedShop().getNoticeEn() : "");
                data.put("shopNoticeTa", u.getAssignedShop() != null ?
                    u.getAssignedShop().getNoticeTa() : "");
                data.put("closureReason", u.getAssignedShop() != null ?
                    u.getAssignedShop().getClosureReason() : "");
                data.put("shopClosureReason", u.getAssignedShop() != null ?
                    u.getAssignedShop().getClosureReason() : "");
                data.put("govtShopId", u.getGovtShop() != null ?
                    u.getGovtShop().getId() : null);
                data.put("govtShopName", u.getGovtShop() != null ?
                    u.getGovtShop().getName() : "");

                System.out.println("======================");
                return ResponseEntity.ok(Map.of(
                    "success", true, "data", data));
            }

            System.out.println("❌ User not found for: " + rationCardNumber);
            System.out.println("======================");
            return ResponseEntity.ok(Map.of(
                "success", false, "message", "User not found"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                "success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/notifications")
    public ResponseEntity<?> getNotifications(
            @RequestHeader(value="Authorization",
                required=false) String authHeader) {
        try {
            String rationCardNumber = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtUtil.isTokenValid(token)) {
                    rationCardNumber = jwtUtil.extractSubject(token);
                }
            }
            if (rationCardNumber != null) {
                Optional<User> userOpt = userRepository
                    .findByRationCardNumber(
                        rationCardNumber.toUpperCase().trim());
                if (userOpt.isPresent()) {
                    Long userId = userOpt.get().getId();
                    List<Map<String, Object>> result = new ArrayList<>();
                    notificationRepository
                        .findByUserIdOrderBySentAtDesc(userId)
                        .forEach(n -> {
                            Map<String, Object> map = new HashMap<>();
                            map.put("id", n.getId());
                            map.put("title", n.getTitleEn());
                            map.put("titleTa", n.getTitleTa());
                            map.put("msg", n.getMessageEn());
                            map.put("type", n.getType().toString());
                            map.put("read", n.getIsRead());
                            map.put("time", n.getSentAt() != null ?
                                n.getSentAt().toString() : "");
                            result.add(map);
                        });
                    return ResponseEntity.ok(Map.of(
                        "success", true, "data", result));
                }
            }
            return ResponseEntity.ok(Map.of(
                "success", true, "data", List.of()));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "success", false, "data", List.of()));
        }
    }

    @GetMapping("/transactions")
public ResponseEntity<?> getTransactions(
        @RequestHeader(value="Authorization",
            required=false) String authHeader) {
    try {
        String rationCardNumber = null;
        if (authHeader != null &&
            authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.isTokenValid(token)) {
                rationCardNumber = jwtUtil.extractSubject(token);
            }
        }

        if (rationCardNumber != null) {
            String card = rationCardNumber.toUpperCase().trim();
            Optional<User> userOpt =
                userRepository.findByRationCardNumber(card);

            if (userOpt.isPresent()) {
                Long userId = userOpt.get().getId();
                List<Map<String, Object>> result = new ArrayList<>();

                transactionRepository.findByUserIdOrderByTransactionAtDesc(userId)
                    .forEach(tx -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", tx.getId());
                        map.put("ref", tx.getTransactionNumber());
                        map.put("token", tx.getToken() != null
                            ? tx.getToken().getTokenNumber() : "");
                        map.put("shop", tx.getToken() != null
                            && tx.getToken().getShop() != null
                            ? tx.getToken().getShop().getName()
                            : "");
                        map.put("amount", tx.getAmount());
                        map.put("paymentMode", tx.getPaymentMode() != null
                            ? tx.getPaymentMode().toString() : "Cash");
                        map.put("status", tx.getStatus() != null
                            ? tx.getStatus().toString() : "Success");
                        map.put("date", tx.getTransactionAt() != null
                            ? tx.getTransactionAt().toLocalDate().toString()
                            : "");
                        
                        // Add items breakdown
                        List<Map<String, Object>> itemsList = new ArrayList<>();
                        if (tx.getToken() != null) {
                            tokenItemRepository.findByTokenId(tx.getToken().getId())
                                .forEach(ti -> {
                                    Map<String, Object> itemMap = new HashMap<>();
                                    itemMap.put("itemName", ti.getItem().getNameEn());
                                    itemMap.put("itemNameTa", ti.getItem().getNameTa());
                                    itemMap.put("quantity", ti.getQuantity());
                                    itemMap.put("unit", "kg"); // Default unit
                                    itemsList.add(itemMap);
                                });
                        }
                        map.put("items", itemsList);
                        
                        result.add(map);
                    });

                return ResponseEntity.ok(Map.of(
                    "success", true, "data", result));
            }
        }
        return ResponseEntity.ok(Map.of(
            "success", true, "data", List.of()));
    } catch (Exception e) {
        return ResponseEntity.ok(Map.of(
            "success", false, "data", List.of()));
    }
}

    @GetMapping("/members")
    public ResponseEntity<?> getMembers(
            @RequestHeader(value="Authorization",
                required=false) String authHeader) {
        try {
            String rationCardNumber = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtUtil.isTokenValid(token)) {
                    rationCardNumber = jwtUtil.extractSubject(token);
                }
            }

            if (rationCardNumber != null) {
                Optional<User> userOpt = userRepository
                    .findByRationCardNumber(
                        rationCardNumber.toUpperCase().trim());
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    List<Map<String, Object>> result = new ArrayList<>();
                    
                    // 1. First, check the normalized 'members' table
                    List<Member> dbMembers = memberRepository.findByUserId(user.getId());
                    if (dbMembers != null && !dbMembers.isEmpty()) {
                        System.out.println("📦 Found " + dbMembers.size() + " members in DB table.");
                        for (Member m : dbMembers) {
                            Map<String, Object> map = new HashMap<>();
                            map.put("id", m.getId());
                            map.put("name", m.getName());
                            map.put("relation", m.getRelation() != null ? m.getRelation() : (m.getIsHead() ? "Head of Family" : "Member"));
                            map.put("isHead", m.getIsHead());
                            map.put("gender", m.getGender() != null ? m.getGender().toString() : "Other");
                            result.add(map);
                        }
                    } else {
                        // 2. Fallback to parsing the string list for older records
                        System.out.println("⚠️ No members in DB table, falling back to string list.");
                        
                        // Add head of family manually for older records
                        Map<String, Object> head = new HashMap<>();
                        head.put("id", 0);
                        head.put("name", user.getHeadOfFamily());
                        head.put("relation", "Head");
                        head.put("isHead", true);
                        head.put("gender", "Male");
                        result.add(head);

                        if (user.getFamilyMembersList() != null && !user.getFamilyMembersList().isEmpty()) {
                            String rawList = user.getFamilyMembersList().trim();
                            if (rawList.startsWith("[")) {
                                try {
                                    ObjectMapper mapper = new ObjectMapper();
                                    List<Map<String, String>> parsedList = mapper.readValue(rawList, new TypeReference<List<Map<String, String>>>(){});
                                    int memberIdx = 1;
                                    for (Map<String, String> parsed : parsedList) {
                                        String mname = parsed.getOrDefault("name", "Unknown");
                                        if (mname.trim().equalsIgnoreCase(user.getHeadOfFamily().trim())) continue;
                                        Map<String, Object> m = new HashMap<>();
                                        m.put("id", memberIdx++);
                                        m.put("name", mname);
                                        m.put("relation", parsed.getOrDefault("relation", "Member"));
                                        m.put("isHead", false);
                                        m.put("gender", "Other");
                                        m.put("age", parsed.getOrDefault("age", ""));
                                        result.add(m);
                                    }
                                } catch (Exception e) {
                                    System.err.println("Error parsing JSON family members: " + e.getMessage());
                                }
                            } else {
                                String[] members = rawList.split(",");
                                int memberIdx = 1;
                                for (int i = 0; i < members.length; i++) {
                                    String mName = members[i].trim();
                                    if (mName.isEmpty() || mName.equalsIgnoreCase(user.getHeadOfFamily().trim())) continue;
                                    Map<String, Object> m = new HashMap<>();
                                    m.put("id", memberIdx++);
                                    m.put("name", mName);
                                    m.put("relation", "Member");
                                    m.put("isHead", false);
                                    m.put("gender", "Other");
                                    result.add(m);
                                }
                            }
                        }
                    }


                    return ResponseEntity.ok(Map.of(
                        "success", true, "data", result));
                }
            }
            return ResponseEntity.ok(Map.of(
                "success", false, "message", "User not found"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/benefits")
    public ResponseEntity<?> getActiveBenefits() {
        return ResponseEntity.ok(Map.of("success", true, "data", benefitRepository.findByIsActiveTrue()));
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of(
            "success", true, "message", "Marked as read"));
    }

    @PutMapping("/update-shop")
public ResponseEntity<?> updateShop(
        @RequestHeader(value="Authorization",
            required=false) String authHeader,
        @RequestBody Map<String, Object> req) {
    try {
        String rationCard = null;
        if (authHeader != null &&
            authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.isTokenValid(token)) {
                rationCard = jwtUtil.extractSubject(token);
            }
        }

        if (rationCard == null) {
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", "Not authenticated"));
        }

        // Make effectively final for lambda
        final String finalCard = rationCard;
        Long shopId = Long.valueOf(req.get("shopId").toString());

        Optional<User> userOpt = userRepository
            .findByRationCardNumber(finalCard);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            shopRepository.findById(shopId).ifPresent(shop -> {
                user.setAssignedShop(shop);
                userRepository.save(user);
                System.out.println("✅ Shop updated for "
                    + finalCard + " → " + shop.getName());
            });
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Shop updated"));
        }

        return ResponseEntity.ok(Map.of(
            "success", false, "message", "User not found"));

    } catch (Exception e) {
        return ResponseEntity.ok(Map.of(
            "success", false, "message", e.getMessage()));
    }
}
@PutMapping("/profile/update")
public ResponseEntity<?> updateProfile(
        @RequestHeader(value="Authorization",
            required=false) String authHeader,
        @RequestBody Map<String, Object> req) {
    try {
        String rationCard = null;
        if (authHeader != null
                && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.isTokenValid(token)) {
                rationCard = jwtUtil.extractSubject(token);
            }
        }
        if (rationCard == null) {
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", "Not authenticated"));
        }
        final String finalCard = rationCard;
        Optional<User> userOpt = userRepository
            .findByRationCardNumber(finalCard);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (req.containsKey("headOfFamily"))
                user.setHeadOfFamily(
                    req.get("headOfFamily").toString());
            if (req.containsKey("mobileNumber"))
                user.setMobileNumber(
                    req.get("mobileNumber").toString());
            if (req.containsKey("address"))
                user.setAddress(
                    req.get("address").toString());
            if (req.containsKey("pincode"))
                user.setPincode(
                    req.get("pincode").toString());
            if (req.containsKey("district"))
                user.setDistrict(
                    req.get("district").toString());
            userRepository.save(user);
            System.out.println("✅ Profile updated: "
                + finalCard);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Profile updated"));
        }
        return ResponseEntity.ok(Map.of(
            "success", false,
            "message", "User not found"));
    } catch(Exception e) {
        return ResponseEntity.ok(Map.of(
            "success", false,
            "message", e.getMessage()));
    }
}
}