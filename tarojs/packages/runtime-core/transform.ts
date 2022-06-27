import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as fse from 'fs-extra';
import * as npath from 'path';
import { parseCode } from '../common/npmResolve';
import generator from '@babel/generator';

const TARO_COMPONENTS_NAME = '@taro/components';

interface TarnsformOption {
  code: string;
  sourceDirPath: string;
  relativeAppPath: string;
  relativeComponentsPath: string;
}

/**
 * runtime的transform函数比compile少很多，我们不用去提取各种函数，只需要改写属性名，
 * @param options
 * @returns
 */

export default function tarnsform(options: TarnsformOption) {
  let code = options.code;
  const sourceDirPath = options.sourceDirPath;
  const relativeComponentsPath = options.relativeComponentsPath;
  const ast = parseCode(code);
  let outTemplate = null;
  let style = null;
  let result: any = {};
  let className = ''; // 文件名

  traverse(ast, {
    ClassDeclaration(path) {
      className = path.node.id.name;
    },
    // 修改属性
    JSXAttribute(path) {
      const node = path.node;
      const attributeName = node.name.name;
      if (attributeName === 'className') {
        path.node.name.name = 'class';
      }
      if (attributeName === 'onClick') {
        path.node.name.name = 'bindtap';
      }
    },
    ImportDeclaration(path) {
      const source = path.node.source.value;
      if (source === TARO_COMPONENTS_NAME) {
        path.node.source.value = relativeComponentsPath;
      }
      if (/css$/.test(source)) {
        let cssPath = npath.join(sourceDirPath, source);
        style = fse.readFileSync(cssPath).toString().replace(/px/g, 'rpx');
      }
    }
  });

  outTemplate = `
<import src="/base.wxml"/>
<template is="TPL" data="{{root: root}}" />
    `;

  ast.program.body = ast.program.body.filter(
    (item) => !(t.isImportDeclaration(item) && /css$/.test(item.source.value))
  );

  code = generator(ast).code;
  result.code = code;
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
