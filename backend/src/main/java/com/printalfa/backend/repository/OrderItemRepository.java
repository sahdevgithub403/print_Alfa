package com.printalfa.backend.repository;

import com.printalfa.backend.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {
    List<OrderItem> findByOrderId(UUID orderId);
    Optional<OrderItem> findByIdAndOrderShopId(UUID id, UUID shopId);
}
