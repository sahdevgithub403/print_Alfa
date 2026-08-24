package com.printalfa.backend.service;

import com.printalfa.backend.dto.OrderDTO;
import com.printalfa.backend.dto.PrintJobDTO;
import com.printalfa.backend.entity.PrintJob;
import com.printalfa.backend.enums.JobStatus;
import com.printalfa.backend.enums.PrintStatus;
import com.printalfa.backend.repository.PrintJobRepository;
import com.printalfa.backend.repository.PrintOrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PrintService {

    private final PrintJobRepository printJobRepository;
    private final PrintOrderRepository printOrderRepository;
    private final OrderService orderService;

    public PrintService(PrintJobRepository printJobRepository, PrintOrderRepository printOrderRepository, OrderService orderService) {
        this.printJobRepository = printJobRepository;
        this.printOrderRepository = printOrderRepository;
        this.orderService = orderService;
    }

    @Transactional(readOnly = true)
    public List<PrintJobDTO> getQueuedJobs() {
        return printJobRepository.findByStatusOrderByCreatedAtAsc(JobStatus.QUEUED)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public PrintJobDTO updateJobStatus(UUID jobId, JobStatus status, String agentId) {
        PrintJob job = printJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Print job not found"));

        job.setStatus(status);
        if (agentId != null) {
            job.setAssignedAgentId(agentId);
        }

        if (status == JobStatus.PROCESSING) {
            job.getOrder().setPrintStatus(PrintStatus.PRINTING);
        } else if (status == JobStatus.COMPLETED) {
            job.getOrder().setPrintStatus(PrintStatus.COMPLETED);
        } else if (status == JobStatus.FAILED) {
            job.getOrder().setPrintStatus(PrintStatus.FAILED);
        }

        printOrderRepository.save(job.getOrder());
        PrintJob saved = printJobRepository.save(job);
        return mapToDTO(saved);
    }

    private PrintJobDTO mapToDTO(PrintJob job) {
        PrintJobDTO dto = new PrintJobDTO();
        dto.setJobId(job.getId());
        dto.setOrder(orderService.mapToDTO(job.getOrder()));
        dto.setStatus(job.getStatus());
        dto.setAssignedAgentId(job.getAssignedAgentId());
        dto.setCreatedAt(job.getCreatedAt());
        return dto;
    }
}
