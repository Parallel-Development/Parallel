import { ButtonInteraction } from "discord.js";

abstract class Button {
  public associatedIds: string[];

  constructor(...ids: string[]) {
    this.associatedIds = ids;
  }

  abstract run(interaction: ButtonInteraction<'cached'>): unknown;
}

export default Button;