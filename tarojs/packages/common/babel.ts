import { transformAsync } from '@babel/core';
import npmResolve from './npmResolve';

const babelOptions = {
  sourceMap: true,
  presets: ['@babel/preset-react'],
  plugins: [
    [
      'minify-replace',
      {
        replacements: [
          {
            identifierName: '__DEV__',
            replacement: {
              type: 'numericLiteral',
              value: 0
            }
          }
        ]
      }
    ]
  ]
};

export default async function babel(content, file) {
  content = await npmResolve(content, file);
  let config: any = babelOptions;
  config.filename = file;
  return transformAsync(content, config);
}
