const fs = require('fs');
fetch('https://furoku.github.io/bananaX/projects/infographic-evaluation/ko/')
  .then(res => res.text())
  .then(text => fs.writeFileSync('page.html', text))
  .catch(err => console.error(err));
