export function assert(condition: boolean) {
  if (!condition) {
    throw new Error(`Failed assertion.`);
  }
}