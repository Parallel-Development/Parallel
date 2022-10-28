import { EmbedBuilder } from '@discordjs/builders';
import { Colors, PermissionFlagsBits as Permissions } from 'discord.js';
import { InfractionType } from '@prisma/client';
import client from './client';

setInterval(async () => {
  await client.db.infraction.deleteMany({
    where: {
      expires: {
        lte: Date.now()
      }
    }
  });

  const guilds = await client.db.guild.findMany({
    select: { id: true, tasks: { where: { expires: { lte: Date.now() }, missed: false }} }
  });

  for (const guildTasks of guilds) {
    const guild = client.guilds.cache.get(guildTasks.id);
    if (!guild) { 
      await client.db.task.updateMany({
        where: {
          guildId: guildTasks.id
        },
        data: {
          missed: true
        }
      });

      continue;
    }

    const permissions = guild.members.me!.permissions;
    const banPerm = permissions.has(Permissions.BanMembers);

    // essentially, we still save the data, but we ignore it for now
    // We provide the ability to unmark these as missed so the users may be automatically unbanned again
    if (!banPerm) {
      await client.db.task.updateMany({
        where: {
          guildId: guild.id,
          type: InfractionType.Ban
        },
        data: {
          missed: true
        }
      });

      continue;
    }

    for (const task of guildTasks.tasks) {
      if (task.type === InfractionType.Ban) {
        await guild.members.unban(task.userId).catch(() => {});
      } else {
        const member = await client.util.getMember(guild, task.userId);
        if (member) {
          // parallel listens for timeout changes, but in the event that it misses it, we still double check
          // if the user is timed out for more than `10` seconds then we'll update the expiration date accordingly
          if (member.communicationDisabledUntil && (+member.communicationDisabledUntil) > Number(task.expires) + 10000) {
            await client.db.task.update({
              where: {
                id: task.id
              },
              data: {
                expires: +member.communicationDisabledUntil,
              }
            });

            continue;
          }

          const unDM = new EmbedBuilder()
          .setAuthor( { name: 'Parallel Moderation', iconURL: client.user!.displayAvatarURL() })
          .setTitle(`You were unmuted in ${guild.name}`)
          .setColor(Colors.Green)
          .setDescription(`Timeout Expired.`)
          .setTimestamp()

          await member.send({ embeds: [unDM] }).catch(() => {});
        }

      }

      await client.db.task.delete({
        where: {
          id: task.id
        }
      });
    }
  }
}, 60000);