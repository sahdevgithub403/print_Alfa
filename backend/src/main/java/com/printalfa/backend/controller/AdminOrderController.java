package com.printalfa.backend.controller;

import com.printalfa.backend.dto.ApiResponse;
import com.printalfa.backend.dto.OrderDTO;
import com.printalfa.backend.dto.UpdatePrintStatusRequest;
import com.printalfa.backend.enums.PaymentStatus;
import com.printalfa.backend.security.UserPrincipal;
import com.printalfa.backend.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    private final OrderService orderService;

    public AdminOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderDTO>>> getShopOrders(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) String status) {
        
        UUID shopId = userPrincipal.getShopId();
        if (shopId == null) {
            throw new AccessDeniedException("User is not associated with any shop");
        }

        List<OrderDTO> orders = orderService.getShopOrders(shopId, status);
        return ResponseEntity.ok(ApiResponse.success(orders));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<OrderDTO>> getOrderById(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable UUID orderId) {
        
        OrderDTO order = orderService.getOrderById(orderId);
        if (!order.getShopId().equals(userPrincipal.getShopId())) {
            throw new AccessDeniedException("Unauthorized access to shop order");
        }
        return ResponseEntity.ok(ApiResponse.success(order));
    }

    @PatchMapping("/{orderId}/status")
    public ResponseEntity<ApiResponse<OrderDTO>> updatePrintStatus(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable UUID orderId,
            @Valid @RequestBody UpdatePrintStatusRequest request) {
        
        OrderDTO existing = orderService.getOrderById(orderId);
        if (!existing.getShopId().equals(userPrincipal.getShopId())) {
            throw new AccessDeniedException("Unauthorized access to shop order");
        }

        OrderDTO updated = orderService.updatePrintStatus(orderId, request.getPrintStatus());
        return ResponseEntity.ok(ApiResponse.success("Order status updated", updated));
    }

    @PatchMapping("/{orderId}/items/{itemId}/status")
    public ResponseEntity<ApiResponse<OrderDTO>> updateItemPrintStatus(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable UUID orderId,
            @PathVariable UUID itemId,
            @Valid @RequestBody UpdatePrintStatusRequest request) {

        OrderDTO existing = orderService.getOrderById(orderId);
        if (!existing.getShopId().equals(userPrincipal.getShopId())) {
            throw new AccessDeniedException("Unauthorized access to shop order");
        }

        OrderDTO updated = orderService.updateItemPrintStatus(orderId, itemId, request.getPrintStatus(), userPrincipal.getShopId());
        return ResponseEntity.ok(ApiResponse.success("Item print status updated", updated));
    }

    @PatchMapping("/{orderId}/payment-status")
    public ResponseEntity<ApiResponse<OrderDTO>> updatePaymentStatus(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable UUID orderId,
            @RequestBody Map<String, String> body) {
        
        OrderDTO existing = orderService.getOrderById(orderId);
        if (!existing.getShopId().equals(userPrincipal.getShopId())) {
            throw new AccessDeniedException("Unauthorized access to shop order");
        }

        String paymentStatusStr = body.get("paymentStatus");
        PaymentStatus newStatus = PaymentStatus.valueOf(paymentStatusStr.toUpperCase());
        OrderDTO updated = orderService.updatePaymentStatus(orderId, newStatus);
        return ResponseEntity.ok(ApiResponse.success("Payment status updated", updated));
    }
}
