const fs = require('fs');
const html = fs.readFileSync('page.html', 'utf-8');

// match all script tags
const scriptSrcs = html.match(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi);
console.log("Script sources:", scriptSrcs);

// find anywhere it says "prompt" or "data"
const promptLines = html.split('\n').filter(l => l.includes('data') || l.includes('prompt')).slice(0, 50).join('\n');
fs.writeFileSync('snippets.txt', promptLines);
