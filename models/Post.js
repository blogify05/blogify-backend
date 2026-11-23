import mongoose from 'mongoose';
const s = new mongoose.Schema({
    title: { type: String, required: true, trim: true }, slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, required: true }, excerpt: String, category: { type: String, default: 'General' },
    thumbnailImage: String, coverImage: String, authorAvatar: String,
    status: { type: String, enum: ['draft', 'scheduled', 'published'], default: 'draft' }, isFeatured: { type: Boolean, default: false },
    scheduledAt: Date, publishedAt: Date, author: { type: String, default: 'Krushangi Bhatiya' }, seoTitle: String, seoDescription: String, views: { type: Number, default: 0 }
}, { timestamps: true });
s.index({ status: 1, scheduledAt: 1 }); s.index({ status: 1, publishedAt: -1 });
export const live = () => ({ status: 'published', publishedAt: { $lte: new Date() } });
export default mongoose.model('Post', s);
