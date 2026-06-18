const fs = require('fs');
const file = 'src/renderer/control/ControlApp.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/window\.api\.invoke\('([^']+)'(?:,\s*([^)]+?))?\)/g, (match, p1, p2) => {
  const method = p1.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  return 'window.api.' + method + '(' + (p2 || '') + ')';
});

content = content.replace(/window\.api\.send\('([^']+)'(?:,\s*([^)]+?))?\)/g, (match, p1, p2) => {
  const method = p1.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  return 'window.api.' + method + '(' + (p2 || '') + ')';
});

// Fix special cases like previewAlert where arguments might be messy
content = content.replace(/window\.api\.startPoll\([^)]+\)/g, (match) => {
    return match.replace("window.api.startPoll(", "window.api.previewAlert({ type: 'start-poll', ").replace(/,$/, " })");
});

fs.writeFileSync(file, content);
console.log('Fixed API calls in ' + file);
