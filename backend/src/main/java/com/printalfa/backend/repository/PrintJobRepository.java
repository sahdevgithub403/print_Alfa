package com.printalfa.backend.repository;

import com.printalfa.backend.entity.PrintJob;
import com.printalfa.backend.enums.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PrintJobRepository extends JpaRepository<PrintJob, UUID> {
    Optional<PrintJob> findByIdAndOrderShopId(UUID id, UUID shopId);
    Optional<PrintJob> findByOrderId(UUID orderId);
    boolean existsByOrderId(UUID orderId);
    Optional<PrintJob> findByOrderIdAndOrderShopId(UUID orderId, UUID shopId);
    List<PrintJob> findByStatusOrderByCreatedAtAsc(JobStatus status);
    List<PrintJob> findByOrderShopIdAndStatusOrderByCreatedAtAsc(UUID shopId, JobStatus status);
}
