package com.printalfa.backend.service;

import com.printalfa.backend.dto.*;
import com.printalfa.backend.entity.*;
import com.printalfa.backend.enums.*;
import com.printalfa.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashMap;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;

@Service
public class OrderService {

    private final PrintOrderRepository printOrderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ShopRepository shopRepository;
    private final DocumentRepository documentRepository;
    private final PricingEngineService pricingEngineService;
    private final PrintJobRepository printJobRepository;
    private final WebSocketService webSocketService;

    @Value("${razorpay.key-id}")
    private String razorpayKeyId;

    @Value("${razorpay.key-secret}")
    private String razorpayKeySecret;

    public OrderService(PrintOrderRepository printOrderRepository,
                        OrderItemRepository orderItemRepository,
                        ShopRepository shopRepository,
                        DocumentRepository documentRepository,
                        PricingEngineService pricingEngineService,
                        PrintJobRepository printJobRepository,
                        WebSocketService webSocketService) {
        this.printOrderRepository = printOrderRepository;
        this.orderItemRepository = orderItemRepository;
        this.shopRepository = shopRepository;
        this.documentRepository = documentRepository;
        this.pricingEngineService = pricingEngineService;
        this.printJobRepository = printJobRepository;
        this.webSocketService = webSocketService;
    }

    @Transactional
    public OrderDTO createOrder(CreateOrderRequest request) {
        Shop shop = shopRepository.findById(request.getShopId())
                .orElseThrow(() -> new IllegalArgumentException("Shop not found"));

        List<CreateOrderItemRequest> itemRequests = request.getItems();
        if ((itemRequests == null || itemRequests.isEmpty()) && request.getDocumentId() != null) {
            // Legacy single-item payload compatibility
            CreateOrderItemRequest singleReq = new CreateOrderItemRequest();
            singleReq.setDocumentId(request.getDocumentId());
            singleReq.setPrintType(request.getPrintType() != null ? request.getPrintType() : PrintType.PRINT);
            singleReq.setColorMode(request.getColorMode());
            singleReq.setPaperSize(request.getPaperSize());
            singleReq.setPrintSide(request.getPrintSide());
            singleReq.setPageRange(request.getPageRange() != null ? request.getPageRange() : "ALL");
            singleReq.setCopies(request.getCopies() > 0 ? request.getCopies() : 1);
            itemRequests = List.of(singleReq);
        }

        if (itemRequests == null || itemRequests.isEmpty()) {
            throw new IllegalArgumentException("Order must contain at least one print file item");
        }

        PrintOrder order = new PrintOrder();
        order.setOrderNumber(generateOrderNumber());
        order.setShop(shop);
        order.setPaymentMethod(request.getPaymentMethod());
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setPrintStatus(PrintStatus.PENDING);
        order.setCustomerName(request.getCustomerName() != null && !request.getCustomerName().trim().isEmpty()
                ? request.getCustomerName().trim()
                : "Walk-in Customer");
        order.setCustomerPhone(request.getCustomerPhone() != null ? request.getCustomerPhone().trim() : "");

        BigDecimal orderTotal = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();

        for (CreateOrderItemRequest itemReq : itemRequests) {
            Document doc = documentRepository.findById(itemReq.getDocumentId())
                    .orElseThrow(() -> new IllegalArgumentException("Document not found: " + itemReq.getDocumentId()));

            PricingCalculateRequest calcReq = new PricingCalculateRequest();
            calcReq.setShopId(shop.getId());
            calcReq.setDocumentId(doc.getId());
            calcReq.setPrintType(itemReq.getPrintType() != null ? itemReq.getPrintType() : PrintType.PRINT);
            calcReq.setColorMode(itemReq.getColorMode());
            calcReq.setPaperSize(itemReq.getPaperSize());
            calcReq.setPrintSide(itemReq.getPrintSide());
            calcReq.setPageRange(itemReq.getPageRange());
            calcReq.setCopies(itemReq.getCopies());

            PricingCalculateResponse pricingResponse = pricingEngineService.calculatePrice(calcReq);

            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setDocument(doc);
            item.setPrintType(itemReq.getPrintType() != null ? itemReq.getPrintType() : PrintType.PRINT);
            item.setColorMode(itemReq.getColorMode());
            item.setPaperSize(itemReq.getPaperSize());
            item.setPrintSide(itemReq.getPrintSide());
            item.setPageRange(itemReq.getPageRange() != null ? itemReq.getPageRange() : "ALL");
            item.setCopies(itemReq.getCopies() > 0 ? itemReq.getCopies() : 1);
            item.setCalculatedPages(pricingResponse.getCalculatedPages());
            item.setUnitPrice(pricingResponse.getUnitPricePerPage());
            item.setItemPrice(pricingResponse.getTotalPrice());
            item.setPrintStatus(PrintStatus.PENDING);

            orderItems.add(item);
            orderTotal = orderTotal.add(pricingResponse.getTotalPrice());
        }

        order.setItems(orderItems);
        order.setTotalPrice(orderTotal);

        // Populate legacy fields on first item for DB compatibility if needed
        if (!orderItems.isEmpty()) {
            OrderItem first = orderItems.get(0);
            order.setDocument(first.getDocument());
            order.setPrintType(first.getPrintType());
            order.setColorMode(first.getColorMode());
            order.setPaperSize(first.getPaperSize());
            order.setPrintSide(first.getPrintSide());
            order.setPageRange(first.getPageRange());
            order.setCopies(first.getCopies());
            order.setCalculatedPages(first.getCalculatedPages());
        }

        if (order.getPaymentMethod() == PaymentMethod.ONLINE) {
            try {
                RazorpayClient razorpay = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
                JSONObject orderRequest = new JSONObject();
                // amount in paise
                orderRequest.put("amount", orderTotal.multiply(new BigDecimal("100")).intValue());
                orderRequest.put("currency", "INR");
                orderRequest.put("receipt", order.getOrderNumber());
                
                Order rzpOrder = razorpay.orders.create(orderRequest);
                order.setRazorpayOrderId(rzpOrder.get("id"));
            } catch (RazorpayException e) {
                throw new RuntimeException("Failed to create Razorpay order", e);
            }
        }

        PrintOrder savedOrder = printOrderRepository.save(order);
        OrderDTO orderDTO = mapToDTO(savedOrder);
        
        Map<String, Object> event = new HashMap<>();
        event.put("type", "NEW_PRINT_REQUEST");
        event.put("order", orderDTO);
        webSocketService.sendOrderUpdate(shop.getId(), event);
        
        return orderDTO;
    }

