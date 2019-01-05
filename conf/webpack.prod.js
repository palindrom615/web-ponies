const webpack = require('webpack');
const path = require('path');
const Merge = require('webpack-merge');
const CommonConfig = require('./webpack.common.js');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = Merge(CommonConfig, {
  entry: {
    app: [path.join(process.cwd(), 'src/index.js')]
  },
  output: {
    path: path.join(process.cwd(), 'dist'),
    filename: 'browser-ponies.min.js',
    publicPath: '/',
    library: 'BrowserPonies'
  },
  plugins: [
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false
    }),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    }),
    new UglifyJSPlugin({
      uglifyOptions: {
        beautify: false,
        mangle: {
          keep_fnames: true
        },
        compress: true,
        comments: false
      }
    })
  ]
});
