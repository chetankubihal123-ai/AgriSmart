import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';

const replacements = {
  'farm-light': 'prodmast-primary',
  'farm-white': 'white',
  'farm-accent': 'prodmast-accent',
  'farm-text': 'prodmast-light',
  'farm-muted': 'prodmast-muted',
  'farm-brand': 'prodmast-primary',
  'farm-dark': 'prodmast-dark',
  'farm-forest': 'prodmast-primary'
};

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;

      for (const [oldClass, newClass] of Object.entries(replacements)) {
        // Replace boundary-aware matches. e.g. text-farm-light -> text-prodmast-primary
        const regex = new RegExp(oldClass, 'g');
        content = content.replace(regex, newClass);
      }

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(SRC_DIR);
console.log('Class migration complete!');
