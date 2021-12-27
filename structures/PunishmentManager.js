const Discord = require('discord.js');
const settingsSchema = require('../schemas/settings-schema');
const automodSchema = require('../schemas/automod-schema');
const warningSchema = require('../schemas/warning-schema');
const punishmentSchema = require('../schemas/punishment-schema');
const systemSchema = require('../schemas/system-schema');
const fetch = require('petitio');
const userMap = new Map();
const automodCooldown = new Set();

class PunishmentManager {
    /**
     * send a log to the message logging channel with the message deletion or update data
     * @param {Discord.Client} client the client
     * @param {Discord.GuildChannel} channel the channel the message was deleted or updated in
     * @param {Discord.Message} message the deleted or old message object
     * @param {Discord.Message | null} oldMessage the new message content if the message was updated, or null if not
     * @returns {Promise<Discord.Message> | boolean} the sent message resolvable or false if it failed to send
     */
    async createMessageLog(client, channel, message, oldMessage = null) {
        const logEmbed = new Discord.MessageEmbed()
            .setColor(client.config.colors.log)
            .setAuthor('Parallel Logging', client.user.displayAvatarURL())
            .addField(`User`, `**${message.author.tag}** - \`${message.author.id}\``);
        if (oldMessage) {
            const binnedOldContent = await client.util.createBin(oldMessage.content);
            const binnedContent = await client.util.createBin(message.content);
            logEmbed.setDescription(`[Jump to message](${message.url})`);
            logEmbed.setTitle('Message Update');
            logEmbed.addField('Date', client.util.timestamp(Date.now()));
            logEmbed.addField(
                'Old Message Content',
                oldMessage.content.length <= 1024 ? oldMessage.content : binnedOldContent
            );
            logEmbed.addField(
                'Updated Message Content',
                message.content.length <= 1024 ? message.content : binnedContent
            );
            logEmbed.addField('Edited in', message.channel.toString());
        } else {
            logEmbed.setTitle('Message Deleted');
            logEmbed.addField('Date', client.util.timestamp(Date.now()));
            logEmbed.addField('Deleted in', message.channel.toString());
            if (message.content)
                logEmbed.addField(
                    'Content',
                    message.content.length <= 1024 ? message.content : await client.util.createBin(message.content)
                );

            if (
                message.attachments.size === 1 &&
                !message.attachments
                    .map(attachment => attachment.url)
                    .join('\n')
                    .endsWith('mp4') &&
                !message.attachments
                    .map(attachment => attachment.url)
                    .join('\n')
                    .endsWith('mov')
            ) {
                logEmbed.setImage(message.attachments.map(attachment => attachment.url).join('\n'));
            } else if (message.attachments.size) {
                logEmbed.addField('Attachments', message.attachments.map(attachment => attachment.url).join('\n'));
            }
        }

        return channel.send({ embeds: [logEmbed] }).catch(() => false);
    }

    /**
     * send a DM to a user with an infraction's information
     * @param {Discord.Client} client the client
     * @param {string} type the type of the punishment
     * @param {string} color the hex code or rgb integer for the embed color
     * @param {Discord.Message} message the message of the command used to issue the punishment or where it was automatically issued
     * @param {Discord.GuildMember | Discord.User} member the member or user with the issued punishment
     * @param {string} reason the reason for the punishment
     * @param {string} punishmentID the punishment ID snowflake
     * @param {string} time the duration of the punishment
     * @param {string} baninfo if the punishment is a ban, the additional ban information sent to the user
     * @returns {Promise<Discord.Message> | boolean} the sent message resolvable or false if it failed to send
     */
    async createUserInfractionDM(
        client,
        type,
        color,
        message,
        member,
        { reason, punishmentID, time, baninfo = null } = {}
    ) {
        const infractionEmbed = new Discord.MessageEmbed();
        infractionEmbed.setAuthor('Parallel Moderation', client.user.displayAvatarURL());
        infractionEmbed.setColor(color);

        infractionEmbed.setTitle(
            `You were ${type} ${type === 'banned' || type === 'kicked' ? 'from' : 'in'} ${message.guild.name}!`
        );

        infractionEmbed.addField('Reason', reason);
        if (time !== 'ignore')
            infractionEmbed.addField(
                'Duration',
                time && time !== 'Permanent' ? client.util.duration(time) : 'Permanent',
                true
            );
        if (time !== 'ignore')
            infractionEmbed.addField(
                'Expires',
                time && time !== 'Permanent' ? client.util.timestamp(Date.now() + time) : 'Never',
                true
            );
        infractionEmbed.addField('Date', client.util.timestamp());
        if (baninfo) infractionEmbed.addField('Additional Ban Information', baninfo);
        if (punishmentID && punishmentID !== 'ignore') infractionEmbed.setFooter(`Punishment ID: ${punishmentID}`);

        return member.send({ embeds: [infractionEmbed] }).catch(() => false);
    }

