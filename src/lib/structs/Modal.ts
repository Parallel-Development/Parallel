import { ModalSubmitInteraction } from 'discord.js';
import client from '../../client';

abstract class Modal {
  public readonly name: string;
  public client = client;

  constructor(name: string) {
    this.name = name;
  }

  abstract run(interaction: ModalSubmitInteraction): unknown;
}

export default Modal;
