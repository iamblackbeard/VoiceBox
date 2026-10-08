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

export function mapOffsetToNode(nodes: TextNodeInfo[], offset: number): { node: any; offset: number } | null {
  let currentOffset = 0;
  for (const info of nodes) {
    if (offset < currentOffset + info.length || (offset === currentOffset + info.length && offset !== 0)) {
      return { node: info.node, offset: offset - currentOffset };
    }
    // Edge case: if offset is 0 and the first node is empty, we should still return it.
    if (offset === 0 && info.length === 0) {
      return { node: info.node, offset: 0 };
    }
    currentOffset += info.length;
  }
  
  // If offset is exactly the total length, point to the end of the last node
  if (nodes.length > 0 && offset === currentOffset) {
    const lastNode = nodes[nodes.length - 1];
    return { node: lastNode!.node, offset: lastNode!.length };
  }
  return null;
}

export function buildChunkRanges(chunks: string[], nodes: TextNodeInfo[], exactText: string): RangeInfo[] {
  const ranges: RangeInfo[] = [];
  let currentOffset = 0;
  
  for (const chunk of chunks) {
    let startOffset = exactText.indexOf(chunk, currentOffset);
    if (startOffset === -1) continue; // Should not happen if exactText matches chunks
    
    let endOffset = startOffset + chunk.length;
    
    let start = mapOffsetToNode(nodes, startOffset);
    // If we land on a virtual space node, snap forward to the next real node
    while (start && start.node === null) {
      startOffset++;
      start = mapOffsetToNode(nodes, startOffset);
    }

    let end = mapOffsetToNode(nodes, endOffset);
    // If we land on a virtual space node, snap backward to the previous real node
    while (end && end.node === null) {
      endOffset--;
      end = mapOffsetToNode(nodes, endOffset);
    }
    
    if (start && end) {
      ranges.push({
        startNode: start.node,
        startOffset: start.offset,
        endNode: end.node,
        endOffset: end.offset
      });
    }
    currentOffset = endOffset;
  }
  
  return ranges;
}
