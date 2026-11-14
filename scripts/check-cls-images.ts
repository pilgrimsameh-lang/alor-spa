import fs from 'node:fs';
import path from 'node:path';

function findFiles(dir: string, ext: string[]): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(filePath, ext));
    } else if (ext.some((e) => file.endsWith(e))) {
      results.push(filePath);
    }
  }
  return results;
}

function checkImageDimensions() {
  console.log('=== Checking Image Tags for CLS & Accessibility ===\n');
  const files = findFiles(path.resolve('src/components'), ['.astro']).concat(findFiles(path.resolve('src/pages'), ['.astro']));
  const issues: string[] = [];

  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const imgTags = content.match(/<img[^>]+>/gi) || [];

    for (const tag of imgTags) {
      const relPath = path.relative(process.cwd(), f);
      // Skip dynamic preview img in admin MediaPickerModal where width/height are controlled via CSS
      if (f.includes('MediaPickerModal.astro') || f.includes('admin')) {
        continue;
      }
      if (!tag.includes('alt=')) {
        issues.push(`[${relPath}] Image missing alt: ${tag.slice(0, 60)}...`);
      }
      if (!tag.includes('width=') || !tag.includes('height=')) {
        issues.push(`[${relPath}] Image missing explicit width/height: ${tag.slice(0, 60)}...`);
      }
    }
  }

  console.log(`Found ${issues.length} image CLS/a11y issues:`);
  issues.forEach((i) => console.log('  - ' + i));
  console.log('=== End Image Check ===\n');
}

checkImageDimensions();
