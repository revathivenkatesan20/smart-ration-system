package com.ration.service;

import com.google.firebase.messaging.*;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class FirebaseMessagingService {

    public void sendNotification(String token, String title, String body) {
        if (token == null || token.isEmpty()) return;

        Message message = Message.builder()
            .setToken(token)
            .setNotification(Notification.builder()
                .setTitle(title)
                .setBody(body)
                .build())
            .build();

        try {
            String response = FirebaseMessaging.getInstance().send(message);
            System.out.println("✅ Successfully sent message: " + response);
        } catch (FirebaseMessagingException e) {
            System.err.println("❌ Error sending Firebase message: " + e.getMessage());
        }
    }

    public void sendMulticastNotification(List<String> tokens, String title, String body) {
        if (tokens == null || tokens.isEmpty()) return;

        MulticastMessage message = MulticastMessage.builder()
            .addAllTokens(tokens)
            .setNotification(Notification.builder()
                .setTitle(title)
                .setBody(body)
                .build())
            .build();

        try {
            BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
            System.out.println("✅ Sent " + response.getSuccessCount() + " messages successfully out of " + tokens.size());
        } catch (FirebaseMessagingException e) {
            System.err.println("❌ Error sending multicast message: " + e.getMessage());
        }
    }

    public void sendTopicNotification(String topic, String title, String body) {
        if (topic == null || topic.isEmpty()) return;

        Message message = Message.builder()
            .setTopic(topic)
            .setNotification(Notification.builder()
                .setTitle(title)
                .setBody(body)
                .build())
            .build();

        try {
            String response = FirebaseMessaging.getInstance().send(message);
            System.out.println("✅ Successfully sent topic message: " + response);
        } catch (FirebaseMessagingException e) {
            System.err.println("❌ Error sending Firebase topic message: " + e.getMessage());
        }
    }
}

