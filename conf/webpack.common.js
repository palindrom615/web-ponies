const path = require("path");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const CopyWebPackPlugin = require("copy-webpack-plugin");
const FriendlyErrorsWebpackPlugin = require("friendly-errors-webpack-plugin");
module.exports = {
  //context: path.join(process.cwd(), 'src'), //the home directory for webpack
  context: process.cwd(),

  devtool: "source-map", // enhance debugging by adding meta info for the browser devtools

  output: {
    path: path.join(process.cwd(), "dist"),
    filename: "bundle.js",
    publicPath: "/",
    sourceMapFilename: "[name].map"
  },

  resolve: {
    extensions: [".ts", ".js"], // extensions that are used
    modules: [path.join(process.cwd(), "src"), "node_modules"] // directories where to look for modules
  },

  module: {
    rules: [
      {
        enforce: "pre",
        test: /\.ts?$/,
        include: path.resolve(process.cwd(), "src"),
        use: [
          {
            loader: "eslint-loader",
            options: {
              emitErrors: true
            }
          }
        ]
      },
      {
        test: /\.ts?$/,
        use: "ts-loader",
        exclude: /node_modules/
      },
      {
        test: /\.js$/,
        include: [
          path.resolve(process.cwd(), "static"),
          path.resolve(process.cwd(), "src")
        ],
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"]
          }
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
        loader: "file-loader"
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(["dist"], { root: process.cwd() }),
    new CopyWebPackPlugin([{ from: "contents/ponies", to: "ponies" }]),
    new FriendlyErrorsWebpackPlugin()
  ]
};
