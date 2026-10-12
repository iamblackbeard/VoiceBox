import { describe, it, expect } from 'vitest';
import { mapOffsetToNode, buildChunkRanges, type TextNodeInfo } from '../lib/range-mapper';

describe('range-mapper', () => {
  it('maps correctly across multiple nodes', () => {
    const nodes: TextNodeInfo[] = [
      { node: 'n1', length: 5 },  // 0-5
      { node: 'n2', length: 10 }, // 5-15
      { node: 'n3', length: 5 }   // 15-20
    ];

    expect(mapOffsetToNode(nodes, 0)).toEqual({ node: 'n1', offset: 0 });
    expect(mapOffsetToNode(nodes, 3)).toEqual({ node: 'n1', offset: 3 });
    expect(mapOffsetToNode(nodes, 5, true)).toEqual({ node: 'n1', offset: 5 });
    expect(mapOffsetToNode(nodes, 5, false)).toEqual({ node: 'n2', offset: 0 });
    expect(mapOffsetToNode(nodes, 10)).toEqual({ node: 'n2', offset: 5 });
    expect(mapOffsetToNode(nodes, 15, true)).toEqual({ node: 'n2', offset: 10 });
    expect(mapOffsetToNode(nodes, 15, false)).toEqual({ node: 'n3', offset: 0 });
    expect(mapOffsetToNode(nodes, 20, true)).toEqual({ node: 'n3', offset: 5 });
    expect(mapOffsetToNode(nodes, 21)).toBeNull();
  });

  it('buildChunkRanges handles single chunk spanning multiple nodes', () => {
    const nodes = [
      { node: 'n1', length: 5 },
      { node: 'n2', length: 5 }
    ];
    const chunks = ['1234567890'];
    const exactText = '1234567890';
    const ranges = buildChunkRanges(chunks, nodes, exactText);
    expect(ranges).toEqual([{
      startNode: 'n1',
      startOffset: 0,
      endNode: 'n2',
      endOffset: 5
    }]);
  });

  it('buildChunkRanges handles multiple chunks', () => {
    const nodes = [
      { node: 'n1', length: 10 }
    ];
    const chunks = ['12345', '67890'];
    const exactText = '1234567890';
    const ranges = buildChunkRanges(chunks, nodes, exactText);
    expect(ranges).toEqual([
      { startNode: 'n1', startOffset: 0, endNode: 'n1', endOffset: 5 },
      { startNode: 'n1', startOffset: 5, endNode: 'n1', endOffset: 10 }
    ]);
  });

  it('buildChunkRanges handles leading whitespace without drifting sentence offsets', () => {
    const nodes: TextNodeInfo[] = [
      { node: 'n1', length: 15 } // "  Sentence one."
    ];
    const exactText = '  Sentence one.';
    const chunks = ['Sentence one.'];
    const ranges = buildChunkRanges(chunks, nodes, exactText);
    expect(ranges).toEqual([
      { startNode: 'n1', startOffset: 2, endNode: 'n1', endOffset: 15 }
    ]);
  });

  it('buildChunkRanges handles virtual spaces between paragraph nodes', () => {
    const nodes: TextNodeInfo[] = [
      { node: 'p1', length: 6 }, // "Line 1"
      { node: null, length: 1 }, // virtual space
      { node: 'p2', length: 6 }  // "Line 2"
    ];
    const exactText = 'Line 1 Line 2';
    const chunks = ['Line 1', 'Line 2'];
    const ranges = buildChunkRanges(chunks, nodes, exactText);
    expect(ranges).toEqual([
      { startNode: 'p1', startOffset: 0, endNode: 'p1', endOffset: 6 },
      { startNode: 'p2', startOffset: 0, endNode: 'p2', endOffset: 6 }
    ]);
  });
});
