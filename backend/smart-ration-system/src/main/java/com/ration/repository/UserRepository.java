package com.ration.repository;

import com.ration.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository
        extends JpaRepository<User, Long> {

    Optional<User> findByRationCardNumber(
        String rationCardNumber);

    Optional<User> findByRationCardNumberAndMobileNumber(
        String rationCardNumber, String mobileNumber);

    Optional<User> findByMobileNumber(String mobileNumber);

    List<User> findByAssignedShopId(Long shopId);
}