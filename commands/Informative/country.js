const Discord = require('discord.js')
const countriesInfo = require('countries-information')
const ISO6391 = require('iso-639-1')

module.exports = {
    name: 'country',
    description: 'Gather information on a country using its name or code name',
    usage: 'country (name/code name)',
    async execute(client, message, args) {
        const country = args.join(' ');
        if(!country) return message.channel.send('Please specify a country name or code')

        let getCode = countriesInfo.getCountryInfoByCode(country.toUpperCase())
        if(!getCode) {
            getCode = countriesInfo.getCountryInfoByName(country.toLowerCase())
            if(!getCode) {
                const noInformationFound = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setDescription(`No country found with the name or code \`${country}\``)
                return message.channel.send(noInformationFound)
            }
        }

        const languages = []
        getCode.languages.forEach(lang => {
            languages.push(ISO6391.getName(lang.substr(0, 2)))
        })

        const countryInformation = new Discord.MessageEmbed()
        .setColor('#09fff2')
        .setAuthor('Country Information', client.user.displayAvatarURL())
        .setTitle(getCode.name)
        .addField('Country Name', getCode.name, true)
        .addField('Calling Code(s)', getCode.countryCallingCodes.join(' | '), true)
        .addField('Currencies', getCode.currencies.join(', '), true)
        .addField('Spoken Languages', languages.join(', '), true)
        .addField('Country Flag', getCode.emoji, true)
        
        message.channel.send(countryInformation)

    }
}