import "dotenv/config";
import axios from "axios";
import WebSocket from "ws";
import { EMA } from "technicalindicators";
import http from "http";

import { executeTrade } from "./executeTrade.js";

const API_KEY =
  "YbVqsurBtsZ3dBgEkASnhB45cQUpxdwLolHitovPdC3Ttgh2axEoKNZev11CNPAb"; // Apna Binance API Key yahan daalen
const SECRET_KEY =
  "G5XjXlVi53OZuIeSqTayDKGtU1dj12gjgOiM0fUhau5hvN11HwQSUqGJJGYFRqOu"; // Apna Binance Secret Key yahan daalen
const BASE_URL = "https://fapi.binance.com"; // Binance Futures base URL
const SYMBOL = "XRPUSDT"; // Trading pair for Futures
const TRADE_AMOUNT_IN_USDT = 1; // USDT mein trading amount
const LEVERAGE = 10; // Leverage for Futures trading

let candles = [];
let orderId = null;
let EMA9 = 0;
let EMA21 = 0;
let previousEMA9 = null;
let previousEMA21 = null;

let symbol = "XRPUSDT";
let TRADE_AMOUNT = 0;

console.log("🚀 Binance Trading Bot is running...");
console.log("📡 Connecting to WebSocket...");

// EMA Calculation Function
function calculateEMA(closes, period, callback) {
  const emaArray = EMA.calculate({ period: period, values: closes });
  callback(emaArray[emaArray.length - 1]);
}

// Check EMA Values and Execute Trades
async function checkEMAValues() {
  if (previousEMA9 !== null && previousEMA21 !== null) {
    if (previousEMA9 < previousEMA21 && EMA9 > EMA21) {
      console.log("📈 9EMA crossed above 21EMA -> Buy Signal");
      executeTrade("BUY", symbol);
    } else if (previousEMA9 > previousEMA21 && EMA9 < EMA21) {
      console.log("📉 9EMA crossed below 21EMA -> Sell Signal");
      executeTrade("SELL", symbol);
    }
  }
  previousEMA9 = EMA9;
  previousEMA21 = EMA21;
}

// Fetch historical data (Klines) for Futures
async function fetchKlines() {
  try {
    const response = await axios.get(`${BASE_URL}/fapi/v1/klines`, {
      params: { symbol: SYMBOL, interval: "5m", limit: 25 },
    });

    candles = response.data.map((k) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    const currentPrice = candles[candles.length - 1].close;
    TRADE_AMOUNT = (TRADE_AMOUNT_IN_USDT / currentPrice).toFixed(6);
    console.log(`💰 Trading amount (${SYMBOL}): ${TRADE_AMOUNT}`);
  } catch (error) {
    if (error.response) {
      // Server responded with a status other than 200 range
      console.error("❌ Error fetching K-lines:", error.response.data);
    } else if (error.request) {
      // Request was made but no response was received
      console.error("❌ Network error fetching K-lines:", error.message);
    } else {
      // Something else happened
      console.error("❌ Unexpected error fetching K-lines:", error.message);
    }
  }
}

// WebSocket connection for real-time Futures data
function connectWebSocket() {
  const ws = new WebSocket(
    `wss://fstream.binance.com/ws/${SYMBOL.toLowerCase()}@kline_5m`
  );
  ws.onopen = () => console.log("✅ Connected to Binance Future WebSocket");
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.k && data.k.x) {
      // Jab candle close ho jaye
      const kline = {
        time: data.k.t,
        open: parseFloat(data.k.o),
        high: parseFloat(data.k.h),
        low: parseFloat(data.k.l),
        close: parseFloat(data.k.c),
        volume: parseFloat(data.k.v),
      };
      candles.push(kline);
      if (candles.length > 25) candles.shift();
      const closePrices = candles.map((c) => c.close);
      if (closePrices.length > 25) closePrices.shift();
      calculateEMA(closePrices, 9, (result) => {
        EMA9 = result;
        console.log("EMA9:", EMA9);
        calculateEMA(closePrices, 21, (result) => {
          EMA21 = result;
          console.log("EMA21:", EMA21);
          checkEMAValues();
        });
      });
    }
  };
  ws.onclose = () => {
    console.error("⚠️ WebSocket Disconnected. Reconnecting in 5 seconds...");
    setTimeout(connectWebSocket, 5000);
  };
  ws.onerror = (error) => console.error("❌ WebSocket Error:", error.message);
}

// Heartbeat (Status check every minute)
setInterval(() => {
  console.log(
    `💓 Heartbeat: Bot is running at ${new Date().toLocaleTimeString()}`
  );
}, 60000);

(async () => {
  await fetchKlines();
  // await executeTrade("BUY", symbol);
  connectWebSocket();
})();

// 🛠 HTTP Server for Uptime Monitoring
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running\n");
});

server.listen(8080, () => {
  console.log("🌐 HTTP server is running on port 8080");
});
