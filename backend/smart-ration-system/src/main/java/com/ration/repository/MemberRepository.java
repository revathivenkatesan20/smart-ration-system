package com.ration.repository;

import com.ration.model.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import jakarta.transaction.Transactional;
import java.util.List;

@Repository
public interface MemberRepository extends JpaRepository<Member, Long> {
    List<Member> findByUserId(Long userId);
    @Modifying
    @Transactional
    @Query("DELETE FROM Member m WHERE m.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}