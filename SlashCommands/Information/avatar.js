const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'avatar',
    description: "Displays the specified user's avatar",
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription("Display the specified user's avatar")
        .addUserOption(option => option.setName('user').setDescription('The user you are getting the avatar of'))
        .addBooleanOption(option => option.setName('absolute').setDescription('If the user has a guild avatar set and you wish to view their real avatar, use this flag')),
    async execute(client, interaction, args) {

        const target = await client.util.getMember(interaction.guild, args['user']) || await client.util.getUser(client, args['user']) || interaction.member;
        const user = await client.util.getUser(client, target.id);
        const absoluteFlagUsed = args['absolute'];

        const avatar = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(interaction.guild))
            .setAuthor(`${user.tag}'s avatar`, client.user.displayAvatarURL())
            .setImage(target instanceof Discord.GuildMember ? absoluteFlagUsed ? target.user.displayAvatarURL({ dynamic: true, size: 1024 }).replace('.webp', '.png') : target.displayAvatarURL({ dynamic: true, size: 1024 }).replace('.webp', '.png') : target.displayAvatarURL({ dynamic: true, size: 1024 }).replace('.webp', '.png'))
            .setFooter(`Information requested by ${interaction.user.tag}`, interaction.user.displayAvatarURL());

        return interaction.reply({ embeds: [avatar] });
    }
};
