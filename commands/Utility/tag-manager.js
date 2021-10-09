const Discord = require('discord.js');
const tagSchema = require('../../schemas/tag-schema');

module.exports = {
    name: 'tag-manager',
    description: 'Manage the tags on the server\n\nNOTICE: tags override the allowed commands setting',
    usage: 'tag-manager create [tag name] <tag text>\ntag-manager delete [tag name]\ntag-manager remove-all\ntag-manager edit [tag name] <new text>\ntag-manager view\ntag-manager get [tag name]\ntag-manager allowed-roles add [everyone, <role>]\ntag-manager allowed-roles remove [everyone, <role>]',
    permissions: Discord.Permissions.FLAGS.MANAGE_GUILD,
    aliases: ['tags'],
    async execute(client, message, args) {

        const option = args[0]?.toLowerCase()?.replaceAll('-', '');
        if(!option) return client.util.throwError(message, client.config.errors.missing_argument_option);

        if (option === 'create') {

            const tagName = args[1];
            if(!tagName) return client.util.throwError(message, 'a tag name is required')
            const validateTag = await tagSchema.findOne({ guildID: message.guild.id, tags: { $elemMatch: { name: tagName } }});

            if(validateTag) return client.util.throwError(message, 'a tag with this name already exists');
            const tagText = args.slice(2).join(' ');
            if(!tagText) return client.util.throwError(message, client.config.errors.missing_argument_text);
            if(tagText.length > 2000) return message.reply('Error: the tag text length exceeded the limit of **2000** characters');

            await tagSchema.updateOne({ 
                guildID: message.guild.id 
            }, 
            { $push: 
                { tags: 
                    { 
                        name: tagName, 
                        content: tagText} 
                    }
                }
            )

            return message.reply(`Successfully created tag with name \`${tagName}\``);
        } else if (option === 'remove') {
            const tagName = args[1];
            if(!tagName) return client.util.throwError(message, 'a tag name is required')
            const validateTag = await tagSchema.findOne({ guildID: message.guild.id, tags: { $elemMatch: { name: tagName } }});

            if(!validateTag) return client.util.throwError(message, 'tag not found');

            await tagSchema.updateOne({ 
                guildID: message.guild.id
            },
                { $pull: 
                    { tags: 
                        { name: tagName 
                    } 
                }}
            )

            return message.reply(`Successfully removed tag \`${tagName}\``);
        } else if (option === 'removeall') {

            const guildTags = await tagSchema.findOne({ guildID: message.guild.id });
            if(!guildTags.tags.length) return client.util.throwError(message, 'there are no tags in this server');

            if (global.confirmationRequests.some(request => request.ID === message.author.id)) global.confirmationRequests.pop({ ID: message.author.id })
            global.confirmationRequests.push({ ID: message.author.id, guildID: message.guild.id, request: 'removeAllTags', at: Date.now() });
            return message.reply(`Are you sure? This will remove all all tags in this server. To confirm, run \`confirm\`. To cancel, run \`>cancel\``);
        } else if (option === 'edit') {
            const tagName = args[1];
            const validateTag = await tagSchema.findOne({ guildID: message.guild.id, tags: { $elemMatch: { name: tagName } }});

            if(!validateTag) return client.util.throwError(message, 'tag not found');

            const newTagText = args.slice(2).join(' ');
            if (newTagText.length > 2000) return message.reply('Error: the tag text length exceeded the limit of **2000** characters');

            await tagSchema.updateOne({
                guildID: message.guild.id,
                tags: {
                    $elemMatch: {
                        name: args[1]
                    }
                }
            },
            {
                $set: { 'tags.$.content': newTagText }
            })

            return message.reply(`Successfully edited tag \`${tagName}\``);
        } else if (option === 'view') {

            const guildTags = await tagSchema.findOne({ guildID: message.guild.id });
            const tagList = guildTags.tags.map(tag => tag.name).join(', ').length <= 2000 ?
            guildTags.tags.map(tag => `\`${tag.name}\``).join(', ') :
            await client.util.craeteBin(guildTags.tags.map(tag => tag.name).join(', '));

            const list = new Discord.MessageEmbed()
            .setAuthor(`Tags for ${message.guild.name}`, client.user.displayAvatarURL())
            .setColor(client.config.colors.main)
            .setDescription(`You can get a tag's content by running tag-manager get [tag name]\n\n${tagList}`);

            return message.reply({ embeds: [list] })
        }  else if (option === 'get') {

            const guildTags = await tagSchema.findOne({ guildID: message.guild.id });
            if(!args[1]) return client.util.throwError(message, 'no tag provided');
            const tag = guildTags.tags.find(key => key.name === args[1]);
            if(!tag) return client.util.throwError(message, 'no tag found');

            const tagInfo = new Discord.MessageEmbed()
            .setAuthor(`Tag - ${tag.name}`, client.user.displayAvatarURL())
            .setColor(client.config.colors.main)
            .setDescription(tag.content)

            return message.reply({ embeds: [tagInfo] })

        }  else if (option === 'allowedroles') {

            const guildTagSettings = await tagSchema.findOne({ guildID: message.guild.id });
            const { allowedRoleList } = guildTagSettings;

            if(args[1] === 'add') {
                if(!args[2]) return client.util.throwError(message, client.config.errors.missing_argument_role);
                let role = client.util.getRole(message.guild, args[2]) || message.guild.roles.cache.find(role => role.name === args.slice(2).join(' '));
                if(args[2].toLowerCase() === 'everyone') role = message.guild.roles.everyone;
                if(!role) return client.util.throwError(message, client.config.errors.invalid_role);
                if(allowedRoleList.includes(role.id)) return client.util.throwError(message, 'this role is already on the allowed role list');

                await tagSchema.updateOne({
                    guildID: message.guild.id
                },
                {
                    $push: { allowedRoleList: role.id }
                })

                return message.reply(`Anyone with the role \`${role.name}\` may now use tags`);

            } else if (args[1] === 'remove') {

                if(!args[2]) return client.util.throwError(message, client.config.errors.missing_argument_role);
                let role = client.util.getRole(message.guild, args[2]) || message.guild.roles.cache.find(role => role.name === args.slice(2).join(' '));
                if(args[2].toLowerCase() === 'everyone') role = message.guild.roles.everyone;
                if(!role) return client.util.throwError(message, client.config.errors.invalid_role);
                if(!allowedRoleList.includes(role.id)) return client.util.throwError(message, 'this role is not on the allowed role list');

                await tagSchema.updateOne({
                    guildID: message.guild.id
                },
                {
                    $pull: { allowedRoleList: role.id }
                })

                return message.reply(`The role \`${role.name}\` no longer grants the permission for users to use tags`);

            } else if (args[1] === 'view') {

                if(!allowedRoleList.length) return message.reply('No roles on are on the allowed roles list for tags');

                const roleList = allowedRoleList.map(role => message.guild.roles.cache.get(role.id)).join(' ').length <= 2000 ? 
                allowedRoleList.map(role => message.guild.roles.cache.get(role)).join(' ') : 
                await client.util.createBin(allowedRoleList.map(role => message.guild.roles.cache.get(role.id)));


                const allowedRolesListEmbed = new Discord.MessageEmbed()
                .setColor(client.config.colors.main)
                .setAuthor(`Allowed roles list for tags in ${message.guild.name}`, client.user.displayAvatarURL())
                .setDescription(roleList);

                return message.reply({ embeds: [allowedRolesListEmbed] });
            } else return client.util.throwError(message, 'please use either option `add`, `remove` or `view`');
        } else return client.util.throwError(message, client.config.errors.invalid_option);
    }
}