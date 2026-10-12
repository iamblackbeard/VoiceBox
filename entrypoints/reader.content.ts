import type { PageRequest, SelectionResponse } from '@/lib/messages';
import { chunkText } from '@/lib/chunker';
import { buildChunkRanges, type TextNodeInfo } from '@/lib/range-mapper';
import '@/assets/highlight.css';

let chunkRanges: Range[] = [];

// Helper to extract all text nodes from a given Range
function getTextNodesInRange(range: Range): TextNodeInfo[] {
  const nodes: TextNodeInfo[] = [];

  // If selection is within a single text node, treeWalker won't visit its children (it has none).
  if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
    const node = range.commonAncestorContainer;
    const text = node.textContent || '';
    const startOffset = Math.max(0, range.startOffset);
    const endOffset = Math.min(text.length, range.endOffset);
    if (endOffset > startOffset) {
      nodes.push({ node, length: endOffset - startOffset });
    }
    return nodes;
  }

  const treeWalker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        if (!range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  let currentNode = treeWalker.nextNode();
  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      let textContent = currentNode.textContent || '';
      let length = textContent.length;
      let startOffset = 0;
      let endOffset = length;
      
      if (currentNode === range.startContainer) {
        startOffset = range.startOffset;
      }
      if (currentNode === range.endContainer) {
        endOffset = range.endOffset;
      }
      
      if (endOffset > startOffset) {
        nodes.push({ node: currentNode, length: endOffset - startOffset });
      }
    }
    currentNode = treeWalker.nextNode();
  }
  return nodes;
}

function clearHighlight() {
  if ('highlights' in CSS) {
    (CSS as any).highlights.delete('lvr-current');
  }
}

// Injected on demand (never on every page), so the extension only touches
// pages you actually use "Read Aloud" on.
export default defineContentScript({
  registration: 'runtime',
  main() {
    // Guard: the background script may inject this into the same tab twice.
    const flag = '__lvrReaderInstalled';
    const w = window as unknown as Record<string, unknown>;
    if (w[flag]) return;
    w[flag] = true;

    // Listen for disconnections (e.g. side panel closes)
    browser.runtime.onConnect.addListener((port) => {
      port.onDisconnect.addListener(() => {
        clearHighlight();
        chunkRanges = [];
      });
    });

    browser.runtime.onMessage.addListener(
      (message: PageRequest, _sender, sendResponse) => {
        if (message?.type === 'get-selection') {
          const selection = window.getSelection();
          let textToSend = '';
          
          chunkRanges = [];
          
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);

            // Ensure styles pierce shadow roots in browsers like Firefox
            try {
              const root = range.commonAncestorContainer.getRootNode();
              if (root instanceof ShadowRoot && !root.querySelector('style[data-lvr-highlight]')) {
                const styleEl = document.createElement('style');
                styleEl.setAttribute('data-lvr-highlight', 'true');
                styleEl.textContent = '::highlight(lvr-current) { background-color: rgba(255, 235, 59, 0.4); }';
                root.appendChild(styleEl);
              }
            } catch (e) {}

            const nodes = getTextNodesInRange(range);
            
            let exactText = '';
            const mappedNodes: TextNodeInfo[] = [];
            
            for (let i = 0; i < nodes.length; i++) {
              const n = nodes[i]!;
              let textContent = '';
              if (n.node === range.startContainer && n.node === range.endContainer) {
                textContent = n.node.textContent!.substring(range.startOffset, range.endOffset);
              } else if (n.node === range.startContainer) {
                textContent = n.node.textContent!.substring(range.startOffset);
              } else if (n.node === range.endContainer) {
                textContent = n.node.textContent!.substring(0, range.endOffset);
              } else {
                textContent = n.node.textContent || '';
              }
              
              if (textContent) {
                exactText += textContent;
                mappedNodes.push({ node: n.node, length: textContent.length });
                
                // Add a space between separate block-level containers if neither already has whitespace
                if (i < nodes.length - 1 && !textContent.match(/\s$/)) {
                  const nextNode = nodes[i + 1]!;
                  const nextNodeText = (nextNode.node.textContent || '');
                  let nextFirstChar = '';
                  if (nextNode.node === range.endContainer && range.startContainer === range.endContainer) {
                    nextFirstChar = nextNodeText.substring(range.startOffset, range.endOffset);
                  } else if (nextNode.node === range.startContainer) {
                    nextFirstChar = nextNodeText.substring(range.startOffset);
                  } else {
                    nextFirstChar = nextNodeText;
                  }
                  
                  if (!nextFirstChar.match(/^\s/) && n.node.parentElement !== nextNode.node.parentElement) {
                    exactText += ' ';
                    mappedNodes.push({ node: null, length: 1 });
                  }
                }
              }
            }
            
            textToSend = exactText.trim();
            if (textToSend) {
              const chunks = chunkText(textToSend);
              const rangesInfo = buildChunkRanges(chunks, mappedNodes, exactText);
              
              chunkRanges = rangesInfo.map(info => {
                const r = document.createRange();
                
                const startNode = info.startNode as Text;
                const endNode = info.endNode as Text;
                
                let startOffset = info.startOffset;
                let endOffset = info.endOffset;
                
                if (startNode === range.startContainer) {
                  startOffset += range.startOffset;
                }
                if (endNode === range.startContainer) {
                  endOffset += range.startOffset;
                }

                if (startNode === endNode && startOffset > endOffset) {
                  endOffset = startOffset;
                }
                
                r.setStart(startNode, startOffset);
                r.setEnd(endNode, endOffset);
                return r;
              });
            }
          }
          
          const response: SelectionResponse = { text: textToSend };
          sendResponse(response);
        } else if (message?.type === 'highlight') {
          clearHighlight();
          const chunkIndex = message.chunkIndex;
          if (chunkIndex >= 0 && chunkIndex < chunkRanges.length) {
            const range = chunkRanges[chunkIndex];
            if ('highlights' in CSS) {
              const highlight = new (window as any).Highlight(range);
              (CSS as any).highlights.set('lvr-current', highlight);
            }
          }
        } else if (message?.type === 'clear') {
          clearHighlight();
        }
        
        // Answer synchronously; nothing async to wait for.
        return false;
      },
    );
  },
});
