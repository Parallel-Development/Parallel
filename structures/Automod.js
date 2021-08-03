const automodSchema = require('../schemas/automod-schema');
const ModerationLogger = require('../structures/ModerationLogger');
const DMUserInfraction = require('../structures/DMUserInfraction');
const NewInfraction = require('../structures/NewInfraction');
const NewPunishment = require('../structures/NewPunishment');
const settingsSchema = require('../schemas/settings-schema');
const Discord = require('discord.js');

exports.run = async(client, message, type) => {

    const automod = await automodSchema.findOne({ 
        guildID: message.guild.id
    })

    const { 
        fast,
        massmention,
        filter,
        invite,
        walltext,
        links,
        fastTempMuteDuration,
        fastTempBanDuration,
        massmentionTempMuteDuration,
        massmentionTempBanDuration,
        filterTempMuteDuration,
        filterTempBanDuration,
        inviteTempMuteDuration,
        inviteTempBanDuration,
        walltextTempMuteDuration,
        walltextTempBanDuration,
        linksTempMuteDuration,
        linksTempBanDuration
    } = automod;

    const settings = await settingsSchema.findOne({
        guildID: message.guild.id
    })
    const { manualwarnexpire } = settings;
    const { baninfo } = settings;

    const structure = async(name, reason, time, color) => {

        message.delete();
        if (name === 'delete') return;

        const role = message.guild.roles.cache.find(r => r.name === 'Muted') ?
        message.guild.roles.cache.find(r => r.name === 'Muted') :
        await client.util.createMuteRole(message);

        if (name === 'tempmute') name = 'mute';
        if (name === 'tempban') name = 'ban';

        if(name === 'mute') await client.util.muteMember(message, message.member, role);
        if(name === 'warn') {
            if(manualwarnexpire !== 'disabled') this.time = manualwarnexpire
        }

        let member = message.member
        

        NewInfraction.run(client, `${name.charAt(0).toUpperCase() + name.slice(1)}`, message, message.member, reason, punishmentID, time, true);
        NewPunishment.run(message.guild.name, message.guild.id, name, message.member.id, reason, time ? Date.now() + time : 'Never');
        await DMUserInfraction.run(client, `${name.endsWith('e') ? name : name.endsWith('n') ? name + 'ne': name + 'e'}d`, color, message, message.member, reason, punishmentID, time, name === 'ban' ? baninfo !== 'none' ? baninfo : null : null)
        ModerationLogger.run(client, `${name.charAt(0).toUpperCase() + name.slice(1) + (name.endsWith('e') ? '' : name.endsWith('n') ? 'ne' : 'e')}d`, message.guild.me, message.member, message.channel, reason, time, punishmentID);

        if(name === 'kick') await message.memberKICK({reason: reason}) 
        else if(name === 'ban') await message.guild.membersBAN(message.member, { reason: reason });

        const punishedEmbed = new Discord.MessageEmbed()
        .setColor(color)
        .setDescription(`${member} has been automatically ${name.endsWith('e') ? name : name.endsWith('n') ? name + 'ne' : name + 'e'}d with ID \`${punishmentID}\``)

        const msg = await message.channel.send({ embeds: [punishedEmbed] });
        setTimeout(() => { msg.delete() }, 5000);

        return;
    }

    const punishmentID = client.util.generateRandomBase62String();

    if(type === 'fast') message.channel.bulkDelete(4, true);

    switch (type) {
        case 'filter':
            if(filter === 'disabled') return;
            structure(
                filter,
                `[AUTO] Sending or editing a message to a blacklisted word on the server`,
                filterTempMuteDuration ? filterTempMuteDuration : filterTempBanDuration ? filterTempBanDuration : null,
                filter === 'warn' ? client.config.colors.punishment[0] : (filter === 'mute' || filter === 'tempmute') ? client.config.colors.punishment[1] : (filter === 'ban' || filter === 'tempban') ? client.config.colors.punishment[2] : null
            )
            break;
        case 'massmention':
            if (massmention === 'disabled') return;
            structure(
                massmention,
                `[AUTO] Pinging 5 or more users`,
                massmentionTempMuteDuration ? massmentionTempMuteDuration : massmentionTempBanDuration ? massmentionTempBanDuration : null,
                massmention === 'warn' ? client.config.colors.punishment[0] : (massmention === 'mute' || massmention === 'tempmute') ? client.config.colors.punishment[1] : (massmention === 'ban' || massmention === 'tempban') ? client.config.colors.punishment[2] : null
            )
            break;
        case 'walltext':
            if (walltext === 'disabled') return;
            structure(
                walltext,
                `[AUTO] Sending huge or wall-like messages`,
                walltextTempMuteDuration ? walltextTempMuteDuration : walltextTempBanDuration ? walltextTempBanDuration : null,
                walltext === 'warn' ? client.config.colors.punishment[0] : (walltext === 'mute' || walltext === 'tempmute') ? client.config.colors.punishment[1] : (walltext === 'ban' || walltext === 'tempban') ? client.config.colors.punishment[2] : null
            )
            break;
        case 'fast':
            if (fast === 'disabled') return;
            structure(
                fast,
                `[AUTO] Sending many messages in quick succession`,
                fastrTempMuteDuration ? fastTempMuteDuration : fastTempBanDuration ? fastTempBanDuration : null,
                fast === 'warn' ? client.config.colors.punishment[0] : (fast === 'mute' || fast === 'tempmute') ? client.config.colors.punishment[1] : (fast === 'ban' || fast === 'tempban') ? client.config.colors.punishment[2] : null
            )
            break;
        case 'invites':
            if (invites === 'disabled') return;
            structure(
                invites,
                `[AUTO] Sending a discord server invite`,
                inviteTempMuteDuration ? inviteTempMuteDuration : inviteTempBanDuration ? inviteTempBanDuration : null,
                invite === 'warn' ? client.config.colors.punishment[0] : (invite === 'mute' || invite === 'tempmute') ? client.config.colors.punishment[1] : (invite === 'ban' || invite === 'tempban') ? client.config.colors.punishment[2] : null
            )
            break;
        case 'links':
            if (links === 'disabled') return;
            structure(
                links,
                `[AUTO] Sending links`,
                linksTempMuteDuration ? linksTempMuteDuration : linksTempBanDuration ? linksTempBanDuration : null,
                links === 'warn' ? client.config.colors.punishment[0] : (links === 'mute' || links === 'tempmute') ? client.config.colors.punishment[1] : (links === 'ban' || links === 'tempban') ? client.config.colors.punishment[2] : null
            )
            break
    }

}