package com.printalfa.backend.controller;

import com.printalfa.backend.dto.ApiResponse;
import com.printalfa.backend.dto.ShopDTO;
import com.printalfa.backend.security.UserPrincipal;
import com.printalfa.backend.service.ShopService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/shop")
public class AdminShopController {

    private final ShopService shopService;

    public AdminShopController(ShopService shopService) {
        this.shopService = shopService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ShopDTO>> getShopProfile(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        ShopDTO shop = shopService.getShopById(userPrincipal.getShopId());
        return ResponseEntity.ok(ApiResponse.success(shop));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<ShopDTO>> updateShopProfile(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody ShopDTO request) {
        
        ShopDTO updated = shopService.updateShop(userPrincipal.getShopId(), request);
        return ResponseEntity.ok(ApiResponse.success("Shop profile updated successfully", updated));
    }

    @GetMapping("/qr")
    public ResponseEntity<ApiResponse<Map<String, String>>> getShopQR(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        ShopDTO shop = shopService.getShopById(userPrincipal.getShopId());
        Map<String, String> data = new HashMap<>();
        data.put("shopSlug", shop.getSlug());
        data.put("shopName", shop.getName());
        data.put("shopUrl", "/shop/" + shop.getSlug());
        data.put("fullShopUrl", "http://localhost:5173/shop/" + shop.getSlug());
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
