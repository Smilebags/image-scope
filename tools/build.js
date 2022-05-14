const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ENV_EXTENSION = args[0];

const DIST_FOLDER = ENV_EXTENSION === 'chrome' ? 'dist-chrome' : 'dist-firefox';

mkdir(DIST_FOLDER);
copy('src/points.frag', `${DIST_FOLDER}/points.frag`);
copy('src/points.vert', `${DIST_FOLDER}/points.vert`);

const manifestPath = ENV_EXTENSION === 'chrome' ? `src/chrome-manifest.json` : 'src/firefox-manifest.json';

copy(manifestPath, `${DIST_FOLDER}/manifest.json`);

esbuild.buildSync({
  bundle: true,
  entryPoints: ['./src/main.js'],
  define: { ENV_EXTENSION: `"${ENV_EXTENSION}"` },
  outfile: `${DIST_FOLDER}/bundle.js`,
});

function copy(src, dest) {
  const readStream = fs.createReadStream(src);
  const writeStream = fs.createWriteStream(dest);
  readStream.pipe(writeStream);
}

function mkdir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}
