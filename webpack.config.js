const path = require("path");
const { ProvidePlugin } = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: "./src/index.ts",
    output: {
        filename: "js/bundle.js",
        path: path.resolve(__dirname, "dist"),
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    devtool: "source-map",
    plugins: [
        new ProvidePlugin({ $: "jquery" }),
        new CopyWebpackPlugin({
            patterns: [{ from: "static" }],
        }),
    ],
};