    /**
     * log to the expired log channel information about a punishment that had expired
     * @param {Discord.Client} client the client
     * @param {string} type the type of the punishment
     * @param {Discord.Guild} server the guild in the expired punishment expired in
     * @param {Discord.User} user the user whos punishment expired
     * @param {string} reason the reason for the expiration
     * @returns {Promise<Discord.Message> | boolean} the sent message resolvable or false if it failed to send
     */
    async createExpiredLog(client, type, server, user, reason) {
        const getAutomodLogChannel = await settingsSchema.findOne({
            guildID: server.id
        });

        const { automodLogging } = getAutomodLogChannel;

        if (automodLogging === 'none') return;

        if (!server.channels.cache.get(automodLogging)) {
            await settingsSchema.updateOne(
                {
                    guildID: server.id
                },
                {
                    automodLogging: 'none'
                }
            );

            client.cache.settings.delete(message.guild.id);

            return;
        }

        const expiredLog = new Discord.MessageEmbed()
            .setColor('#ffa500')
            .setAuthor('Parallel Logging', client.user.displayAvatarURL())
            .setTitle(`User automatically ${type}`)
            .addField('User', `**${user.tag}** - \`${user.id}\``, true)
            .addField('Reason', reason);

        const automodLogChannel = server.channels.cache.get(automodLogging);
        return automodLogChannel.send({ embeds: [expiredLog] }).catch(() => false);
    }

    /**
     * create a new user infraction
     * @param {Discord.Client} client the client
     * @param {string} type the type of the punishment
     * @param {Discord.Message} message the message the command used to issue the punishment, or where it was automatically issued
     * @param {Discord.GuildMember} moderator the moderator who issued the punishment
     * @param {Discord.GuildMember | Discord.User} member the target member or user
     * @param {string} reason the reason for the punishment
     * @param {string} punishmentID the punishment ID snowflake
     * @param {string} time the duration of the punishment
     * @param {boolean} auto whether the punishment was automatically issued
     * @returns {boolean} true
     */
    async createInfraction(
        client,
        type,
        message,
        moderator,
        member,
        { reason, punishmentID, time, auto = false } = {}
    ) {
        await warningSchema.updateOne(
            {
                guildID: message.guild.id
            },
            {
                $push: {
                    warnings: {
                        userID: member.id,
                        type: type,
                        moderatorID: moderator.id,
                        date: client.util.timestamp(),
                        reason: reason,
                        duration: time && time !== 'Permanent' ? client.util.duration(time) : 'Permanent',
                        expires: time && time !== 'Permanent' ? Date.now() + time : 'Never',
                        punishmentID: punishmentID,
                        auto: auto ? true : false
                    }
                }
            }
        );

        return true;
    }

    /**
     * create a new punishment
     * @param {string} guildname the name of the guild
     * @param {string} guildID the ID of the guild
     * @param {string} type the type of the punishment
     * @param {string} userID the user ID
     * @param {string} reason the reason for the punishment
     * @param {string} time the duration of the punishment
     * @param {[string]} roles the roles the user had before a mute punishment
     * @returns {boolean} true
     */
    async createPunishment(guildname, guildID, type, userID, { reason, time, roles } = {}) {
        await new punishmentSchema({
            guildname: guildname,
            guildID: guildID,
            type: type,
            userID: userID,
            reason: reason,
            expires: time,
            date: `<t:${Math.floor(Date.now() / 1000)}>`,
            roles: roles
        }).save();

        if (type === 'mute') global.notMutedUsers.splice(global.notMutedUsers.indexOf(userID, 1));

        return true;
    }

    /**
     * log to the moderation log channel information about a punishment
     * @param {Discord.Client} client the client
     * @param {string} type the type of the punishment
     * @param {Discord.GuildMember} moderator the moderator who issued the punishment
     * @param {Discord.GuildMember | Discord.User} target the target member or user
     * @param {Discord.GuildChannel} channel the channel the punishment was issued in
     * @param {string} reason the reason for the punishment
     * @param {string} duration the duration of the punishment
     * @param {string} punishmentID the punishment ID snowflake
     * @param {boolean} auto if the punishment was automatically issued
     * @returns {Promise<Discord.Message> | boolean} the sent message resolvable or false if it failed to send
     */
    async createModerationLog(client, type, moderator, target, channel, { reason, duration, punishmentID, auto } = {}) {
        const user = await client.users.fetch(target.id);

        const settings = await settingsSchema.findOne({
            guildID: moderator.guild.id
        });

        const { moderationLogging, automodLogging } = settings;
        if ((moderationLogging === 'none' && !auto) || (automodLogging === 'none' && auto)) return;
        if (!moderator.guild.channels.cache.get(moderationLogging)) {
            await settingsSchema.updateOne(
                {
                    guildID: moderator.guild.id
                },
                {
                    moderationLogging: 'none'
                }
            );
            return;
        }
        if (!moderator.guild.channels.cache.get(automodLogging)) {
            await settingsSchema.updateOne(
                {
                    guildID: moderator.guild.id
                },
                {
                    automodLogging: 'none'
                }
            );
            return;
        }

        const modLog = new Discord.MessageEmbed()
            .setColor('#ffa500')
            .setAuthor('Parallel Logging', client.user.displayAvatarURL())
            .setTitle(`User ${type}`)
            .addField('User', `**${user.tag}** - \`${user.id}\``, true)
            .addField('Moderator', `**${moderator.user.tag}** - \`${moderator.id}\``, true)
            .addField('Reason', reason.length <= 1024 ? reason : await client.util.createBin(reason));
        if (duration && duration !== 'Permanent') modLog.addField('Duration', client.util.duration(duration), true);
        if (duration && duration !== 'Permanent')
            modLog.addField('Expires', client.util.timestamp(Date.now() + duration), true);
        modLog.addField('Punishment ID', punishmentID, true);
        modLog.addField(`${type} in`, channel.toString(), true);

        const modLogChannel = moderator.guild.channels.cache.get(auto ? automodLogging : moderationLogging);
        return modLogChannel.send({ embeds: [modLog] }).catch(() => false);
    }

