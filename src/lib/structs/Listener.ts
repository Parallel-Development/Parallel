abstract class Listener {
  public readonly name: string;
  public readonly once: boolean;

  constructor(name: string, once: boolean = false) {
    this.name = name;
    this.once = once;
  }

  abstract run(...args: any[]): unknown;
}

export default Listener;