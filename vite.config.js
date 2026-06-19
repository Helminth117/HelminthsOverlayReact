import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(),
    electron([
      {
        entry: 'src/main/index.js',
        vite: {
          build: {
            outDir: 'dist-electron/main'
          }
        }
      },
      {
        entry: 'src/preload/index.js',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload'
          }
        }
      },
      {
        entry: 'src/preload/yt-preload.js',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload'
          }
        }
      },
    ]),
    renderer(),
  ],
  build: {
    rollupOptions: {
      input: {
        control: resolve(__dirname, 'control.html'),
        overlay: resolve(__dirname, 'overlay.html'),
        activation: resolve(__dirname, 'activation.html')
      }
    }
  }
})
