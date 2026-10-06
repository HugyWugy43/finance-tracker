import {ApiError,body,db,json,route,user,validateProfile} from '@/lib/server';
export const GET=(request: Request)=>route(async()=>json({user:await user(request)}));
export const PATCH=(request: Request)=>route(async()=>{
 const current=await user(request),profile=validateProfile(await body(request));
 const exists=await db().prepare('SELECT id FROM users WHERE (email=? OR nickname=?) AND id<>?').bind(profile.email,profile.nickname,current.id).first();
 if(exists)throw new ApiError('Эта почта или никнейм уже используются.',409);
 await db().prepare('UPDATE users SET full_name=?,nickname=?,email=? WHERE id=?').bind(profile.fullName,profile.nickname,profile.email,current.id).run();
 return json({user:{...current,...profile}});
});
