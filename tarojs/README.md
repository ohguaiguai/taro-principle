## taro2 原理

compile-core， 重编译时

## taro3 原理

compile-runtime, 重运行时

## taro2 和 taro3 的区别

taro2
对于类组件，实现了一个类 React 的组件，这个组件会对齐 React 组件的声明周期等,我们实际开发时用到的组件就是继承于这个组件。所以其实和 React 没有什么关系，只是遵从了 React 的语法。

相比于 taro3, taro2 需要对 jsx 进行大量的遍历、转换，而 taro3 只是对 jsx 做了简单的属性替换，其他都交给 React 本身来处理了。

taro3
taro-runtime 通过 createPage 就可以创建 Taro DOM Tree，在 hostConfig 中实现从 setState->setData 的映射。
