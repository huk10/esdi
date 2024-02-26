const path = require("path");
const fs = require("fs");

module.exports = {
  "presets": [
    ["@babel/preset-env", {"targets": {"node": "current"}}],
    "@babel/preset-typescript"
  ],
  "plugins": [
    ["@babel/plugin-proposal-decorators", { "version": "2023-05" }],
  [
    "module-resolver",
    {
      // tsconfig moduleResolution 设置为 Node16 或 NodeNext 的话 import 路径会带上 .js babel 处理有问题，需要使用此插件处理。
      // https://github.com/vercel/next.js/discussions/32237
      extensions: [".js", ".jsx", ".es", ".es6", ".mjs", "ts", "tsx"],
      resolvePath(sourcePath, currentFile, opts) {
        if (!sourcePath.startsWith("./") && !sourcePath.startsWith("../")) {
          return sourcePath;
        }
        if (sourcePath.endsWith(".js")) {
          const relPath = path.resolve(path.dirname(currentFile), sourcePath);
          const tsPath = relPath.replace(/\.js$/, ".ts");
          const tsxPath = relPath.replace(/\.js$/, ".tsx");
          if (fs.existsSync(tsPath)) {
            return tsPath;
          }
          if (fs.existsSync(tsxPath)) {
            return tsxPath;
          }
        }
        return sourcePath;
      },
    },
  ],
  ]
}
