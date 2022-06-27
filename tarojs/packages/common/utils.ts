import * as path from "path";
import { outputDir } from "../compile-core/const";
import * as t from "@babel/types";

export function getRelativeAppPath(dir) {
  return path.relative(dir, path.join(outputDir, "/npm/app.js"));
}
export function getRelativeComponentPath(dir) {
  return path.relative(dir, path.join(outputDir, "/npm/components.js"));
}

export function findMethodName(expression) {
  let methodName;
  if (t.isMemberExpression(expression) && t.isIdentifier(expression.property)) {
    methodName = expression.property.name;
  } else {
    console.log("事件方法暂不支持该解析");
  }
  return methodName;
}
export function buildBlockElement(attrs) {
  let blockName = "block";
  return t.jSXElement(
    t.jSXOpeningElement(t.jSXIdentifier(blockName), attrs),
    t.jSXClosingElement(t.jSXIdentifier(blockName)),
    []
  );
}
export default function slash(path) {
  const isExtendedLengthPath = /^\\\\\?\\/.test(path);
  const hasNonAscii = /[^\u0000-\u0080]+/.test(path);
  if (isExtendedLengthPath || hasNonAscii) {
    return path;
  }
  return path.replace(/\\/g, "/");
}
