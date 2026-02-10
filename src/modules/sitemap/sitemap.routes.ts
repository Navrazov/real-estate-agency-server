import { Router, Request, Response } from 'express';
import { ListingModel } from '../../models/Listing.js';

const router = Router();

router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const listings = await ListingModel.find(
      { status: 'active', moderationStatus: 'approved' },
      { _id: 1, updatedAt: 1 }
    ).lean();

    const baseUrl = 'https://estatehub.com';

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    const staticPages = ['/', '/login'];
    for (const page of staticPages) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page}</loc>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>${page === "/" ? "1.0" : "0.5"}</priority>\n';
      xml += '  </url>\n';
    }

    // Listing pages
    for (const listing of listings) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/listing/${listing._id}</loc>\n`;
      if (listing.updatedAt) {
        xml += `    <lastmod>${new Date(listing.updatedAt).toISOString().split('T')[0]}</lastmod>\n`;
      }
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }

    xml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch {
    res.status(500).send('Error generating sitemap');
  }
});

export const sitemapRoutes = router;
