const webpack = require('webpack');
const path = require('path');
const Merge = require('webpack-merge');
const CommonConfig = require('./webpack.common.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = Merge(CommonConfig, {
  entry: {
    app: [path.join(process.cwd(), 'static/index.js')]
  },
  module: {
    rules: [{
      test: /\.css$/,
      use: ['style-loader', 'css-loader']
    }]
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      template: path.join(process.cwd(), 'static/index.html'),
      favicon: "static/favicon.ico"
    }),

  ],
  devServer: {
    publicPath: '/',
    port: 9000,
    contentBase: path.join(process.cwd(), 'dist'), // static file location
    host: 'localhost',
    historyApiFallback: true, // true for index.html upon 404, object for multiple paths
    noInfo: false,
    stats: 'minimal',
    hot: true,  // hot module replacement. Depends on HotModuleReplacementPlugin
    quiet: true // friendly-errors-webpack-plugin works for
  }
});
