import Container from './container';
import render from './render';
import React from 'react';

export const createPage = function createPageConfig(component) {
  const config = {
    data: {
      root: {
        children: []
      }
    },
    onLoad() {
      // 生成一套taro dom tree
      this.container = new Container(this, 'root');

      // 调用react.createElement生成reactNode, 这样就不需要编译JSX； 这里就和taro2不一样，taro2里需要遍历JSX进行各种从JSX到小程序模板的转换。
      const pageElement = React.createElement(component, {
        page: this
      });

      // 使用react-conciler + hostConfig实现的一套自定义的渲染器
      render(pageElement, this.container);
    }
  };

  return config;
};
