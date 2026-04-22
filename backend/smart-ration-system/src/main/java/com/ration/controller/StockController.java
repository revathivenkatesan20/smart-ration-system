package com.ration.controller;

import com.ration.service.StockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/stock")
public class StockController {

    @Autowired
    private StockService stockService;

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<?> getStockByShop(@PathVariable Long shopId) {
        List<Map<String, Object>> stock = stockService.getStockByShop(shopId);
        return ResponseEntity.ok(Map.of("success", true, "data", stock));
    }

    @GetMapping("/admin/alerts")
    public ResponseEntity<?> getLowStockAlerts() {
        List<Map<String, Object>> alerts = stockService.getLowStockAlerts();
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", alerts,
            "count", alerts.size()
        ));
    }

    @PutMapping("/admin/update")
    public ResponseEntity<?> updateStock(@RequestBody Map<String, Object> req) {
        try {
            Long shopId = Long.valueOf(req.get("shopId").toString());
            Long itemId = Long.valueOf(req.get("itemId").toString());
            int qty = Integer.parseInt(req.get("quantity").toString());
            double threshold = Double.parseDouble(req.get("threshold").toString());
            boolean success = stockService.updateStock(shopId, itemId, qty, threshold);
            return ResponseEntity.ok(Map.of("success", success));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false,
                "message", e.getMessage()));
        }
    }
}
