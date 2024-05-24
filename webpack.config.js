const path = require("path");
const { ProvidePlugin } = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: "./build/index.js",
    output: {
        filename: "js/bundle.js",
        path: path.resolve(__dirname, "dist"),
    },
    plugins: [
        new ProvidePlugin({ $: "jquery" }),
        new CopyWebpackPlugin({
            patterns: [{ from: "static" }],
        }),
    ],
};
