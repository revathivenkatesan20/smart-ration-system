package com.ration.repository;

import com.ration.model.ChangeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChangeRequestRepository extends JpaRepository<ChangeRequest, Long> {
    List<ChangeRequest> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<ChangeRequest> findByStatusOrderByCreatedAtDesc(ChangeRequest.Status status);
    List<ChangeRequest> findAllByOrderByCreatedAtDesc();
}
