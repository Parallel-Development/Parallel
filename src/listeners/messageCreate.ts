import { InfractionType } from '@prisma/client';
import { Colors, EmbedBuilder, Message, PermissionFlagsBits as Permissions } from 'discord.js';
import Listener from '../lib/structs/Listener';
import { domainReg, pastTenseInfractionTypes } from '../lib/util/constants';

class MessageCreate extends Listener {
  // userId.guildId
  spamTrack: Map<string, number[]> = new Map();

  constructor() {
    super('messageCreate');
  }

  async run(message: Message<true>) {
    if (!message.member) return;

    const automod = await this.client.db.guild.findUnique({
      where: {
        id: message.guildId
      },
      select: {
        autoModSpamToggle: true,
        autoModSpamAmount: true,
        autoModSpamIn: true,
        autoModSpamImmuneChannels: true,
        autoModSpamImmuneRoles: true,
        autoModSpamPunishment: true,
        autoModSpamDuration: true,
        autoModMaliciousToggle: true,
        autoModMaliciousImmuneChannels: true,
        autoModMaliciousImmuneRoles: true,
        autoModMaliciousPunishment: true,
        autoModMaliciousDuration: true
      }
    });

    if (!automod) return;
    if (message.member.permissions.has(Permissions.Administrator)) return;

    if (
      automod.autoModMaliciousToggle &&
      !automod.autoModMaliciousImmuneChannels.includes(message.channelId) &&
      !message.member!.roles.cache.some(role => automod.autoModMaliciousImmuneRoles.includes(role.id))
    ) {
      if (domainReg.test(message.content)) {
        const req = await fetch('https://anti-fish.bitflow.dev/check', {
          method: 'POST',
          headers: {
            'User-Agent': 'Parallel Discord Bot (https://parallel.wtf)',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message.content
          })
        });

        const data = await req.json();
        if (data.match) {
          await message.delete();
          return this.automodPunish(
            message,
            'Malicious links.',
            automod.autoModMaliciousPunishment,
            automod.autoModMaliciousDuration
          );
        }
      }
    }

    if (
      automod.autoModSpamToggle &&
      !automod.autoModSpamImmuneChannels.includes(message.channelId) &&
      !message.member!.roles.cache.some(role => automod.autoModSpamImmuneRoles.includes(role.id))
    ) {
      const key = `${message.author.id}.${message.guildId}`;
      const userSpam = this.spamTrack.get(key)?.concat([Date.now()]) ?? [Date.now()];
      this.spamTrack.set(key, userSpam);

      if (userSpam.length !== automod.autoModSpamAmount) return false;
      const speed = userSpam[userSpam.length - 1] - userSpam[0];

      if (speed <= automod.autoModSpamIn * 1000) {
        this.spamTrack.set(key, []);
        const messages = [...(await message.channel.messages.fetch({ limit: 20 })).values()]
          .filter(msg => msg.author.id === message.author.id)
          .slice(0, automod.autoModSpamAmount);
        await message.channel.bulkDelete(messages);

        return this.automodPunish(
          message,
          'Fast message spam.',
          automod.autoModSpamPunishment,
          automod.autoModSpamDuration
        );
      }

      this.spamTrack.set(key, userSpam.slice(1));
      return false;
    }
  }

  private async automodPunish(
    message: Message<true>,
    reason: 'Malicious links.' | 'Fast message spam.',
    punishment: InfractionType | null,
    duration: bigint
  ) {
    if (!punishment) return;

    const date = BigInt(Date.now());
    const expires = punishment ? (duration ? date + duration : null) : null;
    const expiresStr = Math.floor(Number(expires) / 1000);

    const infraction = await this.client.db.infraction.create({
      data: {
        userId: message.author.id,
        guildId: message.guildId,
        type: punishment,
        date,
        moderatorId: this.client.user!.id,
        expires,
        reason
      }
    });

    if (expires && punishment !== InfractionType.Warn) {
      const data = {
        guildId: message.guildId,
        userId: message.author.id,
        type: punishment,
        expires
      };

      await this.client.db.task.upsert({
        where: {
          userId_guildId_type: { userId: message.author.id, guildId: message.guildId, type: punishment }
        },
        update: data,
        create: data
      });
    }

    const dm = new EmbedBuilder()
      .setAuthor({ name: 'Parallel Moderation', iconURL: this.client.user!.displayAvatarURL() })
      .setTitle(
        `You were ${pastTenseInfractionTypes[punishment.toLowerCase() as keyof typeof pastTenseInfractionTypes]} ${
          punishment === InfractionType.Ban || punishment === InfractionType.Kick ? 'from' : 'in'
        } ${message.guild.name}`
      )
      .setColor(
        punishment === InfractionType.Warn
          ? Colors.Yellow
          : punishment === InfractionType.Mute || punishment === InfractionType.Kick
          ? Colors.Orange
          : punishment === InfractionType.Unmute || punishment === InfractionType.Unban
          ? Colors.Green
          : Colors.Red
      )
      .setDescription(`${reason}${expires ? `\n\n***•** Expires: <t:${expiresStr}> (<t:${expiresStr}:R>)*` : ''}`)
      .setFooter({ text: `Punishment ID: ${infraction.id}` })
      .setTimestamp();

    await message.member!.send({ embeds: [dm] });

    switch (punishment) {
      case InfractionType.Ban:
        await message.member!.ban({ reason });
      case InfractionType.Kick:
        await message.member!.kick(reason);
      case InfractionType.Mute:
        await message.member!.timeout(Number(duration), reason);
    }

    return true;
  }
}

export default MessageCreate;
