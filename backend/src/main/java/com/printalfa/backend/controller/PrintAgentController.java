package com.printalfa.backend.controller;

import com.printalfa.backend.dto.ApiResponse;
import com.printalfa.backend.dto.PrintJobDTO;
import com.printalfa.backend.enums.JobStatus;
import com.printalfa.backend.service.PrintService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/print-agent")
public class PrintAgentController {

    private final PrintService printService;

    public PrintAgentController(PrintService printService) {
        this.printService = printService;
    }

    @GetMapping("/jobs")
    public ResponseEntity<ApiResponse<List<PrintJobDTO>>> getQueuedJobs() {
        List<PrintJobDTO> jobs = printService.getQueuedJobs();
        return ResponseEntity.ok(ApiResponse.success(jobs));
    }

    @PostMapping("/jobs/{jobId}/started")
    public ResponseEntity<ApiResponse<PrintJobDTO>> markJobStarted(
            @PathVariable UUID jobId,
            @RequestBody(required = false) Map<String, String> body) {
        String agentId = body != null ? body.get("agentId") : "Agent-Local";
        PrintJobDTO job = printService.updateJobStatus(jobId, JobStatus.PROCESSING, agentId);
        return ResponseEntity.ok(ApiResponse.success("Print job started", job));
    }

    @PostMapping("/jobs/{jobId}/completed")
    public ResponseEntity<ApiResponse<PrintJobDTO>> markJobCompleted(
            @PathVariable UUID jobId,
            @RequestBody(required = false) Map<String, String> body) {
        String agentId = body != null ? body.get("agentId") : "Agent-Local";
        PrintJobDTO job = printService.updateJobStatus(jobId, JobStatus.COMPLETED, agentId);
        return ResponseEntity.ok(ApiResponse.success("Print job completed", job));
    }

    @PostMapping("/jobs/{jobId}/failed")
    public ResponseEntity<ApiResponse<PrintJobDTO>> markJobFailed(
            @PathVariable UUID jobId,
            @RequestBody(required = false) Map<String, String> body) {
        String agentId = body != null ? body.get("agentId") : "Agent-Local";
        PrintJobDTO job = printService.updateJobStatus(jobId, JobStatus.FAILED, agentId);
        return ResponseEntity.ok(ApiResponse.success("Print job marked failed", job));
    }
}
