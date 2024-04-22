// @ts-nocheck
import { nanoid } from 'nanoid';

type Point = {
  x: number;
  y: number;
};

interface AvailbleSelection {
  selection: Selection;
  selectionRange: Range;
}

enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

// FIXME: 应该以当前选中文本的行高为准
// 默认选中文本的行高
const DEFAULT_LINE_HEIGHT = 24;

const MARK_WORD_DEFAULT_CLASS_NAME = 'web-word-mark--word';
const MARK_WORD_HIGHLIGHT_CLASS_NAME = 'web-word-mark--highlight';

interface WebSelectOptions {
  scrollContainer?: HTMLElement;
  markBarElement: HTMLElement;
  debug?: boolean;
}

export default class WebWordMark {
  private __options: Omit<WebSelectOptions, 'scrollContainer' | 'markBarElement'>;
  private __containerElement: HTMLElement;
  private __scrollContainerElement: HTMLElement;
  private __markBarElement: HTMLElement;

  private startPoint: Point | null = null;
  private isVisibleMarkBar = false;
  private currentHighlightMarkElement: HTMLSpanElement | null = null;

  constructor(container: HTMLElement, options: WebSelectOptions) {
    const { scrollContainer, markBarElement, ...__options } = options;
    if (!container || !markBarElement) {
      console.warn('`container` or `markBarElement` is null');
      return;
    }

    this.__options = __options;
    this.__containerElement = container;
    this.__scrollContainerElement = scrollContainer || this.__containerElement;
    this.__markBarElement = markBarElement;
    this.hideMarkBarElement();

    this.__containerElement.addEventListener('mousedown', this.onContainerMouseDown);
    this.__containerElement.addEventListener('mouseup', this.onContainerMouseUp);
    this.__containerElement.addEventListener('click', this.onContainerClick);

    return this;
  }

  /**
   * @description 记录鼠标开始位置，配合 `mouseup` 事件计算选区移动方向，从而计算标记工具栏应该展示在哪个位置
   */
  private onContainerMouseDown = (event: MouseEvent) => {
    // 先隐藏一下标记工具栏和当前标记元素
    this.undoHighlightMarkText();
    if (this.isVisibleMarkBar) {
      this.hideMarkBarElement();
    }

    this.startPoint = {
      x: event.pageX,
      y: event.pageY,
    };
  };

  private onContainerMouseUp = (event: MouseEvent) => {
    const availableSelection = this.getAvailableSelectionAndRange();
    if (!availableSelection || !this.startPoint) return;

    const endPoint = {
      x: event.pageX,
      y: event.pageY,
    };

    // 当前属于点击行为，不需要处理
    if (this.startPoint?.x === endPoint.x && this.startPoint?.y === endPoint.y) return;

    const direction = this.getSelectionDirection(this.startPoint, endPoint, availableSelection);
    const position = this.getMarkBarElementPosition(direction, availableSelection);
    this.showMarkBarElement(position);

    this.startPoint = null;
  };

  /**
   * @description 根据 event.target 判断是否显示或撤销当前高亮元素，高亮元素有两个来源：
   *  1. 鼠标点击高亮元素
   *  2. 通过 this.doHighlightMarkText 方法实现的高亮
   */
  private onContainerClick = (event: MouseEvent) => {
    const targetElm = event.target;
    if (!(targetElm instanceof HTMLElement)) return;

    if (!this.checkIsMarkElement(targetElm)) {
      // 如果当前有MarkWord元素，则撤销高亮
      if (this.currentHighlightMarkElement) {
        // 通过 this.doHighlightMarkText 创建的 markword 元素，是没有 MarkID 的
        if (this.getWebWordMarkID(this.currentHighlightMarkElement)) {
          this.currentHighlightMarkElement.classList.remove(MARK_WORD_HIGHLIGHT_CLASS_NAME);
        } else {
          this.undoHighlightMarkText();
        }
      }

      // `eventTarget`既不是MarkWord元素，当前也没有MarkWord高亮元素，则什么都不做
      return;
    }

    const isMarkWordHighlight = targetElm.classList.contains(MARK_WORD_HIGHLIGHT_CLASS_NAME);

    if (isMarkWordHighlight) {
      targetElm.classList.remove(MARK_WORD_HIGHLIGHT_CLASS_NAME);
    } else {
      targetElm.classList.add(MARK_WORD_HIGHLIGHT_CLASS_NAME);
      this.currentHighlightMarkElement = targetElm;
    }
  };

