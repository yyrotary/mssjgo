const fs = require('fs');
const urls = [
    'https://furoku.github.io/bananaX/projects/infographic-evaluation/ko/evaluation_data.json',
    'https://furoku.github.io/bananaX/projects/infographic-evaluation/ko/evaluation_lite.json',
    'https://furoku.github.io/bananaX/projects/infographic-evaluation/ko/business_prompts.json'
];

async function download() {
    for (const url of urls) {
        try {
            const res = await fetch(url);
            const text = await res.text();
            const filename = url.split('/').pop();
            fs.writeFileSync(filename, text);
            console.log(`Downloaded ${filename}: ${text.length} bytes`);
        } catch (e) {
            console.error(e);
        }
    }
}
download();
