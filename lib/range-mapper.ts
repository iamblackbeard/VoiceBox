export interface TextNodeInfo {
  node: any;
  length: number;
}

export interface RangeInfo {
  startNode: any;
  startOffset: number;
  endNode: any;
  endOffset: number;
}

export function mapOffsetToNode(
  nodes: TextNodeInfo[],
  offset: number,
  isEnd: boolean = false
): { node: any; offset: number } | null {
  let currentOffset = 0;
  for (let i = 0; i < nodes.length; i++) {
    const info = nodes[i]!;
    const nextOffset = currentOffset + info.length;

    if (offset < nextOffset) {
      return { node: info.node, offset: offset - currentOffset };
    }

    if (offset === nextOffset) {
      if (isEnd || i === nodes.length - 1) {
        return { node: info.node, offset: info.length };
      }
      // If isEnd is false and there are subsequent nodes, continue so start falls on the next node at offset 0
    }

    currentOffset = nextOffset;
  }

  if (nodes.length > 0 && offset === currentOffset) {
    const lastNode = nodes[nodes.length - 1]!;
    return { node: lastNode.node, offset: lastNode.length };
  }
  return null;
}

export function buildChunkRanges(
  chunks: string[],
  nodes: TextNodeInfo[],
  exactText: string
): RangeInfo[] {
  const ranges: RangeInfo[] = [];
  let currentOffset = 0;

  for (const chunk of chunks) {
    let startOffset = exactText.indexOf(chunk, currentOffset);
    let chunkLen = chunk.length;

    // Fallback: if exact chunk doesn't match directly, try trimmed chunk
    if (startOffset === -1) {
      const trimmed = chunk.trim();
      startOffset = exactText.indexOf(trimmed, currentOffset);
      if (startOffset !== -1) {
        chunkLen = trimmed.length;
      }
    }

    if (startOffset === -1) continue;

    let endOffset = startOffset + chunkLen;
    const nextSearchOffset = endOffset;

    let start = mapOffsetToNode(nodes, startOffset, false);
    while (start && start.node === null && startOffset < endOffset) {
      startOffset++;
      start = mapOffsetToNode(nodes, startOffset, false);
    }

    let end = mapOffsetToNode(nodes, endOffset, true);
    while (end && end.node === null && endOffset > startOffset) {
      endOffset--;
      end = mapOffsetToNode(nodes, endOffset, true);
    }

    if (start && end && start.node && end.node) {
      ranges.push({
        startNode: start.node,
        startOffset: start.offset,
        endNode: end.node,
        endOffset: end.offset,
      });
    }

    currentOffset = nextSearchOffset;
  }

  return ranges;
}