  /**
   * 计算选区移动方向
   * @param startPoint 鼠标开始位置
   * @param endPoint 鼠标结束位置
   */
  private getSelectionDirection(startPoint: Point, endPoint: Point, { selectionRange }: AvailbleSelection) {
    const horizontalDirection = endPoint.x > startPoint.x ? Direction.RIGHT : Direction.LEFT;
    const verticalDirection = endPoint.y > startPoint.y ? Direction.DOWN : Direction.UP;

    // 比较 x 和 y 轴上的距离来确定主要移动方向
    const deltaX = Math.abs(endPoint.x - startPoint.x);
    const deltaY = Math.abs(endPoint.y - startPoint.y);

    if (deltaX > deltaY) {
      // 当选区高度大于默认行高时，优先考虑垂直方向
      if (selectionRange) {
        const selectionRangeRect = selectionRange.getBoundingClientRect();

        if (selectionRangeRect.height > DEFAULT_LINE_HEIGHT) {
          return verticalDirection;
        }
      }

      return horizontalDirection;
    } else {
      return verticalDirection;
    }
  }

  /**
   * 计算标记工具栏位置
   * @param direction 选区移动方向
   */
  private getMarkBarElementPosition(direction: Direction, { selectionRange }: AvailbleSelection) {
    const markPointShouldBeAtStart = direction === Direction.LEFT || direction === Direction.UP;

    let dummyRange = selectionRange.cloneRange();
    dummyRange.collapse(markPointShouldBeAtStart);
    let dummyRangeRect = dummyRange.getBoundingClientRect();

    // 这种特殊情况是通过鼠标双击再进行选择至开头/结尾才会出现，可以统一定位到开头位置
    if (dummyRangeRect.x === 0 && dummyRangeRect.y === 0 && dummyRangeRect.height === 0) {
      // eslint-disable-next-line no-param-reassign
      direction = Direction.UP;
      dummyRange = selectionRange.cloneRange();
      dummyRange.collapse(true);
      dummyRangeRect = dummyRange.getBoundingClientRect();
    }

    const containerRect = this.__containerElement.getBoundingClientRect();
    const markBarElementRect = this.__markBarElement.getBoundingClientRect();

    const position: Point = {
      x: dummyRangeRect.x - containerRect.left,
      y: dummyRangeRect.y + this.__scrollContainerElement.scrollTop,
    };

    if (!markPointShouldBeAtStart) {
      position.x -= markBarElementRect.width;
    }

    // TODO: 下面的计算逻辑是不是可以再优化一下，想一想

    // FIXME: 最后加减的数字是保持和选区背景保持一定距离，这个数值从哪里获取，暂时不知道，先写死
    if (direction === Direction.DOWN) {
      position.y += 8;
    } else {
      position.y = position.y - markBarElementRect.height - dummyRangeRect.height - 5;
    }

    // 最后还需要考虑容器边界情况
    // 若在容器顶部，则展示在选区下方
    if (position.x < 0) {
      position.x = 0;
    } else if (position.x > containerRect.width) {
      position.x = containerRect.width - markBarElementRect.width;
    }

    if (position.y < 0) {
      position.y = dummyRangeRect.y + 8;
    } else if (position.y > this.__scrollContainerElement.scrollHeight - markBarElementRect.height) {
      position.y = this.__scrollContainerElement.scrollHeight - markBarElementRect.height;
    }

    return position;
  }

  /**
   * 高亮选区文本
   */
  doHighlightMarkText() {
    const availableSelection = this.getAvailableSelectionAndRange();
    if (!availableSelection) return;
    const { selection, selectionRange } = availableSelection;

    this.currentHighlightMarkElement = document.createElement('span');
    this.currentHighlightMarkElement.className = [MARK_WORD_DEFAULT_CLASS_NAME, MARK_WORD_HIGHLIGHT_CLASS_NAME].join(' ');

    try {
      selectionRange.surroundContents(this.currentHighlightMarkElement);
      selection.removeAllRanges();
    } catch (error) {
      console.error('选区不支持交叉覆盖');
      return;
    }
  }

