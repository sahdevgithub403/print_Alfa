package com.printalfa.backend.controller;

import com.printalfa.backend.dto.ApiResponse;
import com.printalfa.backend.dto.PrintJobDTO;
import com.printalfa.backend.entity.Document;
import com.printalfa.backend.enums.JobStatus;
import com.printalfa.backend.repository.DocumentRepository;
import com.printalfa.backend.repository.PrintOrderRepository;
import com.printalfa.backend.security.PrintAgentPrincipal;
import com.printalfa.backend.security.UserPrincipal;
import com.printalfa.backend.service.FileStorageService;
import com.printalfa.backend.service.PrintService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/print-agent")
public class PrintAgentController {

    private final PrintService printService;
    private final FileStorageService fileStorageService;
    private final DocumentRepository documentRepository;
    private final PrintOrderRepository printOrderRepository;
    private final com.printalfa.backend.repository.UserSessionRepository userSessionRepository;

    public PrintAgentController(PrintService printService,
                                FileStorageService fileStorageService,
                                DocumentRepository documentRepository,
                                PrintOrderRepository printOrderRepository,
                                com.printalfa.backend.repository.UserSessionRepository userSessionRepository) {
        this.printService = printService;
        this.fileStorageService = fileStorageService;
        this.documentRepository = documentRepository;
        this.printOrderRepository = printOrderRepository;
        this.userSessionRepository = userSessionRepository;
    }

    private UUID extractShopId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new AccessDeniedException("Unauthorized: No authentication principal found");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof PrintAgentPrincipal agentPrincipal) {
            return agentPrincipal.getShopId();
        }
        if (principal instanceof UserPrincipal userPrincipal) {
            return userPrincipal.getShopId();
        }
        throw new AccessDeniedException("Unauthorized: Unrecognized principal type");
    }

    @GetMapping("/jobs")
    public ResponseEntity<ApiResponse<List<PrintJobDTO>>> getQueuedJobs(
            Authentication authentication,
            @RequestParam(required = false) UUID shopId) {
        UUID authShopId = extractShopId(authentication);
        if (authShopId == null) {
            throw new AccessDeniedException("Authenticated agent is not bound to any shop");
        }
        if (shopId != null && !shopId.equals(authShopId)) {
            throw new AccessDeniedException("Unauthorized: Cannot access print jobs of another shop");
        }
        List<PrintJobDTO> jobs = printService.getQueuedJobsByShop(authShopId);
        return ResponseEntity.ok(ApiResponse.success(jobs));
    }

    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<ApiResponse<PrintJobDTO>> getJobById(
            Authentication authentication,
            @PathVariable UUID jobId) {
        UUID authShopId = extractShopId(authentication);
        PrintJobDTO job = printService.getJobByIdAndShop(jobId, authShopId);
        return ResponseEntity.ok(ApiResponse.success(job));
    }

    @PostMapping("/jobs/{jobId}/started")
    public ResponseEntity<ApiResponse<PrintJobDTO>> markJobStarted(
            Authentication authentication,
            @PathVariable UUID jobId,
            @RequestBody(required = false) Map<String, String> body) {
        UUID authShopId = extractShopId(authentication);
        String agentId = body != null ? body.get("agentId") : "Agent-" + authShopId;
        PrintJobDTO job = printService.updateJobStatusWithShopCheck(jobId, JobStatus.PROCESSING, agentId, authShopId);
        return ResponseEntity.ok(ApiResponse.success("Print job started", job));
    }

    @PostMapping("/jobs/{jobId}/completed")
    public ResponseEntity<ApiResponse<PrintJobDTO>> markJobCompleted(
            Authentication authentication,
            @PathVariable UUID jobId,
            @RequestBody(required = false) Map<String, String> body) {
        UUID authShopId = extractShopId(authentication);
        String agentId = body != null ? body.get("agentId") : "Agent-" + authShopId;
        PrintJobDTO job = printService.updateJobStatusWithShopCheck(jobId, JobStatus.COMPLETED, agentId, authShopId);
        return ResponseEntity.ok(ApiResponse.success("Print job completed", job));
    }

    @PostMapping("/jobs/{jobId}/failed")
    public ResponseEntity<ApiResponse<PrintJobDTO>> markJobFailed(
            Authentication authentication,
            @PathVariable UUID jobId,
            @RequestBody(required = false) Map<String, String> body) {
        UUID authShopId = extractShopId(authentication);
        String agentId = body != null ? body.get("agentId") : "Agent-" + authShopId;
        PrintJobDTO job = printService.updateJobStatusWithShopCheck(jobId, JobStatus.FAILED, agentId, authShopId);
        return ResponseEntity.ok(ApiResponse.success("Print job marked failed", job));
    }

    @PostMapping("/jobs/{jobId}/retry")
    public ResponseEntity<ApiResponse<PrintJobDTO>> retryJob(
            Authentication authentication,
            @PathVariable UUID jobId) {
        UUID authShopId = extractShopId(authentication);
        PrintJobDTO job = printService.retryJobWithShopCheck(jobId, authShopId);
        return ResponseEntity.ok(ApiResponse.success("Print job requeued", job));
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<ApiResponse<Map<String, Object>>> heartbeat(
            Authentication authentication,
            jakarta.servlet.http.HttpServletRequest request,
            @RequestBody(required = false) Map<String, String> body) {
        UUID authShopId = extractShopId(authentication);
        
        UUID sessionId = (UUID) request.getAttribute("USER_SESSION_ID");
        if (sessionId != null) {
            userSessionRepository.findById(sessionId).ifPresent(session -> {
                session.setLastHeartbeat(java.time.LocalDateTime.now());
                userSessionRepository.save(session);
            });
        }
        
        Map<String, Object> response = Map.of(
            "status", "ok",
            "serverTime", java.time.LocalDateTime.now().toString(),
            "sessionValid", true
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/documents/{documentId}/download")
    public ResponseEntity<Resource> downloadDocument(
            Authentication authentication,
            @PathVariable UUID documentId) {
        UUID authShopId = extractShopId(authentication);
        if (authShopId == null) {
            throw new AccessDeniedException("Authenticated agent is not bound to any shop");
        }

        boolean hasAccess = printOrderRepository.existsByShopIdAndDocumentId(authShopId, documentId);
        if (!hasAccess) {
            throw new AccessDeniedException("Unauthorized: Document does not belong to any orders in your shop");
        }

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        Resource resource = fileStorageService.loadFileAsResource(document.getStoredFileName());

        String contentType = document.getContentType();
        if (contentType == null || contentType.isEmpty()) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + document.getOriginalFileName() + "\"")
                .body(resource);
    }
}
