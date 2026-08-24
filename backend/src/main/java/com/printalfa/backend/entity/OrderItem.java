package com.printalfa.backend.entity;

import com.printalfa.backend.enums.*;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private PrintOrder order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PrintType printType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ColorMode colorMode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaperSize paperSize;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PrintSide printSide;

    @Column(nullable = false)
    private String pageRange;

    @Column(nullable = false)
    private int copies;

    @Column(nullable = false)
    private int calculatedPages;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "item_price", nullable = false)
    private BigDecimal itemPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PrintStatus printStatus;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.printStatus == null) {
            this.printStatus = PrintStatus.PENDING;
        }
        if (this.pageRange == null || this.pageRange.trim().isEmpty()) {
            this.pageRange = "ALL";
        }
        if (this.copies < 1) {
            this.copies = 1;
        }
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public PrintOrder getOrder() { return order; }
    public void setOrder(PrintOrder order) { this.order = order; }

    public Document getDocument() { return document; }
    public void setDocument(Document document) { this.document = document; }

    public PrintType getPrintType() { return printType; }
    public void setPrintType(PrintType printType) { this.printType = printType; }

    public ColorMode getColorMode() { return colorMode; }
    public void setColorMode(ColorMode colorMode) { this.colorMode = colorMode; }

    public PaperSize getPaperSize() { return paperSize; }
    public void setPaperSize(PaperSize paperSize) { this.paperSize = paperSize; }

    public PrintSide getPrintSide() { return printSide; }
    public void setPrintSide(PrintSide printSide) { this.printSide = printSide; }

    public String getPageRange() { return pageRange; }
    public void setPageRange(String pageRange) { this.pageRange = pageRange; }

    public int getCopies() { return copies; }
    public void setCopies(int copies) { this.copies = copies; }

    public int getCalculatedPages() { return calculatedPages; }
    public void setCalculatedPages(int calculatedPages) { this.calculatedPages = calculatedPages; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getItemPrice() { return itemPrice; }
    public void setItemPrice(BigDecimal itemPrice) { this.itemPrice = itemPrice; }

    public PrintStatus getPrintStatus() { return printStatus; }
    public void setPrintStatus(PrintStatus printStatus) { this.printStatus = printStatus; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
