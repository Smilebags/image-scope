const esbuild = require('esbuild');

const args = process.argv.slice(2);
const ENV_EXTENSION = args[0];

esbuild.buildSync({
  bundle: true,
  entryPoints: ['./src/main.js'],
  define: { ENV_EXTENSION: `"${ENV_EXTENSION}"`, DEBUG: 'true', },
  outfile: './dist-chrome/bundle.js',
});
