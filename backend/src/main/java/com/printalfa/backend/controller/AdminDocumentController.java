package com.printalfa.backend.controller;

import com.printalfa.backend.dto.AdminDocumentDTO;
import com.printalfa.backend.dto.ApiResponse;
import com.printalfa.backend.entity.Document;
import com.printalfa.backend.repository.DocumentRepository;
import com.printalfa.backend.repository.PrintOrderRepository;
import com.printalfa.backend.security.UserPrincipal;
import com.printalfa.backend.service.AdminDocumentService;
import com.printalfa.backend.service.FileStorageService;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/documents")
public class AdminDocumentController {

    private final AdminDocumentService adminDocumentService;
    private final FileStorageService fileStorageService;
    private final DocumentRepository documentRepository;
    private final PrintOrderRepository printOrderRepository;

    public AdminDocumentController(AdminDocumentService adminDocumentService,
                                   FileStorageService fileStorageService,
                                   DocumentRepository documentRepository,
                                   PrintOrderRepository printOrderRepository) {
        this.adminDocumentService = adminDocumentService;
        this.fileStorageService = fileStorageService;
        this.documentRepository = documentRepository;
        this.printOrderRepository = printOrderRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AdminDocumentDTO>>> getShopDocuments(
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "ALL") String type,
            @RequestParam(required = false, defaultValue = "NEWEST") String sort,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "25") int size,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        if (userPrincipal == null || userPrincipal.getShopId() == null) {
            throw new AccessDeniedException("User not authenticated or shop context missing");
        }

        Page<AdminDocumentDTO> documents = adminDocumentService.getShopDocuments(
                userPrincipal.getShopId(), search, type, sort, page, size
        );

        return ResponseEntity.ok(ApiResponse.success(documents));
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<ApiResponse<String>> deleteDocument(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        if (userPrincipal == null || userPrincipal.getShopId() == null) {
            throw new AccessDeniedException("User not authenticated or shop context missing");
        }

        adminDocumentService.deleteDocument(userPrincipal.getShopId(), documentId, userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success("Document permanently deleted", null));
    }

    @DeleteMapping("/bulk")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteBulkDocuments(
            @RequestBody Map<String, List<UUID>> requestBody,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        if (userPrincipal == null || userPrincipal.getShopId() == null) {
            throw new AccessDeniedException("User not authenticated or shop context missing");
        }

        List<UUID> documentIds = requestBody != null ? requestBody.get("documentIds") : null;
        int deletedCount = adminDocumentService.deleteBulkDocuments(userPrincipal.getShopId(), documentIds, userPrincipal.getId());

        return ResponseEntity.ok(ApiResponse.success("Bulk deletion completed", Map.of("deletedCount", deletedCount)));
    }

    @DeleteMapping("/all")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteAllShopDocuments(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        if (userPrincipal == null || userPrincipal.getShopId() == null) {
            throw new AccessDeniedException("User not authenticated or shop context missing");
        }

        Map<String, Object> result = adminDocumentService.deleteAllShopDocuments(userPrincipal.getShopId(), userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success("All eligible shop documents deleted", result));
    }

    @GetMapping("/{documentId}/download")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        if (userPrincipal == null || userPrincipal.getShopId() == null) {
            throw new AccessDeniedException("User not authenticated or shop context missing");
        }

        boolean hasAccess = printOrderRepository.existsByShopIdAndDocumentId(userPrincipal.getShopId(), documentId);
        if (!hasAccess) {
            throw new AccessDeniedException("Document does not belong to any orders in your shop");
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
