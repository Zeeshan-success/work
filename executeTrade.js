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
    console.log(`Placing market ${side} order...`);

    let postion = await client.getPositionInformationV3(symbol);
    console.log("Position Information:", postion.data);
    const response = await client.newOrder(symbol, side, "MARKET", {
      quantity: postion.data.length === 0 ? 6 : postion.data.positionAmt + 6,
      reduceOnly: false,
      newOrderRespType: "RESULT", // Ensures immediate execution response
    });

    console.log("Final Order Status:", response.data);
  } catch (error) {
    console.error("Error placing order:", error);
  }
}
