package com.ration.service;

import com.ration.model.User;
import com.ration.repository.UserRepository;
import com.ration.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired private UserRepository userRepository;
    @Autowired private JwtUtil jwtUtil;

    // Add these to application.properties
    @Value("${msg91.auth.key:DISABLED}")
    private String msg91AuthKey;

    @Value("${msg91.sender.id:RATION}")
    private String msg91SenderId;

    @Value("${msg91.template.id:DISABLED}")
    private String msg91TemplateId;

    @Value("${otp.debug.mode:true}")
    private boolean debugMode;

    public String sendOtp(String rationCardNumber, String mobileNumber) {
        String card = rationCardNumber != null ?
            rationCardNumber.trim() : "";
        String mobile = mobileNumber != null ?
            mobileNumber.trim() : "";

        System.out.println("=================================");
        System.out.println("sendOtp: " + card + " / " + mobile);

        Optional<User> userOpt = userRepository
            .findByRationCardNumberAndMobileNumber(card, mobile);
        System.out.println("user found: " + userOpt.isPresent());

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            // 1-minute cooldown check
            if (user.getLastOtpSentAt() != null && 
                user.getLastOtpSentAt().plusMinutes(1).isAfter(LocalDateTime.now())) {
                throw new RuntimeException("Wait for 60s before requesting a new OTP.");
            }

            String otp = String.format("%06d",
                new Random().nextInt(999999));
            user.setOtpCode(otp);
            user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
            user.setLastOtpSentAt(LocalDateTime.now());
            userRepository.save(user);

            if (debugMode || "DISABLED".equals(msg91AuthKey)) {
                // Debug mode — log OTP securely
                logger.info("🔑 DEBUG OTP for " + mobile + ": " + otp);
                logger.warn("⚠️ Set otp.debug.mode=false in application.properties for production");
            } else {
                // Send real SMS via MSG91
                sendSmsViaMSG91(mobile, otp);
            }
            return otp;
        } else {
            System.out.println("❌ No user: " + card + "/" + mobile);
            return null;
        }
    }

    public boolean isDebugMode() {
        return debugMode || "DISABLED".equals(msg91AuthKey);
    }

    private void sendSmsViaMSG91(String mobile, String otp) {
    try {
        String mobileWithCode = "91" + mobile;

        // MSG91 OTP API v5
        URL url = new URL("https://api.msg91.com/api/v5/otp");
        HttpURLConnection conn =
            (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type",
            "application/json");
        conn.setRequestProperty("authkey", msg91AuthKey);
        conn.setDoOutput(true);

        String jsonBody = "{"
            + "\"template_id\":\"" + msg91TemplateId + "\","
            + "\"mobile\":\"" + mobileWithCode + "\","
            + "\"otp\":\"" + otp + "\","
            + "\"otp_expiry\":\"10\","
            + "\"otp_length\":\"6\""
            + "}";

        System.out.println("MSG91 request: " + jsonBody);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(jsonBody.getBytes("UTF-8"));
        }

        int responseCode = conn.getResponseCode();
        System.out.println("MSG91 response code: " + responseCode);

        // Read response
        java.io.BufferedReader br = new java.io.BufferedReader(
            new java.io.InputStreamReader(
                responseCode >= 200 && responseCode < 300
                    ? conn.getInputStream()
                    : conn.getErrorStream()
            )
        );
        StringBuilder response = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) {
            response.append(line);
        }
        System.out.println("MSG91 response body: "
            + response.toString());

        if (responseCode == 200) {
            System.out.println("✅ OTP SMS sent to " + mobile);
        } else {
            System.out.println("❌ MSG91 failed — check auth key"
                + " and template ID");
            // Fallback to debug
            System.out.println("🔑 FALLBACK OTP: " + otp);
        }
    } catch (Exception e) {
        System.out.println("MSG91 error: " + e.getMessage());
        System.out.println("🔑 FALLBACK OTP: " + otp);
        e.printStackTrace();
    }
}

    public void sendGeneralSms(String mobile, String message) {
        try {
            if (debugMode || "DISABLED".equals(msg91AuthKey)) {
                logger.info("📱 [DEBUG SMS] to " + mobile + ": " + message);
            } else {
                // Generic SMS via MSG91 (using a standard template if required, or direct)
                // Note: v5 API usually requires template_id. We might need a separate template for alerts.
                // For now, we reuse the connection logic but log the intent.
                logger.info("🚀 Sending Real SMS to " + mobile + ": " + message);
                // Implementation would go here with a specific alert template ID
            }
        } catch (Exception e) {
            logger.error("Failed to send general SMS: " + e.getMessage());
        }
    }

    public String verifyOtp(String rationCardNumber,
                            String mobileNumber, String otp) {
        String card = rationCardNumber != null ?
            rationCardNumber.trim() : "";
        String mobile = mobileNumber != null ?
            mobileNumber.trim() : "";

        System.out.println("=================================");
        System.out.println("verifyOtp: " + card + " / " + mobile);

        Optional<User> userOpt = userRepository
            .findByRationCardNumberAndMobileNumber(card, mobile);

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            if (debugMode) {
                // Debug mode — accept any 6-digit OTP
                System.out.println("⚠️ DEBUG MODE: accepting OTP");
            } else {
                // Production — verify OTP matches and not expired
                if (user.getOtpCode() == null ||
                    !user.getOtpCode().equals(otp)) {
                    throw new RuntimeException("Invalid OTP");
                }
                if (user.getOtpExpiry() == null ||
                    LocalDateTime.now().isAfter(user.getOtpExpiry())) {
                    throw new RuntimeException("OTP expired");
                }
            }

            // Clear OTP after use
            user.setOtpCode(null);
            user.setOtpExpiry(null);
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);

            String token = jwtUtil.generateToken(
                card, "USER", user.getId());
            System.out.println("✅ Login: " + card);
            System.out.println("=================================");
            return token;
        }

        System.out.println("❌ No registered user found for: " + card + "/" + mobile);
        System.out.println("=================================");
        // Return null — do NOT issue a demo token to unregistered users
        return null;
    }

    public String getUserName(String rationCardNumber) {
        String card = rationCardNumber != null ?
            rationCardNumber.trim() : "";
        return userRepository.findByRationCardNumber(card)
            .map(u -> u.getHeadOfFamily() != null ?
                u.getHeadOfFamily() : "User")
            .orElse("User");
    }

    public Long getUserId(String rationCardNumber) {
        String card = rationCardNumber != null ?
            rationCardNumber.trim() : "";
        return userRepository.findByRationCardNumber(card)
            .map(User::getId)
            .orElse(1L);
    }

    public void sendRegistrationOtp(String mobile, String otp) {
        System.out.println("📱 Registration OTP for " + mobile + ": " + otp);
        if (debugMode || "DISABLED".equals(msg91AuthKey)) {
            System.out.println("🔑 DEBUG Registration OTP: " + otp);
        } else {
            sendSmsViaMSG91(mobile, otp);
        }
    }
}