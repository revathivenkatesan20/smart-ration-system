package com.ration.service;

import com.ration.model.*;
import com.ration.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AIDistributionService {

    @Autowired private StockRepository stockRepository;
    @Autowired private ProcurementRequestRepository procurementRepository;
    @Autowired private AdminRepository adminRepository;
    @Autowired private FirebaseMessagingService firebaseService;

    /**
     * Analyzes procurement requests and identifies shops with excess stock
     * that can fulfill these requests, optimizing local distribution.
     */
    public List<Map<String, Object>> getRedistributionSuggestions() {
        List<Map<String, Object>> suggestions = new ArrayList<>();
        
        // 1. Get all pending procurement requests
        List<ProcurementRequest> pendingRequests = procurementRepository.findByStatus(ProcurementRequest.RequestStatus.Pending);
        
        // 2. Get all stock records
        List<Stock> allStock = stockRepository.findAll();

        for (ProcurementRequest request : pendingRequests) {
            Item item = request.getItem();
            BigDecimal needed = request.getRequestedQuantity();
            
            // 3. Find other shops with high stock of the same item
            // Criteria: Stock > 2x the threshold
            List<Stock> sources = allStock.stream()
                .filter(s -> s.getItem().getId().equals(item.getId()))
                .filter(s -> !s.getShop().getId().equals(request.getShop().getId()))
                .filter(s -> s.getQuantityAvailable().compareTo(s.getThresholdMin().multiply(new BigDecimal("2"))) > 0)
                .sorted((a, b) -> b.getQuantityAvailable().compareTo(a.getQuantityAvailable()))
                .collect(Collectors.toList());

            if (!sources.isEmpty()) {
                Stock bestSource = sources.get(0);
                Map<String, Object> suggestion = new HashMap<>();
                suggestion.put("requestId", request.getId());
                suggestion.put("itemId", item.getId());
                suggestion.put("itemNameEn", item.getNameEn());
                suggestion.put("requestedQty", needed);
                suggestion.put("targetShopId", request.getShop().getId());
                suggestion.put("targetShopName", request.getShop().getName());
                suggestion.put("sourceShopId", bestSource.getShop().getId());
                suggestion.put("sourceShopName", bestSource.getShop().getName());
                suggestion.put("sourceAvailable", bestSource.getQuantityAvailable());
                suggestion.put("optimizationType", "Inter-Shop Transfer");
                suggestion.put("reason", "Excess stock identified in neighboring shop.");
                suggestions.add(suggestion);
            }
        }
        
        return suggestions;
    }

    @jakarta.transaction.Transactional
    public void executeRedistribution(Long requestId, Long sourceShopId, Long targetShopId, Long itemId, BigDecimal quantity) {
        // 1. Update Source Shop (Decrease)
        Optional<Stock> sourceStock = stockRepository.findByShopId(sourceShopId).stream()
            .filter(s -> s.getItem().getId().equals(itemId)).findFirst();
        if (sourceStock.isPresent()) {
            Stock s = sourceStock.get();
            s.setQuantityAvailable(s.getQuantityAvailable().subtract(quantity));
            stockRepository.save(s);
        }

        // 2. Update Target Shop (Increase)
        Optional<Stock> targetStock = stockRepository.findByShopId(targetShopId).stream()
            .filter(s -> s.getItem().getId().equals(itemId)).findFirst();
        if (targetStock.isPresent()) {
            Stock s = targetStock.get();
            s.setQuantityAvailable(s.getQuantityAvailable().add(quantity));
            stockRepository.save(s);
        }

        // 3. Fulfill Procurement Request
        procurementRepository.findById(requestId).ifPresent(pr -> {
            pr.setStatus(ProcurementRequest.RequestStatus.Fulfilled);
            pr.setFulfilledDate(java.time.LocalDateTime.now());
            procurementRepository.save(pr);
        });

        // 4. Notify both Admins
        notifyShopAdmins(sourceShopId, "🚨 Stock Transfer (Out)", quantity + " units being moved to help fulfill demand at another shop.");
        notifyShopAdmins(targetShopId, "✅ Stock Transfer (In)", quantity + " units receiving from a source shop cluster.");
    }

    private void notifyShopAdmins(Long shopId, String title, String msg) {
        try {
            List<Admin> admins = adminRepository.findByShopId(shopId);
            for (Admin admin : admins) {
                if (admin.getFcmToken() != null && !admin.getFcmToken().isEmpty()) {
                    firebaseService.sendNotification(admin.getFcmToken(), title, msg);
                }
            }
        } catch (Exception e) {
            System.err.println("Failed AI redistribution notification: " + e.getMessage());
        }
    }
}