    /**
     * check if a message sent by a user has triggered the automod checks
     * @param {Discord.Client} client the client
     * @param {Discord.Message} message the message to check
     * @param {boolean} edit if the message was edited
     * @param {boolean} onlyCheck to only check if the message has triggered the automod and not to punish the user
     * @returns {Promise<boolean>} whether the message has triggered the automod AND got the user punished
     */
    async automodCheck(client, message, edit = false, onlyCheck = false) {
        const automodSettings = await automodSchema.findOne({
            guildID: message.guild.id
        });

        // Malicious Link Check;

        if (client.cache.maliciousLinks.some(url => message.content.includes(url))) {
            let punished = await this._createAutomodPunishment(client, message, 'maliciouslinks', onlyCheck);
            if (punished !== false) return true;
        }

        const matchRegex = /([\w-]+(?:(?:.[\w-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])/g;
        const stripped = message.content.replace(/[^\x20-\x7E]/g, '');

        if (matchRegex.test(stripped)) {
            const res = await fetch('https://anti-fish.bitflow.dev/check', 'POST')
                .header('User-Agent', 'Parallel (745401642664460319)')
                .body({ message: message.content })
                .send();

            let data;
            try {
                data = res.json();
            } catch {
                return false;
            }
            if (data.match) {
                if (
                    data.matches.length &&
                    !client.cache.maliciousLinks.some(link => data.matches.map(match => match.url).includes(link))
                )
                    client.cache.maliciousLinks = client.cache.maliciousLinks.concat(
                        data.matches.map(match => match.url)
                    );
                let punished = await this._createAutomodPunishment(client, message, 'maliciouslinks', onlyCheck);
                if (punished !== false) return true;
            }
        }

        // Filter Check;

        const { filterList } = automodSettings;
        const allowedChars = 'abcdefghjiklmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ ';

        const messageCharacters = message.content
            .split('')
            .filter(char => allowedChars.includes(char) || filterList.some(word => word.includes(char)));
        const extraAllowedChars = message.content
            .split('')
            .filter(char => !allowedChars.includes(char) && filterList.some(word => word.includes(char)));

        const joinedCharacters = messageCharacters.join('');

        if (
            filterList.some(
                word =>
                    joinedCharacters.toLowerCase().split(' ').includes(word) ||
                    joinedCharacters
                        .toLowerCase()
                        .split(' ')
                        .filter(char => !extraAllowedChars.includes(char))
                        .includes(word) ||
                    (word.split(' ').length > 1 &&
                        joinedCharacters
                            .toLowerCase()
                            .split('')
                            .filter(char => !extraAllowedChars.includes(char))
                            .join('')
                            .includes(word))
            )
        ) {
            let punished = await this._createAutomodPunishment(client, message, 'filter', onlyCheck);
            if (punished !== false) return true;
        }

        // Mass Mention

        if (!edit && message.mentions.users.filter(user => !user.bot).size >= 5) {
            let punished = await this._createAutomodPunishment(client, message, 'massmention', onlyCheck);
            if (punished !== false) return true;
        }
        // Walltext

        const walltextCheck = message.content.split('\n');
        if (walltextCheck.length >= 9 || message.content.length >= 700) {
            let punished = await this._createAutomodPunishment(client, message, 'walltext', onlyCheck);
            if (punished !== false) return true;
        }
        // Spam

        if (!edit) {
            if (userMap.has(message.author.id)) {
                const userData = userMap.get(message.author.id);
                let msgCount = userData.msgCount;
                if (parseInt(msgCount) === 4) {
                    userMap.delete(message.author.id);
                    let punished = await this._createAutomodPunishment(client, message, 'fast', onlyCheck);
                    if (punished !== false) return true;
                } else {
                    msgCount++;
                    userData.msgCount = msgCount;
                    userMap.set(message.author.id, userData);
                }
            } else {
                userMap.set(message.author.id, {
                    msgCount: 1,
                    lastMessage: message,
                    timer: null
                });
                setTimeout(() => {
                    userMap.delete(message.author.id);
                }, 3000);
            }
        }

        // Invites

        const inviteCheck = /discord(?:app)?.(?:com\/invite|gg)\/[a-zA-Z0-9]+\/?/i;
        if (inviteCheck.test(message.content.toLowerCase())) {
            let punished = await this._createAutomodPunishment(client, message, 'invites', onlyCheck);
            if (punished !== false) return true;
        }
        // Links

        const linkRegex =
            /(?<protocol>(?:(?:[a-z]+:)?\/\/)|www\.)(?:\S+(?::\S*)?@)?(?<hostname>localhost|(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?:(?:[a-z\u00a1-\uffff0-9][-_]*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:northwesternmutual|travelersinsurance|vermögensberatung|vermögensberater|americanexpress|kerryproperties|sandvikcoromant|afamilycompany|americanfamily|bananarepublic|cancerresearch|cookingchannel|kerrylogistics|weatherchannel|international|lifeinsurance|spreadbetting|travelchannel|wolterskluwer|construction|lplfinancial|scholarships|versicherung|accountants|barclaycard|blackfriday|blockbuster|bridgestone|calvinklein|contractors|creditunion|engineering|enterprises|foodnetwork|investments|kerryhotels|lamborghini|motorcycles|olayangroup|photography|playstation|productions|progressive|redumbrella|williamhill|சிங்கப்பூர்|accountant|apartments|associates|basketball|bnpparibas|boehringer|capitalone|consulting|creditcard|cuisinella|eurovision|extraspace|foundation|healthcare|immobilien|industries|management|mitsubishi|nationwide|newholland|nextdirect|onyourside|properties|protection|prudential|realestate|republican|restaurant|schaeffler|swiftcover|tatamotors|technology|university|vlaanderen|volkswagen|accenture|alfaromeo|allfinanz|amsterdam|analytics|aquarelle|barcelona|bloomberg|christmas|community|directory|education|equipment|fairwinds|financial|firestone|fresenius|frontdoor|fujixerox|furniture|goldpoint|hisamitsu|homedepot|homegoods|homesense|institute|insurance|kuokgroup|lancaster|landrover|lifestyle|marketing|marshalls|melbourne|microsoft|panasonic|passagens|pramerica|richardli|scjohnson|shangrila|solutions|statebank|statefarm|stockholm|travelers|vacations|موريتانيا|yodobashi|abudhabi|airforce|allstate|attorney|barclays|barefoot|bargains|baseball|boutique|bradesco|broadway|brussels|budapest|builders|business|capetown|catering|catholic|cipriani|cityeats|cleaning|clinique|clothing|commbank|computer|delivery|deloitte|democrat|diamonds|discount|discover|download|engineer|ericsson|etisalat|exchange|feedback|fidelity|firmdale|football|frontier|goodyear|grainger|graphics|guardian|hdfcbank|helsinki|holdings|hospital|infiniti|ipiranga|istanbul|jpmorgan|lighting|lundbeck|marriott|maserati|mckinsey|memorial|merckmsd|mortgage|observer|partners|pharmacy|pictures|plumbing|property|redstone|reliance|saarland|samsclub|security|services|shopping|showtime|softbank|software|stcgroup|supplies|training|vanguard|ventures|verisign|woodside|السعودية|yokohama|abogado|academy|agakhan|alibaba|android|athleta|auction|audible|auspost|avianca|banamex|bauhaus|bentley|bestbuy|booking|brother|bugatti|capital|caravan|careers|channel|charity|chintai|citadel|clubmed|college|cologne|comcast|company|compare|contact|cooking|corsica|country|coupons|courses|cricket|cruises|dentist|digital|domains|exposed|express|farmers|fashion|ferrari|ferrero|finance|fishing|fitness|flights|florist|flowers|forsale|frogans|fujitsu|gallery|genting|godaddy|grocery|guitars|hamburg|hangout|hitachi|holiday|hosting|hoteles|hotmail|hyundai|ismaili|jewelry|juniper|kitchen|komatsu|lacaixa|lanxess|lasalle|latrobe|leclerc|limited|lincoln|markets|monster|netbank|netflix|network|neustar|okinawa|oldnavy|organic|origins|philips|pioneer|politie|realtor|recipes|rentals|reviews|rexroth|samsung|sandvik|schmidt|schwarz|science|shiksha|singles|staples|storage|support|surgery|systems|temasek|theater|theatre|tickets|tiffany|toshiba|trading|walmart|wanggou|watches|weather|website|wedding|whoswho|windows|winners|xfinity|католик|الجزائر|العليان|اتصالات|پاکستان|البحرين|كاثوليك|இந்தியா|yamaxun|youtube|zuerich|abarth|abbott|abbvie|africa|agency|airbus|airtel|alipay|alsace|alstom|amazon|anquan|aramco|author|bayern|beauty|berlin|bharti|bostik|boston|broker|camera|career|caseih|casino|center|chanel|chrome|church|circle|claims|clinic|coffee|comsec|condos|coupon|credit|cruise|dating|datsun|dealer|degree|dental|design|direct|doctor|dunlop|dupont|durban|emerck|energy|estate|events|expert|family|flickr|futbol|gallup|garden|george|giving|global|google|gratis|health|hermes|hiphop|hockey|hotels|hughes|imamat|insure|intuit|jaguar|joburg|juegos|kaufen|kinder|kindle|kosher|lancia|latino|lawyer|lefrak|living|locker|london|luxury|madrid|maison|makeup|market|mattel|mobile|monash|mormon|moscow|museum|mutual|nagoya|natura|nissan|nissay|norton|nowruz|office|olayan|online|oracle|orange|otsuka|pfizer|photos|physio|pictet|quebec|racing|realty|reisen|repair|report|review|rocher|rogers|ryukyu|safety|sakura|sanofi|school|schule|search|secure|select|shouji|soccer|social|stream|studio|supply|suzuki|swatch|sydney|taipei|taobao|target|tattoo|tennis|tienda|tjmaxx|tkmaxx|toyota|travel|unicom|viajes|viking|villas|virgin|vision|voting|voyage|vuelos|walter|webcam|xihuan|москва|онлайн|ファッション|भारतम्|ارامكو|امارات|الاردن|المغرب|ابوظبي|مليسيا|இலங்கை|فلسطين|yachts|yandex|zappos|actor|adult|aetna|amfam|amica|apple|archi|audio|autos|azure|baidu|beats|bible|bingo|black|boats|bosch|build|canon|cards|chase|cheap|cisco|citic|click|cloud|coach|codes|crown|cymru|dabur|dance|deals|delta|drive|dubai|earth|edeka|email|epson|faith|fedex|final|forex|forum|gallo|games|gifts|gives|glade|glass|globo|gmail|green|gripe|group|gucci|guide|homes|honda|horse|house|hyatt|ikano|irish|iveco|jetzt|koeln|kyoto|lamer|lease|legal|lexus|lilly|linde|lipsy|lixil|loans|locus|lotte|lotto|macys|mango|media|miami|money|movie|nexus|nikon|ninja|nokia|nowtv|omega|osaka|paris|parts|party|phone|photo|pizza|place|poker|praxi|press|prime|promo|quest|radio|rehab|reise|ricoh|rocks|rodeo|rugby|salon|sener|seven|sharp|shell|shoes|skype|sling|smart|smile|solar|space|sport|stada|store|study|style|sucks|swiss|tatar|tires|tirol|tmall|today|tokyo|tools|toray|total|tours|trade|trust|tunes|tushu|ubank|vegas|video|vodka|volvo|wales|watch|weber|weibo|works|world|xerox|ישראל|বাংলা|భారత్|भारोत|संगठन|ایران|بازار|بھارت|سودان|همراه|سورية|ഭാരതം|嘉里大酒店|yahoo|aarp|able|adac|aero|akdn|ally|amex|arab|army|arpa|arte|asda|asia|audi|auto|baby|band|bank|bbva|beer|best|bike|bing|blog|blue|bofa|bond|book|buzz|cafe|call|camp|care|cars|casa|case|cash|cbre|cern|chat|citi|city|club|cool|coop|cyou|data|date|dclk|deal|dell|desi|diet|dish|docs|duck|dvag|erni|fage|fail|fans|farm|fast|fiat|fido|film|fire|fish|flir|food|ford|free|fund|game|gbiz|gent|ggee|gift|gmbh|gold|golf|goog|guge|guru|hair|haus|hdfc|help|here|hgtv|host|hsbc|icbc|ieee|imdb|immo|info|itau|java|jeep|jobs|jprs|kddi|kiwi|kpmg|kred|land|lego|lgbt|lidl|life|like|limo|link|live|loan|loft|love|ltda|luxe|maif|meet|meme|menu|mini|mint|mobi|moda|moto|name|navy|news|next|nico|nike|ollo|open|page|pars|pccw|pics|ping|pink|play|plus|pohl|porn|post|prod|prof|qpon|raid|read|reit|rent|rest|rich|rmit|room|rsvp|ruhr|safe|sale|sarl|save|saxo|scot|seat|seek|sexy|shaw|shia|shop|show|silk|sina|site|skin|sncf|sohu|song|sony|spot|star|surf|talk|taxi|team|tech|teva|tiaa|tips|town|toys|tube|vana|visa|viva|vivo|vote|voto|wang|weir|wien|wiki|wine|work|xbox|ಭಾರತ|ଭାରତ|大众汽车|ভাৰত|ভারত|موقع|香格里拉|сайт|アマゾン|дети|ポイント|ලංකා|電訊盈科|クラウド|ભારત|भारत|عمان|بارت|ڀارت|عراق|شبكة|بيتك|组织机构|تونس|グーグル|ਭਾਰਤ|yoga|zara|zero|zone|aaa|abb|abc|aco|ads|aeg|afl|aig|anz|aol|app|art|aws|axa|bar|bbc|bbt|bcg|bcn|bet|bid|bio|biz|bms|bmw|bom|boo|bot|box|buy|bzh|cab|cal|cam|car|cat|cba|cbn|cbs|ceo|cfa|cfd|com|cpa|crs|csc|dad|day|dds|dev|dhl|diy|dnp|dog|dot|dtv|dvr|eat|eco|edu|esq|eus|fan|fit|fly|foo|fox|frl|ftr|fun|fyi|gal|gap|gay|gdn|gea|gle|gmo|gmx|goo|gop|got|gov|hbo|hiv|hkt|hot|how|ibm|ice|icu|ifm|inc|ing|ink|int|ist|itv|jcb|jio|jll|jmp|jnj|jot|joy|kfh|kia|kim|kpn|krd|lat|law|lds|llc|llp|lol|lpl|ltd|man|map|mba|med|men|mil|mit|mlb|mls|mma|moe|moi|mom|mov|msd|mtn|mtr|nab|nba|nec|net|new|nfl|ngo|nhk|now|nra|nrw|ntt|nyc|obi|off|one|ong|onl|ooo|org|ott|ovh|pay|pet|phd|pid|pin|pnc|pro|pru|pub|pwc|qvc|red|ren|ril|rio|rip|run|rwe|sap|sas|sbi|sbs|sca|scb|ses|sew|sex|sfr|ski|sky|soy|spa|srl|stc|tab|tax|tci|tdk|tel|thd|tjx|top|trv|tui|tvs|ubs|uno|uol|ups|vet|vig|vin|vip|wed|win|wme|wow|wtc|wtf|xin|कॉम|セール|คอม|我爱你|қаз|срб|бел|קום|淡马锡|орг|नेट|ストア|мкд|كوم|中文网|ком|укр|亚马逊|诺基亚|飞利浦|мон|عرب|ไทย|рус|ລາວ|みんな|天主教|مصر|قطر|հայ|新加坡|xxx|xyz|you|yun|zip|ac|ad|ae|af|ag|ai|al|am|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cu|cv|cw|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|ss|st|su|sv|sx|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|佛山|慈善|集团|在线|한국|点看|八卦|公益|公司|网站|移动|联通|бг|时尚|微博|삼성|商标|商店|商城|ею|新闻|家電|中信|中国|中國|娱乐|谷歌|购物|通販|网店|餐厅|网络|香港|食品|台湾|台灣|手机|澳門|닷컴|政府|გე|机构|健康|招聘|рф|大拿|ευ|ελ|世界|書籍|网址|닷넷|コム|游戏|企业|信息|嘉里|广东|政务|ye|yt|za|zm|zw))\.?)(?::\d{2,5})?(?:[/?#][^\s"]*)?/gi;

        const words = message.content.toLowerCase().split(' ');
        const { allowTenor } = automodSettings;
        if (
            words.some(
                word =>
                    word.startsWith('https://tenor.com') ||
                    word.startsWith('http://tenor.com') ||
                    word.startsWith('http://www.tenor.com') ||
                    word.startsWith('https://www.tenor.com') ||
                    word.startsWith('tenor.com') ||
                    word.startsWith('www.tenor.com')
            ) &&
            allowTenor.enabled
        ) {
            if (
                allowTenor.attachmentPermsOnly &&
                !message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.ATTACH_FILES)
            ) {
                let punished = await this._createAutomodPunishment(client, message, 'links', onlyCheck);
                if (punished !== false) return true;
            }
        } else if (linkRegex.test(message.content.toLowerCase())) {
            let punished = await this._createAutomodPunishment(client, message, 'links', onlyCheck);
            if (punished !== false) return true;
        }
    }

    // ======================================================

    async _createAutomodPunishment(client, message, type, onlyCheck) {
        const automod = await automodSchema.findOne({ guildID: message.guild.id });

        const {
            fast,
            massmention,
            filter,
            invites,
            walltext,
            links,
            maliciouslinks,
            fastTempMuteDuration,
            fastTempBanDuration,
            massmentionTempMuteDuration,
            massmentionTempBanDuration,
            filterTempMuteDuration,
            filterTempBanDuration,
            invitesTempMuteDuration,
            invitesTempBanDuration,
            walltextTempMuteDuration,
            walltextTempBanDuration,
            linksTempMuteDuration,
            linksTempBanDuration,
            maliciouslinksTempMuteDuration,
            maliciouslinksTempBanDuration
        } = automod;

        const settings = await settingsSchema.findOne({
            guildID: message.guild.id
        });
        const { autowarnexpire, baninfo, muterole, removerolesonmute } = settings;

        const structure = async (name, reason, time, color) => {
            if (onlyCheck) return;

            message.delete().catch(() => {});
            if (name === 'delete') return;

            if (automodCooldown.has(message.author.id)) return;
            else {
                automodCooldown.add(message.author.id);
                setTimeout(() => {
                    automodCooldown.delete(message.author.id);
                }, 2500);
            }

            const role = message.guild.roles.cache.get(muterole) || (await client.util.createMuteRole(message));

            if (name === 'tempmute') name = 'mute';
            if (name === 'tempban') name = 'ban';

            let memberRoles;

            if (name === 'mute') {
                if (!message.member.roles.cache.has(role.id)) {
                    memberRoles = removerolesonmute ? message.member.roles.cache.map(roles => roles.id) : [];
                    const unmanagableRoles = message.member.roles.cache
                        .filter(role => role.managed)
                        .map(roles => roles.id);

                    if (removerolesonmute) await message.member.roles.set([role, ...unmanagableRoles]);
                    else await client.util.muteMember(message, message.member, role);
                }
            }
            if (name === 'warn') {
                if (autowarnexpire !== 'disabled') time = parseFloat(autowarnexpire);
                else time = null;
            }

            let member = message.member;
            let punishmentID = client.util.createSnowflake();

            await this.createInfraction(
                client,
                `${name.charAt(0).toUpperCase() + name.slice(1)}`,
                message,
                message.guild.me,
                message.member,
                { reason: reason, punishmentID: punishmentID, time: time, auto: true }
            );
            if (name !== 'warn')
                await this.createPunishment(message.guild.name, message.guild.id, name, message.member.id, {
                    reason: reason,
                    time: time ? Date.now() + time : 'Never',
                    roles: memberRoles
                });
            await this.createUserInfractionDM(
                client,
                `${name.endsWith('e') ? name : name.endsWith('ban') ? name + 'ne' : name + 'e'}d`,
                color,
                message,
                message.member,
                {
                    reason: reason,
                    punishmentID: punishmentID,
                    time: time,
                    baninfo: name === 'ban' ? (baninfo !== 'none' ? baninfo : null) : null
                }
            );
            await this.createModerationLog(
                client,
                `${
                    name.charAt(0).toUpperCase() +
                    name.slice(1) +
                    (name.endsWith('e') ? '' : name.endsWith('ban') ? 'ne' : 'e')
                }d`,
                message.guild.me,
                message.member,
                message.channel,
                { reason: reason, duration: time, punishmentID: punishmentID, auto: true }
            );

            if (name === 'kick') await message.member.kick({ reason: reason });
            else if (name === 'ban') await message.guild.members.ban(message.member, { reason: reason });

            const punishedEmbed = new Discord.MessageEmbed()
                .setColor(color)
                .setDescription(
                    `${member.toString()} has been automatically ${
                        name.endsWith('e') ? name : name.endsWith('ban') ? name + 'ne' : name + 'e'
                    }d with ID \`${punishmentID}\``
                );

            const msg = await message.channel.send({ embeds: [punishedEmbed] });
            setTimeout(() => {
                msg.delete();
            }, 5000);

            if (name !== 'warn') return;

            const guildSystem = await systemSchema.findOne({
                guildID: message.guild.id
            });
            if (!guildSystem) return;
            const { system } = guildSystem;
            if (!system.length) return;
            const guildWarnings = await warningSchema.findOne({
                guildID: message.guild.id
            });
            if (!guildWarnings?.warnings?.length) return;
            const memberAutomodWarnings = guildWarnings.warnings.filter(
                warning => warning.userID === message.author.id && warning.auto && warning.type === 'Warn'
            );

            const x = [];
            for (let i = 0; i !== system.length; ++i) {
                if (memberAutomodWarnings.length - system[i].amount >= 0)
                    x.push(memberAutomodWarnings.length - system[i].amount);
            }

            if (!x.length) return;
            const closestInstance = memberAutomodWarnings.length - Math.min(...x);
            const instance = system.find(instance => instance.amount === closestInstance);
            const _reason = `[AUTO] Reaching or exceeding **${closestInstance}** infractions`;
            punishmentID = client.util.createSnowflake();

            if (instance.punishment === 'ban' || instance.punishment === 'tempban') {
                await this.createUserInfractionDM(
                    client,
                    'banned',
                    client.config.colors.punishment[2],
                    message,
                    message.member,
                    {
                        reason: _reason,
                        punishmentID: punishmentID,
                        time: instance.duration,
                        baninfo: baninfo !== 'none' ? baninfo : null
                    }
                );

                await this.createModerationLog(client, 'Banned', message.guild.me, message.member, message.channel, {
                    reason: _reason,
                    duration: instance.duration,
                    punishmentID: punishmentID,
                    auto: true
                });
                await this.createInfraction(client, 'Ban', message, message.guild.me, message.member, {
                    reason: _reason,
                    punishmentID: punishmentID,
                    time: instance.duration,
                    auto: true
                });
                if (instance.duration)
                    await this.createPunishment(message.guild.name, message.guild.id, 'ban', message.member.id, {
                        reason: _reason,
                        time: instance.duration ? Date.now() + instance.duration : 'Never'
                    });

                await message.guild.members.ban(message.member, { reason: _reason });
            } else if (instance.punishment === 'mute' || instance.punishment === 'tempmute') {
                const memberRoles = removerolesonmute ? member.roles.cache.map(roles => roles.id) : [];
                const unmanagableRoles = message.member.roles.cache.filter(role => role.managed).map(roles => roles.id);

                if (!message.member.roles.cache.has(role.id)) {
                    if (removerolesonmute) {
                        await member.voice.disconnect().catch(() => {});
                        await member.roles.set([role, ...unmanagableRoles]);
                    } else await client.util.muteMember(message, member, role);
                }

                await this.createInfraction(client, 'Mute', message, message.guild.me, message.member, {
                    reason: _reason,
                    punishmentID: punishmentID,
                    time: instance.duration,
                    auto: true
                });
                await this.createPunishment(message.guild.name, message.guild.id, 'mute', message.member.id, {
                    reason: _reason,
                    time: instance.duration ? Date.now() + instance.duration : 'Never',
                    roles: memberRoles
                });
                await this.createUserInfractionDM(
                    client,
                    'muted',
                    client.config.colors.punishment[1],
                    message,
                    message.member,
                    {
                        reason: _reason,
                        punishmentID: punishmentID,
                        time: instance.duration
                    }
                );
                await this.createModerationLog(client, 'Muted', message.guild.me, message.member, message.channel, {
                    reason: _reason,
                    duration: instance.duration,
                    punishmentID: punishmentID,
                    auto: true
                });
            } else if (instance.punishment === 'kick') {
                await this.createUserInfractionDM(
                    client,
                    'kicked',
                    client.config.colors.punishment[1],
                    message,
                    member,
                    {
                        reason: _reason,
                        punishmentID: punishmentID,
                        time: time
                    }
                );
                await this.createInfraction(client, 'Kick', message, message.guild.me, message.member, {
                    reason: _reason,
                    punishmentID: punishmentID,
                    time: instance.duration,
                    auto: true
                });
                await this.createModerationLog(client, 'Kicked', message.guild.me, message.member, message.channel, {
                    reason: _reason,
                    duration: instance.duration,
                    punishmentID: punishmentID,
                    auto: true
                });

                await message.guild.members.kick(message.member, { reason: _reason });
            }

            const _punishedEmbed = new Discord.MessageEmbed();
            if (instance.punishment === 'warn') _punishedEmbed.setColor(client.config.colors.punishment[0]);
            if (instance.punishment === 'kick') _punishedEmbed.setColor(client.config.colors.punishment[1]);
            if (instance.punishment === 'mute' || instance.punishment === 'tempmute')
                _punishedEmbed.setColor(client.config.colors.punishment[1]);
            if (instance.punishment === 'ban' || instance.punishment === 'tempban')
                _punishedEmbed.setColor(client.config.colors.punishment[2]);
            const stype = instance.punishment.replace('temp', '');
            _punishedEmbed.setDescription(
                `${member.toString()} has been automatically ${(
                    stype.charAt(0).toUpperCase() +
                    stype.slice(1) +
                    (stype.endsWith('e') ? '' : stype.endsWith('ban') ? 'ne' : 'e')
                ).toLowerCase()}d with ID \`${punishmentID}\``
            );
            const msg2 = await message.channel.send({ embeds: [_punishedEmbed] });
            return setTimeout(async () => await msg2.delete(), 5000);
        };

        if (type === 'fast') {
            const userMessages = [];
            const _messages = await message.channel.messages.fetch({ limit: 100 });
            const messages = [..._messages.values()];
            for (let i = 0; i !== 5; ++i) {
                const msg = messages[i];
                if (msg?.author.id === message.author.id) userMessages.push(msg);
            }
            if (fast !== 'disabled') message.channel.bulkDelete(userMessages).catch(() => {});
        }

        switch (type) {
            case 'maliciouslinks':
                if (maliciouslinks === 'disabled') return false;
                return structure(
                    maliciouslinks,
                    `[AUTO] Sending a malicious link`,
                    maliciouslinksTempMuteDuration
                        ? maliciouslinksTempMuteDuration
                        : maliciouslinksTempBanDuration
                        ? maliciouslinksTempBanDuration
                        : null,
                    maliciouslinks === 'warn'
                        ? client.config.colors.punishment[0]
                        : maliciouslinks === 'mute' || maliciouslinks === 'tempmute'
                        ? client.config.colors.punishment[1]
                        : maliciouslinks === 'ban' || maliciouslinks === 'tempban'
                        ? client.config.colors.punishment[2]
                        : null
                );
            case 'filter':
                if (filter === 'disabled') return false;
                return structure(
                    filter,
                    `[AUTO] Sending or editing a message to a blacklisted word on the server`,
                    filterTempMuteDuration
                        ? filterTempMuteDuration
                        : filterTempBanDuration
                        ? filterTempBanDuration
                        : null,
                    filter === 'warn'
                        ? client.config.colors.punishment[0]
                        : filter === 'mute' || filter === 'tempmute'
                        ? client.config.colors.punishment[1]
                        : filter === 'ban' || filter === 'tempban'
                        ? client.config.colors.punishment[2]
                        : null
                );
            case 'massmention':
                if (massmention === 'disabled') return false;
                return structure(
                    massmention,
                    `[AUTO] Pinging 5 or more users`,
                    massmentionTempMuteDuration
                        ? massmentionTempMuteDuration
                        : massmentionTempBanDuration
                        ? massmentionTempBanDuration
                        : null,
                    massmention === 'warn'
                        ? client.config.colors.punishment[0]
                        : massmention === 'mute' || massmention === 'tempmute'
                        ? client.config.colors.punishment[1]
                        : massmention === 'ban' || massmention === 'tempban'
                        ? client.config.colors.punishment[2]
                        : null
                );
            case 'walltext':
                if (walltext === 'disabled') return false;
                return structure(
                    walltext,
                    `[AUTO] Sending huge or wall-like messages`,
                    walltextTempMuteDuration
                        ? walltextTempMuteDuration
                        : walltextTempBanDuration
                        ? walltextTempBanDuration
                        : null,
                    walltext === 'warn'
                        ? client.config.colors.punishment[0]
                        : walltext === 'mute' || walltext === 'tempmute'
                        ? client.config.colors.punishment[1]
                        : walltext === 'ban' || walltext === 'tempban'
                        ? client.config.colors.punishment[2]
                        : null
                );

            case 'fast':
                if (fast === 'disabled') return false;
                return structure(
                    fast,
                    `[AUTO] Sending many messages in quick succession`,
                    fastTempMuteDuration ? fastTempMuteDuration : fastTempBanDuration ? fastTempBanDuration : null,
                    fast === 'warn'
                        ? client.config.colors.punishment[0]
                        : fast === 'mute' || fast === 'tempmute'
                        ? client.config.colors.punishment[1]
                        : fast === 'ban' || fast === 'tempban'
                        ? client.config.colors.punishment[2]
                        : null
                );
            case 'invites':
                if (invites === 'disabled') return false;
                return structure(
                    invites,
                    `[AUTO] Sending a discord server invite`,
                    invitesTempMuteDuration
                        ? invitesTempMuteDuration
                        : invitesTempBanDuration
                        ? invitesTempBanDuration
                        : null,
                    invites === 'warn'
                        ? client.config.colors.punishment[0]
                        : invites === 'mute' || invites === 'tempmute'
                        ? client.config.colors.punishment[1]
                        : invites === 'ban' || invites === 'tempban'
                        ? client.config.colors.punishment[2]
                        : null
                );
            case 'links':
                if (links === 'disabled') return false;
                return structure(
                    links,
                    `[AUTO] Sending links`,
                    linksTempMuteDuration ? linksTempMuteDuration : linksTempBanDuration ? linksTempBanDuration : null,
                    links === 'warn'
                        ? client.config.colors.punishment[0]
                        : links === 'mute' || links === 'tempmute'
                        ? client.config.colors.punishment[1]
                        : links === 'ban' || links === 'tempban'
                        ? client.config.colors.punishment[2]
                        : null
                );
        }
    }
}

module.exports = PunishmentManager;
