package com.printalfa.backend.dto;

import java.util.UUID;

public class ShopDTO {
    private UUID id;
    private String name;
    private String slug;
    private String address;
    private String phone;
    private String logoUrl;

    public ShopDTO() {}

    public ShopDTO(UUID id, String name, String slug, String address, String phone, String logoUrl) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.address = address;
        this.phone = phone;
        this.logoUrl = logoUrl;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
}
