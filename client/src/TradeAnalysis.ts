import * as Utils from "./Utils";
import * as ArrayUtils from "./ArrayUtils";
import * as Maths from "./Maths";

export class TradeAnalysis {
  securitySymbol: string;
  exchangeName: string;
  timeframe: string;

  openTimes: number[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];

  heikinOpens: number[];
  heikinHighs: number[];
  heikinLows: number[];
  heikinCloses: number[];

  isLocalMinima: boolean[];
  isLocalMaxima: boolean[];

  linRegSlopePctClose: number[];
  linRegSlopePctCloseConcavity: number[];
  linRegSlopePctCloseMulVolumeMean: number[];

  sma50: number[];
  sma50Derivative1st: number[];
  sma50Derivative2nd: number[];

  sma20: number[];
  sma20Derivative1st: number[];
  sma20Derivative2nd: number[];

  stochasticClose: number[];
  stochasticVolume: number[];

  isVolumeAbnormal: boolean[];
  didVolumeDrop: boolean[];

  bullishness: number[];

  constructor(
    securitySymbol: string,
    exchangeName: string,
    timeframe: string,
    openTimes: number[],
    opens: number[],
    highs: number[],
    lows: number[],
    closes: number[],
    volumes: number[]) {
      this.securitySymbol = securitySymbol;
      this.exchangeName = exchangeName;
      this.timeframe = timeframe;
      
      this.openTimes = openTimes;
      this.opens = opens;
      this.highs = highs;
      this.lows = lows;
      this.closes = closes;
      this.volumes = volumes;

      this.calculateHeikinAshiCandlesticks();

      //this.isGreens = areConsecutiveBullishCandlesticks(4, this.opens, this.closes);
      const extremaRadius = 3;
      this.isLocalMinima = Utils.areLocalMinima(extremaRadius, this.lows);
      this.isLocalMaxima = Utils.areLocalMaxima(extremaRadius, this.highs);
      Utils.consolidateAdjacentExtrema(this.lows, this.isLocalMinima, this.highs, this.isLocalMaxima);

      const linRegLookbackLength = 8;
      this.linRegSlopePctClose = Utils.lineOfBestFitPercentCloseSlopes(this.closes, linRegLookbackLength);
      this.linRegSlopePctCloseConcavity = Maths.movingSecondDerivative(
        this.linRegSlopePctClose, 1
      );
      this.linRegSlopePctCloseMulVolumeMean = ArrayUtils.combineArrays(
        this.linRegSlopePctClose,
        Maths.laggingReduce(this.volumes, linRegLookbackLength, Maths.meanArraySlice),
        (e1, e2) => e1 * e2
      );

      this.sma20 = Maths.laggingSimpleMovingAverage(this.closes, 20);
      this.sma20Derivative1st = Maths.movingDerivative(this.sma20, 1);
      this.sma20Derivative2nd = Maths.movingSecondDerivative(this.sma20, 1);

      this.sma50 = Maths.laggingSimpleMovingAverage(this.closes, 50);
      this.sma50Derivative1st = Maths.movingDerivative(this.sma50, 1);
      this.sma50Derivative2nd = Maths.movingSecondDerivative(this.sma50, 1);

      this.stochasticClose = Maths.laggingStochasticOscillator(this.closes, linRegLookbackLength);
      this.stochasticVolume = Maths.laggingStochasticOscillator(this.volumes, linRegLookbackLength);

      this.isVolumeAbnormal = Maths.laggingReduce(this.volumes, linRegLookbackLength, (values, startIndex, count) => {
        if(count < linRegLookbackLength) { return false; }

        const mean = Maths.meanArraySlice(values, startIndex, count - 1);
        const stdev = Maths.populationStandardDeviation(values, startIndex, count - 1);

        return !Maths.inRangeInclusive(
          this.volumes[startIndex + count - 1],
          mean - (3 * stdev),
          mean + (3 * stdev)
        );
      });

      this.didVolumeDrop = new Array<boolean>(this.candlestickCount);
      for(let i = 0; i < this.candlestickCount; i++) {
        this.didVolumeDrop[i] = (i > 0) ? (Maths.divNoNaN(this.volumes[i], this.volumes[i - 1]) < 0.5) : false;
      }

      this.bullishness = new Array<number>(this.candlestickCount);
      for(let i = 0; i < this.candlestickCount; i++) {
        const signedBodyLengthPctClose = (this.closes[i] - this.opens[i]) / this.closes[i];
        const signedBodyLengthPctCloseMulVolume = signedBodyLengthPctClose * this.volumes[i];

        this.bullishness[i] = (
          (0.0005 * signedBodyLengthPctCloseMulVolume) +
          (1 * this.linRegSlopePctClose[i])
        );
      }
  }

  get candlestickCount() {
    return this.opens.length;
  }

  private calculateHeikinAshiCandlesticks() {
    this.heikinOpens = new Array<number>(this.candlestickCount);
    this.heikinHighs = new Array<number>(this.candlestickCount);
    this.heikinLows = new Array<number>(this.candlestickCount);
    this.heikinCloses = new Array<number>(this.candlestickCount);

    if(this.candlestickCount === 0) { return; }

    this.heikinOpens[0] = this.opens[0];
    this.heikinHighs[0] = this.highs[0];
    this.heikinLows[0] = this.lows[0];
    this.heikinCloses[0] = this.closes[0];
    
    for(let i = 1; i < this.candlestickCount; i++) {
      this.heikinCloses[i] = (this.opens[i] + this.highs[i] + this.lows[i] + this.closes[i]) / 4;
      this.heikinOpens[i] = (this.heikinOpens[i - 1] + this.heikinCloses[i - 1]) / 2;
      this.heikinHighs[i] = Math.max(this.highs[i], this.heikinOpens[i], this.heikinCloses[i]);
      this.heikinLows[i] = Math.min(this.lows[i], this.heikinOpens[i], this.heikinCloses[i]);
    }
  }
}