const webpack = require("webpack");
const path = require("path");
const { merge } = require("webpack-merge");
const CommonConfig = require("./webpack.common.js");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = merge(CommonConfig, {
  entry: {
    app: [path.join(process.cwd(), "static/index.js")],
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      template: path.join(process.cwd(), "static/index.html"),
      favicon: "static/favicon.ico",
    }),
  ],
  devServer: {
    port: 9000,
    static: [{directory: path.join(process.cwd(), "dist"), publicPath: "/"}],
    host: "localhost",
    historyApiFallback: true, // true for index.html upon 404, object for multiple paths
    hot: true, // hot module replacement. Depends on HotModuleReplacementPlugin
  },
});
