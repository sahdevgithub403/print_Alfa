package com.printalfa.backend.repository;

import com.printalfa.backend.entity.PrintOrder;
import com.printalfa.backend.enums.PrintStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PrintOrderRepository extends JpaRepository<PrintOrder, UUID> {
    Optional<PrintOrder> findByPublicToken(UUID publicToken);
    Optional<PrintOrder> findByOrderNumber(String orderNumber);
    
    List<PrintOrder> findByShopIdOrderByCreatedAtDesc(UUID shopId);
    List<PrintOrder> findByShopIdAndPrintStatusOrderByCreatedAtDesc(UUID shopId, PrintStatus printStatus);
    boolean existsByShopIdAndDocumentId(UUID shopId, UUID documentId);

    @Query("SELECT p FROM PrintOrder p WHERE p.shop.id = :shopId AND p.printStatus IN :statuses ORDER BY p.createdAt DESC")
    List<PrintOrder> findByShopIdAndPrintStatusIn(@Param("shopId") UUID shopId, @Param("statuses") List<PrintStatus> statuses);

    @Query("SELECT COUNT(p) FROM PrintOrder p WHERE p.shop.id = :shopId AND p.printStatus = :status")
    long countByShopIdAndPrintStatus(@Param("shopId") UUID shopId, @Param("status") PrintStatus status);
}
