import * as Utils from "./Utils";
import { TradeAnalysis } from "./TradeAnalysis";

export const ALGORITHM_USD_TO_BUY = 50;

export class TradingAlgorithmState {
  isInTrade: boolean;
  stopLossPrice: number;
  minTakeProfitPrice: number;
  trailingStopLossPrice: number;
}

export function updateTradingAlgorithm(
  state: TradingAlgorithmState,
  tradeAnalysis: TradeAnalysis,
  curCandlestickIndex: number,
  tryBuy: () => Promise<boolean>,
  trySell: () => Promise<boolean>
): Promise<any> {
  const curPrice = tradeAnalysis.closes[curCandlestickIndex];

  const smaDerivativePctCloseThreshold = 0.04 / 100;

  const shouldEnterSmaPositive = () => {
    const ddt = tradeAnalysis.sma50Derivative1st[curCandlestickIndex];
    const close = tradeAnalysis.closes[curCandlestickIndex];
    const sma50DerivativePctClose = ddt / close;

    return sma50DerivativePctClose >= smaDerivativePctCloseThreshold;
  };
  const shouldExitSmaNegative = () => {
    const ddt = tradeAnalysis.sma50Derivative1st[curCandlestickIndex];
    const close = tradeAnalysis.closes[curCandlestickIndex];
    const sma50DerivativePctClose = ddt / close;
    
    return sma50DerivativePctClose <= -smaDerivativePctCloseThreshold;
  };

  const shouldEnter3Extrema = () => {
    const extrema = Utils.areMinimaMaximaToExtremas(
      tradeAnalysis.lows, tradeAnalysis.isLocalMinima, tradeAnalysis.highs, tradeAnalysis.isLocalMaxima
    ).filter(x => x.index <= curCandlestickIndex);

    if(extrema.length < 3) { return false; }

    const e1 = extrema[extrema.length - 3];
    const e2 = extrema[extrema.length - 2];
    const e3 = extrema[extrema.length - 1];
    
    if(!(
      (e1.type === Utils.ExtremaType.MINIMA) &&
      (e2.type === Utils.ExtremaType.MAXIMA) &&
      (e3.type === Utils.ExtremaType.MINIMA)
    )) {
      return false;
    }
    
    const lowsPriceIncreasePercent = (e3.value - e1.value) / e1.value;
    const lowsPriceIncreasePercentPerCandlestick = lowsPriceIncreasePercent / (e3.index - e1.index);
    const priceIncreasePercentPerCandlestickThreshold = 0.05 / 100;

    return lowsPriceIncreasePercentPerCandlestick >= priceIncreasePercentPerCandlestickThreshold;
  };
  const shouldEnter4Extrema = () => {
    const extrema = Utils.areMinimaMaximaToExtremas(
      tradeAnalysis.lows, tradeAnalysis.isLocalMinima, tradeAnalysis.highs, tradeAnalysis.isLocalMaxima
    ).filter(x => x.index <= curCandlestickIndex);

    if(extrema.length < 4) { return false; }

    const e1 = extrema[extrema.length - 4];
    const e2 = extrema[extrema.length - 3];
    const e3 = extrema[extrema.length - 2];
    const e4 = extrema[extrema.length - 1];
    
    if(!(
      (e1.type === Utils.ExtremaType.MAXIMA) &&
      (e2.type === Utils.ExtremaType.MINIMA) &&
      (e3.type === Utils.ExtremaType.MAXIMA) &&
      (e4.type === Utils.ExtremaType.MINIMA)
    )) {
      return false;
    }
    
    const lowsPriceIncreasePercent = (e4.value - e2.value) / e2.value;
    const lowsPriceIncreasePercentPerCandlestick = lowsPriceIncreasePercent / (e4.index - e2.index);

    const highsPriceIncreasePercent = (e3.value - e1.value) / e3.value;
    const highsPriceIncreasePercentPerCandlestick = highsPriceIncreasePercent / (e3.index - e1.index);

    const priceIncreasePercentThresholdPerCandlestick = 0.05 / 100;

    return (
      (lowsPriceIncreasePercentPerCandlestick >= priceIncreasePercentThresholdPerCandlestick) &&
      (highsPriceIncreasePercentPerCandlestick >= priceIncreasePercentThresholdPerCandlestick)
    );
  };
  const shouldEnter2 = () => {
    const isBearishMinus2 = tradeAnalysis.heikinCloses[curCandlestickIndex - 2] < tradeAnalysis.heikinOpens[curCandlestickIndex - 2];
    const isBullishMinus1 = tradeAnalysis.heikinCloses[curCandlestickIndex - 1] > tradeAnalysis.heikinOpens[curCandlestickIndex - 1];
    
    const signedBodyHeight = tradeAnalysis.heikinCloses[curCandlestickIndex] - tradeAnalysis.heikinOpens[curCandlestickIndex];
    const signedBodyHeightPctOfOpen = signedBodyHeight / tradeAnalysis.heikinOpens[curCandlestickIndex];
    const isGreenNonHeikin = tradeAnalysis.closes[curCandlestickIndex] > tradeAnalysis.opens[curCandlestickIndex];
    const isBullishEnough = signedBodyHeightPctOfOpen > (0.25 / 100);

    return isBearishMinus2 && isBullishMinus1 && isGreenNonHeikin && isBullishEnough;
  };

  const shouldExitStopLoss = () => {
    return curPrice <= state.stopLossPrice;
  };
  const shouldExitTrailingStopLoss = () => {
    return curPrice <= state.trailingStopLossPrice;
  };
  
  const shouldEnter = shouldEnterSmaPositive;
  const shouldExit = () => shouldExitSmaNegative();
  // NOTE: if using stop losses, refreshing the page loses stop loss price levels!!!

  if(!state.isInTrade) {
    // look for entry
    if(curCandlestickIndex === 0) { return Promise.resolve(); }

    if(shouldEnter()) {
      const stopLossDropPercent = 2 / 100;
      const minTakeProfitRisePercent = 1 / 100;

      state.stopLossPrice = (1 - stopLossDropPercent) * curPrice;
      state.minTakeProfitPrice = (1 + minTakeProfitRisePercent) * curPrice;
      state.trailingStopLossPrice = state.stopLossPrice;

      return tryBuy()
      .then(succeeded => {
        if(succeeded) {
          state.isInTrade = true;
        }
      })
      .catch(error => {
        return Promise.resolve();
      });
    }

    return Promise.resolve();
  } else {
    if(shouldExit()) {
      return trySell()
        .then(succeeded => {
          if(succeeded) {
            state.isInTrade = false;
          }
        })
        .catch(error => {
          return Promise.resolve();
        });
    } else if(curPrice >= state.minTakeProfitPrice) {
      const trailingStopLossPercentLag = 1 / 100;
      state.trailingStopLossPrice = Math.max((1 - trailingStopLossPercentLag) * curPrice, state.minTakeProfitPrice);
    }
    
    return Promise.resolve();
  }
}