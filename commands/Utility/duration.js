const Discord = require('discord.js');

module.exports = {
    name: 'duration',
    description: 'Convert milliseconds or seconds to a duration format',
    usage: 'duration (milliseconds)\nduration --seconds (seconds)',
    async execute(client, message, args) {

        const inSeconds = args[0] === '--seconds' ? true : false;
        const input = inSeconds ? parseFloat(args[1]) * 1000 : parseFloat(args[0])
        if (!input && input !== 0) return await client.util.throwError(message, client.config.errors.missing_argument_number);
        if (!input && input !== 0) return await client.util.throwError(message, client.config.errors.bad_input_number)
        if (input > 315576000000) return await client.util.throwError(message, client.config.errors.time_too_long);
        const duration = client.util.duration(input)

        const durationEmbed = new Discord.MessageEmbed()
        .setColor(client.config.colors.main)
        .setAuthor('Milliseconds/Seconds to Duration', client.user.displayAvatarURL())
        .addField('Input', `\`\`\`fix\n${inSeconds ? input / 1000 : input }\`\`\``)
        .addField('Output', `\`\`\`js\n${duration}\`\`\``)
        return message.reply({ embeds: [durationEmbed] });
    }
}