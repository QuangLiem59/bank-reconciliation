export interface BaseTransformerInterface<T, U> {
  transform(input: T): Promise<U>;
  getMeta(): { availableIncludes: string[]; defaultIncludes: string[] };
}
