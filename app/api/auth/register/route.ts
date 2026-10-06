import {ApiError,body,db,hashPassword,json,limitAuth,random,route,session,validateProfile} from '@/lib/server';
export const POST=(request: Request)=>route(async()=>{
 const data=await body(request), profile=validateProfile(data);
 await limitAuth(request,profile.email);
 if(typeof data.password!=='string'||data.password.length<8||data.password.length>128)throw new ApiError('Пароль должен содержать от 8 до 128 символов.');
 const exists=await db().prepare('SELECT id FROM users WHERE email=? OR nickname=?').bind(profile.email,profile.nickname).first();
 if(exists)throw new ApiError('Эта почта или никнейм уже используются.',409);
 const id=crypto.randomUUID(),salt=random(),hash=await hashPassword(data.password,salt);
 try { await db().prepare('INSERT INTO users (id,full_name,nickname,email,password_hash,salt,budget,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,profile.fullName,profile.nickname,profile.email,hash,salt,5000000,Date.now()).run(); } catch(e){if(String(e).includes('UNIQUE'))throw new ApiError('Эта почта или никнейм уже используются.',409);throw e;}
 return json({user:{id,...profile,budget:5000000}},201,{'Set-Cookie':await session(request,id)});
});
