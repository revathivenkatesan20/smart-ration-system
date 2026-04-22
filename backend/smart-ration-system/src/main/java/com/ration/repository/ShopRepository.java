package com.ration.repository;

import com.ration.model.Shop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ShopRepository extends JpaRepository<Shop, Long> {
    List<Shop> findByIsActiveTrue();
    List<Shop> findByPincode(String pincode);
    java.util.Optional<Shop> findByShopCode(String shopCode);
}