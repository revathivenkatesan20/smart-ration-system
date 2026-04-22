package com.ration.security;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import jakarta.annotation.PostConstruct;
import java.io.IOException;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initialize() {
        try {
            String firebaseConfig = System.getenv("FIREBASE_SERVICE_ACCOUNT");
            FirebaseOptions options;

            if (firebaseConfig != null && !firebaseConfig.isEmpty()) {
                // Read from Environment Variable (Render/Production)
                options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(
                        new java.io.ByteArrayInputStream(firebaseConfig.getBytes())))
                    .build();
                System.out.println("✅ Firebase initialized using Environment Variable");
            } else {
                // Fallback to Classpath file (Local Development)
                options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(
                        new ClassPathResource("firebase-service-account.json").getInputStream()))
                    .build();
                System.out.println("✅ Firebase initialized using local JSON file");
            }

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
                System.out.println("🔥 Firebase Admin SDK initialized successfully");
            }
        } catch (IOException e) {
            System.err.println("❌ Error initializing Firebase Admin SDK: " + e.getMessage());
        }
    }
}
