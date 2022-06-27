import * as path from 'path';
import * as fse from 'fs-extra';
import babel from '../common/babel';
import { buildSinglePage } from '../common/buildSinglePage';
import { config, outputDir } from './const';
import transform from './transform';
import { baseWxml } from './base';

/**
 * 遍历所有文件找到其中的npm包，然后拷贝到输出目录
 */
async function copyNpmToWx() {
  const npmPath = path.resolve(__dirname, './npm');
  const allFiles = await fse.readdirSync(npmPath);
  allFiles.forEach(async (fileName) => {
    const fileContent = fse
      .readFileSync(path.join(npmPath, fileName))
      .toString();
    const outputNpmPath = path.join(outputDir, `./npm/${fileName}`);
    let resCode = await babel(fileContent, outputNpmPath);
    fse.ensureDirSync(path.dirname(outputNpmPath));
    fse.writeFileSync(outputNpmPath, resCode.code);
  });
}
/**
 *  页面生成4种输出到输出目录
 */
async function buildPages() {
  config.pages.forEach((page) => {
    buildSinglePage(page, transform);
  });
}
/**
 *  输出入口文件app.js与app.json
 */
async function buildEntry() {
  fse.writeFileSync(path.join(outputDir, './app.js'), `App({})`);
  fse.writeFileSync(
    path.join(outputDir, './app.json'),
    JSON.stringify(config, undefined, 2)
  );
}
/**
 *  输出project.config.json
 */
async function buildProjectConfig() {
  fse.writeFileSync(
    path.join(outputDir, 'project.config.json'),
    `
{
    "miniprogramRoot": "./",
    "projectname": "app",
    "description": "app",
    "appid": "touristappid",
    "setting": {
        "urlCheck": true,
        "es6": false,
        "postcss": false,
        "minified": false
    },
    "compileType": "miniprogram"
}
    `
  );
}
/**
 *  检查目录等准备工作
 */
async function init() {
  fse.removeSync(outputDir);
  fse.ensureDirSync(outputDir);
}

async function geneBaseWxml() {
  const outputBaseWxml = path.join(outputDir, '/base.wxml');
  fse.ensureDirSync(path.dirname(outputBaseWxml));
  fse.writeFileSync(outputBaseWxml, baseWxml);
}

async function main() {
  debugger;
  // 检查目录等准备工作
  await init();
  // npm拷贝到输出目录
  await copyNpmToWx();
  // 拷贝base到根目录
  await geneBaseWxml();
  // 页面生成4种输出到输出目录
  await buildPages();
  // 输出入口文件app.js与app.json
  await buildEntry();
  // 输出project.config.json
  await buildProjectConfig();
}
main();
