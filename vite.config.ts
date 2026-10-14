import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'node:url';

// Pages that live in their own folder, served at /<folder>/.
const folders = ['scrape-painting', 'squeegee-painting', 'gallery'];

// The dev server would answer /gallery with the studio; send it to /gallery/,
// as vercel.json does in production.
const trailingSlash: Plugin = {
  name: 'scrape-trailing-slash',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const [path, query] = (req.url ?? '').split('?');
      if (folders.includes(path.slice(1))) { res.statusCode = 308; res.setHeader('Location', `${path}/${query ? `?${query}` : ''}`); res.end(); return; }
      next();
    });
  },
};

export default defineConfig({
  plugins: [trailingSlash],
  build: {
    rolldownOptions: {
      input: {
        studio: fileURLToPath(new URL('./index.html', import.meta.url)),
        reference: fileURLToPath(new URL('./reference.html', import.meta.url)),
        ...Object.fromEntries(folders.map(folder => [folder, fileURLToPath(new URL(`./${folder}/index.html`, import.meta.url))])),
      },
    },
  },
});
