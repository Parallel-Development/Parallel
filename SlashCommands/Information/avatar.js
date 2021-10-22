const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'avatar',
    description: "Displays the specified user's avatar",
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription("Display the specified user's avatar")
        .addUserOption(option => option.setName('user').setDescription('The user you are getting the avatar of')),
    async execute(client, interaction, args) {
        const user = (await client.util.getUser(client, args['user'])) || interaction.user;

        const avatar = new Discord.MessageEmbed()
            .setColor(client.util.mainColor(interaction.guild))
            .setAuthor(`${user.tag}'s avatar`, client.user.displayAvatarURL())
            .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }).replace('.webp', '.png'))
            .setFooter(`Information requested by ${interaction.user.tag}`, interaction.user.displayAvatarURL());

        return interaction.reply({ embeds: [avatar] });
    }
};
