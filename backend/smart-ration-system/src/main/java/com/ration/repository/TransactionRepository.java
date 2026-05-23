package com.ration.repository;

import com.ration.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    @EntityGraph(attributePaths = {"token", "user"})
    List<Transaction> findByUserIdOrderByTransactionAtDesc(Long userId);

    @EntityGraph(attributePaths = {"token", "user"})
    List<Transaction> findByTokenId(Long tokenId);

    @EntityGraph(attributePaths = {"token", "user"})
    List<Transaction> findAllByOrderByTransactionAtDesc();
}