const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'serverinfo',
    description: 'Shows information related to the server',
    data: new SlashCommandBuilder().setName('serverinfo').setDescription('Shows information related to the server'),
    async execute(client, interaction, args) {
        const serverinfo = new Discord.MessageEmbed()

            .setColor(client.config.colors.main)
            .setAuthor(`Server Information for ${interaction.guild.name}`, client.user.displayAvatarURL())
            .addField('Server ID', interaction.guild.id, true)
            .addField('Member Count', `${interaction.guild.memberCount}`)
            .addField('Channel Count', `<:text:815451803733852160> ${interaction.guild.channels.cache.filter(channel => channel.isText()).size} Text<:spacer:815451803642626068><:voice:815451803331854367>${interaction.guild.channels.cache.filter(channel => channel.type === 'GUILD_VOICE').size} Voice`)
            .addField('Emoji Count', `${interaction.guild.emojis.cache.size}`, true)
            .addField('Role Count', `${interaction.guild.roles.cache.size - 1}`, true)
            .addField('Highest Role', interaction.guild.roles.highest.toString())
            .addField('Nitro Boosts', `<:boost:815451803361214465> ${interaction.guild.premiumSubscriptionCount} (Level ${interaction.guild.premiumTier === 'NONE' ? 0 : interaction.guild.premiumTier.slice(-1)})`)
            .addField('Server Owner', await interaction.guild.fetchOwner().then((owner) => owner.toString()))
            .addField('Created', client.util.timestamp(interaction.guild.createdAt))
            .setFooter(`Information requested by ${interaction.user.tag}`, interaction.user.displayAvatarURL())
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }).replace('.webp', '.png'))

        return interaction.reply({ embeds: [serverinfo] })
    }
}
