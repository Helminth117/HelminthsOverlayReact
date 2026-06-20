const BLOCKED_WORDS = [
  "pendejo","pinche","chingada","chingar","cabrón","cabron","puta","puto",
  "culero","culo","verga","mamón","mamada","wey","güey","hijo de puta",
  "gilipollas","imbécil","subnormal","idiota","coño","joder","mierda",
  "marica","maricon","maricón","retrasado","mongolo","pelotudo","boludo",
  "forro","perra","zorra","putona","ramera","bastardo","hdp","ctm",
  "ojete","naco","mamon","chinga tu madre","vete a la chingada",
  "me cago","hostia","capullo","estupido","tarado","baboso","menso",
  "bruto","inútil","inutil","cagon","desgraciado","maldito",
  "fuck","fucking","fucker","motherfucker","shit","bullshit","asshole",
  "bitch","bastard","crap","dick","cock","pussy","cunt","whore","slut",
  "nigga","nigger","faggot","fag","retard","moron","dumbass","jackass",
  "dipshit","douchebag","prick","twat","wanker","tosser","bollocks",
  "arse","arsehole","kys","kill yourself","scumbag","piece of shit",
  "gemido","gemidos","gimiendo","moan","moans","moaning","orgasmo","orgasmos","orgasm","porno",
  "hentai","rule34","sex","sexo","xxx","porn","nude","naked","horny",
  "erotico","fetish","fetiche","onlyfans","only fans","gemi2","gmi2",
  "gimi2","gimi3","gemi3","gemido2","gemid2","nsfw","nfw","boobs","tits",
  "clit","dildo","masturbate","masturbacion","cum","blowjob","handjob",
  "anal","deepthroat","gangbang","milf","rape","violar","violacion",
  "te voy a matar","te voy a golpear","muerte","matar","kill","murder",
  "bomb","bomba","shoot","apuñalar","gore","mutilación",
  "suicidio","suicidate","suicide","autolesión","cortarse","self harm",
  "self-harm","overdose","sobredosis",
  "aaaa","aaaaaa","jajajajajaja","lolololol","xdxdxd",
  "contraseña","password","dox","doxxing","doxear","hackeo",
  "sé donde vives","i know where you live","datos personales",
  "skibidi","chupapi","muñaño","mi bebito fiu fiu","gyat","rizz",
  "fanum tax","looksmaxxing","brainrot","sigma male"
];

const normalize = (text) => text.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').replace(/(\b\w)\s(?=\w\b)/g, '$1');

export const TTSFilter = {
  clean: (text) => {
    if (!text) return '';
    let result = text;
    const normalized = normalize(text);

    for (const word of BLOCKED_WORDS) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|\\W)${escaped}(?:\\W|$)`, 'gi');
      if (regex.test(normalized)) {
        const wordRegex = new RegExp(escaped, 'gi');
        result = result.replace(wordRegex, (match) => '*'.repeat(match.length));
      }
    }
    return result;
  }
};
