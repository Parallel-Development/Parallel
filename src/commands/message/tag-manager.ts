import { PermissionFlagsBits as Permissions, Message } from 'discord.js';
import Command, { data, properties } from '../../lib/structs/Command';
import { bin } from '../../lib/util/functions';

@properties<true>({
  name: 'tag-manager',
  description: 'Manage tags in the guild. Tags are (typically) informational text that can be referenced.',
  args: ['create [name] [content]', 'delete [name]', 'rename [name] [new_name]', 'edit [name] [new_content]'],
  aliases: ['tags']
})
class TagManagerCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw "Missing a command option. See this command's help menu to see all options.";

    switch (args[0]) {
      case 'create': {
        if (args.length === 1) throw 'Missing required arguments `name` and `content`.';
        if (args.length === 2) throw 'Missing required argument `content`.';

        const name = args[1];
        const content = args.slice(2).join(' ');

        if (name.length > 30) throw `The name may only be a maximum of 30 characters (${name.length} provided.)`;
        if (content.length > 1880)
          throw `The content may only be a maximum of 1880 characters (${content.length} provided.)`;

        await this.client.db.tag
          .create({
            data: {
              guildId: message.guildId,
              name,
              content
            }
          })
          .catch(() => {
            throw 'A tag with that name already exists.';
          });

        return message.reply(`Created tag \`${name}\`.`);
      }
      case 'delete': {
        if (args.length === 1) throw 'Missing required arguments `name` and `content`.';
        const name = args[1];

        const deleted = await this.client.db.tag.deleteMany({
          where: {
            guildId: message.guildId,
            name
          }
        });

        if (deleted.count === 0) throw 'Tag does not exist.';

        return message.reply('Tag deleted.');
      }
      case 'rename': {
        if (args.length === 1) throw 'Missing required arguments `name` and `new_name`.';
        if (args.length === 2) throw 'Missing required argument `new_name`.';

        const name = args[1];
        const newName = args[2];

        await this.client.db.tag
          .update({
            where: {
              guildId_name: { guildId: message.guildId, name }
            },
            data: {
              name: newName
            }
          })
          .catch(() => {
            throw 'Tag does not exist.';
          });

        return message.reply(`Tag renamed to \`${newName}\``);
      }
      case 'edit': {
        if (args.length === 1) throw 'Missing required arguments `name` and `content`.';
        if (args.length === 2) throw 'Missing required argument `content`.';

        const name = args[1];
        const content = args.slice(2).join(' ');

        await this.client.db.tag
          .update({
            data: {
              content
            },
            where: {
              guildId_name: { guildId: message.guildId, name }
            }
          })
          .catch(() => {
            throw 'Tag does not exist.';
          });

        return message.reply(`Edited tag \`${name}\`.`);
      }
      case 'view': {
        const tags = await this.client.db.tag.findMany({
          where: {
            guildId: message.guildId
          }
        });

        if (tags.length === 0) return message.reply('This guild has no tags.');

        const tagMap = tags.map(tag => tag.name);

        if (tags.length > 30) {
          const out = await bin('GUILD TAGS\n\n' + tagMap.join('\n'));
          return message.reply(`Here's the list of tags: ${out}`);
        }

        return message.reply(`\`\`\`\n${tagMap.join(', ')}\`\`\``);
      }
    }
  }
}

export default TagManagerCommand;
