import { HmacSHA384, enc } from "crypto-js";

export function loadAccountBalances(apiKey: string, apiSecret: string) {
  const payload = {
    request: "/v1/balances",
    nonce: nextNonce()
  };

  return callGeminiPrivateApi(apiKey, apiSecret, "https://api.gemini.com/v1/balances", payload)
    .then(response => {
      if (!response.ok) {
        throw new Error("Error fetching data from Gemini.");
      }

      return response.json();
    }).then(json => {
      const findBalanceObj = (currency: string) => (json as Array<any>).find(balanceObj => balanceObj.currency === currency);
      
      return {
        USD: findBalanceObj("USD").available,
        BTC: findBalanceObj("BTC").available,
        ETH: findBalanceObj("ETH").available
      };
    });
}
export function buyCurrencyThroughGemini(apiKey: string, apiSecret: string, symbol: string, amount: number, price: number) : Promise<Response> {
  return geminiNewOrder(apiKey, apiSecret, symbol, "buy", amount, price);
}
export function sellCurrencyThroughGemini(apiKey: string, apiSecret: string, symbol: string, amount: number, price: number) : Promise<Response> {
  return geminiNewOrder(apiKey, apiSecret, symbol, "sell", amount, price);
}
export function geminiNewOrder(apiKey: string, apiSecret: string, symbol: string, side: string, amount: number, price: number) : Promise<Response> {
  const nonce = nextNonce();
  const clientOrderId = nonce.toString();

  const payload = {
    request: "/v1/order/new",
    nonce: nonce,
    client_order_id: clientOrderId,
    symbol: symbol,
    amount: amount.toString(),
    price: price.toString(),
    side: side,
    type: "exchange limit",
    options: ["immediate-or-cancel"]
  };

  return callGeminiPrivateApi(apiKey, apiSecret, "https://api.gemini.com/v1/order/new", payload);
}

export function callGeminiPrivateApi(apiKey: string, apiSecret: string, url: string, payload: any) : Promise<Response> {
  const jsonPayload = JSON.stringify(payload);
  const base64JsonPayload = btoa(jsonPayload);
  const hashedSignatureBytes = HmacSHA384(base64JsonPayload, apiSecret);
  const signature = enc.Hex.stringify(hashedSignatureBytes);

  const proxyUrl = "http://localhost:8080/" + url;

  return fetch(proxyUrl, {
    method: "POST",
    headers: {
      "X-GEMINI-APIKEY": apiKey,
      "X-GEMINI-PAYLOAD": base64JsonPayload,
      "X-GEMINI-SIGNATURE": signature
    },
    body: ""
  });
}

let lastNonce = 0;
function nextNonce(): number {
  var newNonce = (new Date()).getTime();
  newNonce = Math.max(newNonce, lastNonce + 1); // Ensure the nonce is monotonically increasing.

  lastNonce = newNonce;

  return newNonce;
}