    @Transactional(readOnly = true)
    public OrderDTO getOrderByPublicToken(UUID publicToken) {
        PrintOrder order = printOrderRepository.findByPublicToken(publicToken)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with provided tracking token"));
        return mapToDTO(order);
    }

    @Transactional(readOnly = true)
    public OrderDTO getOrderById(UUID orderId) {
        PrintOrder order = printOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        return mapToDTO(order);
    }

    @Transactional(readOnly = true)
    public List<OrderDTO> getShopOrders(UUID shopId, String status) {
        List<PrintOrder> orders;
        if (status != null && !status.isEmpty() && !"ALL".equalsIgnoreCase(status)) {
            try {
                PrintStatus printStatus = PrintStatus.valueOf(status.toUpperCase());
                orders = printOrderRepository.findByShopIdAndPrintStatusOrderByCreatedAtDesc(shopId, printStatus);
            } catch (IllegalArgumentException e) {
                orders = printOrderRepository.findByShopIdOrderByCreatedAtDesc(shopId);
            }
        } else {
            orders = printOrderRepository.findByShopIdOrderByCreatedAtDesc(shopId);
        }
        return orders.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public OrderDTO updatePrintStatus(UUID orderId, PrintStatus newStatus) {
        PrintOrder order = printOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        order.setPrintStatus(newStatus);
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                item.setPrintStatus(newStatus);
            }
        }

        // Manage PrintJob queue if present
        if (newStatus == PrintStatus.PRINTING) {
            printJobRepository.findByOrderId(orderId).orElseGet(() -> {
                PrintJob job = new PrintJob(order, JobStatus.PROCESSING);
                return printJobRepository.save(job);
            });
        } else if (newStatus == PrintStatus.COMPLETED) {
            printJobRepository.findByOrderId(orderId).ifPresent(job -> {
                job.setStatus(JobStatus.COMPLETED);
                printJobRepository.save(job);
            });
        }

        PrintOrder updated = printOrderRepository.save(order);
        OrderDTO updatedDTO = mapToDTO(updated);
        
        Map<String, Object> event = new HashMap<>();
        event.put("type", "ORDER_STATUS_UPDATED");
        event.put("order", updatedDTO);
        webSocketService.sendOrderUpdate(order.getShop().getId(), event);
        
