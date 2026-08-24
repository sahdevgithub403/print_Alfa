package com.printalfa.backend.service;

import com.printalfa.backend.entity.Document;
import com.printalfa.backend.repository.DocumentRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path fileStorageLocation;
    private final DocumentRepository documentRepository;

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList("pdf", "jpg", "jpeg", "png", "doc", "docx");

    public FileStorageService(@Value("${app.upload.dir:./uploads}") String uploadDir, DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create directory for uploaded files.", ex);
        }
    }

    public Document uploadFile(MultipartFile file) {
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        
        if (originalFileName.contains("..")) {
            throw new IllegalArgumentException("Filename contains invalid path sequence " + originalFileName);
        }

        String extension = getFileExtension(originalFileName).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Unsupported file type: ." + extension + ". Allowed formats: PDF, JPG, PNG, DOC, DOCX.");
        }

        String storedFileName = UUID.randomUUID().toString() + "." + extension;
        Path targetLocation = this.fileStorageLocation.resolve(storedFileName);

        try {
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new RuntimeException("Failed to store file " + originalFileName, ex);
        }

        int pageCount = calculatePageCount(targetLocation.toFile(), extension);

        Document doc = new Document(
                originalFileName,
                storedFileName,
                file.getContentType(),
                file.getSize(),
                pageCount,
                targetLocation.toString()
        );

        return documentRepository.save(doc);
    }

    public Resource loadFileAsResource(String storedFileName) {
        try {
            Path filePath = this.fileStorageLocation.resolve(storedFileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists()) {
                return resource;
            } else {
                throw new RuntimeException("File not found " + storedFileName);
            }
        } catch (MalformedURLException ex) {
            throw new RuntimeException("File not found " + storedFileName, ex);
        }
    }

    private int calculatePageCount(File file, String extension) {
        if ("pdf".equals(extension)) {
            try (PDDocument doc = Loader.loadPDF(file)) {
                return doc.getNumberOfPages();
            } catch (Exception e) {
                return 1;
            }
        }
        return 1; // Default 1 page for images and documents
    }

    private String getFileExtension(String fileName) {
        if (fileName == null) return "";
        int lastIndex = fileName.lastIndexOf('.');
        return lastIndex == -1 ? "" : fileName.substring(lastIndex + 1);
    }
}
