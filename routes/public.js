import {Router} from 'express';import Post,{live} from '../models/Post.js';
const r=Router();const card='-description';const esc=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
r.get('/posts',async(q,s)=>{const page=Math.max(1,+q.query.page||1),limit=Math.min(24,+q.query.limit||9);
 const f={...live()};if(q.query.search)f.title={$regex:esc(q.query.search),$options:'i'};
 if(q.query.category&&q.query.category!=='All')f.category=q.query.category;
 const [items,total]=await Promise.all([Post.find(f).select(card).sort({publishedAt:-1}).skip((page-1)*limit).limit(limit),Post.countDocuments(f)]);
 s.json({items,total,page,pages:Math.ceil(total/limit)});});
r.get('/categories',async(q,s)=>{
 const counts=await Post.aggregate([{$match:live()},{$group:{_id:'$category',count:{$sum:1}}},{$sort:{count:-1}}]);
 s.json(counts.map(c=>({name:c._id||'General',count:c.count})));
});
r.get('/posts/featured',async(q,s)=>{s.json(await Post.findOne({...live(),isFeatured:true}).select(card).sort({publishedAt:-1})||await Post.findOne(live()).select(card).sort({publishedAt:-1}));});
r.get('/posts/popular',async(q,s)=>s.json(await Post.find(live()).select(card).sort({views:-1}).limit(5)));
r.get('/posts/:slug',async(q,s)=>{const p=await Post.findOneAndUpdate({slug:q.params.slug,...live()},{$inc:{views:1}},{new:true});
 if(!p)return s.status(404).json({message:'Post not found'});
 const related=await Post.find({...live(),_id:{$ne:p._id}}).select(card).sort({publishedAt:-1}).limit(3);s.json({post:p,related});});
r.get('/settings',(q,s)=>s.json({name:'BlogSphere',tagline:'Stories worth reading.',timezone:process.env.SITE_TZ||'Asia/Kolkata'}));
export default r;
