package com.ration.controller;

import com.ration.model.*;
import com.ration.repository.*;
import com.ration.security.JwtUtil;
import com.ration.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired private JwtUtil jwtUtil;
    @Autowired private AuthService authService;
    @Autowired private UserRepository userRepository;
    @Autowired private ShopRepository shopRepository;
    @Autowired private ItemRepository itemRepository;
@Autowired private StockRepository stockRepository;
    @Autowired private MemberRepository memberRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @PostMapping("/user/send-otp")
    public ResponseEntity<?> sendOtp(
            @RequestBody Map<String, String> req) {
        try {
            String rationCardNumber = req.get("rationCardNumber");
            if (rationCardNumber == null || !userRepository.findByRationCardNumber(rationCardNumber).isPresent()) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "This Ration Card is not registered. Please register first."
                ));
            }

            String otp = authService.sendOtp(
                rationCardNumber,
                req.get("mobileNumber")
            );
            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("message", "OTP sent successfully");
            if (authService.isDebugMode() && otp != null) {
                resp.put("otp", otp);
            }
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", e.getMessage() != null ? e.getMessage() : "Failed to send OTP. Please try again later."
            ));
        }
    }

    @PostMapping("/user/verify-otp")
    public ResponseEntity<?> verifyOtp(
            @RequestBody Map<String, String> req) {
        try {
            String rationCardNumber = req.get("rationCardNumber");
            String mobileNumber = req.get("mobileNumber");
            String otp = req.get("otp");

            String token = authService.verifyOtp(rationCardNumber, mobileNumber, otp);

            // null token means user not found in the database
            if (token == null) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "No registered account found for this Ration Card. Please register first."
                ));
            }

            String name = authService.getUserName(rationCardNumber);
            Long id = authService.getUserId(rationCardNumber);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of(
                    "token", token,
                    "role", "USER",
                    "rationCardNumber", rationCardNumber,
                    "name", name,
                    "id", id
                )
            ));
        } catch (RuntimeException e) {
            // OTP invalid / expired etc.
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", e.getMessage() != null ? e.getMessage() : "Invalid OTP or Ration Card. Please try again."
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", "Verification failed. Please check your Ration Card number and try again."
            ));
        }
    }

    @PostMapping("/admin/login")
    public ResponseEntity<?> adminLogin(
            @RequestBody Map<String, String> req) {
        String username = req.getOrDefault("username", "");
        String password = req.getOrDefault("password", "");
        
        // In production, this would check against a secure admin table or highly secured property.
        // For development, we match against the secure hash of the default admin password.
        boolean isAdmin = "superadmin".equals(username) && 
                         passwordEncoder.matches(password, passwordEncoder.encode("admin@123"));

        if (isAdmin) {
            String token = jwtUtil.generateToken(username, "ADMIN", 1L);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of(
                    "token", token,
                    "role", "ADMIN",
                    "name", "Super Admin",
                    "id", 1
                )
            ));
        }
        return ResponseEntity.status(401).body(Map.of(
            "success", false,
            "message", "Invalid credentials"
        ));
    }

    @Transactional
    @PostMapping("/register")
    public ResponseEntity<?> register(
        @RequestBody Map<String, Object> req) {
    try {
        String card = req.getOrDefault(
            "rationCardNumber", "").toString().trim();
        String mobile = req.getOrDefault(
            "mobileNumber", "").toString().trim();
        String name = req.getOrDefault(
            "headOfFamily", "").toString().trim();
        String address = req.getOrDefault(
            "address", "").toString().trim();
        String pincode = req.getOrDefault(
            "pincode", "600001").toString().trim();
        String district = req.getOrDefault(
            "district", "Chengalpattu").toString();
        String cardType = req.getOrDefault(
            "cardType", "PHH").toString();
        Long govtShopId = Long.valueOf(
            req.getOrDefault("govtShopId", "4").toString());
        Long currentShopId = Long.valueOf(
            req.getOrDefault("shopId", req.getOrDefault("currentShopId", govtShopId.toString())).toString());
        
        // New family fields
        Integer totalCount = Integer.valueOf(req.getOrDefault("totalMembers", "1").toString());
        Integer gasCylinders = Integer.valueOf(req.getOrDefault("gasCylinders", "0").toString());
        Boolean isUrban = Boolean.TRUE.equals(req.get("isUrban"));
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> memberData = (List<Map<String, Object>>) req.getOrDefault("familyMembers", new ArrayList<>());
        
        String membersSummary = memberData != null ? 
            memberData.stream()
                .map(m -> m.get("name") != null ? m.get("name").toString() : "")
                .collect(Collectors.joining(", ")) : "";

        String headGender = req.getOrDefault("headGender", "Male").toString();
        String headAadhaar = req.getOrDefault("headAadhaar", req.getOrDefault("aadharNumber", "")).toString();
        Integer headAge = 40; // Default
        try {
            headAge = Integer.valueOf(req.getOrDefault("headAge", "40").toString());
        } catch (Exception ignored) {}
        
        System.out.println("📝 Register: " + card
            + " / " + mobile + " / " + name 
            + " / Gender: " + headGender + " / Age: " + headAge
            + " / Members Count: " + totalCount 
            + " / Gas: " + gasCylinders + " / Urban: " + isUrban);


        // Validate 12-digit number
        if (!card.matches("\\d{12}")) {
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", "Invalid ration card. "
                    + "Must be exactly 12 digits."
            ));
        }

        // Check if already registered
        Optional<User> existing =
            userRepository.findByRationCardNumber(card);
        if (existing.isPresent()
                && existing.get().getMobileNumber() != null
                && !existing.get().getMobileNumber().isEmpty()) {
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", "This ration card is already "
                    + "registered. Please login."
            ));
        }

        // Find shops
        Shop govtShop = shopRepository.findById(govtShopId)
            .orElse(shopRepository.findAll().get(0));
        Shop currentShop = shopRepository.findById(currentShopId)
            .orElse(govtShop);

        // Set safe defaults for nullable fields
        if (pincode == null || pincode.isEmpty()) {
            pincode = "600001";
        }
        if (address == null || address.isEmpty()) {
            address = "Tamil Nadu";
        }

        // Create or update user
        User user = existing.orElse(new User());
        user.setRationCardNumber(card);
        user.setMobileNumber(mobile);
        user.setHeadOfFamily(name);
        user.setAddress(address);
        user.setPincode(pincode);
        user.setDistrict(district);
        user.setCardType(cardType);
        user.setAssignedShop(currentShop);
        user.setGovtShop(govtShop);
        user.setIsActive(true);
        user.setTotalMembers(totalCount);
        user.setFamilyMembersList(membersSummary);
        user.setGasCylinders(gasCylinders);
        user.setIsUrban(isUrban);
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(LocalDateTime.now());
        }

        // Generate OTP
        String otp = String.format("%06d",
            new Random().nextInt(999999));
        user.setOtpCode(otp);
        user.setOtpExpiry(
            LocalDateTime.now().plusMinutes(10));

        // Use saveAndFlush to ensure ID is available for member deletions
        user = userRepository.saveAndFlush(user);

        // Normalized data persistence: save members to the 'members' table
        try {
            // 1. Clear existing members for this user to avoid duplicates on re-registration
            memberRepository.deleteByUserId(user.getId());

            // 2. Add Head of Family as a member
            Member head = Member.builder()
                .user(user)
                .name(user.getHeadOfFamily())
                .age(headAge)
                .gender(Member.Gender.valueOf(headGender))
                .aadhaarNumber(headAadhaar)
                .isHead(true)
                .relation("Head of Family")
                .createdAt(LocalDateTime.now())
                .build();
            memberRepository.save(head);

            // 3. Add other family members with deduplication
            if (memberData != null) {
                Set<String> processedMembers = new HashSet<>();
                processedMembers.add(user.getHeadOfFamily().toLowerCase());
                
                if (user.getHeadOfFamily() != null) {
                    processedMembers.add(user.getHeadOfFamily().toLowerCase());
                }

                for (Map<String, Object> mObj : memberData) {
                    String mName = mObj.getOrDefault("name", "").toString().trim();
                    if (mName.isEmpty() || processedMembers.contains(mName.toLowerCase())) {
                        System.out.println("⏭️ Skipping duplicate or empty member: " + mName);
                        continue;
                    }
                    
                    Integer mAge = 30; // Default
                    try {
                        mAge = Integer.valueOf(mObj.getOrDefault("age", "30").toString());
                    } catch (Exception ignored) {}

                    String mGender = mObj.getOrDefault("gender", "Male").toString();
                    String mAadhaar = mObj.getOrDefault("aadhaar", mObj.getOrDefault("aadhar", "")).toString();

                    Member m = Member.builder()
                        .user(user)
                        .name(mName)
                        .age(mAge)
                        .gender(Member.Gender.valueOf(mGender))
                        .aadhaarNumber(mAadhaar)
                        .isHead(false)
                        .relation(mObj.getOrDefault("relation", "Family Member").toString())
                        .createdAt(LocalDateTime.now())
                        .build();
                    memberRepository.save(m);
                    processedMembers.add(mName.toLowerCase());
                }
            }
            System.out.println("👨‍👩‍👧‍👦 Members saved to 'members' table.");
        } catch (Exception e) {
            System.out.println("⚠️ Member persistence error: " + e.getMessage());
        }

        // Log registration without exposing full OTP in production
        logger.info("New registration attempt for card: " + card);

        // Auto-allocate stock to shops
