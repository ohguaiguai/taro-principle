import * as t from "@babel/types";
import template from "@babel/template";
import generator from "@babel/generator";
import { buildBlockElement, findMethodName } from "../common/utils";

let usedEvents = new Set<string>();

/**
 *
 * 键值对属性变成字符串
 * @param {*} input
 * @return {*}
 */
function stringifyAttributes(input) {
  const attributes = [];
  for (const key of Object.keys(input)) {
    let value = input[key];
    if (value === false) {
      continue;
    }
    if (Array.isArray(value)) {
      value = value.join(" ");
    }
    let attribute = key;
    if (value !== true) {
      attribute += `="${String(value)}"`;
    }
    attributes.push(attribute);
  }
  return attributes.length > 0 ? " " + attributes.join(" ") : "";
}

function createWXMLLElement(options) {
  // 空div默认配置合并
  options = Object.assign(
    {
      name: "div",
      attributes: {},
      value: "",
    },
    options
  );
  let ret = `<${options.name}${stringifyAttributes(options.attributes)}>`;

  ret += `${options.value}</${options.name}>`;
  return ret;
}

/**
 *
 * 替换this state proops
 * @param {*} ast
 * @return {*}
 */
function generateJSXAttr(ast) {
  const code = generator(ast).code;
  return code
    .replace(/(this\.props\.)|(this\.state\.)/g, "")
    .replace(/(props\.)|(state\.)/g, "")
    .replace(/this\./g, "");
}

function parseJSXChildren(children) {
  return children.reduce((str, child) => {
    // 文本
    if (t.isJSXText(child)) {
      const strings = [];
      child.value.split(/(\r?\n\s*)/).forEach((val) => {
        // 空格替换
        const value = val.replace(/\u00a0/g, "&nbsp;");
        if (!value) {
          return;
        }
        if (value.startsWith("\n")) {
          return;
        }
        strings.push(value);
      });
      return str + strings.join("");
    }
    // jsx元素
    if (t.isJSXElement(child)) {
      return str + parseJSXElement(child);
    }
    // {}表达式
    if (t.isJSXExpressionContainer(child)) {
      if (t.isJSXElement(child.expression)) {
        return str + parseJSXElement(child.expression);
      }
      return str + `{${generateJSXAttr(child)}}`;
    }
    return str;
  }, "");
}

function parseJSXElement(element) {
  const children = element.children;
  const { attributes, name } = element.openingElement;
  // 标签名
  const componentName = name.name;
  // 属性键值对
  let attributesTrans = {};
  if (attributes.length) {
    attributesTrans = attributes.reduce((obj, attr) => {
      let name = attr.name.name;
      let value = "";
      let attrValue = attr.value;
      if (typeof name === "string") {
        if (t.isStringLiteral(attrValue)) {
          value = attrValue.value;
        } else if (t.isJSXExpressionContainer(attrValue)) {
          // 查找替换过的onclick事件
          let isBindEvent = name.startsWith("bind") && name !== "bind";
          let code = generator(attrValue.expression, {
            quotes: "single",
            concise: true,
          })
            .code.replace(/"/g, "'")
            .replace(/(this\.props\.)|(this\.state\.)/g, "")
            .replace(/this\./g, "");
          // 如果是事件则函数名，否则是绑定值
          value = isBindEvent ? code : `{{${code}}}`;
        }
      }
      obj[name] = value;
      return obj;
    }, {});
  }
  let eLe = createWXMLLElement({
    name: componentName,
    attributes: attributesTrans,
    value: parseJSXChildren(children), //解析子节点
  });
  return eLe;
}

function setCustomEvent(renderPath) {
  const classPath = renderPath.findParent(
    (p) => p.isClassExpression() || p.isClassDeclaration()
  );
  // 给类组件增加event属性
  const eventPropName = "$$events";
  const _usedEvents = Array.from(usedEvents).map((s) => t.stringLiteral(s));
  // 变成数组array插入
  let classProp = t.classProperty(
    t.identifier(eventPropName),
    t.arrayExpression(_usedEvents)
  );
  classProp.static = true;
  // 插入class属性
  classPath.node.body.body.unshift(classProp);
}

export function compileRender(renderPath) {
  //  防止无限递归用
  let finalReturnElement = null;
  let outputTemplate = null;
  renderPath.traverse({
    JSXAttribute(path) {
      const node = path.node;
      const value = path.node.value;
      const attributeName = node.name.name;
      if (attributeName === "className") {
        // classname转为class
        path.node.name.name = "class";
      }
      if (attributeName === "onClick" && t.isJSXExpressionContainer(value)) {
        // 查找方法名 修改onclick为bindtap
        const methodName = findMethodName(path.node.value.expression);
        methodName && usedEvents.add(methodName);
        path.node.name.name = "bindtap";
      }
    },
  });
  renderPath.traverse({
    JSXElement(path) {
      if (t.isReturnStatement(path.parent) && !finalReturnElement) {
        // 创建该组件外层的block，用于适时触发didmount
        const block = buildBlockElement([
          t.jSXAttribute(
            t.jSXIdentifier("wx:if"),
            t.jSXExpressionContainer(t.identifier("$taroCompReady"))
          ),
        ]);
        finalReturnElement = block;
        // 把原先的节点变为其子节点
        block.children.push(path.node);
        //  替换模板中this.state this.props
        outputTemplate = parseJSXElement(block);
        path.replaceWith(block);
      }
    },
  });

  renderPath.traverse({
    BlockStatement(path) {
      // 查找定义的变量
      const vars = path.node.body
        .filter((node) => t.isVariableDeclaration(node))
        .reduce((p, c) => {
          c.declarations.forEach((n) => {
            if (t.isVariableDeclarator(n) && t.isIdentifier(n.id)) {
              p.push(n.id.name);
            }
          });
          return p;
        }, []);
      // createData方法插入第一句获取参数
      path.node.body.unshift(
        template(`
        this.__state = arguments[0];
      `)()
      );
      // 让最后一句合并state
      path.node.body[path.node.body.length - 1] = template(`
        Object.assign(this.__state, {
          ${vars.map((i) => `${i}: ${i},`).join(",")}
        });
      `)();
      //最后插入返回
      path.node.body.push(
        template(`
        return this.__state
      `)()
      );
    },
  });

  setCustomEvent(renderPath);

  return outputTemplate;
}
