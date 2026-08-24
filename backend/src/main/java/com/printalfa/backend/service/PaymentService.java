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

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PrintOrderRepository printOrderRepository;

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
    public PaymentResponse verifyPayment(UUID orderId, String transactionId, boolean success) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Payment record not found for order"));

        PrintOrder order = payment.getOrder();

        if (success) {
            payment.setStatus(PaymentStatus.PAID);
            if (transactionId != null && !transactionId.isEmpty()) {
                payment.setTransactionId(transactionId);
            }
            order.setPaymentStatus(PaymentStatus.PAID);
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
