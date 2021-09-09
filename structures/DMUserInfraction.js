const Discord = require('discord.js');

class DMUserInfraction {

    constructor(client, type, color, message, member, { reason, punishmentID, time, baninfo = null } = {}) {

        if (!client) throw new Error('required argument \'client\' is missing')
        if (!type) throw new Error('required argument \'type\' is missing');
        if (typeof type !== 'string') throw new TypeError('argument \'type\' must be type string');
        if (!message) throw new Error('required argument \'message\' is missing');
        if (typeof message !== 'object') throw new TypeError('argument \'message\' must be an object');
        if (!member) throw new Error('required argument \'member\' is missing');
        if (typeof member !== 'object') throw new TypeError('argument \'member\' must be an object');
        if (!reason) throw new Error('required argument \'reason\' is missing');
        if (typeof reason !== 'string') throw new TypeError('argument \'message\' must be a string');

        const infractionEmbed = new Discord.MessageEmbed()
        infractionEmbed.setAuthor('Parallel Moderation', client.user.displayAvatarURL())
        infractionEmbed.setColor(color)

        infractionEmbed.setTitle(`You were ${type} ${type === 'banned' || type === 'kicked' ? 'from' : 'in'} ${message.guild.name}!`)

        infractionEmbed.addField('Reason', reason)
        if (time !== 'ignore') infractionEmbed.addField('Duration', time && time !== 'Permanent' ? client.util.duration(time) : 'Permanent', true)
        if (time !== 'ignore') infractionEmbed.addField('Expires', time && time !== 'Permanent' ? client.util.timestamp(Date.now() + time) : 'Never', true)
        infractionEmbed.addField('Date', client.util.timestamp())
        if (baninfo) infractionEmbed.addField('Additional Ban Information', baninfo)
        if (punishmentID && punishmentID !== 'ignore') infractionEmbed.setFooter(`Punishment ID: ${punishmentID}`)

        return member.send({ embeds: [infractionEmbed] }).catch(() => { });
    }
}

module.exports = DMUserInfraction;
