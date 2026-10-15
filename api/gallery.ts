import { handleGallery } from '../server/gallery.ts';
import { blobStore } from '../server/blob-gallery.ts';

export default {
  async fetch(request: Request) {
    if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)) {
      return Response.json({ error: 'Public publishing is not set up yet. Please download your painting and try again later.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    return handleGallery(request, blobStore);
  },
};
