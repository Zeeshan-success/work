import { UMFutures } from "@binance/futures-connector";

export async function executeTrade(side, symbol) {
  const apiKey =
    "YbVqsurBtsZ3dBgEkASnhB45cQUpxdwLolHitovPdC3Ttgh2axEoKNZev11CNPAb";
  const apiSecret =
    "G5XjXlVi53OZuIeSqTayDKGtU1dj12gjgOiM0fUhau5hvN11HwQSUqGJJGYFRqOu";

  const client = new UMFutures(apiKey, apiSecret, {
    baseURL: "https://fapi.binance.com",
  });

  try {
    await client.cancelAllOpenOrders(symbol);

    console.log(`Placing market ${side} order...`);

    // Get current position information
    let position = await client.getPositionInformationV3(symbol);
    console.log("Position Information:", position.data);

    // Define trade quantity
    const quantity =
      position.data.length === 0
        ? 6
        : Math.abs(position.data[0].positionAmt) + 6;

    // Place Market Order
    const response = await client.newOrder(symbol, side, "MARKET", {
      quantity: quantity,
      reduceOnly: false,
      newOrderRespType: "RESULT",
    });

    console.log("Market Order Response:", response.data);

    const orderPrice = parseFloat(response.data.avgPrice);
    const oppositeSide = side === "BUY" ? "SELL" : "BUY";

    // ✅ Take Profit Calculation
    const tpPrice = side === "BUY" ? orderPrice + 0.01 : orderPrice - 0.01;

    // ✅ Place Take Profit Order (LIMIT)
    const tpResponse = await client.newOrder(symbol, oppositeSide, "LIMIT", {
      quantity: 6,
      price: tpPrice.toFixed(3),
      timeInForce: "GTC",
      reduceOnly: true,
    });

    console.log("Take Profit Order Response:", tpResponse.data);

    // ✅ Stop Loss Calculation
    const slPrice = side === "BUY" ? orderPrice - 0.005 : orderPrice + 0.005;

    // ✅ Place Stop Loss Order (STOP-MARKET)
    const slResponse = await client.newOrder(
      symbol,
      oppositeSide,
      "STOP_MARKET",
      {
        quantity: 6,
        stopPrice: slPrice.toFixed(3), // Stop Price for SL trigger
        timeInForce: "GTC",
        reduceOnly: true,
      }
    );

    console.log("Stop Loss Order Response:", slResponse.data);
  } catch (error) {
    console.error("Error placing order:", error);
  }
}
