package com.printalfa.backend.service;

import com.printalfa.backend.dto.OrderDTO;
import com.printalfa.backend.dto.PaymentResponse;
import com.printalfa.backend.entity.Payment;
import com.printalfa.backend.entity.PrintJob;
import com.printalfa.backend.entity.PrintOrder;
import com.printalfa.backend.enums.JobStatus;
import com.printalfa.backend.enums.PaymentMethod;
import com.printalfa.backend.enums.PaymentStatus;
import com.printalfa.backend.repository.PaymentRepository;
import com.printalfa.backend.repository.PrintJobRepository;
import com.printalfa.backend.repository.PrintOrderRepository;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PrintOrderRepository printOrderRepository;
    private final PrintJobRepository printJobRepository;
    private final WebSocketService webSocketService;
    private final OrderService orderService;

    @Value("${razorpay.key-secret}")
    private String razorpayKeySecret;

    @Value("${razorpay.webhook-secret:dummy_webhook_secret}")
    private String razorpayWebhookSecret;

    public PaymentService(PaymentRepository paymentRepository,
                          PrintOrderRepository printOrderRepository,
                          PrintJobRepository printJobRepository,
                          WebSocketService webSocketService,
                          @Lazy OrderService orderService) {
        this.paymentRepository = paymentRepository;
        this.printOrderRepository = printOrderRepository;
        this.printJobRepository = printJobRepository;
        this.webSocketService = webSocketService;
        this.orderService = orderService;
    }

    @Transactional
    public PaymentResponse createPayment(UUID orderId, PaymentMethod paymentMethod) {
        PrintOrder order = printOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));

        Payment payment = paymentRepository.findByOrderId(orderId).orElseGet(() -> {
            Payment p = new Payment();
            p.setOrder(order);
            return p;
        });

        String txId = (paymentMethod == PaymentMethod.PAY_AT_SHOP)
                ? "CASH-" + order.getOrderNumber()
                : "TXN-" + System.currentTimeMillis();

        payment.setTransactionId(txId);
        payment.setAmount(order.getTotalPrice());
        payment.setPaymentMethod(paymentMethod);
        payment.setStatus(PaymentStatus.PENDING);

        Payment saved = paymentRepository.save(payment);
        return mapToDTO(saved);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public PaymentResponse verifyPayment(UUID orderId, String razorpayPaymentId, String razorpayOrderId, String razorpaySignature) {
        PrintOrder order = printOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));

        if (order.getPaymentMethod() != PaymentMethod.ONLINE) {
            throw new IllegalStateException("Order is not an online payment order");
        }

        // Idempotency check: if order is already PAID, return existing payment without duplicate side-effects
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            Payment payment = paymentRepository.findByOrderId(orderId).orElseGet(() -> {
                Payment p = new Payment(order, razorpayPaymentId, order.getTotalPrice(), PaymentMethod.ONLINE, PaymentStatus.PAID);
                return paymentRepository.save(p);
            });
            return mapToDTO(payment);
        }

        if (razorpayPaymentId == null || razorpayOrderId == null || razorpaySignature == null) {
            throw new IllegalArgumentException("Missing Razorpay payment verification parameters");
        }

        Payment payment = paymentRepository.findByOrderId(orderId).orElseGet(() -> {
            Payment p = new Payment();
            p.setOrder(order);
            p.setAmount(order.getTotalPrice());
            p.setPaymentMethod(PaymentMethod.ONLINE);
            p.setStatus(PaymentStatus.PENDING);
            return p;
        });

        boolean isValidSignature = false;
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", razorpayOrderId);
            options.put("razorpay_payment_id", razorpayPaymentId);
            options.put("razorpay_signature", razorpaySignature);

            isValidSignature = Utils.verifyPaymentSignature(options, razorpayKeySecret);
        } catch (Exception e) {
            isValidSignature = false;
        }

        if (!isValidSignature) {
            order.setPaymentStatus(PaymentStatus.FAILED);
            payment.setStatus(PaymentStatus.FAILED);
            printOrderRepository.save(order);
            paymentRepository.save(payment);
            throw new IllegalArgumentException("Invalid Razorpay payment signature");
        }

        // Verified successfully
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setRazorpayPaymentId(razorpayPaymentId);
        order.setRazorpaySignature(razorpaySignature);
        printOrderRepository.save(order);

        payment.setStatus(PaymentStatus.PAID);
        payment.setTransactionId(razorpayPaymentId);
        Payment saved = paymentRepository.save(payment);

        // Safe idempotent print job creation
        if (!printJobRepository.existsByOrderId(order.getId())) {
            PrintJob printJob = new PrintJob(order, JobStatus.QUEUED);
            printJobRepository.save(printJob);
        }

        // Broadcast real-time order update to shop admin
        OrderDTO orderDTO = orderService.mapToDTO(order);
        Map<String, Object> event = new HashMap<>();
        event.put("type", "NEW_PRINT_REQUEST");
        event.put("order", orderDTO);
        webSocketService.sendOrderUpdate(order.getShop().getId(), event);

        return mapToDTO(saved);
    }

    @Transactional
    public PaymentResponse cancelPayment(UUID orderId) {
        PrintOrder order = printOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));

        if (order.getPaymentStatus() == PaymentStatus.PENDING) {
            order.setPaymentStatus(PaymentStatus.FAILED);
            printOrderRepository.save(order);

            Payment payment = paymentRepository.findByOrderId(orderId).orElseGet(() -> {
                Payment p = new Payment();
                p.setOrder(order);
                p.setAmount(order.getTotalPrice());
                p.setPaymentMethod(order.getPaymentMethod());
                return p;
            });
            payment.setStatus(PaymentStatus.FAILED);
            Payment saved = paymentRepository.save(payment);
            return mapToDTO(saved);
        }

        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));
        return mapToDTO(payment);
    }

    @Transactional
    public void handleWebhook(String rawPayload, String signatureHeader) {
        if (signatureHeader == null || signatureHeader.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing Razorpay webhook signature header");
        }

        try {
            boolean isValid = Utils.verifyWebhookSignature(rawPayload, signatureHeader, razorpayWebhookSecret);
            if (!isValid) {
                throw new IllegalArgumentException("Invalid Razorpay webhook signature");
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Webhook verification failed: " + e.getMessage());
        }

        JSONObject payloadJson = new JSONObject(rawPayload);
        String eventType = payloadJson.optString("event");

        if ("payment.captured".equals(eventType) || "order.paid".equals(eventType)) {
            JSONObject payload = payloadJson.optJSONObject("payload");
            if (payload != null) {
                JSONObject paymentObj = payload.optJSONObject("payment");
                JSONObject paymentEntity = paymentObj != null ? paymentObj.optJSONObject("entity") : null;

                String razorpayOrderId = null;
                String razorpayPaymentId = null;

                if (paymentEntity != null) {
                    razorpayOrderId = paymentEntity.optString("order_id");
                    razorpayPaymentId = paymentEntity.optString("id");
                } else {
                    JSONObject orderObj = payload.optJSONObject("order");
                    JSONObject orderEntity = orderObj != null ? orderObj.optJSONObject("entity") : null;
                    if (orderEntity != null) {
                        razorpayOrderId = orderEntity.optString("id");
                    }
                }

                if (razorpayOrderId != null && !razorpayOrderId.isEmpty()) {
                    PrintOrder order = printOrderRepository.findByRazorpayOrderId(razorpayOrderId).orElse(null);
                    if (order != null && order.getPaymentStatus() != PaymentStatus.PAID) {
                        order.setPaymentStatus(PaymentStatus.PAID);
                        if (razorpayPaymentId != null) {
                            order.setRazorpayPaymentId(razorpayPaymentId);
                        }
                        printOrderRepository.save(order);

                        Payment payment = paymentRepository.findByOrderId(order.getId()).orElseGet(() -> {
                            Payment p = new Payment();
                            p.setOrder(order);
                            p.setAmount(order.getTotalPrice());
                            p.setPaymentMethod(PaymentMethod.ONLINE);
                            return p;
                        });
                        payment.setStatus(PaymentStatus.PAID);
                        if (razorpayPaymentId != null) {
                            payment.setTransactionId(razorpayPaymentId);
                        }
                        paymentRepository.save(payment);

                        if (!printJobRepository.existsByOrderId(order.getId())) {
                            PrintJob printJob = new PrintJob(order, JobStatus.QUEUED);
                            printJobRepository.save(printJob);
                        }

                        OrderDTO orderDTO = orderService.mapToDTO(order);
                        Map<String, Object> wsEvent = new HashMap<>();
                        wsEvent.put("type", "NEW_PRINT_REQUEST");
                        wsEvent.put("order", orderDTO);
                        webSocketService.sendOrderUpdate(order.getShop().getId(), wsEvent);
                    }
                }
            }
        } else if ("payment.failed".equals(eventType)) {
            JSONObject payload = payloadJson.optJSONObject("payload");
            if (payload != null) {
                JSONObject paymentObj = payload.optJSONObject("payment");
                JSONObject paymentEntity = paymentObj != null ? paymentObj.optJSONObject("entity") : null;
                if (paymentEntity != null) {
                    String razorpayOrderId = paymentEntity.optString("order_id");
                    if (razorpayOrderId != null) {
                        PrintOrder order = printOrderRepository.findByRazorpayOrderId(razorpayOrderId).orElse(null);
                        if (order != null && order.getPaymentStatus() == PaymentStatus.PENDING) {
                            order.setPaymentStatus(PaymentStatus.FAILED);
                            printOrderRepository.save(order);

                            Payment payment = paymentRepository.findByOrderId(order.getId()).orElse(null);
                            if (payment != null) {
                                payment.setStatus(PaymentStatus.FAILED);
                                paymentRepository.save(payment);
                            }
                        }
                    }
                }
            }
        }
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
