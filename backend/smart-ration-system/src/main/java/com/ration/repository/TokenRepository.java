package com.ration.repository;

import com.ration.model.Token;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TokenRepository
        extends JpaRepository<Token, Long> {

    Optional<Token> findByTokenNumber(String tokenNumber);

    List<Token> findByRationCardNumberOrderByCreatedAtDesc(
        String rationCardNumber);

    @Query("SELECT t FROM Token t ORDER BY t.createdAt DESC")
    List<Token> findAllOrderByCreatedAtDesc();

    List<Token> findByRationCardNumberAndTokenDateBetween(
        String rationCardNumber, java.time.LocalDate start, java.time.LocalDate end);

    List<Token> findByShopId(Long shopId);

    long countByShopIdAndTokenDate(Long shopId, java.time.LocalDate tokenDate);
    
    long countByRationCardNumber(String rationCardNumber);
}