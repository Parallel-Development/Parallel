import { ModalSubmitInteraction } from "discord.js";

abstract class Modal {
  public readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract run(interaction: ModalSubmitInteraction<'cached'>): unknown;
}

export default Modal;