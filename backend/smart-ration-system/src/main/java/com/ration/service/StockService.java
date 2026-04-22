package com.ration.service;

import com.ration.model.*;
import com.ration.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class StockService {

    @Autowired
    private StockRepository stockRepository;
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private NudgeService nudgeService;

    public List<Map<String, Object>> getStockByShop(Long shopId) {
        try {
            List<Stock> stockList = stockRepository.findByShopId(shopId);
            List<Map<String, Object>> result = new ArrayList<>();

            for (Stock s : stockList) {
                if (s.getItem() == null) continue;
                Map<String, Object> item = new HashMap<>();
                item.put("stockId",           s.getId());
                item.put("itemId",            s.getItem().getId());
                item.put("itemCode",          s.getItem().getItemCode());
                item.put("nameEn",            s.getItem().getNameEn());
                item.put("nameTa",            s.getItem().getNameTa());
                item.put("category",          s.getItem().getCategory() != null ?
                    s.getItem().getCategory().toString() : "Other");
                item.put("unit",              s.getItem().getUnit());
                item.put("subsidyPrice",      s.getItem().getSubsidyPrice());
                item.put("pricePerUnit",      s.getItem().getPricePerUnit());
                item.put("quantityAvailable", s.getQuantityAvailable());
                item.put("monthlyEntitlement",s.getItem().getMonthlyEntitlement());
                item.put("status", calculateStatus(s));
                item.put("thresholdMin",      s.getThresholdMin());
                result.add(item);
            }
            System.out.println("✅ Stock loaded: " + result.size()
                + " items for shop " + shopId);
            return result;
        } catch (Exception e) {
            System.out.println("StockService error: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public List<Map<String, Object>> getLowStockAlerts() {
        try {
            List<Stock> allStock = stockRepository.findAll();
            List<Map<String, Object>> result = new ArrayList<>();

            for (Stock s : allStock) {
                if (s.getItem() == null || s.getShop() == null) continue;
                String status = calculateStatus(s);
                if ("Low".equals(status) || "Out of Stock".equals(status)) {
                    Map<String, Object> alert = new HashMap<>();
                    alert.put("stockId",   s.getId());
                    alert.put("shopId",    s.getShop().getId());
                    alert.put("shopName",  s.getShop().getName());
                    alert.put("itemId",    s.getItem().getId());
                    alert.put("itemName",  s.getItem().getNameEn());
                    alert.put("itemNameTa",s.getItem().getNameTa());
                    alert.put("quantity",  s.getQuantityAvailable());
                    alert.put("threshold", s.getThresholdMin());
                    alert.put("status",    status);
                    alert.put("unit",      s.getItem().getUnit());
                    result.add(alert);
                }
            }
            System.out.println("⚠️ Low stock alerts: " + result.size());
            return result;
        } catch (Exception e) {
            System.out.println("getLowStockAlerts error: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public boolean updateStock(Long shopId, Long itemId,
                               int addQty, double threshold) {
        try {
            stockRepository.findByShopIdAndItemId(shopId, itemId)
                .ifPresent(stock -> {
                    String oldStatus = stock.getStatus();
                    
                    stock.setQuantityAvailable(
                        stock.getQuantityAvailable()
                            .add(BigDecimal.valueOf(addQty)));
                    stock.setThresholdMin(BigDecimal.valueOf(threshold));
                    stock.setLastRestockedAt(LocalDateTime.now());
                    stock.setLastRestockedQuantity(BigDecimal.valueOf(addQty));
                    updateStockStatus(stock);
                    stockRepository.saveAndFlush(stock);
                    
                    System.out.println("✅ Stock updated shop="
                        + shopId + " item=" + itemId);

                    // Restock notification if status changed from Out of Stock to Available
                    if ("Out of Stock".equals(oldStatus) && addQty > 0) {
                        triggerRestockNotification(stock);
                    }
                    
                    // Nudge if status is now Low
                    if ("Low".equals(stock.getStatus())) {
                        nudgeService.sendLowStockNudges(stock);
                    }
                });
            return true;
        } catch (Exception e) {
            System.out.println("updateStock error: " + e.getMessage());
            return false;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void decreaseStock(Long shopId, Long itemId, BigDecimal qty) {
        try {
            stockRepository.findByShopIdAndItemId(shopId, itemId).ifPresent(stock -> {
                stock.setQuantityAvailable(stock.getQuantityAvailable().subtract(qty));
                updateStockStatus(stock);
                stockRepository.saveAndFlush(stock);
                System.out.println("📉 Stock decreased: " + stock.getItem().getNameEn() + " -" + qty);
                
                if ("Low".equals(stock.getStatus())) {
                    nudgeService.sendLowStockNudges(stock);
                }
            });
        } catch (Exception e) {
            System.out.println("decreaseStock error: " + e.getMessage());
        }
    }

    private void triggerRestockNotification(Stock stock) {
        try {
            Long shopId = stock.getShop().getId();
            List<User> shopUsers = userRepository.findByAssignedShopId(shopId);
            
            String itemName = stock.getItem().getNameEn();
            String itemNameTa = stock.getItem().getNameTa();
            
            for (User user : shopUsers) {
                Notification n = new Notification();
                n.setUser(user);
                n.setTitleEn("Restock Alert! 📦");
                n.setTitleTa("சரக்கு இருப்பு புதுப்பிப்பு! 📦");
                n.setMessageEn(itemName + " is now back in stock at " + stock.getShop().getName());
                n.setMessageTa(itemNameTa + " இப்போது இருப்பில் உள்ளது.");
                n.setType(Notification.NotifType.Stock);
                n.setSentAt(LocalDateTime.now());
                notificationRepository.save(n);
            }
            System.out.println("🔔 Restock notifications sent to " + shopUsers.size() + " users");
        } catch (Exception e) {
            System.out.println("Restock notification error: " + e.getMessage());
        }
    }
    
    private void updateStockStatus(Stock s) {
        s.setStatus(calculateStatus(s));
    }

    public static String calculateStatus(Stock s) {
        if (s.getQuantityAvailable() == null || s.getQuantityAvailable().compareTo(BigDecimal.ZERO) <= 0) {
            return "Out of Stock";
        } else if (s.getThresholdMin() != null && s.getQuantityAvailable().compareTo(s.getThresholdMin()) < 0) {
            return "Low";
        } else {
            return "Available";
        }
    }
}
