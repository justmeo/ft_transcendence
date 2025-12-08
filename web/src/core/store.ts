type Listener<T> = (value: T) => void;

/**
 * Lightweight observable store for shared state without frameworks.
 */
export class Store<T> {
  private value: T;
  private listeners = new Set<Listener<T>>();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get(): T {
    return this.value;
  }

  set(next: T): void {
    this.value = next;
    this.listeners.forEach((fn) => fn(this.value));
  }

  update(updater: (current: T) => T): void {
    this.set(updater(this.value));
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    listener(this.value);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
