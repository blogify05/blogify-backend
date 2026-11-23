import cron from 'node-cron';import Post from './models/Post.js';
// Polls MongoDB every minute. The update is a single atomic server-side operation filtered on
// status+scheduledAt, so with many instances each post is still published exactly once.
export async function publishDue(){
 const r=await Post.updateMany({status:'scheduled',scheduledAt:{$lte:new Date()}},[{$set:{status:'published',publishedAt:'$$NOW'}}]);
 if(r.modifiedCount)console.log(`Published ${r.modifiedCount} scheduled post(s)`);
}
export const startScheduler=()=>{publishDue().catch(console.error);cron.schedule('* * * * *',()=>publishDue().catch(console.error));};
