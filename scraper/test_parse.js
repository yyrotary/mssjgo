const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('page.html', 'utf8');
const $ = cheerio.load(html);
$('script').each((i, el) => {
    if ($(el).attr('src')) {
        console.log($(el).attr('src'));
    }
});
