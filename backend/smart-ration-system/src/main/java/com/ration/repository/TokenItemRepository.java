package com.ration.repository;

import com.ration.model.TokenItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TokenItemRepository extends JpaRepository<TokenItem, Long> {
    List<TokenItem> findByTokenId(Long tokenId);
    List<TokenItem> findByTokenIdIn(List<Long> tokenIds);
}