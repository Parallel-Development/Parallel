const Discord = require('discord.js');
const { MessageButton, MessageActionRow } = Discord;
const blacklistSchema = require('../schemas/blacklist-schema');
const settingsSchema = require('../schemas/settings-schema');
const cooldown = new Set();
const rps = require('../Buttons/rock-paper-scissors');

module.exports = {
    name: 'interactionCreate',
    async execute(client, interaction) {

        const isBlacklisted = await blacklistSchema.findOne({ ID: interaction.user.id, server: false});
        const isBlacklistedServer = await blacklistSchema.findOne({ ID: interaction.guild.id, server: true});
        if(isBlacklistedServer) {
            const { reason, date, sent } = isBlacklistedServer;
            let failedToSend = false;
            if (!sent) {

                await interaction.reply(`This server is blacklisted!\n\nReason: ${reason}\nDate: ${date}`).catch(() => failedToSend = true );

                if (!failedToSend) {
                    await blacklistSchema.updateOne({
                        ID: interaction.guild.id,
                        server: true
                    },
                    {
                        sent: true
                    })
                }

            }

            return interaction.guild.leave();
        }
        
        if(isBlacklisted) {
            const { reason, date, sent } = isBlacklisted;
            let doNotSend = false;
            if (sent) return;

            const blacklistEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setDescription(`You cannot run any commands because you are blacklisted from Parallel. This means I will ignore all your commands. If you believe this blacklist is unjustified, you can submit an appeal [here](https://docs.google.com/forms/d/1xedhPPJONP3tGmL58xQAiTd-XVQ1V8tCkEqUu9q1LWM/edit?usp=drive_web)`)
                .setAuthor('You are blacklisted from Parallel!', client.user.displayAvatarURL())
                .addField('Reason', reason)
                .addField('Date', date)
                .setFooter('You cannot appeal your ban if it is not unjustified!');
            await interaction.user.send({ embeds: [blacklistEmbed] }).catch(() => { doNotSend = true })

            if (!doNotSend) {
                await blacklistSchema.updateOne({
                    ID: interaction.user.id,
                    server: false
                },
                {
                    sent: true
                })
            }

            return;
        }

        if(interaction.isButton()) {
            if(interaction.customId === 'join' || interaction.customId === 'deny') return rps.run(client, interaction);
        }

        if(cooldown.has(interaction.user.id)) return;
        else if(!client.config.developers.includes(interaction.user.id)) {
            cooldown.add(interaction.user.id);
            setTimeout(() => { cooldown.delete(interaction.user.id )}, 2000)
        }

        if(!interaction.isCommand()) return;

        const command = client.slashCommands.get(interaction.commandName);
        if(!command) return interaction.reply({ content: 'Unexpeted error: The interaction exists but there is no found linked command for it', ephemeral: true });

        const { modRoles, locked } = await settingsSchema.findOne({ guildID: interaction.guild.id });

        const denyAccess = (commandName) => {
            const errorMessage = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setAuthor('Access Denied')
                .setDescription(`You do not have permission to run the \`${commandName}\` command`)
            return interaction.reply({ embeds: [errorMessage], ephemeral: true })
        }


        if (
            command.permissions &&
            !interaction.member.permissions.has(command.permissions)
        ) {

            if (
                command.permissions === Discord.Permissions.FLAGS.MANAGE_MESSAGES
                || command.permissions === Discord.Permissions.FLAGS.BAN_MEMBERS
                || command.permissions === Discord.Permissions.FLAGS.KICK_MEMBERS
                || command.permissions === Discord.Permissions.FLAGS.MANAGE_NICKNAMES
                || command.permissions === Discord.Permissions.FLAGS.MANAGE_ROLES
                || command.permissions === Discord.Permissions.FLAGS.MANAGE_CHANNELS
            ) {
                if (!interaction.member.roles.cache.some(role => modRoles.includes(role))) return denyAccess(command.name)
            } else return denyAccess(command.name);
        }

        if(command.requiredBotPermission && !interaction.guild.me.permissions.has(command.requiredBotPermission)) {

            let missingPermission = new Discord.Permissions(command.requiredBotPermission);
            missingPermission = missingPermission.toArray();
            if(missingPermission.length > 1) missingPermission = 'ADMINISTRATOR';
            else missingPermission = missingPermission[0].replaceAll('_', ' ');
            const missingPermissionEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.err)
                .setAuthor(`Missing Permissions`)
                .setDescription(`I am missing required permissions for this command to work\nMissing Permission: \`${missingPermission}\``)

            return interaction.reply({ embeds: [missingPermissionEmbed ]});
        }

        if(
            (locked.includes(interaction.channel.id) || locked.includes(interaction.parent?.id))
            && !interaction.member.roles.cache.some(role => modRoles.includes(role)) 
            && !interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)
        ) return interaction.reply({ content: 'Commands are disabled in this channel', ephemeral: true })

        try {
            command.execute(client, interaction, interaction.options.data.reduce((map, arg) => (map[arg.name] = arg.value, map), {}));
        } catch {
            interaction.reply({ content: 'Error executing command', ephemeral: true });
        }
    }
}