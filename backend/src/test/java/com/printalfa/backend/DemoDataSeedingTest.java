package com.printalfa.backend;

import com.printalfa.backend.config.DataInitializer;
import com.printalfa.backend.dto.OrderDTO;
import com.printalfa.backend.dto.OrderItemDTO;
import com.printalfa.backend.entity.PrintOrder;
import com.printalfa.backend.entity.Shop;
import com.printalfa.backend.repository.PrintOrderRepository;
import com.printalfa.backend.repository.ShopRepository;
import com.printalfa.backend.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
@Transactional
public class DemoDataSeedingTest {

    @Autowired
    private PrintOrderRepository printOrderRepository;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private OrderService orderService;

    @Autowired
    private DataInitializer dataInitializer;

    @Test
    void testDemoOrdersHavePopulatedOrderItems() {
        Optional<PrintOrder> order1Opt = printOrderRepository.findByOrderNumber("PR-1024");
        assertTrue(order1Opt.isPresent(), "Demo order PR-1024 should exist");
        PrintOrder order1 = order1Opt.get();
        assertNotNull(order1.getItems(), "PR-1024 should have items list");
        assertFalse(order1.getItems().isEmpty(), "PR-1024 items list should not be empty");
        assertEquals(1, order1.getItems().size());
        assertNotNull(order1.getItems().get(0).getDocument());
        assertEquals("Resume_SoftwareEngineer.pdf", order1.getItems().get(0).getDocument().getOriginalFileName());
        assertEquals(8, order1.getItems().get(0).getCalculatedPages());
        assertEquals(2, order1.getItems().get(0).getCopies());

        Optional<PrintOrder> order2Opt = printOrderRepository.findByOrderNumber("PR-1025");
        assertTrue(order2Opt.isPresent(), "Demo order PR-1025 should exist");
        PrintOrder order2 = order2Opt.get();
        assertNotNull(order2.getItems());
        assertFalse(order2.getItems().isEmpty());
        assertEquals("Final_Project_Report.pdf", order2.getItems().get(0).getDocument().getOriginalFileName());

        Optional<PrintOrder> order3Opt = printOrderRepository.findByOrderNumber("PR-1026");
        assertTrue(order3Opt.isPresent(), "Demo order PR-1026 should exist");
        PrintOrder order3 = order3Opt.get();
        assertNotNull(order3.getItems());
        assertFalse(order3.getItems().isEmpty());
        assertEquals("ID_Card_Copy.png", order3.getItems().get(0).getDocument().getOriginalFileName());
    }

    @Test
    void testOrderDTOMappingIncludesOrderItemsForAdminDashboard() {
        Shop shop = shopRepository.findBySlug("quickprint").orElseThrow();
        List<OrderDTO> orders = orderService.getShopOrders(shop.getId(), "ALL");

        assertFalse(orders.isEmpty(), "QuickPrint shop should have orders");
        for (OrderDTO dto : orders) {
            assertNotNull(dto.getItems(), "OrderDTO should contain items list");
            assertFalse(dto.getItems().isEmpty(), "OrderDTO items list should not be empty for order " + dto.getOrderNumber());
            for (OrderItemDTO item : dto.getItems()) {
                assertNotNull(item.getDocument(), "OrderItemDTO should have populated document");
                assertNotNull(item.getItemPrice(), "OrderItemDTO should have item price");
                assertNotNull(item.getPrintType(), "OrderItemDTO should have print type");
            }
        }
    }

    @Test
    void testDataInitializerIdempotency() throws Exception {
        long initialCount = printOrderRepository.count();
        dataInitializer.run();
        assertEquals(initialCount, printOrderRepository.count(), "Re-running DataInitializer should not create duplicate orders");
    }
}
