import {Router} from 'express';import jwt from 'jsonwebtoken';import bcrypt from 'bcryptjs';import multer from 'multer';import fs from 'fs';import sanitize from 'sanitize-html';
import {v2 as cloud} from 'cloudinary';import Post from '../models/Post.js';import Admin from '../models/Admin.js';
const r=Router();const esc=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
r.post('/auth/login',async(q,s)=>{const a=await Admin.findOne({email:String(q.body.email||'').toLowerCase()});
 if(!a||!(await bcrypt.compare(String(q.body.password||''),a.password)))return s.status(401).json({message:'Invalid credentials'});
 s.json({token:jwt.sign({id:a._id},process.env.JWT_SECRET,{expiresIn:'1d'})});});
r.use((q,s,n)=>{try{jwt.verify((q.headers.authorization||'').replace('Bearer ',''),process.env.JWT_SECRET);n();}catch{s.status(401).json({message:'Unauthorized'});}});
const clean=h=>sanitize(h,{allowedTags:sanitize.defaults.allowedTags.concat(['img','h1','h2']),allowedAttributes:{a:['href','target'],img:['src','alt']}});
const fields=b=>({title:b.title,slug:b.slug,description:clean(b.description||''),thumbnailImage:b.thumbnailImage,coverImage:b.coverImage,isFeatured:!!b.isFeatured,seoTitle:b.seoTitle,seoDescription:b.seoDescription});
const fail=(s,e)=>s.status(e.code===11000?409:400).json({message:e.code===11000?'URL already in use':e.message});
const future=t=>t instanceof Date&&t>new Date();
r.get('/dashboard',async(q,s)=>{const c=x=>Post.countDocuments(x?{status:x}:{});
 s.json({total:await c(),published:await c('published'),scheduled:await c('scheduled'),draft:await c('draft'),recent:await Post.find().select('-description').sort({createdAt:-1}).limit(5)});});
r.get('/posts',async(q,s)=>{const f={};if(q.query.status)f.status=q.query.status;if(q.query.search)f.title={$regex:esc(q.query.search),$options:'i'};
 s.json(await Post.find(f).select('-description').sort({createdAt:-1}));});
r.get('/posts/:id',async(q,s)=>{const p=await Post.findById(q.params.id);p?s.json(p):s.status(404).json({message:'Not found'});});
r.post('/posts',async(q,s)=>{try{const d=fields(q.body);
 if(q.body.status==='scheduled'){const t=new Date(q.body.scheduledAt);if(!future(t))return s.status(400).json({message:'Schedule time must be in the future'});d.status='scheduled';d.scheduledAt=t;}
 else if(q.body.status==='published'){d.status='published';d.publishedAt=new Date();}
 s.status(201).json(await Post.create(d));}catch(e){fail(s,e);}});
r.put('/posts/:id',async(q,s)=>{try{const p=await Post.findById(q.params.id);if(!p)return s.status(404).json({message:'Not found'});
 Object.assign(p,fields(q.body));await p.save();s.json(p);}catch(e){fail(s,e);}});
r.patch('/posts/:id/publish',async(q,s)=>s.json(await Post.findByIdAndUpdate(q.params.id,{status:'published',publishedAt:new Date(),scheduledAt:null},{new:true})));
r.patch('/posts/:id/draft',async(q,s)=>s.json(await Post.findByIdAndUpdate(q.params.id,{status:'draft',scheduledAt:null,publishedAt:null},{new:true})));
r.patch('/posts/:id/schedule',async(q,s)=>{const t=new Date(q.body.scheduledAt);if(!future(t))return s.status(400).json({message:'Schedule time must be in the future'});
 s.json(await Post.findByIdAndUpdate(q.params.id,{status:'scheduled',scheduledAt:t,publishedAt:null},{new:true}));});
r.delete('/posts/:id',async(q,s)=>{await Post.findByIdAndDelete(q.params.id);s.json({ok:true});});
const up=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024},fileFilter:(q,f,cb)=>/^image\/(jpeg|png|webp|gif)$/.test(f.mimetype)?cb(null,true):cb(new Error('Only jpg/png/webp/gif images'))});
r.post('/media',(q,s)=>up.single('image')(q,s,async e=>{
 if(e)return s.status(400).json({message:e.message});if(!q.file)return s.status(400).json({message:'No file'});
 if(process.env.CLOUDINARY_CLOUD_NAME){
  cloud.config({cloud_name:process.env.CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET});
  return cloud.uploader.upload_stream({folder:'blogsphere',resource_type:'auto'},(er,x)=>{
   if(er){console.error('[Cloudinary Error]',er);return s.status(500).json({message:er.message});}
   console.log('[Cloudinary Success]',x.secure_url);
   s.json({url:x.secure_url});
  }).end(q.file.buffer);
 }
 fs.mkdirSync('uploads',{recursive:true});const n=Date.now()+'-'+q.file.originalname.replace(/[^\w.]/g,'_');fs.writeFileSync('uploads/'+n,q.file.buffer);
 console.log('[Local Upload]',`uploads/${n}`);
 s.json({url:`${q.protocol}://${q.get('host')}/uploads/${n}`});}));
export default r;
