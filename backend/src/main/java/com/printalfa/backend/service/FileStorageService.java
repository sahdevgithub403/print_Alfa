package com.printalfa.backend.service;

import com.printalfa.backend.entity.Document;
import com.printalfa.backend.repository.DocumentRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.poi.hpsf.SummaryInformation;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.ooxml.POIXMLProperties;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
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

        int pageCount;
        try {
            pageCount = calculatePageCount(targetLocation.toFile(), extension, originalFileName);
        } catch (Exception ex) {
            try {
                Files.deleteIfExists(targetLocation);
            } catch (IOException ignored) {}
            if (ex instanceof IllegalArgumentException) {
                throw (IllegalArgumentException) ex;
            }
            throw new IllegalArgumentException("Failed to process document " + originalFileName + ": " + ex.getMessage(), ex);
        }

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

    public boolean deletePhysicalFile(String storedFileName) {
        if (storedFileName == null || storedFileName.contains("..") || storedFileName.contains("/") || storedFileName.contains("\\")) {
            throw new IllegalArgumentException("Invalid stored file name for deletion");
        }
        try {
            Path filePath = this.fileStorageLocation.resolve(storedFileName).normalize();
            if (!filePath.startsWith(this.fileStorageLocation)) {
                throw new SecurityException("Cannot delete file outside upload directory");
            }
            return Files.deleteIfExists(filePath);
        } catch (IOException ex) {
            org.slf4j.LoggerFactory.getLogger(FileStorageService.class)
                    .warn("Failed to delete physical file {}: {}", storedFileName, ex.getMessage());
            return false;
        }
    }

    public Resource loadFileAsResource(String storedFileName) {
        try {
            if (storedFileName == null || storedFileName.contains("..") || storedFileName.contains("/") || storedFileName.contains("\\")) {
                throw new IllegalArgumentException("Invalid stored file name");
            }
            Path filePath = this.fileStorageLocation.resolve(storedFileName).normalize();
            if (!filePath.startsWith(this.fileStorageLocation)) {
                throw new SecurityException("Cannot access file outside upload directory");
            }
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("File not found " + storedFileName);
            }
        } catch (MalformedURLException ex) {
            throw new RuntimeException("File not found " + storedFileName, ex);
        }
    }

    public int calculatePageCount(File file, String extension, String originalFileName) {
        if ("pdf".equals(extension)) {
            try (PDDocument doc = Loader.loadPDF(file)) {
                int pages = doc.getNumberOfPages();
                if (pages <= 0) {
                    throw new IllegalArgumentException("Invalid PDF document: page count is zero");
                }
                return pages;
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid or corrupted PDF file: " + originalFileName, e);
            }
        } else if ("docx".equals(extension)) {
            try (FileInputStream fis = new FileInputStream(file);
                 XWPFDocument docx = new XWPFDocument(fis)) {
                POIXMLProperties props = docx.getProperties();
                if (props != null && props.getExtendedProperties() != null) {
                    int pages = props.getExtendedProperties().getPages();
                    if (pages > 0) {
                        return pages;
                    }
                }
                return 1;
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid or corrupted DOCX file: " + originalFileName, e);
            }
        } else if ("doc".equals(extension)) {
            try (FileInputStream fis = new FileInputStream(file);
                 HWPFDocument doc = new HWPFDocument(fis)) {
                SummaryInformation summary = doc.getSummaryInformation();
                if (summary != null) {
                    int pages = summary.getPageCount();
                    if (pages > 0) {
                        return pages;
                    }
                }
                return 1;
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid or corrupted DOC file: " + originalFileName, e);
            }
        } else if ("jpg".equals(extension) || "jpeg".equals(extension) || "png".equals(extension)) {
            try {
                BufferedImage image = ImageIO.read(file);
                if (image == null) {
                    throw new IllegalArgumentException("Invalid or unreadable image file: " + originalFileName);
                }
                return 1;
            } catch (IOException e) {
                throw new IllegalArgumentException("Corrupted image file: " + originalFileName, e);
            }
        }

        return 1;
    }

    private String getFileExtension(String fileName) {
        if (fileName == null) return "";
        int lastIndex = fileName.lastIndexOf('.');
        return lastIndex == -1 ? "" : fileName.substring(lastIndex + 1);
    }
}
