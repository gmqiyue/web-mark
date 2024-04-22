import { WEB_MARK_CONTAINER_DATASET, WEB_MARK_CONTAINER_SELECTOR, WEB_MARK_HIGHLIGHT_CLASS_NAME, WEB_MARK_WORD_CLASS_NAME } from './constant';
import { findAncestor, getCharacterOffsetsWithin, getRangeByCharacterOffsets } from './selectionTools';

interface WebMarkOptions {
  scrollContainer?: HTMLElement;
  onMarkClick?: (event: MouseEvent) => void;
}

interface Point {
  x: number;
  y: number;
}

interface CharacterOffset {
  startOffset: number;
  endOffset: number;
  selectContent: string;
  webmarkId: string;
  webmarkMid: string;
}

class WebMark {
  #container: HTMLElement;
  #scrollContainer: HTMLElement;
  #options: Omit<WebMarkOptions, 'scrollContainer'>;

  #startPoint: Point | null = null;
  #currentWebMarkElement: HTMLElement | null = null;

  constructor(container: HTMLElement, options?: WebMarkOptions) {
    const { scrollContainer, ...resetOptions } = options || {};

    this.#container = container;
    this.#scrollContainer = scrollContainer || container;
    this.#options = resetOptions;

    this.#container.addEventListener('mouseup', this.#onMouseUp);
  }

  #clearState() {
    // 清除之前的选区
    // 清除之前点击高亮的批注元素
  }

  #onMouseDown = (event: MouseEvent) => {
    this.#clearState();

    this.#startPoint = {
      x: event.pageX,
      y: event.pageY,
    };
  };

  #isElementNode(node: Node | null) {
    return !!node && node.nodeType === Node.ELEMENT_NODE;
  }

  #isMarkwordElement(node: HTMLElement | null) {
    return !!node && node.classList.contains(WEB_MARK_WORD_CLASS_NAME);
  }

  #isSelectionWithinWebMarkContainer(node: Node | null) {
    if (node && node.nodeType === Node.ELEMENT_NODE) {
      return (node as HTMLElement).hasAttribute(`data-${WEB_MARK_CONTAINER_DATASET}`);
    }

    return false;
  }

  #getAvailableSelectionAndRange() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const ancestorNode = range.commonAncestorContainer;

    // 选区跨节点了
    if (this.#isElementNode(ancestorNode) || range.startContainer !== range.endContainer) {
      selection.removeAllRanges();
      this.#logWarn('getAvailableSelectionAndRange', '选区跨节点了', { type: 'warn' });
      return null;
    }

    if (ancestorNode.nodeType === Node.TEXT_NODE && this.#isMarkwordElement(ancestorNode.parentElement)) {
      selection.removeAllRanges();
      this.#logWarn('getAvailableSelectionAndRange', '选区重复了', { type: 'warn' });
      return null;
    }

    const parentElement = findAncestor(ancestorNode, this.#isSelectionWithinWebMarkContainer) as HTMLElement | null;
    if (!parentElement) {
      selection.removeAllRanges();
      this.#logWarn('getAvailableSelectionAndRange', `选区不在具有'${WEB_MARK_CONTAINER_SELECTOR}'属性的容器内`, { type: 'warn' });
      return null;
    }

    return { selection, range, parentElement };
  }

  #onMouseUp = (event: MouseEvent) => {
    this.#logInfo('onmouseup', event.target);

    const { selection, range, parentElement } = this.#getAvailableSelectionAndRange() || {};
    if (!selection || !range || !parentElement) {
      if (this.#isMarkwordElement(event.target as HTMLElement)) {
        this.#toggleActiveMarkwordElement(event.target as HTMLElement);
        this.#options.onMarkClick && this.#options.onMarkClick(event);
        return;
      }

      if (this.#isActiveMarkwordElement()) {
        this.#deactiveMarkword(this.#currentWebMarkElement as HTMLElement);
        return;
      }

      return;
    }

    const datasetIds = Object.fromEntries(Object.entries({ ...parentElement.dataset }).filter(([key, val]) => /id$/i.test(key))) as Record<string, any> &
      Pick<CharacterOffset, 'webmarkId' | 'webmarkMid'>;

    const characterOffset: CharacterOffset = {
      ...getCharacterOffsetsWithin({
        range,
        parentElement,
      }),
      ...datasetIds,
    };
    getRangeByCharacterOffsets(parentElement, characterOffset.startOffset, characterOffset.endOffset);

    console.log(characterOffset);
  };

  #logger(opts?: { type: 'log' | 'warn' | 'error' }, ...args: any[]) {
    const { type = 'log' } = opts || {};

    console[type]('[WebMark]', ...args);
  }
  #logError(...args: any) {
    this.#logger({ type: 'error' }, ...args);
  }
  #logWarn(...args: any) {
    this.#logger({ type: 'warn' }, ...args);
  }
  #logInfo(...args: any) {
    this.#logger({ type: 'log' }, ...args);
  }

  #createMarkwordWrapper(characterOffset: CharacterOffset) {
    const span = document.createElement('span');

    span.classList.add(WEB_MARK_WORD_CLASS_NAME);
    span.setAttribute('data-webmark-mid', characterOffset.webmarkMid);

    return span;
  }

  #activeMarkword(element: HTMLElement) {
    element.classList.add(WEB_MARK_HIGHLIGHT_CLASS_NAME);
    this.#currentWebMarkElement = element;
  }

  #deactiveMarkword(element: HTMLElement) {
    element.classList.remove(WEB_MARK_HIGHLIGHT_CLASS_NAME);
    this.#currentWebMarkElement = null;
  }

  #isActiveMarkwordElement(element = this.#currentWebMarkElement) {
    return !!element && element.classList.contains(WEB_MARK_HIGHLIGHT_CLASS_NAME);
  }

  #toggleActiveMarkwordElement(element: HTMLElement) {
    if (this.#isActiveMarkwordElement(element)) {
      this.#deactiveMarkword(element);
    } else {
      this.#activeMarkword(element);
    }
  }

  hilightMarkwordByCharacterOffsets(characterOffsets: CharacterOffset[]) {
    characterOffsets.forEach((characterOffset) => {
      const parentElement = document.querySelector(`[data-${WEB_MARK_CONTAINER_DATASET}=${characterOffset.webmarkId}]`);
      if (!parentElement) return;

      const range = getRangeByCharacterOffsets(parentElement, characterOffset.startOffset, characterOffset.endOffset);
      if (this.#isElementNode(range.commonAncestorContainer) && this.#isMarkwordElement(range.commonAncestorContainer as HTMLElement)) return;

      range.surroundContents(this.#createMarkwordWrapper(characterOffset));
    });
  }

  destroy() {
    this.#container.removeEventListener('mouseup', this.#onMouseUp);
  }
}

export default WebMark;
