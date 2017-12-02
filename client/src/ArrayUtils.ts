import * as Debug from "./Debug";

export function arraySliceAll<T>(predicate: (x: T) => boolean, array: T[], sliceStartIndex: number, sliceLength: number) {
  Debug.assert(sliceStartIndex >= 0);
  Debug.assert((sliceStartIndex + sliceLength) <= array.length);

  for (let i = sliceStartIndex; i < (sliceStartIndex + sliceLength); i++) {
    if (!predicate(array[i])) {
      return false;
    }
  }

  return true;
}
export function generateArray<T>(arrayLength: number, genElementFunc: (index: number) => T): T[] {
  let array = new Array<T>(arrayLength);

  for(let i = 0; i < arrayLength; i++) {
    array[i] = genElementFunc(i);
  }

  return array;
}
export function combineArrays<T1, T2, TR>(arr1: T1[], arr2: T2[], combineFunc: (e1: T1, e2: T2, i: number) => TR): TR[] {
  Debug.assert(arr1.length === arr2.length);

  let result = new Array<TR>(arr1.length);

  for(let i = 0; i < result.length; i++) {
    result[i] = combineFunc(arr1[i], arr2[i], i);
  }

  return result;
}