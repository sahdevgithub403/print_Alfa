package com.printalfa.backend.service;

import com.printalfa.backend.dto.ShopDTO;
import com.printalfa.backend.dto.ShopPricingDTO;
import com.printalfa.backend.entity.Shop;
import com.printalfa.backend.entity.ShopPricing;
import com.printalfa.backend.repository.ShopPricingRepository;
import com.printalfa.backend.repository.ShopRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ShopService {

    private final ShopRepository shopRepository;
    private final ShopPricingRepository shopPricingRepository;

    public ShopService(ShopRepository shopRepository, ShopPricingRepository shopPricingRepository) {
        this.shopRepository = shopRepository;
        this.shopPricingRepository = shopPricingRepository;
    }

    @Transactional(readOnly = true)
    public ShopDTO getShopBySlug(String slug) {
        Shop shop = shopRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found with slug: " + slug));
        return mapShopToDTO(shop);
    }

    @Transactional(readOnly = true)
    public ShopDTO getShopById(UUID shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found"));
        return mapShopToDTO(shop);
    }

    @Transactional
    public ShopDTO updateShop(UUID shopId, ShopDTO request) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found"));

        if (request.getName() != null) shop.setName(request.getName());
        if (request.getAddress() != null) shop.setAddress(request.getAddress());
        if (request.getPhone() != null) shop.setPhone(request.getPhone());
        if (request.getLogoUrl() != null) shop.setLogoUrl(request.getLogoUrl());

        Shop updated = shopRepository.save(shop);
        return mapShopToDTO(updated);
    }

    @Transactional(readOnly = true)
    public ShopPricingDTO getShopPricing(UUID shopId) {
        ShopPricing pricing = shopPricingRepository.findByShopId(shopId)
                .orElseThrow(() -> new IllegalArgumentException("Pricing not found for shop"));
        return mapPricingToDTO(pricing);
    }

    @Transactional
    public ShopPricingDTO updateShopPricing(UUID shopId, ShopPricingDTO request) {
        ShopPricing pricing = shopPricingRepository.findByShopId(shopId)
                .orElseThrow(() -> new IllegalArgumentException("Pricing not found for shop"));

        if (request.getBwA4Single() != null) pricing.setBwA4Single(request.getBwA4Single());
        if (request.getBwA4Double() != null) pricing.setBwA4Double(request.getBwA4Double());
        if (request.getColorA4Single() != null) pricing.setColorA4Single(request.getColorA4Single());
        if (request.getColorA4Double() != null) pricing.setColorA4Double(request.getColorA4Double());
        if (request.getBwA3Single() != null) pricing.setBwA3Single(request.getBwA3Single());
        if (request.getBwA3Double() != null) pricing.setBwA3Double(request.getBwA3Double());
        if (request.getColorA3Single() != null) pricing.setColorA3Single(request.getColorA3Single());
        if (request.getColorA3Double() != null) pricing.setColorA3Double(request.getColorA3Double());
        if (request.getPassportPrice() != null) pricing.setPassportPrice(request.getPassportPrice());

        ShopPricing updated = shopPricingRepository.save(pricing);
        return mapPricingToDTO(updated);
    }

    public ShopDTO mapShopToDTO(Shop shop) {
        return new ShopDTO(shop.getId(), shop.getName(), shop.getSlug(), shop.getAddress(), shop.getPhone(), shop.getLogoUrl());
    }

    public ShopPricingDTO mapPricingToDTO(ShopPricing pricing) {
        ShopPricingDTO dto = new ShopPricingDTO();
        dto.setId(pricing.getId());
        dto.setShopId(pricing.getShop().getId());
        dto.setBwA4Single(pricing.getBwA4Single());
        dto.setBwA4Double(pricing.getBwA4Double());
        dto.setColorA4Single(pricing.getColorA4Single());
        dto.setColorA4Double(pricing.getColorA4Double());
        dto.setBwA3Single(pricing.getBwA3Single());
        dto.setBwA3Double(pricing.getBwA3Double());
        dto.setColorA3Single(pricing.getColorA3Single());
        dto.setColorA3Double(pricing.getColorA3Double());
        dto.setPassportPrice(pricing.getPassportPrice());
        return dto;
    }
}
