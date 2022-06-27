/*
 * @Author: yehuozhili
 * @Date: 2021-12-10 23:10:58
 * @LastEditors: yehuozhili
 * @LastEditTime: 2021-12-10 23:55:04
 * @FilePath: \tarocamp\packages\common\buildSinglePage.ts
 */
import * as fse from 'fs-extra';
import * as path from 'path';
import { inputRoot, outputDir } from '../compile-core/const';
import babel from './babel';
import { transform } from '../compile-core/transform';
import { getRelativeAppPath, getRelativeComponentPath } from './utils';
import slash from './utils';

export async function buildSinglePage(page, tran = transform) {
  const pagePath = path.join(inputRoot, `${page}`);
  const pageJs = `${pagePath}.jsx`;
  const outPageDirPath = slash(path.join(outputDir, page));
  console.log(`开始处理：${inputRoot}/${page} ...`);
  const code = fse.readFileSync(pageJs).toString();
  const outputPageJSPath = `${outPageDirPath}.js`;
  const outputPageJSONPath = `${outPageDirPath}.json`;
  const outputPageWXMLPath = `${outPageDirPath}.wxml`;
  const outputPageWXSSPath = `${outPageDirPath}.wxss`;
  const sourceDirPath = path.dirname(pagePath);
  const relativeAppPath = slash(
    getRelativeAppPath(path.dirname(outPageDirPath))
  );
  const relativeComponentsPath = slash(
    getRelativeComponentPath(path.dirname(outPageDirPath))
  );
  const result = tran({
    code,
    sourceDirPath,
    relativeAppPath,
    relativeComponentsPath
  });
  fse.ensureDirSync(path.dirname(outputPageJSPath));
  let resCode = await babel(result.code, outputPageJSPath);
  result.code = `
	${resCode.code}
	Page(require('${relativeAppPath}').createPage(${result.className}))
	    `;
  fse.writeFileSync(outputPageJSONPath, result.json);
  console.log(`输出json文件：${outputDir}/${page}.json`);
  fse.writeFileSync(outputPageJSPath, result.code);
  console.log(`输出js文件：${outputDir}/${page}.js`);
  fse.writeFileSync(outputPageWXMLPath, result.wxml);
  console.log(`输出wxml文件：${outputDir}/${page}.wxml`);
  fse.writeFileSync(outputPageWXSSPath, result.style);
  console.log(`输出wxss文件：${outputDir}/${page}.wxss`);
}
