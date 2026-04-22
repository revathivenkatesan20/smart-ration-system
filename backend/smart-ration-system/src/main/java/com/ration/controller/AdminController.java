package com.ration.controller;

import com.ration.model.*;
import com.ration.repository.*;
import com.ration.service.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
public class AdminController {

    @Autowired private ShopRepository shopRepository;
    @Autowired private TokenRepository tokenRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StockRepository stockRepository;
    @Autowired private TokenService tokenService;
    @Autowired private ProcurementRequestRepository procurementRepository;
    @Autowired private AIDistributionService aiService;
    @Autowired private SpecialBenefitRepository benefitRepository;
    @Autowired private ChangeRequestRepository changeRequestRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private AuthService authService;
    @Autowired private FirebaseMessagingService firebaseService;
    @Autowired private AdminRepository adminRepository;

    @GetMapping("/api/admin/ai/balancing")
    public ResponseEntity<?> getBalancingSuggestions() {
        return ResponseEntity.ok(Map.of("success", true, "data", aiService.getRedistributionSuggestions()));
    }

    @PostMapping("/api/admin/ai/execute-redistribution")
    public ResponseEntity<?> executeRedistribution(@RequestBody Map<String, Object> req) {
        try {
            if (req == null) throw new RuntimeException("Invalid request body");
            
            Long requestId = (req.get("requestId") != null) ? Long.valueOf(req.get("requestId").toString()) : null;
            Long sourceShopId = (req.get("sourceShopId") != null) ? Long.valueOf(req.get("sourceShopId").toString()) : null;
            Long targetShopId = (req.get("targetShopId") != null) ? Long.valueOf(req.get("targetShopId").toString()) : null;
            Long itemId = (req.get("itemId") != null) ? Long.valueOf(req.get("itemId").toString()) : null;
            
            if (requestId == null || sourceShopId == null || targetShopId == null || itemId == null) {
                throw new RuntimeException("Missing required parameters (requestId, sourceShopId, targetShopId, itemId)");
            }

            java.math.BigDecimal quantity = (req.get("quantity") != null) 
                ? new java.math.BigDecimal(req.get("quantity").toString()) 
                : java.math.BigDecimal.ZERO;

            aiService.executeRedistribution(requestId, sourceShopId, targetShopId, itemId, quantity);
            return ResponseEntity.ok(Map.of("success", true, "message", "Stock redistributed successfully. Both shops notified."));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", "Redistribution failed: " + e.getMessage()));
        }
    }

    @GetMapping("/api/admin/procurement/pending")
    public ResponseEntity<?> getPendingProcurements() {
        return ResponseEntity.ok(procurementRepository.findByStatus(ProcurementRequest.RequestStatus.Pending));
    }

