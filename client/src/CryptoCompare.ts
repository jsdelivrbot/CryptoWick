import { TradeAnalysis } from "./TradeAnalysis";

export function loadAggregate1MinCandlesticks(fromSymbol: string, toSymbol: string, exchangeName: string, minutesPerCandlestick: number): Promise<TradeAnalysis> {
  return fetch(`https://min-api.cryptocompare.com/data/histominute?fsym=${fromSymbol}&tsym=${toSymbol}&aggregate=${minutesPerCandlestick}&e=${exchangeName}`)
    .then(response => {
      if (!response.ok) {
        console.log("Error fetching data from CryptoWatch.");
        return;
      }

      return response.json();
    }).then(json => {
      if ((json.Response !== "Success") || (json.Type < 100)) {
        console.log(`Error fetching data from CryptoWatch. Response = ${json.Response}, Type = ${json.Type}`);
      }

      const candlestickCount: number = json.Data.length;
      
      let openTimes = new Array(candlestickCount);
      let opens = new Array(candlestickCount);
      let highs = new Array(candlestickCount);
      let lows = new Array(candlestickCount);
      let closes = new Array(candlestickCount);
      let volumes = new Array(candlestickCount);

      for (let i = 0; i < json.Data.length; i++) {
        openTimes[i] = json.Data[i].time;
        opens[i] = json.Data[i].open;
        highs[i] = json.Data[i].high;
        lows[i] = json.Data[i].low;
        closes[i] = json.Data[i].close;
        volumes[i] = json.Data[i].volumefrom;
      }

      return new TradeAnalysis(fromSymbol + toSymbol, exchangeName, `${minutesPerCandlestick}m`, openTimes, opens, highs, lows, closes, volumes);
    });
}