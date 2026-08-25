package com.printalfa.backend.service;

import com.printalfa.backend.dto.PrintJobDTO;
import com.printalfa.backend.entity.OrderItem;
import com.printalfa.backend.entity.PrintJob;
import com.printalfa.backend.enums.JobStatus;
import com.printalfa.backend.enums.PrintStatus;
import com.printalfa.backend.repository.PrintJobRepository;
import com.printalfa.backend.repository.PrintOrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PrintService {

    private final PrintJobRepository printJobRepository;
    private final PrintOrderRepository printOrderRepository;
    private final OrderService orderService;
    private final WebSocketService webSocketService;

    public PrintService(PrintJobRepository printJobRepository,
                        PrintOrderRepository printOrderRepository,
                        OrderService orderService,
                        WebSocketService webSocketService) {
        this.printJobRepository = printJobRepository;
        this.printOrderRepository = printOrderRepository;
        this.orderService = orderService;
        this.webSocketService = webSocketService;
    }

    @Transactional(readOnly = true)
    public List<PrintJobDTO> getQueuedJobsByShop(UUID shopId) {
        if (shopId == null) {
            throw new org.springframework.security.access.AccessDeniedException("Shop ID is required to fetch tenant print queue");
        }
        return printJobRepository.findByOrderShopIdAndStatusOrderByCreatedAtAsc(shopId, JobStatus.QUEUED)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PrintJobDTO getJobByIdAndShop(UUID jobId, UUID shopId) {
        if (shopId == null) {
            throw new org.springframework.security.access.AccessDeniedException("Shop ID is required");
        }
        PrintJob job = printJobRepository.findByIdAndOrderShopId(jobId, shopId)
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("Print job not found for authenticated shop"));
        return mapToDTO(job);
    }

    @Transactional
    public PrintJobDTO updateJobStatus(UUID jobId, JobStatus status, String agentId) {
        PrintJob job = printJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Print job not found"));

        if (status == JobStatus.PROCESSING) {
            if (job.getStatus() == JobStatus.COMPLETED) {
                throw new IllegalStateException("Cannot process an already completed print job");
            }
            if (job.getStatus() == JobStatus.PROCESSING && job.getAssignedAgentId() != null 
                    && !job.getAssignedAgentId().equals(agentId)) {
                throw new IllegalStateException("Print job is already being processed by agent: " + job.getAssignedAgentId());
            }
            job.setStatus(JobStatus.PROCESSING);
            job.setAssignedAgentId(agentId != null ? agentId : "Agent-Local");
            job.getOrder().setPrintStatus(PrintStatus.PRINTING);
            if (job.getOrder().getItems() != null) {
                for (OrderItem item : job.getOrder().getItems()) {
                    if (item.getPrintStatus() == PrintStatus.PENDING) {
                        item.setPrintStatus(PrintStatus.PRINTING);
                    }
                }
            }
        } else if (status == JobStatus.COMPLETED) {
            job.setStatus(JobStatus.COMPLETED);
            if (agentId != null) {
                job.setAssignedAgentId(agentId);
            }
            job.getOrder().setPrintStatus(PrintStatus.COMPLETED);
            if (job.getOrder().getItems() != null) {
                for (OrderItem item : job.getOrder().getItems()) {
                    item.setPrintStatus(PrintStatus.COMPLETED);
                }
            }
        } else if (status == JobStatus.FAILED) {
            job.setStatus(JobStatus.FAILED);
            if (agentId != null) {
                job.setAssignedAgentId(agentId);
            }
            job.getOrder().setPrintStatus(PrintStatus.FAILED);
            if (job.getOrder().getItems() != null) {
                for (OrderItem item : job.getOrder().getItems()) {
                    item.setPrintStatus(PrintStatus.FAILED);
                }
            }
        } else if (status == JobStatus.QUEUED) {
            job.setStatus(JobStatus.QUEUED);
            job.setAssignedAgentId(null);
            job.getOrder().setPrintStatus(PrintStatus.PENDING);
            if (job.getOrder().getItems() != null) {
                for (OrderItem item : job.getOrder().getItems()) {
                    item.setPrintStatus(PrintStatus.PENDING);
                }
            }
        }

        printOrderRepository.save(job.getOrder());
        PrintJob saved = printJobRepository.save(job);

        // Notify Admin Dashboard
        Map<String, Object> event = new HashMap<>();
        event.put("type", "ORDER_STATUS_UPDATED");
        event.put("order", orderService.mapToDTO(saved.getOrder()));
        webSocketService.sendOrderUpdate(saved.getOrder().getShop().getId(), event);

        return mapToDTO(saved);
    }

    @Transactional
    public PrintJobDTO updateJobStatusWithShopCheck(UUID jobId, JobStatus status, String agentId, UUID authShopId) {
        if (authShopId == null) {
            throw new org.springframework.security.access.AccessDeniedException("Shop ID is required");
        }
        PrintJob job = printJobRepository.findByIdAndOrderShopId(jobId, authShopId)
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("Unauthorized: Print job not found for authenticated shop"));

        return updateJobStatus(job.getId(), status, agentId);
    }

    @Transactional
    public PrintJobDTO retryJobWithShopCheck(UUID jobId, UUID authShopId) {
        if (authShopId == null) {
            throw new org.springframework.security.access.AccessDeniedException("Shop ID is required");
        }
        PrintJob job = printJobRepository.findByIdAndOrderShopId(jobId, authShopId)
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("Unauthorized: Print job not found for authenticated shop"));

        return retryJob(job.getId());
    }

    @Transactional
    public PrintJobDTO retryJob(UUID jobId) {
        return updateJobStatus(jobId, JobStatus.QUEUED, null);
    }

    public PrintJobDTO mapToDTO(PrintJob job) {
        PrintJobDTO dto = new PrintJobDTO();
        dto.setJobId(job.getId());
        dto.setOrder(orderService.mapToDTO(job.getOrder()));
        dto.setStatus(job.getStatus());
        dto.setAssignedAgentId(job.getAssignedAgentId());
        dto.setCreatedAt(job.getCreatedAt());
        return dto;
    }
}