    @PutMapping("/api/admin/procurement/{id}/approve")
    public ResponseEntity<?> approveProcurement(@PathVariable Long id) {
        try {
            ProcurementRequest pr = procurementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Procurement Request not found"));
            
            if (pr.getStatus() != ProcurementRequest.RequestStatus.Pending) {
                return ResponseEntity.ok(Map.of("success", false, "message", "Request is already " + pr.getStatus()));
            }

            // 1. Update Inventory
            java.util.Optional<com.ration.model.Stock> stockOpt = stockRepository.findAll().stream()
                .filter(s -> s.getShop().getId().equals(pr.getShop().getId()) && 
                            s.getItem().getId().equals(pr.getItem().getId()))
                .findFirst();
            
            if (stockOpt.isPresent()) {
                com.ration.model.Stock stock = stockOpt.get();
                java.math.BigDecimal current = stock.getQuantityAvailable() != null 
                    ? stock.getQuantityAvailable() : java.math.BigDecimal.ZERO;
                stock.setQuantityAvailable(current.add(pr.getRequestedQuantity()));
                stockRepository.save(stock);
                System.out.println("📦 Stock Updated for shop=" + pr.getShop().getName() + " item=" + pr.getItem().getNameEn());
            } else {
                // If no stock record exists for this item/shop combo, create one
                com.ration.model.Stock newStock = new com.ration.model.Stock();
                newStock.setShop(pr.getShop());
                newStock.setItem(pr.getItem());
                newStock.setQuantityAvailable(pr.getRequestedQuantity());
                newStock.setThresholdMin(java.math.BigDecimal.valueOf(50)); // Default threshold
                stockRepository.save(newStock);
            }

            // 2. Update Request Status
            pr.setStatus(ProcurementRequest.RequestStatus.Fulfilled);
            pr.setFulfilledDate(LocalDateTime.now());
            procurementRepository.save(pr);

            // 3. Notify Shop Admin
            try {
                List<com.ration.model.Admin> admins = adminRepository.findByShopId(pr.getShop().getId());
                for (com.ration.model.Admin admin : admins) {
                    if (admin.getFcmToken() != null && !admin.getFcmToken().isEmpty()) {
                        firebaseService.sendNotification(
                            admin.getFcmToken(),
                            "✅ Stock Dispatched!",
                            "Your request for " + pr.getRequestedQuantity() + " " + pr.getItem().getUnit() + " of " + pr.getItem().getNameEn() + " has been fulfilled."
                        );
                    }
                }
            } catch (Exception e) {
                System.err.println("Failed to notify shop admin: " + e.getMessage());
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Procurement fulfilled and stock updated"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PutMapping("/api/admin/procurement/{id}/reject")
    public ResponseEntity<?> rejectProcurement(@PathVariable Long id, @RequestBody(required=false) Map<String, String> body) {
        try {
            ProcurementRequest pr = procurementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Procurement Request not found"));
            
            pr.setStatus(ProcurementRequest.RequestStatus.Cancelled);
            procurementRepository.save(pr);

            // Notify Shop Admin
            String reason = body != null ? body.getOrDefault("remarks", "No reason provided") : "No reason provided";
            try {
                List<com.ration.model.Admin> admins = adminRepository.findByShopId(pr.getShop().getId());
                for (com.ration.model.Admin admin : admins) {
                    if (admin.getFcmToken() != null && !admin.getFcmToken().isEmpty()) {
                        firebaseService.sendNotification(
                            admin.getFcmToken(),
                            "❌ Procurement Rejected",
                            "Request for " + pr.getItem().getNameEn() + " was not approved. Reason: " + reason
                        );
                    }
                }
            } catch (Exception e) {
                System.err.println("Failed to notify shop admin: " + e.getMessage());
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Request cancelled"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/api/admin/ai/insights")
    public ResponseEntity<?> getAiInsights(@RequestParam(required = false) Long shopId) {
        try {
            List<com.ration.model.Token> allTokens = (shopId == null) 
                ? tokenRepository.findAll() 
                : tokenRepository.findAll().stream().filter(t -> t.getShop() != null && t.getShop().getId().equals(shopId)).toList();
                
            List<com.ration.model.Stock> allStock = (shopId == null) 
                ? stockRepository.findAll() 
                : stockRepository.findByShopId(shopId);

            // Demand forecasting logic
            Map<String, Map<String, Object>> demandMap = new HashMap<>();
            allStock.forEach(s -> {
                if (s.getItem() == null) return;
                String name = s.getItem().getNameEn();
                demandMap.putIfAbsent(name, new HashMap<>(Map.of(
                    "item", name, "current", java.math.BigDecimal.ZERO,
                    "predicted", java.math.BigDecimal.ZERO, "unit", s.getItem().getUnit(),
                    "icon", s.getItem().getCategory().equals("Grain") ? "🌾" : 
                            s.getItem().getCategory().equals("Oil") ? "🫙" : 
                            s.getItem().getCategory().equals("Sugar") ? "🍬" : "📦"
                )));
                Map<String, Object> entry = demandMap.get(name);
                entry.put("current", ((java.math.BigDecimal)entry.get("current")).add(s.getQuantityAvailable()));
            });

            // Patterns logic
            Map<String, Long> dayCount = new HashMap<>();
            allTokens.forEach(t -> {
                if (t.getTokenDate() != null) {
                    dayCount.merge(t.getTokenDate().getDayOfWeek().toString(), 1L, Long::sum);
                }
            });

            String peakDay = dayCount.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");

            long totalTokens = allTokens.size();
            long collectedTokens = allTokens.stream()
                .filter(t -> "Collected".equals(t.getStatus().toString()))
                .count();
            long collectionRate = totalTokens == 0 ? 0 : (collectedTokens * 100) / totalTokens;

            Map<String, Object> data = new HashMap<>();
            data.put("demand", new ArrayList<>(demandMap.values()));
            data.put("peakDay", peakDay);
            data.put("tokenFrequencies", dayCount);
            data.put("totalTokens", totalTokens);
            
            // Dynamic actionable recommendations based on system metrics
            String recommendation;
            if (collectionRate < 40) {
                recommendation = "Critical: System-wide collection rate is below 40%. Recommend urgent SMS broadcasts to all registered beneficiaries.";
            } else if (collectionRate < 70) {
                recommendation = "Moderate: Collection rate is at " + collectionRate + "%. Suggestizing weekend stock rebalancing in high-demand urban zones.";
            } else if (peakDay.equals("SATURDAY") || peakDay.equals("SUNDAY")) {
                recommendation = "Optimal: Weekend peak detected. Ensure that logistics providers prioritize friday replenishments for district-level warehouses.";
            } else {
                recommendation = "Stable: Strong system-wide collection patterns observed. " + peakDay + " is the current volume driver.";
            }
            data.put("recommendation", recommendation);

            return ResponseEntity.ok(Map.of("success", true, "data", data));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/api/admin/procurement/fulfill/{requestId}")
    public ResponseEntity<?> fulfillProcurement(@PathVariable Long requestId) {
        try {
            ProcurementRequest pr = procurementRepository.findById(requestId).orElseThrow();
            pr.setStatus(ProcurementRequest.RequestStatus.Fulfilled);
            pr.setFulfilledDate(java.time.LocalDateTime.now());
            procurementRepository.save(pr);
            return ResponseEntity.ok(Map.of("success", true, "message", "Procurement request marked as fulfilled"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/api/admin/simulate-date")
    public ResponseEntity<?> simulateDate(@RequestBody Map<String, String> req) {
        try {
            String dateStr = req.get("date"); // yyyy-MM-dd
            java.time.LocalDate date = java.time.LocalDate.parse(dateStr);
            TokenService.setSimulatedDate(date);
            return ResponseEntity.ok(Map.of("success", true, "message", "System date simulated to " + dateStr));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/api/admin/reset-simulation")
    public ResponseEntity<?> resetSimulation() {
        TokenService.resetSimulation();
        return ResponseEntity.ok(Map.of("success", true, "message", "System date reset to real-time"));
    }

    @GetMapping("/api/admin/benefits")
    public ResponseEntity<?> getAllBenefits() {
        return ResponseEntity.ok(Map.of("success", true, "data", benefitRepository.findAll()));
    }

    @PostMapping("/api/admin/benefits")
    public ResponseEntity<?> upsertBenefit(@RequestBody com.ration.model.SpecialBenefit benefit) {
        if (benefit.getCreatedAt() == null) {
            benefit.setCreatedAt(java.time.LocalDateTime.now());
        }
        benefitRepository.save(benefit);
        return ResponseEntity.ok(Map.of("success", true, "message", "Benefit saved"));
    }

    @PostMapping("/api/admin/benefits/{id}/toggle")
    public ResponseEntity<?> toggleBenefit(@PathVariable Long id) {
        try {
            benefitRepository.findById(id).ifPresent(b -> {
                b.setIsActive(!Boolean.TRUE.equals(b.getIsActive()));
                benefitRepository.save(b);
            });
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false));
        }
    }

    @GetMapping("/api/admin/reports/data")
    public ResponseEntity<?> getReportData(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) Long shopId) {
        try {
            List<com.ration.model.Token> tokens = tokenRepository.findAll();
            
            // Filtering logic
            if (shopId != null) {
                tokens = tokens.stream().filter(t -> t.getShop() != null && t.getShop().getId().equals(shopId)).toList();
            }
            
            List<Map<String, Object>> records = new ArrayList<>();
            java.math.BigDecimal totalRevenue = java.math.BigDecimal.ZERO;
            
            for (com.ration.model.Token t : tokens) {
                Map<String, Object> r = new HashMap<>();
                r.put("date", t.getTokenDate() != null ? t.getTokenDate().toString() : "N/A");
                r.put("token", t.getTokenNumber());
                r.put("shop", t.getShop() != null ? t.getShop().getName() : "Unknown");
                r.put("amount", t.getTotalAmount());
                r.put("status", t.getStatus().toString());
                r.put("mode", t.getPaymentMode() != null ? t.getPaymentMode().toString() : "Cash");
                records.add(r);
                if (t.getTotalAmount() != null) totalRevenue = totalRevenue.add(t.getTotalAmount());
            }

            Map<String, Object> summary = new HashMap<>();
            summary.put("totalTokens", tokens.size());
            summary.put("revenue", totalRevenue);
            summary.put("collected", tokens.stream().filter(t -> "Collected".equals(t.getStatus().toString())).count());
            
            return ResponseEntity.ok(Map.of("success", true, "records", records, "summary", summary));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/api/admin/dashboard")
    public ResponseEntity<?> getDashboard() {
        try {
            long totalUsers = userRepository.count();
            long totalShops = shopRepository.count();
            long totalTokens = tokenRepository.count();
            long lowAlerts = stockRepository
                .findByStatusIn(List.of("Low", "Out of Stock"))
                .size();
            
            // Calculate real monthly revenue
            java.math.BigDecimal revenueMonth = tokenRepository.findAll().stream()
                .filter(t -> "Collected".equals(t.getStatus().toString()))
                .map(t -> t.getTotalAmount() != null ? t.getTotalAmount() : java.math.BigDecimal.ZERO)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

            return ResponseEntity.ok(Map.of("success", true,
                "data", Map.of(
                    "totalUsers", totalUsers,
                    "totalShops", totalShops,
                    "tokensToday", totalTokens,
                    "lowAlerts", lowAlerts,
                    "revenueMonth", revenueMonth
                )));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", true,
                "data", Map.of(
                    "totalUsers", 0, "totalShops", 0,
                    "tokensToday", 0, "lowAlerts", 0,
                    "revenueMonth", 0
                )));
        }
    }

    @GetMapping("/api/admin/users")
    public ResponseEntity<?> getUsers() {
        try {
            List<Map<String, Object>> result = new ArrayList<>();
            userRepository.findAll().forEach(u -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", u.getId());
                map.put("rationCard", u.getRationCardNumber());
                map.put("name", u.getHeadOfFamily() != null
                    ? u.getHeadOfFamily() : "");
                map.put("mobile", u.getMobileNumber() != null
                    ? u.getMobileNumber() : "");
                map.put("cardType", u.getCardType() != null
                    ? u.getCardType() : "PHH");
                map.put("district", u.getDistrict() != null
                    ? u.getDistrict() : "");
                map.put("currentShop", u.getAssignedShop() != null
                    ? u.getAssignedShop().getName()
                    : "Not Assigned");
                map.put("shop", u.getAssignedShop() != null
                    ? u.getAssignedShop().getName()
                    : "Not Assigned");
                map.put("shopName", u.getAssignedShop() != null
                    ? u.getAssignedShop().getName()
                    : "Not Assigned");
                map.put("currentShopId", u.getAssignedShop() != null
                    ? u.getAssignedShop().getId() : null);
                map.put("govtShop", u.getGovtShop() != null
                    ? u.getGovtShop().getName()
                    : "Not assigned");
                map.put("govtShopId", u.getGovtShop() != null
                    ? u.getGovtShop().getId() : null);
                map.put("address", u.getAddress() != null ? u.getAddress() : "");
                map.put("familyMembersList", u.getFamilyMembersList() != null ? u.getFamilyMembersList() : "[]");
                map.put("active", Boolean.TRUE.equals(
                    u.getIsActive()));
                result.add(map);
            });
            return ResponseEntity.ok(Map.of(
                "success", true, "data", result));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                "success", false, "data", List.of(),
                "message", e.getMessage()));
        }
    }

    @PutMapping("/api/admin/users/{id}/toggle")
    public ResponseEntity<?> toggleUser(@PathVariable Long id) {
        try {
            userRepository.findById(id).ifPresent(u -> {
                u.setIsActive(!Boolean.TRUE.equals(u.getIsActive()));
                userRepository.save(u);
            });
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false));
        }
    }

    @PutMapping("/api/admin/users/{id}/update")
    public ResponseEntity<?> updateUserInfo(
            @PathVariable Long id,
            @RequestBody Map<String, Object> req) {
        try {
            Optional<User> userOpt = userRepository.findById(id);
            if (userOpt.isEmpty()) return ResponseEntity.ok(Map.of("success", false, "message", "User not found"));
            
            User u = userOpt.get();
            if (req.containsKey("name")) u.setHeadOfFamily(req.get("name").toString());
            if (req.containsKey("headOfFamily")) u.setHeadOfFamily(req.get("headOfFamily").toString());
            
            if (req.containsKey("mobile")) {
                String newVal = req.get("mobile").toString();
                Optional<User> existing = userRepository.findByMobileNumber(newVal);
                if (existing.isPresent() && !existing.get().getId().equals(u.getId())) {
                    return ResponseEntity.ok(Map.of("success", false, "message", "Registration Error: Mobile number '" + newVal + "' is already active for another ration card."));
                }
                u.setMobileNumber(newVal);
            }

            if (req.containsKey("address")) u.setAddress(req.get("address").toString());
            if (req.containsKey("pincode")) u.setPincode(req.get("pincode").toString());
            if (req.containsKey("district")) u.setDistrict(req.get("district").toString());
            if (req.containsKey("cardType")) u.setCardType(req.get("cardType").toString());
            if (req.containsKey("familyMembersList")) u.setFamilyMembersList(req.get("familyMembersList").toString());
            
            if (req.containsKey("assignedShopId")) {
                try {
                    Long shopId = Long.valueOf(req.get("assignedShopId").toString());
                    shopRepository.findById(shopId).ifPresent(u::setAssignedShop);
                } catch (Exception ignored) {}
            }
            
            userRepository.save(u);
            return ResponseEntity.ok(Map.of("success", true, "message", "User updated by admin"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/api/admin/shops")
    public ResponseEntity<?> getShops() {
        try {
            List<Map<String, Object>> result = new ArrayList<>();
            shopRepository.findAll().forEach(s -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", s.getId());
                map.put("code", s.getShopCode() != null
                    ? s.getShopCode() : "");
                map.put("name", s.getName());
                map.put("district", s.getDistrict() != null
                    ? s.getDistrict() : "");
                map.put("pincode", s.getPincode() != null
                    ? s.getPincode() : "");
                map.put("manager", s.getManagerName() != null
                    ? s.getManagerName() : "");
                map.put("address", s.getAddress() != null
                    ? s.getAddress() : "");
                map.put("phone", s.getContactNumber() != null
                    ? s.getContactNumber() : "");
                map.put("openingTime", s.getOpeningTime());
                map.put("closingTime", s.getClosingTime());
                map.put("morningOpen", s.getMorningOpen());
                map.put("morningClose", s.getMorningClose());
                map.put("afternoonOpen", s.getAfternoonOpen());
                map.put("afternoonClose", s.getAfternoonClose());
                map.put("weeklyHoliday", s.getWeeklyHoliday());
                map.put("active", Boolean.TRUE.equals(s.getIsActive()));
                map.put("isOpen", Boolean.TRUE.equals(s.getIsOpen()));
                map.put("closureReason", s.getClosureReason());
                map.put("latitude", s.getLatitude());
                map.put("longitude", s.getLongitude());
                result.add(map);
            });
            return ResponseEntity.ok(Map.of(
                "success", true, "data", result));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                "success", false, "data", List.of(),
                "message", e.getMessage()));
        }
    }

    @PutMapping("/api/admin/shops/{id}")
    public ResponseEntity<?> updateShop(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        try {
            Shop shop = shopRepository.findById(id).orElseThrow();
            if (req.containsKey("name")) shop.setName(req.get("name").toString());
            if (req.containsKey("manager")) shop.setManagerName(req.get("manager").toString());
            if (req.containsKey("phone")) shop.setContactNumber(req.get("phone").toString());
            if (req.containsKey("address")) shop.setAddress(req.get("address").toString());
            if (req.containsKey("openingTime")) shop.setOpeningTime(req.get("openingTime").toString());
            if (req.containsKey("closingTime")) shop.setClosingTime(req.get("closingTime").toString());
            if (req.containsKey("morningOpen")) shop.setMorningOpen(req.get("morningOpen").toString());
            if (req.containsKey("morningClose")) shop.setMorningClose(req.get("morningClose").toString());
            if (req.containsKey("afternoonOpen")) shop.setAfternoonOpen(req.get("afternoonOpen").toString());
            if (req.containsKey("afternoonClose")) shop.setAfternoonClose(req.get("afternoonClose").toString());
            if (req.containsKey("weeklyHoliday")) shop.setWeeklyHoliday(req.get("weeklyHoliday").toString());
            if (req.containsKey("isOpen")) shop.setIsOpen(Boolean.valueOf(req.get("isOpen").toString()));
            if (req.containsKey("closureReason")) shop.setClosureReason(req.get("closureReason").toString());
            if (req.containsKey("district")) shop.setDistrict(req.get("district").toString());
            if (req.containsKey("pincode")) shop.setPincode(req.get("pincode").toString());
            shopRepository.save(shop);
            return ResponseEntity.ok(Map.of("success", true, "message", "Shop details updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/api/public/shops")
    public ResponseEntity<?> getPublicShops() {
        try {
            List<Map<String, Object>> result = new ArrayList<>();
            shopRepository.findAll().forEach(s -> {
                if (!Boolean.TRUE.equals(s.getIsActive()))
                    return;
                Map<String, Object> map = new HashMap<>();
                map.put("id", s.getId());
                map.put("name", s.getName());
                map.put("address", s.getAddress() != null
                    ? s.getAddress() : "");
                map.put("latitude", s.getLatitude());
                map.put("longitude", s.getLongitude());
                map.put("managerName", s.getManagerName() != null
                    ? s.getManagerName() : "");
                map.put("openingTime", s.getOpeningTime());
                map.put("closingTime", s.getClosingTime());
                map.put("morningOpen", s.getMorningOpen());
                map.put("morningClose", s.getMorningClose());
                map.put("afternoonOpen", s.getAfternoonOpen());
                map.put("afternoonClose", s.getAfternoonClose());
                map.put("isOpen", s.getIsOpen());
                map.put("closureReason", s.getClosureReason());
                map.put("noticeEn", s.getNoticeEn());
                map.put("noticeTa", s.getNoticeTa());
                result.add(map);
            });
            return ResponseEntity.ok(Map.of(
                "success", true, "data", result));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "success", false, "data", List.of()));
        }
    }

    @GetMapping("/api/admin/tokens")
    public ResponseEntity<?> getAllTokens() {
        try {
            List<Map<String, Object>> tokens =
                tokenService.getAllTokens();
            return ResponseEntity.ok(Map.of(
                "success", true, "data", tokens));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                "success", false, "data", List.of(),
                "message", e.getMessage()));
        }
    }

    @GetMapping("/api/admin/stock/all")
    public ResponseEntity<?> getAllStock() {
        try {
            List<Map<String, Object>> result = new ArrayList<>();
            shopRepository.findAll().forEach(shop -> {
                List<Map<String, Object>> items =
                    new ArrayList<>();
                stockRepository.findByShopId(shop.getId())
                    .forEach(s -> {
                        if (s.getItem() == null) return;
                        Map<String, Object> item =
                            new HashMap<>();
                        item.put("id", s.getItem().getId());
                        item.put("stockId", s.getId());
                        item.put("nameEn",
                            s.getItem().getNameEn());
                        item.put("nameTa",
                            s.getItem().getNameTa());
                        item.put("available",
                            s.getQuantityAvailable());
                        item.put("threshold",
                            s.getThresholdMin());
                        item.put("status", StockService.calculateStatus(s));
                        item.put("unit",
                            s.getItem().getUnit());
                        items.add(item);
                    });
                if (!items.isEmpty()) {
                    Map<String, Object> shopMap =
                        new HashMap<>();
                    shopMap.put("shopId", shop.getId());
                    shopMap.put("shop", shop.getName());
                    shopMap.put("items", items);
                    result.add(shopMap);
                }
            });
            return ResponseEntity.ok(Map.of(
                "success", true, "data", result));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                "success", false, "data", List.of(),
                "message", e.getMessage()));
        }
    }

    // =====================================================
    // CHANGE REQUESTS - Admin Management
    // =====================================================

    @GetMapping("/api/admin/change-requests")
    public ResponseEntity<?> getAllChangeRequests(@RequestParam(required=false) String status) {
        try {
            List<ChangeRequest> requests;
            if (status != null && !status.isBlank()) {
                requests = changeRequestRepository.findByStatusOrderByCreatedAtDesc(
                    ChangeRequest.Status.valueOf(status.toUpperCase()));
            } else {
                requests = changeRequestRepository.findAllByOrderByCreatedAtDesc();
            }
            List<Map<String, Object>> result = new ArrayList<>();
            for (ChangeRequest cr : requests) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", cr.getId());
                map.put("userId", cr.getUser().getId());
                map.put("userName", cr.getUser().getHeadOfFamily());
                map.put("rationCard", cr.getUser().getRationCardNumber());
                map.put("mobile", cr.getUser().getMobileNumber());
                map.put("requestType", cr.getRequestType());
                map.put("fieldName", cr.getFieldName());
                map.put("oldValue", cr.getOldValue());
                map.put("newValue", cr.getNewValue());
                map.put("description", cr.getDescription());
                map.put("status", cr.getStatus().name());
                map.put("adminRemarks", cr.getAdminRemarks());
                map.put("createdAt", cr.getCreatedAt() != null ? cr.getCreatedAt().toString() : "");
                map.put("resolvedAt", cr.getResolvedAt() != null ? cr.getResolvedAt().toString() : null);
                result.add(map);
            }
            return ResponseEntity.ok(Map.of("success", true, "data", result));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PutMapping("/api/admin/change-requests/{id}/approve")
    public ResponseEntity<?> approveChangeRequest(
            @PathVariable Long id,
            @RequestBody(required=false) Map<String, Object> body) {
        try {
            ChangeRequest cr = changeRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));
            
            if (cr.getStatus() != ChangeRequest.Status.PENDING) {
                return ResponseEntity.ok(Map.of("success", true, "message", "This request has already been processed."));
            }

            User u = cr.getUser();

            // Apply the change to the user profile
            String type = cr.getRequestType();
            
            // Administrative Correction logic (use modifiedValue if provided by Super Admin)
            String newVal = (body != null && body.containsKey("modifiedValue")) 
                ? body.get("modifiedValue").toString() 
                : cr.getNewValue();

            if (type.equalsIgnoreCase("PHONE")) {
                Optional<User> existing = userRepository.findByMobileNumber(newVal);
                if (existing.isPresent() && !existing.get().getId().equals(u.getId())) {
                    return ResponseEntity.ok(Map.of("success", false, "message", "Duplicate entry: Mobile number '" + newVal + "' is already assigned to another user."));
                }
            }

            switch (type.toUpperCase()) {
                case "PHONE"          -> u.setMobileNumber(newVal);
                case "ADDRESS"        -> u.setAddress(newVal);
                case "NAME", "HEAD_OF_FAMILY" -> u.setHeadOfFamily(newVal);
                case "FAMILY_MEMBER"  -> u.setFamilyMembersList(newVal);
                case "DISTRICT"       -> u.setDistrict(newVal);
                case "PINCODE"        -> u.setPincode(newVal);
                case "CARD_TYPE"      -> u.setCardType(newVal);
                case "ADD_MEMBER"     -> {
                    try {
                        String[] addParts = newVal.split("\\|");
                        String name = addParts.length > 0 ? addParts[0].trim() : newVal;
                        String age = addParts.length > 1 ? addParts[1].trim() : "";
                        List<Map<String, String>> memList = getParsedFamilyMembers(u.getFamilyMembersList());
                        // Prevent duplicates
                        boolean exists = memList.stream().anyMatch(m -> m.getOrDefault("name", "").equalsIgnoreCase(name));
                        if (!exists) {
                            memList.add(new HashMap<>(Map.of("name", name, "relation", "Member", "age", age)));
                            u.setFamilyMembersList(new ObjectMapper().writeValueAsString(memList));
                        }
                    } catch(Exception e) { e.printStackTrace(); }
                }
                case "REMOVE_MEMBER"  -> {
                    try {
                        List<Map<String, String>> memList = getParsedFamilyMembers(u.getFamilyMembersList());
                        memList.removeIf(m -> m.getOrDefault("name", "").equals(newVal.trim()));
                        u.setFamilyMembersList(new ObjectMapper().writeValueAsString(memList));
                    } catch(Exception e) { e.printStackTrace(); }
                }
                case "EDIT_MEMBER"    -> {
                    try {
                        String[] editParts = newVal.split("\\|\\|");
                        String oldName = editParts.length > 0 ? editParts[0].trim() : "";
                        String newName = editParts.length > 1 ? editParts[1].trim() : "";
                        String newAge = editParts.length > 2 ? editParts[2].trim() : "";
                        List<Map<String, String>> memList = getParsedFamilyMembers(u.getFamilyMembersList());
                        for(Map<String, String> m : memList) {
                            if (m.getOrDefault("name", "").equals(oldName)) {
                                if (!newName.isEmpty()) m.put("name", newName);
                                if (!newAge.isEmpty()) m.put("age", newAge);
                                break;
                            }
                        }
                        u.setFamilyMembersList(new ObjectMapper().writeValueAsString(memList));
                    } catch(Exception e) { e.printStackTrace(); }
                }
                default -> {} 
            }
            userRepository.save(u);

            // Update request status
            cr.setStatus(ChangeRequest.Status.APPROVED);
            cr.setResolvedAt(LocalDateTime.now());
            cr.setNewValue(newVal); // Record the final applied value
            if (body != null && body.containsKey("remarks"))
                cr.setAdminRemarks(body.get("remarks").toString());
            changeRequestRepository.save(cr);

            // Send notification to user
            Notification notif = Notification.builder()
                .user(u)
                .titleEn("✅ Change Request Approved")
                .titleTa("✅ மாற்று கோரிக்கை அங்கீகரிக்கப்பட்டது")
                .messageEn("Your request to update '" + cr.getFieldName() + "' has been approved and applied to your profile.")
                .messageTa("உங்கள் '" + cr.getFieldName() + "' மாற்று கோரிக்கை அங்கீகரிக்கப்பட்டு உங்கள் சுயவிவரத்தில் பயன்படுத்தப்பட்டது.")
                .type(Notification.NotifType.System)
                .isRead(false)
                .sentAt(LocalDateTime.now())
                .build();
            notificationRepository.save(notif);
            
            // Send SMS Alert
            try {
                String smsMsg = "✅ Smart Ration: Your change request for '" + cr.getFieldName() + "' has been successfully completed and applied to your profile.";
                authService.sendGeneralSms(u.getMobileNumber(), smsMsg);
            } catch (Exception smsEx) {
                System.err.println("SMS notification failed: " + smsEx.getMessage());
            }

            // Push Notification to User
            if (u.getFcmToken() != null && !u.getFcmToken().isEmpty()) {
                firebaseService.sendNotification(
                    u.getFcmToken(),
                    "✅ Profile Updated",
                    "Your request for '" + cr.getFieldName() + "' was approved and applied."
                );
            }
            
            return ResponseEntity.ok(Map.of("success", true, "message", "Request approved and applied"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    private List<Map<String, String>> getParsedFamilyMembers(String rawList) {
        List<Map<String, String>> memList = new ArrayList<>();
        if (rawList == null || rawList.isBlank()) return memList;
        try {
            if (rawList.trim().startsWith("[")) {
                memList = new ObjectMapper().readValue(rawList, new TypeReference<List<Map<String, String>>>(){});
            } else {
                for(String s : rawList.split(",")) {
                    if(!s.trim().isBlank()) {
                        memList.add(new HashMap<>(Map.of("name", s.trim(), "relation", "Member", "age", "")));
                    }
                }
            }
        } catch(Exception e) { e.printStackTrace(); }
        return memList;
    }

    @PutMapping("/api/admin/change-requests/{id}/reject")
    public ResponseEntity<?> rejectChangeRequest(
            @PathVariable Long id,
            @RequestBody(required=false) Map<String, Object> body) {
        try {
            ChangeRequest cr = changeRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));

            cr.setStatus(ChangeRequest.Status.REJECTED);
            cr.setResolvedAt(LocalDateTime.now());
            if (body != null && body.containsKey("remarks"))
                cr.setAdminRemarks(body.get("remarks").toString());
            changeRequestRepository.save(cr);

            // Notify user
            Notification notif = Notification.builder()
                .user(cr.getUser())
                .titleEn("❌ Change Request Rejected")
                .titleTa("❌ மாற்று கோரிக்கை நிராகரிக்கப்பட்டது")
                .messageEn("Your request to update '" + cr.getFieldName() + "' was not approved. Reason: "
                    + (body != null ? body.getOrDefault("remarks", "No reason provided") : "No reason provided"))
                .messageTa("உங்கள் '" + cr.getFieldName() + "' மாற்று கோரிக்கை நிராகரிக்கப்பட்டது.")
                .type(Notification.NotifType.System)
                .isRead(false)
                .sentAt(LocalDateTime.now())
                .build();
            notificationRepository.save(notif);
            
            // Send SMS Alert
            try {
                String reason = (body != null ? body.getOrDefault("remarks", "No reason provided").toString() : "No reason provided");
                String smsMsg = "❌ Smart Ration: Your change request for '" + cr.getFieldName() + "' was rejected. Reason: " + reason;
                authService.sendGeneralSms(cr.getUser().getMobileNumber(), smsMsg);
            } catch (Exception smsEx) {
                System.err.println("SMS notification failed: " + smsEx.getMessage());
            }

            // Push Notification to User
            if (cr.getUser().getFcmToken() != null && !cr.getUser().getFcmToken().isEmpty()) {
                firebaseService.sendNotification(
                    cr.getUser().getFcmToken(),
                    "❌ Change Request Rejected",
                    "Profile update for '" + cr.getFieldName() + "' was not approved."
                );
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Request rejected"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }
}