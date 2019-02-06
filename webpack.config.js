const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: "./src/bootstrap.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bootstrap.js",
  },
  mode: "production",
  plugins: [
    new CopyWebpackPlugin(['src/index.html']),
    new BundleAnalyzerPlugin(),
  ],
  module: {
    rules: [
      {
        test: /node_modules[\\\/]vis[\\\/].*\.js$/, // vis.js files
        loader: 'babel-loader',
        query: {
          cacheDirectory: true,
          presets: [ "babel-preset-es2015" ].map(require.resolve),
          plugins: [
            "transform-es3-property-literals", // see https://github.com/almende/vis/pull/2452
            "transform-es3-member-expression-literals", // see https://github.com/almende/vis/pull/2566
            "transform-runtime" // see https://github.com/almende/vis/pull/2566
          ]
        }
      },
      {
        test: /.jsx$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      }
    ]
  }
};
