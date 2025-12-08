/**
 * Minimal component base to mimic a React-style lifecycle without a framework.
 * Components manage their own state and rendering target.
 */
export abstract class Component<State = Record<string, unknown>> {
  protected state: State;
  private container: HTMLElement | null = null;

  constructor(initialState: State) {
    this.state = initialState;
  }

  /** Return the HTML string for this component. */
  abstract render(): string;

  /** Optional hook after the component is attached to the DOM. */
  mount?(container: HTMLElement): void;

  /** Optional hook before the component is removed. */
  cleanup?(): void;

  /** Attach the component to a container and run lifecycle hooks. */
  attachTo(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = this.render();
    if (this.mount) {
      this.mount(container);
    }
  }

  /** Unmount component and clear container. */
  detach(): void {
    if (this.cleanup) {
      this.cleanup();
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
  }

  /** Merge partial state and re-render. */
  protected setState(partial: Partial<State>): void {
    this.state = { ...this.state, ...partial };
    if (this.container) {
      this.attachTo(this.container);
    }
  }
}
