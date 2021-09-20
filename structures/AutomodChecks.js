const Automod = require('./Automod');
const automodSchema = require('../schemas/automod-schema');
global.userMap = new Map();
const Discord = require('discord.js');

class AutomodChecks {

    constructor(client, message, edit = false) {

        if (!client) throw new Error('required argument `client` is missing');
        if (!message) throw new Error('required argument `message` is missing');
        if (typeof message !== 'object') throw new Error('message must be a string');

        const main = async() => {

            const automodSettings = await automodSchema.findOne({
                guildID: message.guild.id
            })

            // Filter Check;

            const { filterList } = automodSettings;
            const allowedChars = 'abcdefghjiklmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ ';
            const extraAllowedChars = [];
            const messageCharacters = [];
            for (let i = 0; i !== message.content.length; ++i) {
                if (allowedChars.includes(message.content[i]) || filterList.some(word => word.includes(message.content[i]))) {
                    messageCharacters.push(message.content[i].toLowerCase());
                    if (!allowedChars.includes(message.content[i].toLowerCase()) && filterList.some(word => word.includes(message.content[i].toLowerCase()))) 
                        extraAllowedChars.push(message.content[i].toLowerCase());
                }
            }
            
            
            const joinedCharacters = messageCharacters.join('');

            if (
                filterList.some(word => 
                    joinedCharacters.split(' ').join('').toLowerCase().includes(word) || 
                    joinedCharacters.split('').filter(char => !extraAllowedChars.includes(char)).join('').toLowerCase().includes(word))
            ) {
                let punished = await new Automod(client, message, 'filter').punished;
                if (punished) return;
            }

            // Mass Mention

            if (!edit && message.mentions.users.filter(user => !user.bot).size >= 5) {
                let punished = await new Automod(client, message, 'massmention').punished;
                if (punished) return;
            }
            // Walltext

            const walltextCheck = message.content.split('\n')
            if (walltextCheck.length >= 9 || message.content.length >= 700) {
                let punished = await new Automod(client, message, 'walltext').punished;
                if (punished) return;
            }
            // Spam

            if (!edit) {
                if (userMap.has(message.author.id)) {
                    const userData = userMap.get(message.author.id)
                    let msgCount = userData.msgCount
                    if (parseInt(msgCount) === 5) {
                        userMap.delete(message.author.id);
                        let punished = await new Automod(client, message, 'fast').punished;
                        if (punished) return;
                    } else {
                        msgCount++
                        userData.msgCount = msgCount;
                        userMap.set(message.author.id, userData)
                    }
                } else {
                    userMap.set(message.author.id, {
                        msgCount: 1,
                        lastMessage: message,
                        timer: null
                    })
                    setTimeout(() => {
                        userMap.delete(message.author.id)
                    }, 4000)
                }
            }

            // Invites

            const inviteCheck = /discord(?:app)?.(?:com\/invite|gg)\/[a-zA-Z0-9]+\/?/i
            if (inviteCheck.test(message.content.toLowerCase())) {
                let punished = await new Automod(client, message, 'invites').punished;
                if (punished) return;
            }
            // Links

            const linkRegex = /(?<protocol>(?:(?:[a-z]+:)?\/\/)|www\.)(?:\S+(?::\S*)?@)?(?<hostname>localhost|(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?:(?:[a-z\u00a1-\uffff0-9][-_]*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:northwesternmutual|travelersinsurance|vermögensberatung|vermögensberater|americanexpress|kerryproperties|sandvikcoromant|afamilycompany|americanfamily|bananarepublic|cancerresearch|cookingchannel|kerrylogistics|weatherchannel|international|lifeinsurance|spreadbetting|travelchannel|wolterskluwer|construction|lplfinancial|scholarships|versicherung|accountants|barclaycard|blackfriday|blockbuster|bridgestone|calvinklein|contractors|creditunion|engineering|enterprises|foodnetwork|investments|kerryhotels|lamborghini|motorcycles|olayangroup|photography|playstation|productions|progressive|redumbrella|williamhill|சிங்கப்பூர்|accountant|apartments|associates|basketball|bnpparibas|boehringer|capitalone|consulting|creditcard|cuisinella|eurovision|extraspace|foundation|healthcare|immobilien|industries|management|mitsubishi|nationwide|newholland|nextdirect|onyourside|properties|protection|prudential|realestate|republican|restaurant|schaeffler|swiftcover|tatamotors|technology|university|vlaanderen|volkswagen|accenture|alfaromeo|allfinanz|amsterdam|analytics|aquarelle|barcelona|bloomberg|christmas|community|directory|education|equipment|fairwinds|financial|firestone|fresenius|frontdoor|fujixerox|furniture|goldpoint|hisamitsu|homedepot|homegoods|homesense|institute|insurance|kuokgroup|lancaster|landrover|lifestyle|marketing|marshalls|melbourne|microsoft|panasonic|passagens|pramerica|richardli|scjohnson|shangrila|solutions|statebank|statefarm|stockholm|travelers|vacations|موريتانيا|yodobashi|abudhabi|airforce|allstate|attorney|barclays|barefoot|bargains|baseball|boutique|bradesco|broadway|brussels|budapest|builders|business|capetown|catering|catholic|cipriani|cityeats|cleaning|clinique|clothing|commbank|computer|delivery|deloitte|democrat|diamonds|discount|discover|download|engineer|ericsson|etisalat|exchange|feedback|fidelity|firmdale|football|frontier|goodyear|grainger|graphics|guardian|hdfcbank|helsinki|holdings|hospital|infiniti|ipiranga|istanbul|jpmorgan|lighting|lundbeck|marriott|maserati|mckinsey|memorial|merckmsd|mortgage|observer|partners|pharmacy|pictures|plumbing|property|redstone|reliance|saarland|samsclub|security|services|shopping|showtime|softbank|software|stcgroup|supplies|training|vanguard|ventures|verisign|woodside|السعودية|yokohama|abogado|academy|agakhan|alibaba|android|athleta|auction|audible|auspost|avianca|banamex|bauhaus|bentley|bestbuy|booking|brother|bugatti|capital|caravan|careers|channel|charity|chintai|citadel|clubmed|college|cologne|comcast|company|compare|contact|cooking|corsica|country|coupons|courses|cricket|cruises|dentist|digital|domains|exposed|express|farmers|fashion|ferrari|ferrero|finance|fishing|fitness|flights|florist|flowers|forsale|frogans|fujitsu|gallery|genting|godaddy|grocery|guitars|hamburg|hangout|hitachi|holiday|hosting|hoteles|hotmail|hyundai|ismaili|jewelry|juniper|kitchen|komatsu|lacaixa|lanxess|lasalle|latrobe|leclerc|limited|lincoln|markets|monster|netbank|netflix|network|neustar|okinawa|oldnavy|organic|origins|philips|pioneer|politie|realtor|recipes|rentals|reviews|rexroth|samsung|sandvik|schmidt|schwarz|science|shiksha|singles|staples|storage|support|surgery|systems|temasek|theater|theatre|tickets|tiffany|toshiba|trading|walmart|wanggou|watches|weather|website|wedding|whoswho|windows|winners|xfinity|католик|الجزائر|العليان|اتصالات|پاکستان|البحرين|كاثوليك|இந்தியா|yamaxun|youtube|zuerich|abarth|abbott|abbvie|africa|agency|airbus|airtel|alipay|alsace|alstom|amazon|anquan|aramco|author|bayern|beauty|berlin|bharti|bostik|boston|broker|camera|career|caseih|casino|center|chanel|chrome|church|circle|claims|clinic|coffee|comsec|condos|coupon|credit|cruise|dating|datsun|dealer|degree|dental|design|direct|doctor|dunlop|dupont|durban|emerck|energy|estate|events|expert|family|flickr|futbol|gallup|garden|george|giving|global|google|gratis|health|hermes|hiphop|hockey|hotels|hughes|imamat|insure|intuit|jaguar|joburg|juegos|kaufen|kinder|kindle|kosher|lancia|latino|lawyer|lefrak|living|locker|london|luxury|madrid|maison|makeup|market|mattel|mobile|monash|mormon|moscow|museum|mutual|nagoya|natura|nissan|nissay|norton|nowruz|office|olayan|online|oracle|orange|otsuka|pfizer|photos|physio|pictet|quebec|racing|realty|reisen|repair|report|review|rocher|rogers|ryukyu|safety|sakura|sanofi|school|schule|search|secure|select|shouji|soccer|social|stream|studio|supply|suzuki|swatch|sydney|taipei|taobao|target|tattoo|tennis|tienda|tjmaxx|tkmaxx|toyota|travel|unicom|viajes|viking|villas|virgin|vision|voting|voyage|vuelos|walter|webcam|xihuan|москва|онлайн|ファッション|भारतम्|ارامكو|امارات|الاردن|المغرب|ابوظبي|مليسيا|இலங்கை|فلسطين|yachts|yandex|zappos|actor|adult|aetna|amfam|amica|apple|archi|audio|autos|azure|baidu|beats|bible|bingo|black|boats|bosch|build|canon|cards|chase|cheap|cisco|citic|click|cloud|coach|codes|crown|cymru|dabur|dance|deals|delta|drive|dubai|earth|edeka|email|epson|faith|fedex|final|forex|forum|gallo|games|gifts|gives|glade|glass|globo|gmail|green|gripe|group|gucci|guide|homes|honda|horse|house|hyatt|ikano|irish|iveco|jetzt|koeln|kyoto|lamer|lease|legal|lexus|lilly|linde|lipsy|lixil|loans|locus|lotte|lotto|macys|mango|media|miami|money|movie|nexus|nikon|ninja|nokia|nowtv|omega|osaka|paris|parts|party|phone|photo|pizza|place|poker|praxi|press|prime|promo|quest|radio|rehab|reise|ricoh|rocks|rodeo|rugby|salon|sener|seven|sharp|shell|shoes|skype|sling|smart|smile|solar|space|sport|stada|store|study|style|sucks|swiss|tatar|tires|tirol|tmall|today|tokyo|tools|toray|total|tours|trade|trust|tunes|tushu|ubank|vegas|video|vodka|volvo|wales|watch|weber|weibo|works|world|xerox|ישראל|বাংলা|భారత్|भारोत|संगठन|ایران|بازار|بھارت|سودان|همراه|سورية|ഭാരതം|嘉里大酒店|yahoo|aarp|able|adac|aero|akdn|ally|amex|arab|army|arpa|arte|asda|asia|audi|auto|baby|band|bank|bbva|beer|best|bike|bing|blog|blue|bofa|bond|book|buzz|cafe|call|camp|care|cars|casa|case|cash|cbre|cern|chat|citi|city|club|cool|coop|cyou|data|date|dclk|deal|dell|desi|diet|dish|docs|duck|dvag|erni|fage|fail|fans|farm|fast|fiat|fido|film|fire|fish|flir|food|ford|free|fund|game|gbiz|gent|ggee|gift|gmbh|gold|golf|goog|guge|guru|hair|haus|hdfc|help|here|hgtv|host|hsbc|icbc|ieee|imdb|immo|info|itau|java|jeep|jobs|jprs|kddi|kiwi|kpmg|kred|land|lego|lgbt|lidl|life|like|limo|link|live|loan|loft|love|ltda|luxe|maif|meet|meme|menu|mini|mint|mobi|moda|moto|name|navy|news|next|nico|nike|ollo|open|page|pars|pccw|pics|ping|pink|play|plus|pohl|porn|post|prod|prof|qpon|raid|read|reit|rent|rest|rich|rmit|room|rsvp|ruhr|safe|sale|sarl|save|saxo|scot|seat|seek|sexy|shaw|shia|shop|show|silk|sina|site|skin|sncf|sohu|song|sony|spot|star|surf|talk|taxi|team|tech|teva|tiaa|tips|town|toys|tube|vana|visa|viva|vivo|vote|voto|wang|weir|wien|wiki|wine|work|xbox|ಭಾರತ|ଭାରତ|大众汽车|ভাৰত|ভারত|موقع|香格里拉|сайт|アマゾン|дети|ポイント|ලංකා|電訊盈科|クラウド|ભારત|भारत|عمان|بارت|ڀارت|عراق|شبكة|بيتك|组织机构|تونس|グーグル|ਭਾਰਤ|yoga|zara|zero|zone|aaa|abb|abc|aco|ads|aeg|afl|aig|anz|aol|app|art|aws|axa|bar|bbc|bbt|bcg|bcn|bet|bid|bio|biz|bms|bmw|bom|boo|bot|box|buy|bzh|cab|cal|cam|car|cat|cba|cbn|cbs|ceo|cfa|cfd|com|cpa|crs|csc|dad|day|dds|dev|dhl|diy|dnp|dog|dot|dtv|dvr|eat|eco|edu|esq|eus|fan|fit|fly|foo|fox|frl|ftr|fun|fyi|gal|gap|gay|gdn|gea|gle|gmo|gmx|goo|gop|got|gov|hbo|hiv|hkt|hot|how|ibm|ice|icu|ifm|inc|ing|ink|int|ist|itv|jcb|jio|jll|jmp|jnj|jot|joy|kfh|kia|kim|kpn|krd|lat|law|lds|llc|llp|lol|lpl|ltd|man|map|mba|med|men|mil|mit|mlb|mls|mma|moe|moi|mom|mov|msd|mtn|mtr|nab|nba|nec|net|new|nfl|ngo|nhk|now|nra|nrw|ntt|nyc|obi|off|one|ong|onl|ooo|org|ott|ovh|pay|pet|phd|pid|pin|pnc|pro|pru|pub|pwc|qvc|red|ren|ril|rio|rip|run|rwe|sap|sas|sbi|sbs|sca|scb|ses|sew|sex|sfr|ski|sky|soy|spa|srl|stc|tab|tax|tci|tdk|tel|thd|tjx|top|trv|tui|tvs|ubs|uno|uol|ups|vet|vig|vin|vip|wed|win|wme|wow|wtc|wtf|xin|कॉम|セール|คอม|我爱你|қаз|срб|бел|קום|淡马锡|орг|नेट|ストア|мкд|كوم|中文网|ком|укр|亚马逊|诺基亚|飞利浦|мон|عرب|ไทย|рус|ລາວ|みんな|天主教|مصر|قطر|հայ|新加坡|xxx|xyz|you|yun|zip|ac|ad|ae|af|ag|ai|al|am|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cu|cv|cw|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|ss|st|su|sv|sx|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|佛山|慈善|集团|在线|한국|点看|八卦|公益|公司|网站|移动|联通|бг|时尚|微博|삼성|商标|商店|商城|ею|新闻|家電|中信|中国|中國|娱乐|谷歌|购物|通販|网店|餐厅|网络|香港|食品|台湾|台灣|手机|澳門|닷컴|政府|გე|机构|健康|招聘|рф|大拿|ευ|ελ|世界|書籍|网址|닷넷|コム|游戏|企业|信息|嘉里|广东|政务|ye|yt|za|zm|zw))\.?)(?::\d{2,5})?(?:[/?#][^\s"]*)?/gi


            const words = message.content.toLowerCase().split(' ');
            const { allowTenor } = automodSettings;
            if (words.some(word => 
                word.startsWith('https://tenor.com') ||
                word.startsWith('http://tenor.com') ||
                word.startsWith('http://www.tenor.com') ||
                word.startsWith('https://www.tenor.com') ||
                word.startsWith('tenor.com') ||
                word.startsWith('www.tenor.com')
            ) && allowTenor.enabled) {
                if (allowTenor.attachmentPermsOnly && !message.channel.permissionsFor(message.member).has(Discord.Permissions.FLAGS.ATTACH_FILES)) return new Automod(client, message, 'links')
            } else if (linkRegex.test(message.content.toLowerCase())) return new Automod(client, message, 'links');

        }

        return main();
    }

}

module.exports = AutomodChecks;
