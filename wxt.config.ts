import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: ({ browser }) => ({
    name: 'Local Voice Reader',
    description:
      'Reads selected text aloud with a natural voice that runs locally. Your text never leaves your machine.',
    // Chromium needs `sidePanel`; Firefox does not know that permission.
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
