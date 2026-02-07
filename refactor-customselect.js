// Script to help identify files that need CustomSelect -> CustomDropdown replacement
// This is a helper file - actual replacements should be done manually to ensure correctness

const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

console.log('Files that likely need CustomSelect -> CustomDropdown replacement:');
files.forEach(file => {
  const content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  if (content.includes('const CustomSelect')) {
    console.log(`- ${file}`);
  }
});


