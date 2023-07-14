const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ENV_EXTENSION = args[0];

const DIST_FOLDER = ENV_EXTENSION === 'chrome' ? 'dist-chrome' : 'dist-firefox';

mkdir(DIST_FOLDER);
copy('src/points.frag', `${DIST_FOLDER}/points.frag`);
copy('src/points.vert', `${DIST_FOLDER}/points.vert`);
copy('src/popup.html', `${DIST_FOLDER}/popup.html`);

const manifestPath = ENV_EXTENSION === 'chrome' ? `src/chrome-manifest.json` : 'src/firefox-manifest.json';

copy(manifestPath, `${DIST_FOLDER}/manifest.json`);

const commonConfig = {
  bundle: true,
  define: { ENV_EXTENSION: `"${ENV_EXTENSION}"` },
};
esbuild.buildSync({
  ...commonConfig,
  entryPoints: ['./src/main.ts'],
  outfile: `${DIST_FOLDER}/bundle.js`,
});
esbuild.buildSync({
  ...commonConfig,
  entryPoints: ['./src/popup.js'],
  outfile: `${DIST_FOLDER}/popup.js`,
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
