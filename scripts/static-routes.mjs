// Give every page a real file, so GitHub Pages answers deep links with 200.
//
// Pages only knows about files. Without this, a deep link is served from 404.html: the app
// still boots and shows the page, but the HTTP status is 404, so search engines and link
// previews treat every page but the home page as missing. Pages resolves /a/b to a/b.html, so
// a copy of the app shell there fixes the status with no change to the URL.
//
// The routes come from the sitemap, which is also what search engines read.
//
//   node <this file> <outDir>
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const OUT = process.argv[2];
if (!OUT) {
  console.error('usage: node static-routes.mjs <outDir>');
  process.exit(1);
}

const sitemap = readFileSync('public/sitemap.xml', 'utf8');
const paths = [...sitemap.matchAll(/<loc>https?:\/\/[^/<]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
if (paths.length === 0) {
  console.error('public/sitemap.xml lists no pages');
  process.exit(1);
}

const shell = join(OUT, 'index.html');
const put = (file) => {
  mkdirSync(dirname(file), { recursive: true });
  copyFileSync(shell, file);
};

let written = 0;
const folders = new Set();
for (const path of paths) {
  const name = path.replace(/^\/|\/$/g, '');
  if (name === '') continue;
  put(join(OUT, `${name}.html`));
  written++;
  // Pages may answer a folder of pages (/learn) by redirecting to /learn/ and serving its
  // index.html, so every folder that holds pages needs one too.
  if (name.includes('/')) folders.add(name.slice(0, name.lastIndexOf('/')));
}
for (const folder of folders) put(join(OUT, folder, 'index.html'));

console.log(`${written} pages given a static entry, plus ${folders.size} folder index files.`);
