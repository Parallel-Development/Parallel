import { EmbedBuilder } from '@discordjs/builders';
import { Colors, PermissionFlagsBits as Permissions } from 'discord.js';
import { Infraction, InfractionType } from '@prisma/client';
import client from './client';
import { getMember } from './lib/util/functions';

setInterval(async () => {
  await client.db.infraction.deleteMany({
    where: {
      type: InfractionType.Warn,
      expires: {
        lte: Date.now()
      }
    }
  });

  await client.db.$executeRaw`DELETE FROM "Appeal"
  WHERE id IN (
    SELECT D.id
    FROM "Appeal" D
    INNER JOIN "Infraction" I ON D.id = I.id
    INNER JOIN "Guild" G ON D."guildId" = G.id
    WHERE I."date" + G."appealDisregardAfter" <= (extract(epoch from now()) * 1000)
  )`;

  const guilds = await client.db.guild.findMany({
    select: { id: true, tasks: { where: { expires: { lte: Date.now() } } } }
  });

  for (const guildTasks of guilds) {
    const guild = client.guilds.cache.get(guildTasks.id);
    if (!guild) {
      await client.db.task.deleteMany({
        where: {
          guildId: guildTasks.id,
          expires: { lte: Date.now() }
        }
      });

      continue;
    }

    const permissions = guild.members.me!.permissions;
    const banPerm = permissions.has(Permissions.BanMembers);

    if (!banPerm) {
      await client.db.task.deleteMany({
        where: {
          guildId: guild.id,
          type: InfractionType.Ban,
          expires: { lte: Date.now() }
        }
      });

      continue;
    }

    for (const task of guildTasks.tasks) {
      if (task.type === InfractionType.Ban) {
        await guild.members.unban(task.userId).catch(() => {});
      } else {
        const member = await getMember(guild, task.userId);
        if (member) {
          // parallel listens for timeout changes, but in the event that it misses it, we still double check
          // if the user is timed out for more than `10` seconds then we'll update the expiration date accordingly
          if (member.communicationDisabledUntil && +member.communicationDisabledUntil > Number(task.expires) + 10000) {
            await client.db.task.update({
              where: {
                id: task.id
              },
              data: {
                expires: +member.communicationDisabledUntil
              }
            });

            continue;
          }

          const unDM = new EmbedBuilder()
            .setAuthor({ name: 'Parallel Moderation', iconURL: client.user!.displayAvatarURL() })
            .setTitle(`You were unmuted in ${guild.name}`)
            .setColor(Colors.Green)
            .setDescription(`Timeout Expired.`)
            .setTimestamp();

          await member.send({ embeds: [unDM] }).catch(() => {});
        }
      }

      await client.db.task.delete({
        where: {
          id: task.id
        }
      });

      client.emit('punishLog', {
        userId: task.userId,
        guildId: task.guildId,
        moderatorId: client.user!.id,
        reason: `${task.type === InfractionType.Ban ? 'Ban' : 'Timeout'} Expired.`,
        type: task.type === InfractionType.Ban ? InfractionType.Unban : InfractionType.Unmute,
        date: BigInt(Date.now())
      } as Infraction);
    }
  }
}, 60000);
