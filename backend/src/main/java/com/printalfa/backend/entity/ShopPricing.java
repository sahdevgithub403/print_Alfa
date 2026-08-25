package com.printalfa.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "shop_pricings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShopPricing {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false, unique = true)
    private Shop shop;

    @Column(nullable = false)
    private BigDecimal bwA4Single;

    @Column(nullable = false)
    private BigDecimal bwA4Double;

    @Column(nullable = false)
    private BigDecimal colorA4Single;

    @Column(nullable = false)
    private BigDecimal colorA4Double;

    @Column(nullable = false)
    private BigDecimal bwA3Single;

    @Column(nullable = false)
    private BigDecimal bwA3Double;

    @Column(nullable = false)
    private BigDecimal colorA3Single;

    @Column(nullable = false)
    private BigDecimal colorA3Double;

    @Column(nullable = false, columnDefinition = "DECIMAL(10,2) DEFAULT '50.00'")
    private BigDecimal passportPrice = new BigDecimal("50.00");

    public ShopPricing() {}

    public ShopPricing(Shop shop, BigDecimal bwA4Single, BigDecimal bwA4Double,
                       BigDecimal colorA4Single, BigDecimal colorA4Double,
                       BigDecimal bwA3Single, BigDecimal bwA3Double,
                       BigDecimal colorA3Single, BigDecimal colorA3Double,
                       BigDecimal passportPrice) {
        this.shop = shop;
        this.bwA4Single = bwA4Single;
        this.bwA4Double = bwA4Double;
        this.colorA4Single = colorA4Single;
        this.colorA4Double = colorA4Double;
        this.bwA3Single = bwA3Single;
        this.bwA3Double = bwA3Double;
        this.colorA3Single = colorA3Single;
        this.colorA3Double = colorA3Double;
        this.passportPrice = passportPrice != null ? passportPrice : new BigDecimal("50.00");
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Shop getShop() { return shop; }
    public void setShop(Shop shop) { this.shop = shop; }

    public BigDecimal getBwA4Single() { return bwA4Single; }
    public void setBwA4Single(BigDecimal bwA4Single) { this.bwA4Single = bwA4Single; }

    public BigDecimal getBwA4Double() { return bwA4Double; }
    public void setBwA4Double(BigDecimal bwA4Double) { this.bwA4Double = bwA4Double; }

    public BigDecimal getColorA4Single() { return colorA4Single; }
    public void setColorA4Single(BigDecimal colorA4Single) { this.colorA4Single = colorA4Single; }

    public BigDecimal getColorA4Double() { return colorA4Double; }
    public void setColorA4Double(BigDecimal colorA4Double) { this.colorA4Double = colorA4Double; }

    public BigDecimal getBwA3Single() { return bwA3Single; }
    public void setBwA3Single(BigDecimal bwA3Single) { this.bwA3Single = bwA3Single; }

    public BigDecimal getBwA3Double() { return bwA3Double; }
    public void setBwA3Double(BigDecimal bwA3Double) { this.bwA3Double = bwA3Double; }

    public BigDecimal getColorA3Single() { return colorA3Single; }
    public void setColorA3Single(BigDecimal colorA3Single) { this.colorA3Single = colorA3Single; }

    public BigDecimal getColorA3Double() { return colorA3Double; }
    public void setColorA3Double(BigDecimal colorA3Double) { this.colorA3Double = colorA3Double; }

    public BigDecimal getPassportPrice() { return passportPrice; }
    public void setPassportPrice(BigDecimal passportPrice) { this.passportPrice = passportPrice; }
}
