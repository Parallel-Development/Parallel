const Discord = require('discord.js');

module.exports = {
    name: 'search',
    description: 'Search your server for a specified display name',
    usage: 'search [display name]\nsearch --exact [display name]',
    aliases: ['find'],
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    async execute(client, message, args) {
        const exact = args.includes('--exact') ? true : false;
        const displayName = args.join(' ').replace('--exact', '').trim();
        if (!displayName) return message.reply('Please specify a display name to search for!');

        const searchingEmbed = new Discord.MessageEmbed()
            .setColor(client.util.getMainColor(message.guild))
            .setDescription(`Searching... ${client.config.emotes.loading}`);
        const msg = await message.reply({ embeds: [searchingEmbed] });

        await message.guild.members.fetch();
        const members = [];

        const result = new Discord.MessageEmbed()
            .setColor(client.util.getMainColor(message.guild))
            .setAuthor(
                `Results for ${displayName} ${
                    exact ? '| The results shown are for users with the exact display name as specified' : ''
                }`,
                client.user.displayAvatarURL()
            );

        const _members = [...message.guild.members.cache.values()].filter(m =>
            m.displayName.toLowerCase().includes(displayName.toLowerCase())
        );
        for (let i = 0; i !== _members.length; ++i) {
            const member = _members[i];
            if (exact) {
                if (member.displayName.toLowerCase() === displayName.toLowerCase()) {
                    result.addField(
                        member.user.tag,
                        `ID: \`${member.id}\`\nUsername: \`${member.user.username}\`\nDisplay Name: \`${member.displayName}\``
                    );
                    members.push(member);
                }
            } else {
                if (member.displayName.toLowerCase().includes(displayName.toLowerCase())) {
                    result.addField(
                        member.user.tag,
                        `ID: \`${member.id}\`\nUsername: \`${member.user.username}\`\nDisplay Name: \`${member.displayName}\``
                    );
                    members.push(member);
                }
            }
        }

        if (!members.length)
            return msg.edit({
                embeds: [
                    new Discord.MessageEmbed()
                        .setColor(client.util.getMainColor(message.guild))
                        .setDescription('No results found')
                ]
            });

        result.setFooter(`${members.length} results`);
        return msg.edit({ embeds: [result] }).catch(async () => {
            const newResult = await client.util.createBin(
                members
                    .map(
                        (m, i) =>
                            `Result #${i + 1}: ${m.user.tag}\n- ID: ${m.id}\n- Username: ${
                                m.user.username
                            }\n- Display Name: ${m.displayName}\n`
                    )
                    .join('\n')
            );
            const newResultEmbed = new Discord.MessageEmbed()
                .setColor(client.util.getMainColor(message.guild))
                .setDescription(
                    `Failed to send the result! View the result [here](${newResult}) (**${members.length}** results)`
                );
            return msg.edit({ embeds: [newResultEmbed] });
        });
    }
};
