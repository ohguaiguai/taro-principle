import * as path from "path";
export const outputDir = path.resolve(__dirname, "../../dist");
export const inputRoot = path.join(path.resolve("."), "src");
export const config = require(path.resolve(inputRoot, "app.config.js"));
