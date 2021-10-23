const settingsSchema = require('../schemas/settings-schema');
const ms = require('ms');

exports.run = async(client, message, args) => {

    const option = args[1];
    const value = args[2];
    if(!value) return client.util.throwError(message, 'a value is required');

    switch (option) {
        case 'missing-permission':
            if (value === 'respond') {
                await settingsSchema.updateOne({
                    guildID: message.guild.id
                },
                {
                    $set: {
                        "errorConfig.missingPermission": 'respond'
                    }
                })

                message.reply(`Members who try to use a command they do not have permission to run will now be responded to with an error telling them they do not have access to the command`);
            } else if (value === 'delete') {
                await settingsSchema.updateOne({
                    guildID: message.guild.id
                },
                    {
                        $set: {
                            "errorConfig.missingPermission": 'delete'
                        }
                    })

                message.reply(`Members who try to use a command they do not have permission to run will now have their message deleted`);
            } else if (value === 'ignore') {
                await settingsSchema.updateOne({
                    guildID: message.guild.id
                },
                    {
                        $set: {
                            "errorConfig.missingPermission": 'ignore'
                        }
                    })

                message.reply(`Members who try to use a command they do not have permission to run will now simply be ignored`);
            } else return client.util.throwError(message, 'invalid value')
            break;
        case 'disabled-command-channel':
            if (value === 'respond') {
                await settingsSchema.updateOne({
                    guildID: message.guild.id
                },
                    {
                        $set: {
                            "errorConfig.disabledCommandChannel": 'respond'
                        }
                    })

                message.reply(`Members who try to use a command in a disabled command channel will now be responded to with an error telling them they do not have access to the command`);
            } else if (value === 'delete') {
                await settingsSchema.updateOne({
                    guildID: message.guild.id
                },
                    {
                        $set: {
                            "errorConfig.disabledCommandChannel": 'delete'
                        }
                    })

                message.reply(`Members who try to use a command in a disabled command channel will now have their message deleted`);
            } else if (value === 'ignore') {
                await settingsSchema.updateOne({
                    guildID: message.guild.id
                },
                    {
                        $set: {
                            "errorConfig.disabledCommandChannel": 'ignore'
                        }
                    })

                message.reply(`Members who try to use a command in a disabled command channel will now simply be ignored`);
            } else return client.util.throwError(message, 'invalid value')
            break;
        case 'delete-delay':
            if (value === 'never') {
                await settingsSchema.updateOne({
                    guildID: message.guild.id
                },
                    {
                        $set: {
                            "errorConfig.deleteDelay": 'never'
                        }
                    })

                return message.reply(`Errors will now never be deleted by the bot automatically`)
            } else {
                if(!ms(value)) return client.util.throwError(message, client.config.errors.bad_duration);
                if(ms(value) > 60000) return client.util.throwError(message, 'delete delay may not be over 1 minute. Consider setting the delete delay to never instead');
                await settingsSchema.updateOne({
                    guildID: message.guild.id
                },
                    {
                        $set: {
                            "errorConfig.deleteDelay": ms(value)
                        }
                    })
                
                return message.reply(`Errors will now automatically be deleted \`${client.util.duration(ms(value))}\` after being sent`);
            }
            break;
        default:
            return client.util.throwError(message, client.config.errors.invalid_option);
    }
}