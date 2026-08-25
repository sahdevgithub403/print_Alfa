package com.printalfa.backend.config;

import com.printalfa.backend.entity.*;
import com.printalfa.backend.enums.*;
import com.printalfa.backend.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Component
public class DataInitializer implements CommandLineRunner {

    private final ShopRepository shopRepository;
    private final UserRepository userRepository;
    private final ShopPricingRepository shopPricingRepository;
    private final DocumentRepository documentRepository;
    private final PrintOrderRepository printOrderRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(ShopRepository shopRepository,
                           UserRepository userRepository,
                           ShopPricingRepository shopPricingRepository,
                           DocumentRepository documentRepository,
                           PrintOrderRepository printOrderRepository,
                           PasswordEncoder passwordEncoder) {
        this.shopRepository = shopRepository;
        this.userRepository = userRepository;
        this.shopPricingRepository = shopPricingRepository;
        this.documentRepository = documentRepository;
        this.printOrderRepository = printOrderRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // 1. Seed or Get Demo Shop A (QuickPrint)
        Shop shop = shopRepository.findBySlug("quickprint")
                .orElseGet(() -> shopRepository.save(new Shop("QuickPrint Jamshedpur", "quickprint", "Bistupur Main Road, Jamshedpur, Jharkhand", "+91 98765 43210", null)));

        // Seed Demo Shop B (CampusPrint)
        Shop shopB = shopRepository.findBySlug("campusprint")
                .orElseGet(() -> shopRepository.save(new Shop("CampusPrint NIT", "campusprint", "Campus Gate No 2, NIT Adityapur", "+91 98765 99999", null)));

        // 2. Ensure Admin User A (admin@quickprint.com / admin123) is always updated
        User adminUser = userRepository.findByEmail("admin@quickprint.com")
                .orElseGet(User::new);
        
        adminUser.setEmail("admin@quickprint.com");
        adminUser.setPassword(passwordEncoder.encode("admin123"));
        adminUser.setRole(UserRole.ROLE_SHOP_ADMIN);
        adminUser.setShop(shop);
        userRepository.save(adminUser);

        // Ensure Admin User B (admin@campusprint.com / admin123) is created
        User adminUserB = userRepository.findByEmail("admin@campusprint.com")
                .orElseGet(User::new);
        
        adminUserB.setEmail("admin@campusprint.com");
        adminUserB.setPassword(passwordEncoder.encode("admin123"));
        adminUserB.setRole(UserRole.ROLE_SHOP_ADMIN);
        adminUserB.setShop(shopB);
        userRepository.save(adminUserB);

        // 3. Seed Pricing if absent
        if (!shopPricingRepository.findByShopId(shop.getId()).isPresent()) {
            ShopPricing pricing = new ShopPricing(
                    shop,
                    new BigDecimal("2.00"),  // BW A4 Single
                    new BigDecimal("3.00"),  // BW A4 Double
                    new BigDecimal("10.00"), // Color A4 Single
                    new BigDecimal("18.00"), // Color A4 Double
                    new BigDecimal("5.00"),  // BW A3 Single
                    new BigDecimal("8.00"),  // BW A3 Double
                    new BigDecimal("20.00"), // Color A3 Single
                    new BigDecimal("35.00"), // Color A3 Double
                    new BigDecimal("50.00")  // Passport Price
            );
            shopPricingRepository.save(pricing);
        }

        if (!shopPricingRepository.findByShopId(shopB.getId()).isPresent()) {
            ShopPricing pricingB = new ShopPricing(
                    shopB,
                    new BigDecimal("2.50"),  // BW A4 Single
                    new BigDecimal("4.00"),  // BW A4 Double
                    new BigDecimal("12.00"), // Color A4 Single
                    new BigDecimal("20.00"), // Color A4 Double
                    new BigDecimal("6.00"),  // BW A3 Single
                    new BigDecimal("10.00"), // BW A3 Double
                    new BigDecimal("25.00"), // Color A3 Single
                    new BigDecimal("40.00"), // Color A3 Double
                    new BigDecimal("60.00")  // Passport Price
            );
            shopPricingRepository.save(pricingB);
        }

        // 4. Seed Documents if empty
        if (documentRepository.count() == 0) {
            Document doc1 = documentRepository.save(new Document("Resume_SoftwareEngineer.pdf", "doc_resume_01.pdf", "application/pdf", 1250000, 8, "uploads/doc_resume_01.pdf"));
            Document doc2 = documentRepository.save(new Document("Final_Project_Report.pdf", "doc_report_02.pdf", "application/pdf", 3400000, 15, "uploads/doc_report_02.pdf"));
            Document doc3 = documentRepository.save(new Document("ID_Card_Copy.png", "doc_id_03.png", "image/png", 520000, 1, "uploads/doc_id_03.png"));

            // Seed Initial Sample Orders
            PrintOrder order1 = new PrintOrder();
            order1.setOrderNumber("PR-1024");
            order1.setPublicToken(UUID.fromString("11111111-1111-1111-1111-111111111111"));
            order1.setShop(shop);
            order1.setDocument(doc1);
            order1.setPrintType(PrintType.PRINT);
            order1.setColorMode(ColorMode.BW);
            order1.setPaperSize(PaperSize.A4);
            order1.setPrintSide(PrintSide.SINGLE);
            order1.setPageRange("ALL");
            order1.setCopies(2);
            order1.setCalculatedPages(8);
            order1.setTotalPrice(new BigDecimal("32.00"));
            order1.setPaymentMethod(PaymentMethod.PAY_AT_SHOP);
            order1.setPaymentStatus(PaymentStatus.PENDING);
            order1.setPrintStatus(PrintStatus.PENDING);
            printOrderRepository.save(order1);

            PrintOrder order2 = new PrintOrder();
            order2.setOrderNumber("PR-1025");
            order2.setPublicToken(UUID.fromString("22222222-2222-2222-2222-222222222222"));
            order2.setShop(shop);
            order2.setDocument(doc2);
            order2.setPrintType(PrintType.PRINT);
            order2.setColorMode(ColorMode.COLOR);
            order2.setPaperSize(PaperSize.A4);
            order2.setPrintSide(PrintSide.DOUBLE);
            order2.setPageRange("1-10");
            order2.setCopies(1);
            order2.setCalculatedPages(10);
            order2.setTotalPrice(new BigDecimal("180.00"));
            order2.setPaymentMethod(PaymentMethod.ONLINE);
            order2.setPaymentStatus(PaymentStatus.PAID);
            order2.setPrintStatus(PrintStatus.PRINTING);
            printOrderRepository.save(order2);

            PrintOrder order3 = new PrintOrder();
            order3.setOrderNumber("PR-1026");
            order3.setPublicToken(UUID.fromString("33333333-3333-3333-3333-333333333333"));
            order3.setShop(shop);
            order3.setDocument(doc3);
            order3.setPrintType(PrintType.XEROX);
            order3.setColorMode(ColorMode.BW);
            order3.setPaperSize(PaperSize.A4);
            order3.setPrintSide(PrintSide.SINGLE);
            order3.setPageRange("ALL");
            order3.setCopies(3);
            order3.setCalculatedPages(1);
            order3.setTotalPrice(new BigDecimal("6.00"));
            order3.setPaymentMethod(PaymentMethod.PAY_AT_SHOP);
            order3.setPaymentStatus(PaymentStatus.PAID);
            order3.setPrintStatus(PrintStatus.COMPLETED);
            printOrderRepository.save(order3);
        }

        System.out.println(">>> Seeded QuickPrint shop, admin user (admin@quickprint.com / admin123), pricing and sample orders successfully!");
    }
}
