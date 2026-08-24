package com.printalfa.backend.service;

import com.printalfa.backend.dto.PaymentResponse;
import com.printalfa.backend.entity.Payment;
import com.printalfa.backend.entity.PrintOrder;
import com.printalfa.backend.enums.PaymentMethod;
import com.printalfa.backend.enums.PaymentStatus;
import com.printalfa.backend.repository.PaymentRepository;
import com.printalfa.backend.repository.PrintOrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PrintOrderRepository printOrderRepository;

    @Value("${razorpay.key-secret}")
    private String razorpayKeySecret;

    public PaymentService(PaymentRepository paymentRepository, PrintOrderRepository printOrderRepository) {
        this.paymentRepository = paymentRepository;
        this.printOrderRepository = printOrderRepository;
    }

    @Transactional
    public PaymentResponse createPayment(UUID orderId, PaymentMethod paymentMethod) {
        PrintOrder order = printOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        String txId = "TXN-" + System.currentTimeMillis();
        PaymentStatus initialStatus = (paymentMethod == PaymentMethod.PAY_AT_SHOP) ? PaymentStatus.PENDING : PaymentStatus.PENDING;

        Payment payment = paymentRepository.findByOrderId(orderId).orElseGet(() -> {
            Payment p = new Payment();
            p.setOrder(order);
            return p;
        });

        payment.setTransactionId(txId);
        payment.setAmount(order.getTotalPrice());
        payment.setPaymentMethod(paymentMethod);
        payment.setStatus(initialStatus);

        Payment saved = paymentRepository.save(payment);
        return mapToDTO(saved);
    }

    @Transactional
    public PaymentResponse verifyPayment(UUID orderId, String razorpayPaymentId, String razorpayOrderId, String razorpaySignature, boolean success) {
        PrintOrder order = printOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        Payment payment = paymentRepository.findByOrderId(orderId).orElseGet(() -> {
            Payment p = new Payment();
            p.setOrder(order);
            p.setAmount(order.getTotalPrice());
            p.setPaymentMethod(PaymentMethod.ONLINE);
            p.setStatus(PaymentStatus.PENDING);
            return p;
        });

        if (success) {
            try {
                JSONObject options = new JSONObject();
                options.put("razorpay_order_id", razorpayOrderId);
                options.put("razorpay_payment_id", razorpayPaymentId);
                options.put("razorpay_signature", razorpaySignature);

                boolean status = Utils.verifyPaymentSignature(options, razorpayKeySecret);

                if (status) {
                    payment.setStatus(PaymentStatus.PAID);
                    payment.setTransactionId(razorpayPaymentId);
                    
                    order.setPaymentStatus(PaymentStatus.PAID);
                    order.setRazorpayPaymentId(razorpayPaymentId);
                    order.setRazorpaySignature(razorpaySignature);
                } else {
                    payment.setStatus(PaymentStatus.FAILED);
                    order.setPaymentStatus(PaymentStatus.FAILED);
                }
            } catch (Exception e) {
                payment.setStatus(PaymentStatus.FAILED);
                order.setPaymentStatus(PaymentStatus.FAILED);
            }
        } else {
            payment.setStatus(PaymentStatus.FAILED);
            order.setPaymentStatus(PaymentStatus.FAILED);
        }

        printOrderRepository.save(order);
        Payment saved = paymentRepository.save(payment);
        return mapToDTO(saved);
    }

    public PaymentResponse mapToDTO(Payment payment) {
        PaymentResponse dto = new PaymentResponse();
        dto.setId(payment.getId());
        dto.setOrderId(payment.getOrder().getId());
        dto.setTransactionId(payment.getTransactionId());
        dto.setAmount(payment.getAmount());
        dto.setPaymentMethod(payment.getPaymentMethod());
        dto.setStatus(payment.getStatus());
        return dto;
    }
}
