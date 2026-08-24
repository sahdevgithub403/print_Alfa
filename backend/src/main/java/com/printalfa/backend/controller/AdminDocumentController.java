package com.printalfa.backend.controller;

import com.printalfa.backend.entity.Document;
import com.printalfa.backend.repository.DocumentRepository;
import com.printalfa.backend.repository.PrintOrderRepository;
import com.printalfa.backend.security.UserPrincipal;
import com.printalfa.backend.service.FileStorageService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/documents")
public class AdminDocumentController {

    private final FileStorageService fileStorageService;
    private final DocumentRepository documentRepository;
    private final PrintOrderRepository printOrderRepository;

    public AdminDocumentController(FileStorageService fileStorageService,
                                   DocumentRepository documentRepository,
                                   PrintOrderRepository printOrderRepository) {
        this.fileStorageService = fileStorageService;
        this.documentRepository = documentRepository;
        this.printOrderRepository = printOrderRepository;
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
