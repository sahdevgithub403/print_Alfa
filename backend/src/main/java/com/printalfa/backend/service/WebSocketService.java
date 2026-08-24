package com.printalfa.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class WebSocketService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void sendOrderUpdate(UUID shopId, Map<String, Object> event) {
        String destination = "/topic/admin/shop/" + shopId + "/orders";
        messagingTemplate.convertAndSend(destination, event);
    }
}