try {
    List<Shop> targetShops = new ArrayList<>();
    targetShops.add(govtShop);
    if (!currentShop.getId().equals(govtShop.getId())) {
        targetShops.add(currentShop);
    }
    
    itemRepository.findAll().forEach(item -> {
        for (Shop s_target : targetShops) {
            boolean stockExists = stockRepository
                .findByShopId(s_target.getId()).stream()
                .anyMatch(s -> s.getItem() != null
                    && s.getItem().getId()
                        .equals(item.getId()));
            if (!stockExists) {
                Stock s = new Stock();
                s.setShop(s_target);
                s.setItem(item);
                s.setQuantityAvailable(new java.math.BigDecimal("500"));
                s.setThresholdMin(new java.math.BigDecimal("50"));
                stockRepository.save(s);
                System.out.println("📦 Stock added: "
                    + item.getNameEn()
                    + " → " + s_target.getName());
            }
        }
    });
} catch(Exception stockErr) {
    System.out.println("Stock alloc note: "
        + stockErr.getMessage());
}

        // Send OTP
        authService.sendRegistrationOtp(mobile, otp);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "OTP sent to your mobile");
        resp.put("govtShopName", govtShop.getName());
        resp.put("govtShopId", govtShop.getId());
        resp.put("shopName", currentShop.getName());
        resp.put("shopId", currentShop.getId());
        if (authService.isDebugMode()) {
            resp.put("otp", otp);
        }
        return ResponseEntity.ok(resp);

    } catch (Exception e) {
        e.printStackTrace();
        return ResponseEntity.ok(Map.of(
            "success", false,
            "message", "Registration failed: "
                + e.getMessage()
        ));
    }
}

    @PostMapping("/verify-registration")
    public ResponseEntity<?> verifyRegistration(
            @RequestBody Map<String, String> req) {
        try {
            String card = req.getOrDefault(
                "rationCardNumber", "").trim();
            String mobile = req.getOrDefault(
                "mobileNumber", "").trim();
            String otp = req.getOrDefault("otp", "");

            Optional<User> userOpt = userRepository
                .findByRationCardNumberAndMobileNumber(
                    card, mobile);

            if (userOpt.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "User not found"
                ));
            }

            User user = userOpt.get();
            System.out.println("Verify OTP: stored="
                + user.getOtpCode() + " entered=" + otp);

            // Clear OTP
            user.setOtpCode(null);
            user.setOtpExpiry(null);
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);

            String token = jwtUtil.generateToken(
                card, "USER", user.getId());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of(
                    "token", token,
                    "role", "USER",
                    "rationCardNumber", card,
                    "name", user.getHeadOfFamily() != null
                        ? user.getHeadOfFamily() : "User",
                    "id", user.getId(),
                    "shopName",
                        user.getAssignedShop() != null
                        ? user.getAssignedShop().getName()
                        : "",
                    "govtShopName",
                        user.getGovtShop() != null
                        ? user.getGovtShop().getName()
                        : ""
                )
            ));

        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    @PostMapping("/update-fcm-token")
    @Transactional
    public ResponseEntity<?> updateFcmToken(@RequestBody Map<String, String> req) {
        String rationCardNumber = req.get("rationCardNumber");
        String fcmToken = req.get("fcmToken");
        
        return userRepository.findByRationCardNumber(rationCardNumber)
            .map(user -> {
                user.setFcmToken(fcmToken);
                userRepository.save(user);
                return ResponseEntity.ok(Map.of("success", true, "message", "FCM token updated"));
            })
            .orElse(ResponseEntity.ok(Map.of("success", false, "message", "User not found")));
    }
}