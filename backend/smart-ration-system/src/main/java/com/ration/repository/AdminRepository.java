package com.ration.repository;

import com.ration.model.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface AdminRepository extends JpaRepository<Admin, Long> {
    Optional<Admin> findByUsername(String username);
    List<Admin> findByShopId(Long shopId);
    List<Admin> findByRole(Admin.AdminRole role);
}