  undoHighlightMarkText() {
    if (!this.currentHighlightMarkElement || !this.checkIsNewMarkElement(this.currentHighlightMarkElement)) return;

    const { parentNode } = this.currentHighlightMarkElement;
    // 防止复原回去时，父节点存在两个相邻的文本节点或空的文本节点
    this.currentHighlightMarkElement.replaceWith(...this.currentHighlightMarkElement.childNodes);
    parentNode && parentNode.normalize();

    this.currentHighlightMarkElement = null;
  }

  /**
   * 隐藏标记工具栏
   */
  private hideMarkBarElement() {
    this.__markBarElement.style.cssText = `
      display: block;
      position: absolute;
      top: -100%;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;`;
    this.isVisibleMarkBar = false;
  }

  /**
   * 显示标记工具栏
   */
  private showMarkBarElement(position: Point) {
    this.__markBarElement.style.cssText = `
      display: block;
      position: absolute;
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      top: ${position?.y}px;
      left: ${position?.x}px`;
    this.isVisibleMarkBar = true;
  }

  /**
   * 生成唯一 ID
   */
  generateMarkId() {
    return nanoid();
  }

  /**
   * 检查选区是否可用，并返回可用的选区
   * @description 检查逻辑：
   *  1. 选区是否存在
   *  2. 选区是否跨节点
   *  3. 选区的父容器是否已经高亮
   *  4. 选区内开始和结束的节点是否是同一个
   */
  getAvailableSelectionAndRange(): AvailbleSelection | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.toString().trim()) return null;

    const selectionRange = selection.getRangeAt(0);
    const ancestorNdode = selectionRange.commonAncestorContainer;

    // TODO: 需要支持跨节点选区的评论能力
    // 通常在选择了跨区内容时 `commonAncestorContainer.nodeType === ELEMENT_NODE`
    if (ancestorNdode.nodeType === Node.ELEMENT_NODE) {
      selection.removeAllRanges();
      return null;
    }

    // 对于 `commonAncestorContainer.nodeType === Node.TEXT_NODE` 的情况
    // 需要检查选区是不是在批注元素内，如果在，则不允许选中
    if (ancestorNdode.nodeType === Node.TEXT_NODE && this.checkIsMarkElement(ancestorNdode.parentElement)) {
      selection.removeAllRanges();
      return null;
    }

    // TODO: 对于选区中存在换行的情况，需要考虑如何处理
    // 判断条件: 选区文本和 `trim` 后的文本是否相等

    return {
      selection,
      selectionRange,
    };
  }

  getWebWordMarkID(element: HTMLElement) {
    return element.dataset['webwordmark-cid'];
  }

  /**
   * 检查是不是 MarkElement
   * @param element 要检查的元素
   */
  checkIsMarkElement(element: HTMLElement | null) {
    return !!element && element.classList.contains(MARK_WORD_DEFAULT_CLASS_NAME);
  }
  /**
   * 检查是不是新创建的 MarkElement
   * @param element 要检查的元素
   */
  checkIsNewMarkElement(element: HTMLElement | null) {
    return this.checkIsMarkElement(element) && !this.getWebWordMarkID(element as HTMLElement);
  }

  /**
   * 获取选中文本
   */
  getSelectedText() {
    const availableSelection = this.getAvailableSelectionAndRange();
    if (!availableSelection) return '';

    return availableSelection.selection.toString().trim();
  }

  private logger(label: string, ...args: any) {
    if (!this.__options.debug) return;
    console.log(`[WebWordMark::${label}]`, ...args);
  }

  destroy() {
    this.startPoint = null;
    this.hideMarkBarElement();
    this.__containerElement.removeEventListener('mousedown', this.onContainerMouseDown);
    this.__containerElement.removeEventListener('mouseup', this.onContainerMouseUp);
    this.__containerElement.removeEventListener('click', this.onContainerClick);
  }
}