        return updatedDTO;
    }

    @Transactional
    public OrderDTO updateItemPrintStatus(UUID orderId, UUID itemId, PrintStatus newStatus, UUID shopId) {
        PrintOrder order = printOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        // Shop isolation check
        if (shopId != null && !order.getShop().getId().equals(shopId)) {
            throw new IllegalArgumentException("Unauthorized access to shop order");
        }

        OrderItem item = order.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Order item not found: " + itemId));

        item.setPrintStatus(newStatus);

        // Derived overall order status calculation
        PrintStatus derivedStatus = calculateDerivedOrderStatus(order.getItems());
        order.setPrintStatus(derivedStatus);

        PrintOrder updated = printOrderRepository.save(order);
        OrderDTO updatedDTO = mapToDTO(updated);
        
        Map<String, Object> event = new HashMap<>();
        event.put("type", "ORDER_ITEM_STATUS_UPDATED");
        event.put("order", updatedDTO);
        webSocketService.sendOrderUpdate(order.getShop().getId(), event);
        
        return updatedDTO;
    }

    @Transactional
    public OrderDTO updatePaymentStatus(UUID orderId, PaymentStatus newStatus) {
        PrintOrder order = printOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        order.setPaymentStatus(newStatus);
        PrintOrder updated = printOrderRepository.save(order);
        OrderDTO updatedDTO = mapToDTO(updated);
        
        Map<String, Object> event = new HashMap<>();
        event.put("type", "PAYMENT_STATUS_UPDATED");
        event.put("order", updatedDTO);
        webSocketService.sendOrderUpdate(order.getShop().getId(), event);
        
        return updatedDTO;
    }

    private PrintStatus calculateDerivedOrderStatus(List<OrderItem> items) {
        if (items == null || items.isEmpty()) return PrintStatus.PENDING;

        boolean allCompleted = items.stream().allMatch(i -> i.getPrintStatus() == PrintStatus.COMPLETED);
        if (allCompleted) return PrintStatus.COMPLETED;

        boolean allCancelled = items.stream().allMatch(i -> i.getPrintStatus() == PrintStatus.CANCELLED);
        if (allCancelled) return PrintStatus.CANCELLED;

        boolean allPending = items.stream().allMatch(i -> i.getPrintStatus() == PrintStatus.PENDING);
        if (allPending) return PrintStatus.PENDING;

        // If any item is printing or completed while others are pending
        return PrintStatus.PRINTING;
    }

    public OrderDTO mapToDTO(PrintOrder order) {
        OrderDTO dto = new OrderDTO();
        dto.setId(order.getId());
        dto.setOrderNumber(order.getOrderNumber());
        dto.setPublicToken(order.getPublicToken());
        dto.setShopId(order.getShop().getId());
        dto.setShopName(order.getShop().getName());
        dto.setTotalPrice(order.getTotalPrice());
        dto.setPaymentMethod(order.getPaymentMethod());
        dto.setPaymentStatus(order.getPaymentStatus());
        dto.setPrintStatus(order.getPrintStatus());
        dto.setCustomerName(order.getCustomerName());
        dto.setCustomerPhone(order.getCustomerPhone());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setUpdatedAt(order.getUpdatedAt());
        dto.setRazorpayOrderId(order.getRazorpayOrderId());
        dto.setRazorpayPaymentId(order.getRazorpayPaymentId());

        List<OrderItemDTO> itemDTOs = new ArrayList<>();
        if (order.getItems() != null && !order.getItems().isEmpty()) {
            for (OrderItem item : order.getItems()) {
                OrderItemDTO itemDTO = new OrderItemDTO();
                itemDTO.setId(item.getId());
                itemDTO.setOrderId(order.getId());
                if (item.getDocument() != null) {
                    Document doc = item.getDocument();
                    itemDTO.setDocument(new DocumentDTO(
                            doc.getId(),
                            doc.getOriginalFileName(),
                            doc.getContentType(),
                            doc.getFileSize(),
                            doc.getPageCount(),
                            doc.getUploadedAt()
                    ));
                }
                itemDTO.setPrintType(item.getPrintType());
                itemDTO.setColorMode(item.getColorMode());
                itemDTO.setPaperSize(item.getPaperSize());
                itemDTO.setPrintSide(item.getPrintSide());
                itemDTO.setPageRange(item.getPageRange());
                itemDTO.setCopies(item.getCopies());
                itemDTO.setCalculatedPages(item.getCalculatedPages());
                itemDTO.setUnitPrice(item.getUnitPrice());
                itemDTO.setItemPrice(item.getItemPrice());
                itemDTO.setPrintStatus(item.getPrintStatus());
                itemDTO.setCreatedAt(item.getCreatedAt());
                itemDTOs.add(itemDTO);
            }
        }
        dto.setItems(itemDTOs);

        // Populate legacy top-level document properties for backwards compatibility
        if (!itemDTOs.isEmpty()) {
            OrderItemDTO first = itemDTOs.get(0);
            dto.setDocument(first.getDocument());
            dto.setPrintType(first.getPrintType());
            dto.setColorMode(first.getColorMode());
            dto.setPaperSize(first.getPaperSize());
            dto.setPrintSide(first.getPrintSide());
            dto.setPageRange(first.getPageRange());
            dto.setCopies(first.getCopies());
            dto.setCalculatedPages(first.getCalculatedPages());
        }

        return dto;
    }

    private String generateOrderNumber() {
        int randomNum = 1000 + new Random().nextInt(9000);
        return "PR-" + randomNum;
    }
}
