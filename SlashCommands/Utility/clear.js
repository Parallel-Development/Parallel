const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'clear',
    description: 'Clears messages in a channel',
    permissions: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    requiredBotPermission: Discord.Permissions.FLAGS.MANAGE_MESSAGES,
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Bulk delete messages in a channel')
        .addIntegerOption(option =>
            option.setName('amount').setDescription('The amount of messages to be cleared').setRequired(true)
        )
        .addUserOption(option => option.setName('user').setDescription('The user to clear messages from')),
    async execute(client, interaction, args) {
        const amount = args['amount'];
        const user = await client.util.getUser(client, args['user']);

        if (amount > 100 || amount < 1)
            return client.util.throwError(interaction, 'Number must a number between 1-100');
        if (!interaction.channel.permissionsFor(interaction.guild.me).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES))
            return client.util.throwError(interaction, client.config.errors.my_channel_access_denied);

        await interaction.deferReply({ ephemeral: true });

        if (user) {
            let purgedMessages = 0;
            while (purgedMessages < amount) {
                const userMessages = [];
                const _messages = await interaction.channel.messages.fetch({ limit: 100 });
                const messages = [..._messages.values()];
                if (!messages.length) break;
                for (let i = 0; i !== messages.length && userMessages.length !== amount - purgedMessages; ++i) {
                    const msg = messages[i];
                    if (msg.author.id === user.id) userMessages.push(msg);
                }
                const deletedMessages = await interaction.channel.bulkDelete(userMessages, true).catch(() => {});
                if (!deletedMessages.size) break;
                purgedMessages += deletedMessages.size;
            }

            if (!purgedMessages)
                return interaction.editReply(
                    'Deleted 0 messages; either failed to fetch any messages from the user, or the messages were too old to be bulk deleted'
                );
            const bulkDeleteEmbed = new Discord.MessageEmbed()
                .setColor(client.util.mainColor(interaction.guild))
                .setDescription(
                    `✅ Successfully purged \`${purgedMessages}\` ${
                        purgedMessages === 1 ? 'message' : 'messages'
                    } from ${user}`
                );
            const _msg = await interaction.editReply({ embeds: [bulkDeleteEmbed] });
        } else {
            const deletedAmount = await interaction.channel.bulkDelete(amount, true).catch(() => {});
            if (!deletedAmount.size)
                return interaction.editReply(
                    'Deleted 0 messages; either there are no messages in this channel or the messages are too old'
                );
            const _bulkDeleteEmbed = new Discord.MessageEmbed()
                .setColor(client.util.mainColor(interaction.guild))
                .setDescription(
                    `✅ Successfully purged \`${deletedAmount.size}\` ${
                        deletedAmount.size === 1 ? 'message' : 'messages'
                    }`
                );
            const msg = await interaction.editReply({ embeds: [_bulkDeleteEmbed] });
        }
    }
};
