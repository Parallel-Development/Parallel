const automodSchema = require('../schemas/automod-schema');

exports.run = async(client, message, args) => {
    const option = args[1];
    if(!option) return message.channel.send('Please specify a toggle');
    if(!(option === 'enable' || option === 'disable')) return message.channel.send('Expected input `enable` or `disable`');
    const attachmentPermsOnly = args[2] === 'true' ? true : false;

    await automodSchema.updateOne({
        guildID: message.guild.id
    },
    {
        allowTenor: {
            enabled: option === 'enabled' ? true : false,
            attachmentPermsOnly: attachmentPermsOnly
        }
    })

    if(option === 'enable') {
        await automodSchema.updateOne({
            guildID: message.guild.id
        },
        {
            allowTenor: {
                enabled: true,
                attachmentPermsOnly: attachmentPermsOnly
            }
        })
        return message.channel.send('Tenor links will now be excluded from the link automod' + (attachmentPermsOnly ? ' | Users without attachment perms will still get affected' : ''));
    } else {
        await automodSchema.updateOne({
            guildID: message.guild.id
        },
            {
                allowTenor: {
                    enabled: false,
                    attachmentPermsOnly: false
                }
            })
        return message.channel.send('Tenor links will now no longer be excluded from the link automod');
    }
}