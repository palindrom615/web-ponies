const webpack = require('webpack');
const path = require('path');
const {merge} = require('webpack-merge');
const CommonConfig = require('./webpack.common.js');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = merge(CommonConfig, {
  entry: {
    app: [path.join(process.cwd(), 'src/index.ts')]
  },
  output: {
    path: path.join(process.cwd(), 'dist'),
    filename: 'browser-ponies.min.js',
    publicPath: '/',
    library: 'BrowserPonies'
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()]
  },
  plugins: [
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false
    }),
  ]
});
