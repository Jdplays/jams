import path from 'path';
import url from 'url';
import { glob } from 'glob';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import pkg from 'webpack';
const { SourceMapDevToolPlugin } = pkg;

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const entries = glob.sync('./jams/static/ts/**/*.ts').reduce((entries, entry) => {
  // Normalize the entry path
  const normalizedEntry = path.normalize(entry);

   // Remove the 'jams/static/ts/' prefix using path.relative
  const entryName = path.relative('jams/static/ts', normalizedEntry).replace(/\.ts$/, ''); // Remove the .ts extension

  entries[entryName] = `./${entry}`; // Map entry name to file path
  return entries;
}, {});


export default {
  watch: true,
  devtool: 'source-map',
  entry: entries, // Adjust to your TypeScript entry point
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, './jams/static/js/'), // Output directory for the JavaScript files
    publicPath: '/static/js/'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  optimization: {
    minimize: false,
  },
  devtool: false,
  plugins: [
    new SourceMapDevToolPlugin({
      append: '\n//# sourceMappingURL=/static/js/[url]',
      filename: '[name].js.map',
    }),
    //new BundleAnalyzerPlugin()
  ],
  mode: 'development'
};
