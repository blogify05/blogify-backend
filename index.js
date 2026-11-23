import 'dotenv/config'; 
import express from 'express'; 
import cors from 'cors'; 
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import pub from './routes/public.js'; 
import admin from './routes/admin.js'; 
import { startScheduler } from './scheduler.js'; 
import Post, { live } from './models/Post.js';
import Admin from './models/Admin.js';

const app = express(); 
app.use(cors({ origin: process.env.CLIENT_URL || true })); 
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static('uploads')); 
app.use('/api/admin', admin); 
app.use('/api', pub);

const site = process.env.SITE_URL || 'http://localhost:5173';
app.get('/sitemap.xml', async (q, s) => {
    const ps = await Post.find(live()).select('slug updatedAt');
    s.type('xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site}/</loc></url>${ps.map(p => `<url><loc>${site}/${p.slug}</loc><lastmod>${p.updatedAt.toISOString()}</lastmod></url>`).join('')}</urlset>`);
});
app.get('/robots.txt', (q, s) => s.type('text').send(`User-agent: *\nDisallow: /admin\nSitemap: ${site}/sitemap.xml`));

await mongoose.connect(process.env.MONGO_URI); 
startScheduler();

// Ensure admin account exists from .env
const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
const adminExists = await Admin.findOne({ email: adminEmail });
if (!adminExists) {
    await Admin.create({
        email: adminEmail,
        password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ChangeMe123!', 12)
    });
    console.log(`✓ Admin user created: ${adminEmail}`);
}

app.listen(process.env.PORT || 5000, () => {
    console.log('API running on port ' + (process.env.PORT || 5000));
    if (process.env.CLOUDINARY_CLOUD_NAME) {
        console.log('✓ Cloudinary connected: ' + process.env.CLOUDINARY_CLOUD_NAME);
    } else {
        console.log('ℹ Local file storage active (server/uploads)');
    }
});
