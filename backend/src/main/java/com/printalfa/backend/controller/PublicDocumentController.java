package com.printalfa.backend.controller;

import com.printalfa.backend.dto.ApiResponse;
import com.printalfa.backend.dto.DocumentDTO;
import com.printalfa.backend.entity.Document;
import com.printalfa.backend.service.FileStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/public/documents")
public class PublicDocumentController {

    private final FileStorageService fileStorageService;

    public PublicDocumentController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<DocumentDTO>> uploadDocument(@RequestParam("file") MultipartFile file) {
        Document doc = fileStorageService.uploadFile(file);
        DocumentDTO dto = new DocumentDTO(
                doc.getId(),
                doc.getOriginalFileName(),
                doc.getContentType(),
                doc.getFileSize(),
                doc.getPageCount(),
                doc.getUploadedAt()
        );
        return ResponseEntity.ok(ApiResponse.success("Document uploaded successfully", dto));
    }
}
