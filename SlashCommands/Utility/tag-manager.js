const Discord = require('discord.js');
const tagSchema = require('../../schemas/tag-schema');
const settingsSchema = require('../../schemas/settings-schema');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'tag-manager',
    description: 'Manage the tags on the server\n\nNOTICE: tags override the allowed commands setting',
    data: new SlashCommandBuilder()
        .setName('tag-manager')
        .setDescription('Manage the tags on the server')
        .addSubcommand(command =>
            command
                .setName('create')
                .setDescription('Create a new server tag')
                .addStringOption(option =>
                    option.setName('tag_name').setDescription('The tag identifier').setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('tag_content').setDescription('The content of the tag').setRequired(true)
                )
        )
        .addSubcommand(command =>
            command
                .setName('remove')
                .setDescription('Remove a server tag')
                .addStringOption(option =>
                    option.setName('tag_name').setDescription('The tag to remove').setRequired(true)
                )
        )
        .addSubcommand(command => command.setName('remove_all').setDescription('Remove all server tags'))
        .addSubcommand(command =>
            command
                .setName('edit')
                .setDescription("Edit a tag's content")
                .addStringOption(option =>
                    option.setName('tag_name').setDescription('The tag to edit').setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('new_content').setDescription("The new tag's content").setRequired(true)
                )
        )
        .addSubcommand(command =>
            command
                .setName('allowed_roles')
                .setDescription('Manage the allowed roles to use tags')
                .addStringOption(option =>
                    option
                        .setName('method')
                        .setDescription('To add, remove, or view the allowed roles')
                        .setRequired(true)
                        .addChoice('Add', 'add')
                        .addChoice('Remove', 'remove')
                        .addChoice('View', 'view')
                )
                .addRoleOption(option => option.setName('role').setDescription('The role to target'))
        )
        .addSubcommand(command =>
            command
                .setName('get')
                .setDescription('Get information on a tag')
                .addStringOption(option =>
                    option.setName('tag_name').setDescription('The tag to get information on').setRequired(true)
                )
        )
        .addSubcommand(command => command.setName('view').setDescription('View all the tags on the server')),
    async execute(client, interaction, args) {

        const guildTags = await tagSchema.findOne({ guildID: interaction.guild.id });
        const guildSettings = await settingsSchema.findOne({ guildID: interaction.guild.id });
        const { allowedRoleList } = guildTags;
        const { modRoles, modRolePermissions } = guildSettings;

        if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_GUILD) && !interaction.member.roles.cache.some(role => allowedRoleList.includes(role.id)) && (!interaction.member.roles.cache.some(role => modRoles.includes(role.id)) || new Discord.Permissions(modRolePermissions).has(Discord.Permissions.FLAGS.MANAGE_GUILD))) return client.util.throwError(interaction, 'no permission to manage server tags');

        const subArgs = interaction.options.data.reduce((map, arg) => ((map[arg.name] = arg), map), {});

        if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_GUILD) && (!interaction.member.roles.cache.some(role => modRoles.includes(role.id)) || new Discord.Permissions(modRolePermissions).has(Discord.Permissions.FLAGS.MANAGE_GUILD)) && !subArgs['view']) return client.util.throwError(interaction, 'you may only view the server tags');

        if (subArgs['create']) {
            const createArgs = subArgs['create'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});
            const tagName = createArgs['tag_name'];
            const validateTag = await tagSchema.findOne({
                guildID: interaction.guild.id,
                tags: { $elemMatch: { name: tagName } }
            });

            if (validateTag) return client.util.throwError(interaction, 'a tag with this name already exists');
            const tagText = createArgs['tag_content'];
            if (tagText.length > 2000)
                return interaction.reply('Error: the tag text length exceeded the limit of **2000** characters');

            await tagSchema.updateOne(
                {
                    guildID: interaction.guild.id
                },
                {
                    $push: {
                        tags: {
                            name: tagName,
                            content: tagText
                        }
                    }
                }
            );

            return interaction.reply(`Successfully created tag with name \`${tagName}\``);
        } else if (subArgs['remove']) {
            const removeArgs = subArgs['remove'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});

            const tagName = removeArgs['tag_name'];
            const validateTag = await tagSchema.findOne({
                guildID: interaction.guild.id,
                tags: { $elemMatch: { name: tagName } }
            });

            if (!validateTag) return client.util.throwError(interaction, 'tag not found');

            await tagSchema.updateOne(
                {
                    guildID: interaction.guild.id
                },
                { $pull: { tags: { name: tagName } } }
            );

            return interaction.reply(`Successfully removed tag \`${tagName}\``);
        } else if (subArgs['remove_all']) {
            const guildTags = await tagSchema.findOne({ guildID: interaction.guild.id });
            if (!guildTags.tags.length) return client.util.throwError(interaction, 'there are no tags in this server');

            if (global.confirmationRequests.some(request => request.ID === interaction.user.id))
                global.confirmationRequests.pop({ ID: interaction.user.id });
            global.confirmationRequests.push({
                ID: interaction.user.id,
                guildID: interaction.guild.id,
                request: 'removeAllTags',
                at: Date.now()
            });
            return interaction.reply(
                `Are you sure? This will remove all all tags in this server. To confirm, run \`/confirm\`. To cancel, run \`/cancel\``
            );
        } else if (subArgs['edit']) {
            const editArgs = subArgs['edit'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});

            const tagName = editArgs['tag_name'];
            const validateTag = await tagSchema.findOne({
                guildID: interaction.guild.id,
                tags: { $elemMatch: { name: tagName } }
            });

            if (!validateTag) return client.util.throwError(interaction, 'tag not found');

            const newTagText = editArgs['new_content'];
            if (newTagText.length > 2000)
                return interaction.reply('Error: the tag text length exceeded the limit of **2000** characters');

            await tagSchema.updateOne(
                {
                    guildID: interaction.guild.id,
                    tags: {
                        $elemMatch: {
                            name: tagName
                        }
                    }
                },
                {
                    $set: { 'tags.$.content': newTagText }
                }
            );

            return interaction.reply(`Successfully edited tag \`${tagName}\``);
        } else if (subArgs['view']) {
            const guildTags = await tagSchema.findOne({ guildID: interaction.guild.id });
            if (!guildTags.tags.length) return interaction.reply('There are no tags setup on this server');
            const tagList =
                guildTags.tags.map(tag => tag.name).join(', ').length <= 2000
                    ? guildTags.tags.map(tag => `\`${tag.name}\``).join(', ')
                    : await client.util.craeteBin(guildTags.tags.map(tag => tag.name).join(', '));

            const list = new Discord.MessageEmbed()
                .setAuthor(`Tags for ${interaction.guild.name}`, client.user.displayAvatarURL())
                .setColor(client.util.mainColor(interaction.guild))
                .setDescription(`You can get a tag's content by running tag-manager get [tag name]\n\n${tagList}`);

            return interaction.reply({ embeds: [list] });
        } else if (subArgs['get']) {
            const getArgs = subArgs['get'].options.reduce((a, b) => ({ ...a, [b['name']]: b.value }), {});

            const guildTags = await tagSchema.findOne({ guildID: interaction.guild.id });
            const tag = guildTags.tags.find(key => key.name === getArgs['tag_name']);
            if (!tag) return client.util.throwError(interaction, 'no tag found');

            const tagInfo = new Discord.MessageEmbed()
                .setAuthor(`Tag - ${tag.name}`, client.user.displayAvatarURL())
                .setColor(client.util.mainColor(interaction.guild))
                .setDescription(tag.content);

            return interaction.reply({ embeds: [tagInfo] });
        } else if (subArgs['allowed_roles']) {
            const allowedRolesArgs = subArgs['allowed_roles'].options.reduce(
                (a, b) => ({ ...a, [b['name']]: b.value }),
                {}
            );

            const guildTagSettings = await tagSchema.findOne({ guildID: interaction.guild.id });
            const { allowedRoleList } = guildTagSettings;

            if (allowedRolesArgs['method'] === 'add') {
                const role = client.util.getRole(interaction.guild, allowedRolesArgs['role']);
                if (!role) return client.util.throwError(interaction, client.config.errors.missing_argument_role);
                if (allowedRoleList.includes(role.id))
                    return client.util.throwError(interaction, 'this role is already on the allowed role list');

                await tagSchema.updateOne(
                    {
                        guildID: interaction.guild.id
                    },
                    {
                        $push: { allowedRoleList: role.id }
                    }
                );

                return interaction.reply(`Anyone with the role \`${role.name}\` may now use tags`);
            } else if (allowedRolesArgs['method'] === 'remove') {
                const role = client.util.getRole(interaction.guild, allowedRolesArgs['role']);
                if (!role) return client.util.throwError(interaction, client.config.errors.missing_argument_role);
                if (!allowedRoleList.includes(role.id))
                    return client.util.throwError(interaction, 'this role is not on the allowed role list');

                await tagSchema.updateOne(
                    {
                        guildID: interaction.guild.id
                    },
                    {
                        $pull: { allowedRoleList: role.id }
                    }
                );

                return interaction.reply(
                    `The role \`${role.name}\` no longer grants the permission for users to use tags`
                );
            } else if (allowedRolesArgs['method'] === 'view') {
                if (!allowedRoleList.length)
                    return interaction.reply('No roles on are on the allowed roles list for tags');

                for (let i = 0; i !== allowedRoleList.length; ++i) {
                    const allowedRole = allowedRoleList[i];
                    if (!interaction.guild.roles.cache.get(allowedRole)) {
                        await tagSchema.updateOne(
                            {
                                guildID: interaction.guild.id
                            },
                            {
                                $pull: {
                                    allowedRoleList: allowedRole
                                }
                            }
                        );
                    }
                }

                const _allowedRoleList = await tagSchema
                    .findOne({ guildID: interaction.guild.id })
                    .then(result => result.allowedRoleList);
                if (!_allowedRoleList.length)
                    return interaction.reply('No roles on are on the allowed roles list for tags');

                const roleList =
                    _allowedRoleList.map(role => interaction.guild.roles.cache.get(role.id)).join(' ').length <= 2000
                        ? allowedRoleList.map(role => interaction.guild.roles.cache.get(role)).join(' ')
                        : await client.util.createBin(
                              allowedRoleList.map(role => interaction.guild.roles.cache.get(role.id))
                          );

                const allowedRolesListEmbed = new Discord.MessageEmbed()
                    .setColor(client.util.mainColor(interaction.guild))
                    .setAuthor(
                        `Allowed roles list for tags in ${interaction.guild.name}`,
                        client.user.displayAvatarURL()
                    )
                    .setDescription(roleList);

                return interaction.reply({ embeds: [allowedRolesListEmbed] });
            } else return client.util.throwError(interaction, 'please use either option `add`, `remove` or `view`');
        } else return client.util.throwError(interaction, client.config.errors.invalid_option);
    }
};
