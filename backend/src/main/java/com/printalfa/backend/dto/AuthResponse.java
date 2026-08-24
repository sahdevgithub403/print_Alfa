package com.printalfa.backend.dto;

import java.util.UUID;

public class AuthResponse {
    private String token;
    private String email;
    private String role;
    private UUID shopId;
    private String shopName;
    private String shopSlug;

    public AuthResponse() {}

    public AuthResponse(String token, String email, String role, UUID shopId, String shopName, String shopSlug) {
        this.token = token;
        this.email = email;
        this.role = role;
        this.shopId = shopId;
        this.shopName = shopName;
        this.shopSlug = shopSlug;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public UUID getShopId() { return shopId; }
    public void setShopId(UUID shopId) { this.shopId = shopId; }

    public String getShopName() { return shopName; }
    public void setShopName(String shopName) { this.shopName = shopName; }

    public String getShopSlug() { return shopSlug; }
    public void setShopSlug(String shopSlug) { this.shopSlug = shopSlug; }
}
