import * as Debug from "./Debug";

export class Vector2 {
  constructor(public x: number, public y: number) {}
}

export function divNoNaN(a: number, b: number) {
  return (b !== 0) ? (a / b) : 0;
}

export function transformValueInRange(min1: number, max1: number, min2: number, max2: number, value: number): number {
  const pctInRange = (value - min1) / (max1 - min1);
  return min2 + (pctInRange * (max2 - min2))
}

export class LinearLeastSquaresResult {
  m: number;
  b: number;
  r2: number;
}
export function linearLeastSquares(points: Vector2[]): LinearLeastSquaresResult {
  Debug.assert(points != null);
  Debug.assert(points.length >= 2);

  let Sx = 0;
  for(let i = 0; i < points.length; i++) { Sx += points[i].x; }

  let Sy = 0;
  for (let i = 0; i < points.length; i++) { Sy += points[i].y; }

  let Sxy = 0;
  for (let i = 0; i < points.length; i++) { Sxy += (points[i].x * points[i].y); }

  let Sxx = 0;
  for (let i = 0; i < points.length; i++) { Sxx += (points[i].x * points[i].x); }

  let Syy = 0;
  for (let i = 0; i < points.length; i++) { Syy += (points[i].y * points[i].y); }

  const SxSx = Sx * Sx;
  const n = points.length;

  let regressionLine = new LinearLeastSquaresResult();
  let denominator = ((n * Sxx) - SxSx);
  regressionLine.b = ((Sy * Sxx) - (Sx * Sxy)) / denominator;
  regressionLine.m = ((n * Sxy) - (Sx * Sy)) / denominator;

  const r = ((n * Sxy) - (Sx * Sy)) / (Math.sqrt(((n * Sxx) - (Sx * Sx))) * Math.sqrt(((n * Syy) - (Sy * Sy))));

  regressionLine.r2 = r * r;

  return regressionLine;
}
export function movingDerivative(values: number[], h: number): number[] {
  Debug.assert(values !== null);
  Debug.assert(h > 0);

  if (values.length < 2) { return new Array<number>(values.length); }

  const lastIndex = values.length - 1;
  return values.map((value, index) => {
    if (index === 0) {
      // forward difference
      return (values[index + 1] - values[index]) / h;
    } else if (index === lastIndex) {
      // backward difference
      return (values[index] - values[index - 1]) / h;
    } else {
      // central difference
      return (values[index + 1] - values[index - 1]) / (2 * h);
    }
  });
}
export function movingSecondDerivative(values: number[], h: number): number[] {
  Debug.assert(values !== null);
  Debug.assert(h > 0);

  if (values.length < 3) { return new Array<number>(values.length); }

  const lastIndex = values.length - 1;
  const hSquared = h * h;
  return values.map((value, index) => {
    if (index === 0) {
      // forward
      return (values[index + 2] - (2 * values[index + 1]) + values[index]) / hSquared;
    } else if (index === lastIndex) {
      // backward
      return (values[index] - (2 * values[index - 1]) + values[index - 2]) / hSquared;
    } else {
      // central
      return (values[index + 1] - (2 * values[index]) + values[index - 1]) / hSquared;
    }
  });
}
export function sum(values: number[], startIndex: number, valueCount: number): number {
  Debug.assert(values !== null);
  Debug.assert(valueCount >= 1);
  Debug.assert((startIndex + valueCount) <= values.length);

  let valueSum = 0;
  
  const endIndexExclusive = startIndex + valueCount;
  for(let i = startIndex; i < endIndexExclusive; i++) {
    valueSum += values[i];
  }

  return valueSum;
}
export function min(values: number[], startIndex: number, valueCount: number): number {
  Debug.assert(values !== null);
  Debug.assert(valueCount >= 1);
  Debug.assert((startIndex + valueCount) <= values.length);

  const endIndexExclusive = startIndex + valueCount;
  let minValue = values[startIndex];

  for(let i = startIndex + 1; i < endIndexExclusive; i++) {
    if(values[i] < minValue) {
        minValue = values[i];
    }
  }

  return minValue;
}
export function max(values: number[], startIndex: number, valueCount: number): number {
  Debug.assert(values !== null);
  Debug.assert(valueCount >= 1);
  Debug.assert((startIndex + valueCount) <= values.length);

  const endIndexExclusive = startIndex + valueCount;
  let maxValue = values[startIndex];

  for(let i = startIndex + 1; i < endIndexExclusive; i++) {
    if(values[i] > maxValue) {
        maxValue = values[i];
    }
  }

  return maxValue;
}
export function mean(values: number[]): number {
  return sum(values, 0, values.length) / values.length;
}
export function meanArraySlice(values: number[], startIndex: number, valueCount: number): number {
  return sum(values, startIndex, valueCount) / valueCount;
}
export function populationVariance(values: number[], startIndex: number, valueCount: number): number {
  let result = 0;
  const mean = meanArraySlice(values, startIndex, valueCount);

  const exclusiveEndIndex = startIndex + valueCount;
  for(let i = startIndex; i < exclusiveEndIndex; i++) {
    const diffFromMean = values[i] - mean;
    result += diffFromMean * diffFromMean;
  }

  result /= valueCount;
  return result;
}
export function sampleVariance(values: number[], startIndex: number, valueCount: number): number {
  let result = 0;
  const mean = meanArraySlice(values, startIndex, valueCount);

  const exclusiveEndIndex = startIndex + valueCount;
  for(let i = startIndex; i < exclusiveEndIndex; i++) {
    const diffFromMean = values[i] - mean;
    result += diffFromMean * diffFromMean;
  }

  result /= (valueCount - 1);
  return result;
}
export function populationStandardDeviation(values: number[], startIndex: number, valueCount: number): number {
  return Math.sqrt(populationVariance(values, startIndex, valueCount));
}
export function sampleStandardDeviation(values: number[], startIndex: number, valueCount: number): number {
  return Math.sqrt(sampleVariance(values, startIndex, valueCount));
}
export function inRangeInclusive(value: number, min: number, max: number) {
  Debug.assert(max >= min);

  return (value >= min) && (value <= max);
}

