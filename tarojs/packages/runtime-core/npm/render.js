import ReactReconciler from 'react-reconciler';
import hostConfig from './hostConfig';

export const ReactReconcilerInst = ReactReconciler(hostConfig);

export default function render(rootElement, container) {
  if (!container._rootContainer) {
    container._rootContainer = ReactReconcilerInst.createContainer(
      container,
      0,
      false,
      null
    );
  }
  ReactReconcilerInst.updateContainer(
    rootElement,
    container._rootContainer,
    null,
    () => {}
  );
}
