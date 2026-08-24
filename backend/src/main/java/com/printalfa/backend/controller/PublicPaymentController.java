package com.printalfa.backend.controller;

import com.printalfa.backend.dto.ApiResponse;
import com.printalfa.backend.dto.PaymentCreateRequest;
import com.printalfa.backend.dto.PaymentResponse;
import com.printalfa.backend.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/public/payments")
public class PublicPaymentController {

    private final PaymentService paymentService;

    public PublicPaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/create")
    public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(@Valid @RequestBody PaymentCreateRequest request) {
        PaymentResponse response = paymentService.createPayment(request.getOrderId(), request.getPaymentMethod());
        return ResponseEntity.ok(ApiResponse.success("Payment initiated", response));
    }

    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<PaymentResponse>> verifyPayment(@RequestBody Map<String, Object> body) {
        String orderIdStr = (String) body.get("orderId");
        String razorpayPaymentId = (String) body.get("razorpayPaymentId");
        String razorpayOrderId = (String) body.get("razorpayOrderId");
        String razorpaySignature = (String) body.get("razorpaySignature");
        Boolean successObj = (Boolean) body.get("success");
        boolean success = successObj != null ? successObj : true;

        if (orderIdStr == null) {
            throw new IllegalArgumentException("orderId is required");
        }

        UUID orderId = UUID.fromString(orderIdStr);
        PaymentResponse response = paymentService.verifyPayment(orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, success);
        return ResponseEntity.ok(ApiResponse.success("Payment verified", response));
    }
}