export function laggingReduce<T>(
  values: number[],
  lookbacklength: number,
  reduceFunc: (values: number[], startIndex: number, count: number) => T
): T[] {
  Debug.assert(values !== null);
  Debug.assert(lookbacklength > 0);

  return values.map((value, currentValueIndex) => {
    const firstValueIndex = Math.max(currentValueIndex - (lookbacklength - 1), 0);
    const valueCount = (currentValueIndex - firstValueIndex) + 1;

    return reduceFunc(values, firstValueIndex, valueCount);
  });
}
export function laggingSimpleMovingAverage(values: number[], lookbacklength: number): number[] {
  return laggingReduce(values, lookbacklength, meanArraySlice);
}
export function laggingExponentialMovingAverage(values: number[], lookbacklength: number): number[] {
  Debug.assert(values !== null);
  Debug.assert(lookbacklength > 0);

  if(values.length === 0) { return new Array<number>(0); }

  const alpha = 2.0 / (lookbacklength + 1); // smoothing factor
  let ema = new Array<number>(values.length);

  ema[0] = values[0];

  for(let i = 1; i < values.length; i++) {
    ema[i] = ((1.0 - alpha) * ema[i - 1]) + (alpha * values[i]);
  }

  return ema;
}

export function stochasticOscillator(values: number[], lookbacklength: number): number[] {
  return laggingReduce(values, lookbacklength, (values, startIndex, count) => {
  const endIndexExclusive = startIndex + count;
  const curVal = values[endIndexExclusive - 1];
  const low = min(values, startIndex, count);
  const high = max(values, startIndex, count);
  const valRange = high - low;

  return (valRange > 0) ? ((curVal - low) / (high - low)) : 0;
  });
}