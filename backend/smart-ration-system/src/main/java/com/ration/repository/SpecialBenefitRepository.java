package com.ration.repository;

import com.ration.model.SpecialBenefit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SpecialBenefitRepository extends JpaRepository<SpecialBenefit, Long> {
    List<SpecialBenefit> findByIsActiveTrue();
}
