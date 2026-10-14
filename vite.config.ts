import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        studio: fileURLToPath(new URL('./index.html', import.meta.url)),
        reference: fileURLToPath(new URL('./reference.html', import.meta.url)),
        scrapePainting: fileURLToPath(new URL('./scrape-painting/index.html', import.meta.url)),
        squeegeePainting: fileURLToPath(new URL('./squeegee-painting/index.html', import.meta.url)),
      },
    },
  },
});
