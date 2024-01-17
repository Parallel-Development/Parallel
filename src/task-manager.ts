import { EmbedBuilder } from '@discordjs/builders';
import { Colors, PermissionFlagsBits } from 'discord.js';
import { Infraction, InfractionType } from '@prisma/client';
import client from './client';
import { getMember, sleep } from './lib/util/functions';
import punishLog from './handlers/punishLog';

const MS_1_MINUTE = 60000;
const MS_24_HOURS = 86400000;

// for infractions
setInterval(async () => {
  await client.db.infraction.deleteMany({
    where: {
      type: InfractionType.Warn,
      expires: {
        lte: Date.now()
      }
    }
  });

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
    const banPerm = permissions.has(PermissionFlagsBits.BanMembers);

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

      punishLog({
        userId: task.userId,
        guildId: task.guildId,
        moderatorId: client.user!.id,
        reason: `${task.type === InfractionType.Ban ? 'Ban' : 'Timeout'} Expired.`,
        type: task.type === InfractionType.Ban ? InfractionType.Unban : InfractionType.Unmute,
        date: BigInt(Date.now())
      } as Infraction);
    }
  }
}, MS_1_MINUTE);

// for less important objects that can expire, like appeals or chatlogs
// Its not an interval so that it can be called immediately
async function sweeper() {
  await client.db.$executeRaw`DELETE FROM "Appeal"
  WHERE id IN (
    SELECT A.id
    FROM "Appeal" A
    INNER JOIN "Guild" G ON A."guildId" = G.id
    WHERE A."date" + G."appealDisregardAfter" <= (extract(epoch from now()) * 1000)
  )`;

  await client.db.chatlog.deleteMany({
    where: {
      expires: {
        lte: Date.now()
      }
    }
  });

  // call the function in 24 hours
  await sleep(MS_24_HOURS);
  sweeper();
}

sweeper();
