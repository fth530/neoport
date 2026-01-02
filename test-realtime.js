const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

console.log("🔌 Connecting to WebSocket server...");

socket.on("connect", () => {
    console.log("✅ Connected! Socket ID:", socket.id);
});

socket.on("price_update", (data) => {
    console.log("📈 Price Update Received:");
    console.log(`   - Time: ${data.timestamp}`);
    console.log(`   - Type: ${data.type}`);
    console.log(`   - Assets: ${data.assets.length}`);
    console.log(`   - Total Value: ${data.summary.totalValue}`);

    // Test passed
    console.log("✅ Verification Successful: WebSocket is broadcasting updates.");
    process.exit(0);
});

socket.on("disconnect", () => {
    console.log("❌ Disconnected");
});

// Timeout if no event received
setTimeout(() => {
    console.error("❌ Timeout: No price_update event received within 65 seconds.");
    process.exit(1);
}, 65000);
