export const findAncestor = (node: Node, matchFunction: (node: Node) => Boolean) => {
  while (node && node !== document) {
    if (matchFunction(node)) {
      return node;
    }
    node = node.parentNode as Node;
  }

  return null;
};

/**
 * 获取可用的选区对象
 * @description 检查逻辑：
 *  1. 选区是否存在
 *  2. 选区是否跨节点
 *  3. 选区的父容器是否已经高亮
 *  4. 选区内开始和结束的节点是否是同一个
 */
export const getAvailableSelectionAndRange = () => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

  const selectionRange = selection.getRangeAt(0);
  const ancestorNdode = selectionRange.commonAncestorContainer;

  if (ancestorNdode.nodeType === Node.ELEMENT_NODE) {
    selection.removeAllRanges();
    return;
  }

  // if (ancestorNdode.nodeType === Node.TEXT_NODE && checkIsMarkElement(ancestorNdode.parentElement)) {
  //   selection.removeAllRanges();
  //   return;
  // }

  return {
    selection,
    selectionRange,
  };
};

export function getCharacterOffsetsWithin({ range, parentElement }: { selection?: Selection; range: Range; parentElement: Element }) {
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(parentElement);
  preCaretRange.setEnd(range.startContainer, range.startOffset);
  const startOffset = preCaretRange.toString().length;
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  const endOffset = preCaretRange.toString().length;

  return {
    startOffset,
    endOffset,
    selectContent: range.toString(),
  };
}

export function getRangeByCharacterOffsets(element: Node, startOffset: number, endOffset: number) {
  const range = document.createRange();
  range.setStart(element, 0);
  range.collapse(true);

  const nodeStack = [element];
  let node: Node | undefined;
  let foundStart = false;
  let stop = false;
  let charIndex = 0;

  while (!stop && (node = nodeStack.pop())) {
    if (node.nodeType === Node.TEXT_NODE) {
      // 文本节点
      const nextCharIndex = charIndex + (node.textContent || '').length;

      if (!foundStart && startOffset >= charIndex && startOffset < nextCharIndex) {
        range.setStart(node, startOffset - charIndex);
        foundStart = true; // We've found the start of the selection
      }
      if (foundStart && endOffset >= charIndex && endOffset <= nextCharIndex) {
        range.setEnd(node, endOffset - charIndex);
        stop = true; // We've found the end of the selection, stop the loop
      }
      charIndex = nextCharIndex; // Update the charIndex to the end of the current text node
    } else {
      // 非文本节点，将其子节点添加到堆栈中
      const len = node.childNodes.length;
      for (let i = len - 1; i >= 0; i--) {
        nodeStack.push(node.childNodes[i]);
      }
    }
  }

  return range;
}
