import traverse from "@babel/traverse";
import generator from "@babel/generator";
import { parse, ParserPlugin } from "@babel/parser";
import npath from "path";
import * as fse from "fs-extra";
import * as t from "@babel/types";
import { outputDir } from "../runtime-core/const";
import babel from "./babel";
import slash from "./utils";

export function parseCode(code, extname = "jsx") {
  const plugins: ParserPlugin[] = [
    "classProperties",
    "objectRestSpread",
    "optionalChaining",
    ["decorators", { decoratorsBeforeExport: true }],
    "classPrivateProperties",
    "doExpressions",
    "exportDefaultFrom",
    "exportNamespaceFrom",
    "throwExpressions",
  ];

  if (extname === ".ts") {
    plugins.push("typescript");
  } else if (extname === ".tsx") {
    plugins.push("typescript");
    plugins.push("jsx");
  } else {
    plugins.push("flow");
    plugins.push("jsx");
  }

  return parse(code, {
    sourceType: "module",
    plugins,
  });
}

const fileContent = new Map();

/**
 *
 * 判断是否是三方库
 * @param {*} relativePath
 * @returns
 */
function judgeLibPath(relativePath) {
  if (relativePath.startsWith("/") || relativePath.startsWith(".")) {
    return false;
  }
  return true;
}
/**
 *
 * 拿到上一级目录
 * @param {*} path
 * @returns
 */
function getDirPath(path) {
  return npath.resolve(path, "../");
}

function getWxNpmPath(path) {
  const npmRelativePath = slash(
    path.replace(npath.join(npath.resolve("."), "node_modules"), "")
  );
  return `/npm${npmRelativePath}`;
}
function resloveWxNpmPath(path) {
  return slash(npath.join(outputDir, getWxNpmPath(path)));
}
function getWxRelativePath(path, filePath) {
  const rpath = slash(
    npath.relative(getDirPath(filePath), resloveWxNpmPath(path))
  );
  return judgeLibPath(rpath) ? `./${rpath}` : rpath;
}
function addJsFile(name) {
  if (/\.js$/.test(name)) {
    return name;
  } else return `${name}.js`;
}

async function copyNpmToWX(filePath, npmPath, isRoot = false) {
  // react-reconciler.development.js 文件太大，且没有用到，影响拷贝性能，可以过滤掉。
  if (
    fileContent.has(filePath) ||
    filePath.indexOf("react-reconciler.development") > -1
  ) {
    return;
  }
  const code = fse.readFileSync(filePath).toString();
  const ast = parseCode(code);
  traverse(ast, {
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee, { name: "require" })) {
        const sourcePath = path.node.arguments[0].value;
        if (judgeLibPath(sourcePath)) {
          // 如果是nodemodule下的
          let npmPath = "";
          let mainPath = "";
          let packagejson;
          if (/\//.test(sourcePath)) {
            // 如果是包下的某个路径 取出来
            npmPath = npath.join(
              npath.resolve("."),
              "node_modules",
              sourcePath.split("/").shift()
            );
            mainPath = npath.join(
              npath.resolve("."),
              "node_modules",
              addJsFile(sourcePath)
            );
          } else {
            npmPath = npath.join(
              npath.resolve("."),
              "node_modules",
              sourcePath
            );
            // 查找pkg.json的main字段的路径
            packagejson = require(npath.join(npmPath, "package.json"));
            mainPath = npath.join(npmPath, packagejson.main || "index.js");
          }
          copyNpmToWX(mainPath, npmPath);
          path.node.arguments[0].value = getWxRelativePath(
            mainPath,
            resloveWxNpmPath(filePath)
          );
        } else if (npmPath) {
          const _filePath = npath.resolve(npmPath, addJsFile(sourcePath));
          copyNpmToWX(_filePath, npmPath);
        }
      }
    },
  });
  fileContent.set(filePath, { code: generator(ast).code });
  if (isRoot) {
    fileContent.forEach(async (value, filePath) => {
      const _filePath = resloveWxNpmPath(filePath);
      if (
        !fse.existsSync(_filePath) &&
        !fse.existsSync(getDirPath(_filePath))
      ) {
        fse.mkdirSync(getDirPath(_filePath), { recursive: true });
      }
      const resCode = await babel(value.code, _filePath);
      fse.writeFileSync(_filePath, resCode.code);
    });
  }
}

function parseNpm(sourcePath, filePath) {
  const npmPath = npath.join(npath.resolve("."), "node_modules", sourcePath);
  const packagejson = require(npath.join(npmPath, "package.json"));
  const mainPath = npath.join(npmPath, packagejson.main);
  copyNpmToWX(mainPath, npmPath, true);
  return getWxRelativePath(mainPath, filePath);
}

export default async function npmResolve(code, filePath) {
  // 解析
  const ast = parseCode(code);
  // 遍历
  traverse(ast, {
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee, { name: "require" })) {
        const sourcePath = path.node.arguments[0].value;
        if (judgeLibPath(sourcePath)) {
          path.node.arguments[0].value = parseNpm(sourcePath, filePath);
        }
      }
    },
    ImportDeclaration(path) {
      const sourcePath = path.node.source.value;
      if (judgeLibPath(sourcePath)) {
        path.node.source.value = parseNpm(sourcePath, filePath);
      }
    },
    MemberExpression(path) {
      if (path.get("object").matchesPattern("process.env")) {
        const key = path.toComputedKey();
        if (t.isStringLiteral(key)) {
          if (key.value === "NODE_ENV") {
            path.replaceWith(t.valueToNode("production"));
          }
        }
      }
    },
  });
  // 生成
  return generator(ast).code;
}
