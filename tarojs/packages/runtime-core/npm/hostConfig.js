import { generate } from './util';
import VNode from './VNode';

const TYPE_TEXT = 'plain-text';
const METHOD = '$REACT_FN';

function processProps(newProps, node, id) {
  const props = {};
  for (const propKey of Object.keys(newProps)) {
    if (typeof newProps[propKey] === 'function') {
      const contextKey = `${METHOD}_${id}_${propKey}`;
      node.container.createCallback(contextKey, newProps[propKey]);
      props[propKey] = contextKey;
    } else if (propKey === 'style') {
      props[propKey] = newProps[propKey] || '';
    } else if (propKey === 'children') {
      // pass
    } else {
      props[propKey] = newProps[propKey];
    }
  }

  return props;
}

const rootHostContext = {};
const childHostContext = {};

export default {
  getPublicInstance: (inst) => {
    return inst;
  },
  getRootHostContext: () => {
    return rootHostContext;
  },
  shouldSetTextContent() {},
  prepareForCommit: () => {},
  preparePortalMount: () => {},
  clearContainer: () => {},
  resetAfterCommit: (container) => {
    // 这里完成 setState -> setData的映射
    container.applyUpdate();
  },
  getChildHostContext: () => {
    return childHostContext;
  },
  createInstance(type, newProps, container) {
    const id = generate();
    const node = new VNode({
      id,
      type,
      props: {},
      container
    });
    node.props = processProps(newProps, node, id);

    return node;
  },
  createTextInstance(text, container) {
    const id = generate();
    const node = new VNode({
      id,
      type: TYPE_TEXT,
      props: null,
      container
    });
    node.text = text;
    return node;
  },
  commitTextUpdate(node, oldText, newText) {
    if (oldText !== newText) {
      node.text = newText;
    }
  },
  prepareUpdate(node, type, lastProps, nextProps) {
    return lastProps;
  },
  commitUpdate(node, updatePayload, type, oldProps, newProps) {
    node.props = processProps(newProps, node, node.id);
  },
  appendInitialChild: (parent, child) => {
    parent.appendChild(child);
  },
  appendChild(parent, child) {
    parent.appendChild(child);
  },
  insertBefore(parent, child, beforeChild) {
    parent.insertBefore(child, beforeChild);
  },
  removeChild(parent, child) {
    parent.removeChild(child);
  },
  finalizeInitialChildren: () => {},
  appendChildToContainer(container, child) {
    container.appendChild(child);
  },
  insertInContainerBefore(container, child, beforeChild) {
    container.insertBefore(child, beforeChild);
  },
  removeChildFromContainer(container, child) {
    container.removeChild(child);
  },
  hideInstance() {},
  hideTextInstance() {},
  unhideInstance() {},
  unhideTextInstance() {},
  supportsMutation: true
};
