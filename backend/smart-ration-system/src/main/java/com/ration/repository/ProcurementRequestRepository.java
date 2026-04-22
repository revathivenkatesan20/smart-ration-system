package com.ration.repository;

import com.ration.model.ProcurementRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProcurementRequestRepository extends JpaRepository<ProcurementRequest, Long> {
    List<ProcurementRequest> findByStatus(ProcurementRequest.RequestStatus status);
    List<ProcurementRequest> findByShopIdAndStatus(Long shopId, ProcurementRequest.RequestStatus status);
}
