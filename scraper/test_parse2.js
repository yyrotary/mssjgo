const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('page.html', 'utf8');
const $ = cheerio.load(html);
$('script').each((i, el) => {
    if (!$(el).attr('src')) {
        const len = $(el).html().length;
        if (len > 1000) {
            console.log('Found Large Inline Script: Size', Math.floor(len / 1024), 'KB');
            fs.writeFileSync('inline_script.js', $(el).html());
        }
    }
});
