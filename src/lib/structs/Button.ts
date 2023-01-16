import { ButtonInteraction } from 'discord.js';
import client from '../../client';

abstract class Button {
  public readonly name: string;
  public client = client;

  constructor(name: string) {
    this.name = name;
  }

  abstract run(interaction: ButtonInteraction): unknown;
}

export default Button;
