import { parseCode } from "../common/npmResolve";
import * as t from "@babel/types";
import * as fse from "fs-extra";
import * as npath from "path";
import traverse from "@babel/traverse";
import generator from "@babel/generator";
import { compileRender } from "./compileRender";

interface TarnsformOption {
  code: string;
  sourceDirPath: string;
  relativeAppPath: string;
  relativeComponentsPath: string;
}

export const TARO_PACKAGE_NAME = "react";
export const TARO_COMPONENTS_NAME = "@taro/components";

export function transform(props: TarnsformOption) {
  const { code, sourceDirPath, relativeAppPath } = props;
  // 解析成ast
  const ast = parseCode(code);
  // 用于收集wxml
  let outTemplate = null;
  // 用于收集wxss
  let style = null;
  // 用于将该路径导出给另一个函数做处理，这个是render方法路径
  let renderPath = null;
  // 用于收集状态
  let initState = new Set();
  // 套用模板导入时这个类的名字
  let className = "";
  traverse(ast, {
    ClassDeclaration(path) {
      // 找到类的声明，直接把名字赋值
      className = path.node.id.name;
    },
    ClassMethod(path) {
      if (t.isIdentifier(path.node.key)) {
        const node = path.node;
        const methodName = node.key.name;
        if (methodName === "render") {
          // 修改render名变为createData,并把路径提出
          renderPath = path;
          path.node.key.name = "createData";
        }
        if (methodName === "constructor") {
          path.traverse({
            AssignmentExpression(p) {
              if (
                t.isMemberExpression(p.node.left) &&
                t.isThisExpression(p.node.left.object) &&
                t.isIdentifier(p.node.left.property) &&
                p.node.left.property.name === "state" &&
                t.isObjectExpression(p.node.right)
              ) {
                // 提取 this.state
                const properties = p.node.right.properties;
                properties.forEach((p) => {
                  if (t.isObjectProperty(p) && t.isIdentifier(p.key)) {
                    initState.add(p.key.name);
                  }
                });
              }
            },
          });
        }
      }
    },
    ImportDeclaration(path) {
      const source = path.node.source.value;
      if (source === TARO_PACKAGE_NAME) {
        // 声明语句中判断引入该包名的，将其更换为相对路径的包的位置
        path.node.source.value = relativeAppPath;
      }
      if (/css$/.test(source)) {
        // 获取引入的样式文件，读取后替换成rpx
        let cssPath = npath.join(sourceDirPath, source);
        style = fse.readFileSync(cssPath).toString().replace(/px/g, "rpx");
      }
    },
  });
  // 导给另一个文件提取render中的方法与模板
  outTemplate = compileRender(renderPath);
  // 去除原先引入的导入包的声明与样式
  ast.program.body = ast.program.body.filter(
    (item) =>
      !(
        t.isImportDeclaration(item) &&
        item.source.value === TARO_COMPONENTS_NAME
      ) && !(t.isImportDeclaration(item) && /css$/.test(item.source.value))
  );
  // 生成代码
  let codes = generator(ast).code;
  const result = {
    code: "",
    json: "",
    style: "",
    className: "",
    wxml: "",
  };
  result.code = codes;
  result.json = `
	{
	    "usingComponents": {}
	}
	    `;
  result.wxml = outTemplate;
  result.style = style;
  result.className = className;
  return result;
}
