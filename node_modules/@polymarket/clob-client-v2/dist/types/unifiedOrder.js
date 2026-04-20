export function isV2Order(order) {
    if ("version" in order && "order" in order) {
        // VersionedSignedOrder type
        return order.version === 2;
    }
    // Check for V2-specific fields
    return "timestamp" in order && "metadata" in order && "builder" in order;
}
//# sourceMappingURL=unifiedOrder.js.map