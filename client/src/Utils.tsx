import * as Debug from "./Debug";
import * as ArrayUtils from "./ArrayUtils";
import * as Maths from "./Maths";

export function isAlpha(char: string): boolean {
  return /^[A-Z]$/i.test(char);
}
export function isDigit(char: string): boolean {
  return /^[0-9]$/.test(char);
}
export function isWhiteSpace(char: string): boolean {
  return /^\s$/.test(char);
}

export function forEachBreakableMap<K, V>(x: Map<K, V>, iteratee: (key: K, value: V) => boolean) {
  let hasExecutedBreak = false;

  x.forEach((value, key) => {
    if(hasExecutedBreak) { return; }

    if(!iteratee(key, value)) { hasExecutedBreak = true; }
  });
}
export function mapMap<K, V, V2>(x: Map<K, V>, iteratee: (key: K, value: V) => V2): Map<K, V2> {
  let newMap = new Map<K, V2>();

  x.forEach((value, key) => {
    newMap.set(key, iteratee(key, value));
  });

  return newMap;
}

export function unwrapMaybe<T>(value: T | null): T {
  if(value) {
    return value;
  } else {
    throw new Error("Tried to unwrap a null value.");
  }
}

export enum ExtremaType {
  MINIMA,
  MAXIMA
}

export function areLocalMinima(valueRadius: number, values: number[]): boolean[] {
  Debug.assert(valueRadius >= 1);

  const windowSize = (2 * valueRadius) + 1;
  const maxIndex = values.length - 1;
  return values.map((value, index) => ((index >= valueRadius) && (index <= (maxIndex - valueRadius)))
    ? ArrayUtils.arraySliceAll(otherValue => (otherValue >= value), values, index - valueRadius, windowSize)
    : false
  );
}
export function areLocalMaxima(valueRadius: number, values: number[]): boolean[] {
  Debug.assert(valueRadius >= 1);

  const windowSize = (2 * valueRadius) + 1;
  const maxIndex = values.length - 1;
  return values.map((value, index) => ((index >= valueRadius) && (index <= (maxIndex - valueRadius)))
    ? ArrayUtils.arraySliceAll(otherValue => (otherValue <= value), values, index - valueRadius, windowSize)
    : false
  );
}
export function consolidateAdjacentExtrema(
  valuesForMinima: number[],
  areLocalMinima: boolean[],
  valuesForMaxima: number[],
  areLocalMaxima: boolean[]
) {
  const valueCount = valuesForMinima.length;
  let lastExtremaType: ExtremaType | null = null;
  let lastExtremaIndex = -1;

  for(let i = 0; i < valueCount; i++) {
    if(areLocalMinima[i]) {
      if(lastExtremaType !== ExtremaType.MINIMA) {
        // This minima is NOT adjacent to another minima.
        lastExtremaIndex = i;
      } else {
        // Only retain the lower (or later if equal) of the two minima.
        if(valuesForMinima[i] <= valuesForMinima[lastExtremaIndex]) {
          areLocalMinima[lastExtremaIndex] = false;        
          lastExtremaIndex = i;
        } else {
          areLocalMinima[i] = false;
        }
      }

      lastExtremaType = ExtremaType.MINIMA;            
    }
    
    // not else-if because a candlestick can be a low AND a high
    if(areLocalMaxima[i]) {
      if(lastExtremaType !== ExtremaType.MAXIMA) {
        // This maxima is NOT adjacent to another maxima.
        lastExtremaIndex = i;
      } else {
        // Only retain the higher (or later if equal) of the two maxima.
        if(valuesForMaxima[i] >= valuesForMaxima[lastExtremaIndex]) {
          areLocalMaxima[lastExtremaIndex] = false;        
          lastExtremaIndex = i;
        } else {
          areLocalMaxima[i] = false;
        }
      }

      lastExtremaType = ExtremaType.MAXIMA; 
    }
  }
}

export class Extrema {
  constructor(public type: ExtremaType, public value: number, public index: number) {}
}

export function areMinimaMaximaToExtremas(
  valuesForMinima: number[],
  areLocalMinima: boolean[],
  valuesForMaxima: number[],
  areLocalMaxima: boolean[]
): Extrema[] {
  let extrema = new Array<Extrema>();

  const valueCount = valuesForMinima.length;
  for(let i = 0; i < valueCount; i++) {
    if(areLocalMinima[i]) {
      extrema.push(new Extrema(ExtremaType.MINIMA, valuesForMinima[i], i));
    }

    if(areLocalMaxima[i]) {
      extrema.push(new Extrema(ExtremaType.MAXIMA, valuesForMaxima[i], i));
    }
  }

  return extrema;
}

export function lineOfBestFitSlopes(values: number[], linRegValueCount: number): number[] {
  return values.map((value, i) => {
    const startValueIndex = Math.max(i - (linRegValueCount - 1), 0);
    const pointCount = 1 + (i - startValueIndex);

    if(pointCount < linRegValueCount) { return 0; }

    let points = new Array<Maths.Vector2>(pointCount);

    for(let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
      points[pointIndex] = new Maths.Vector2(pointIndex, values[startValueIndex + pointIndex]);
    }

    return Maths.linearLeastSquares(points).m;
  });
}

export function lineOfBestFitPercentCloseSlopes(closes: number[], linRegCandleCount: number): number[] {
  const slopes = lineOfBestFitSlopes(closes, linRegCandleCount);

  return slopes.map((m, i) => m / closes[i]);
}

export function areConsecutiveBullishCandlesticks(windowSize: number, opens: number[], closes: number[]): boolean[] {
  Debug.assert(windowSize >= 1);
  Debug.assert(opens.length === closes.length);

  const candlestickCount = opens.length;
  let result = new Array(candlestickCount);

  for (let curI = 0; curI < candlestickCount; curI++) {
    if (curI < (windowSize - 1)) {
      result[curI] = false;
      continue;
    }

    result[curI] = true;

    for (let pastI = (curI - (windowSize - 1)); pastI <= curI; pastI++) {
      if (closes[pastI] <= opens[pastI]) {
        result[curI] = false;
        break;
      }
    }
  }

  return result;
}

export function iFromRightToColumnX(chartWidth: number, columnWidth: number, scrollOffsetInColumns: number, iFromRight: number): number {
  const rightmostColumnX = chartWidth - columnWidth;
  const columnX = rightmostColumnX - ((iFromRight + scrollOffsetInColumns) * columnWidth);

  return columnX;
}

export function xToColumnIndex(chartWidth: number, columnWidth: number, columnCount: number, scrollOffsetInColumns: number, x: number): number {
  const xFromRight = x - chartWidth;
  const unscrolledIFromRight = Math.ceil(xFromRight / columnWidth);
  const scrolledIFromRight = unscrolledIFromRight + scrollOffsetInColumns;

  return (columnCount - 1) + scrolledIFromRight;
}

export const COLUMN_HIGHLIGHT_FILL_STYLE = "rgba(0, 0, 0, 0.2)";