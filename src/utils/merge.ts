/**
 * Merges two arrays of objects (`arrayA` and `arrayB`) into one, resolving conflicts based on a key returned by the `callbackFn`.
 * For objects with the same key, properties from the objects in the second array (`arrayB`) overwrite those in the first (`arrayA`).
 * From: https://stackoverflow.com/a/78226695
 * 
 * @template TItem Extends object, the type of elements in the arrays to be merged.
 * @template TKey The type of the key used to identify unique objects.
 * @param {TItem[]} arrayA The first array of objects to merge.
 * @param {TItem[]} arrayB The second array of objects to merge.
 * @param {(value: TItem) => TKey} callbackFn A callback function that generates a key for each object based on its value. Used to identify and resolve conflicts between objects.
 * @returns {TItem[]} A new array containing merged objects from `arrayA` and `arrayB`. In case of conflicts, properties from `arrayB` objects take precedence.
 * @example
 *
 * const mergedArray = merge(
 *   [{ id: 1, name: "John" }, { id: 2, name: "Alice" }],
 *   [{ id: 1, age: 18 }, { id: 3, name: "Bob" }],
 *   (element) => element.id
 * );
 * // [{ id: 1, name: "John", age: 18 }, { id: 2, name: "Alice" }, { id: 3, name: "Bob" }]
 */
export function merge<TItem extends object, TKey>(
  arrayA: TItem[],
  arrayB: TItem[],
  callbackFn: (value: TItem) => TKey
): TItem[] {
  const map = new Map<TKey, TItem>();

  arrayA.forEach((item) => {
    const key = callbackFn(item);
    map.set(key, item);
  });

  arrayB.forEach((item) => {
    const key = callbackFn(item);
    const oldItem = map.get(key);
    map.set(key, { ...oldItem, ...item });
  });

  return Array.from(map.values());
}