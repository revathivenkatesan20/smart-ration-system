package com.ration.repository;

import com.ration.model.Stock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {
    List<Stock> findByShopId(Long shopId);
    Optional<Stock> findByShopIdAndItemId(Long shopId, Long itemId);
    List<Stock> findByStatusIn(List<String> statuses);
}