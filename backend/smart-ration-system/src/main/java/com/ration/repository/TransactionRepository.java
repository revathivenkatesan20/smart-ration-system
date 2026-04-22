package com.ration.repository;

import com.ration.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserIdOrderByTransactionAtDesc(Long userId);
    List<Transaction> findByTokenId(Long tokenId);
    List<Transaction> findAllByOrderByTransactionAtDesc();
}