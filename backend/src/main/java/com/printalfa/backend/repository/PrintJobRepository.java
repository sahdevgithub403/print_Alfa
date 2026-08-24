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
    Optional<PrintJob> findByOrderId(UUID orderId);
    List<PrintJob> findByStatusOrderByCreatedAtAsc(JobStatus status);
}
