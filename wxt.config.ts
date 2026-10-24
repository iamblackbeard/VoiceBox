import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: ({ browser }) => ({
    name: 'Voice Box',
    description:
      'Reads selected text aloud with a natural voice that runs locally. Your text never leaves your machine.',
    // Chromium needs `sidePanel`; Firefox does not know that permission.
    icons: {
      16: 'icons/voice_16.png',
      24: 'icons/voice_24.png',
      48: 'icons/voice_48.png',
      96: 'icons/voice_96.png',
      128: 'icons/voice_128.png',
    },
    permissions: [
      'contextMenus',
      'activeTab',
      'scripting',
      'storage',
      ...(browser === 'firefox' ? [] : ['sidePanel']),
    ],
    // The one-time voice download comes from Hugging Face.
    host_permissions: ['https://huggingface.co/*', 'https://*.hf.co/*'],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
    ...(browser === 'firefox'
      ? {
        browser_specific_settings: {
          gecko: {
            id: 'local-voice-reader@example.com',
            // The extension collects nothing: text stays on the machine.
            data_collection_permissions: { required: ['none'] },
          },
        },
      }
      : {}),
  }),
});
