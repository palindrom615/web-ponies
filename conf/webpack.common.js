const path = require("path");
const CopyWebPackPlugin = require("copy-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");

module.exports = {
  //context: path.join(process.cwd(), 'src'), //the home directory for webpack
  context: process.cwd(),

  devtool: "source-map", // enhance debugging by adding meta info for the browser devtools

  output: {
    path: path.join(process.cwd(), "dist"),
    filename: "bundle.js",
    publicPath: "/",
    sourceMapFilename: "[name].map",
  },

  resolve: {
    extensions: [".ts", ".js"], // extensions that are used
    modules: [path.join(process.cwd(), "src"), "node_modules"], // directories where to look for modules
  },

  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        include: [
          path.resolve(process.cwd(), "static"),
          path.resolve(process.cwd(), "src"),
        ],
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-typescript", "@babel/preset-env"],
            plugins: ["@babel/plugin-proposal-class-properties"],
          },
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
        loader: "file-loader",
      },
    ],
  },
  plugins: [
    new CopyWebPackPlugin({
      patterns: [{ from: "contents/ponies", to: "ponies" }],
    }),
    new ESLintPlugin(),
  ],
};
