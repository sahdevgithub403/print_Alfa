package com.printalfa.backend.dto;

import com.printalfa.backend.enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class PaymentCreateRequest {
    @NotNull(message = "Order ID is required")
    private UUID orderId;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    public PaymentCreateRequest() {}

    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID orderId) { this.orderId = orderId; }

    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
}
