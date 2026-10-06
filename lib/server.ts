import { env } from 'cloudflare:workers';
import type { Profile } from './finance';
export class ApiError extends Error { constructor(message: string, public status=400){ super(message); } }
export function db(){ if(!env.DB) throw new ApiError('Хранилище временно недоступно.',503); return env.DB; }
export function json(data: unknown, status=200, headers: Record<string,string>={}) { return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}}); }
export async function route(work:()=>Promise<Response>) { try {return await work();} catch(e){ if(e instanceof ApiError) return json({error:e.message},e.status); console.error('ORBIT API:',e); return json({error:'Не удалось выполнить запрос. Попробуйте ещё раз.'},500); } }
export async function body(request: Request) {
  if(request.headers.get('origin') && new URL(request.headers.get('origin')!).host!==new URL(request.url).host) throw new ApiError('Недопустимый источник запроса.',403);
  if(!request.headers.get('content-type')?.startsWith('application/json')) throw new ApiError('Ожидается JSON.',415);
  const raw=await request.text(); if(raw.length>12000) throw new ApiError('Слишком большой запрос.',413);
  try { const value=JSON.parse(raw); if(!value || typeof value!=='object'||Array.isArray(value)) throw new Error(); return value; } catch {throw new ApiError('Некорректные данные.');}
}
function hex(buffer: ArrayBuffer){return Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');}
export const random = () => hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
export async function digest(value: string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));}
export async function hashPassword(password: string,salt: string){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256));
}
export function equal(a: string,b: string){let diff=a.length^b.length;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
export function cookie(request: Request, token: string, maxAge=604800){ return `orbit_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`; }
export function tokenOf(request: Request){return request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('orbit_session='))?.slice(14);}
export async function session(request: Request, id: string){ const token=random(); await db().batch([db().prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()),db().prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').bind(await digest(token),id,Date.now()+604800000)]);return cookie(request,token); }
export async function user(request: Request): Promise<Profile> {
  const token=tokenOf(request);if(!token)throw new ApiError('Войдите в аккаунт.',401);
  const row=await db().prepare('SELECT u.id,u.full_name AS fullName,u.nickname,u.email,u.budget FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),Date.now()).first<Profile>();
  if(!row)throw new ApiError('Сессия завершилась. Войдите снова.',401);return row;
}
export function validateProfile(data: Record<string,unknown>){
  const fullName=typeof data.fullName==='string'?data.fullName.trim():'';
  const nickname=typeof data.nickname==='string'?data.nickname.trim().toLowerCase():'';
  const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
  if(fullName.length<2||fullName.length>100)throw new ApiError('Введите ФИО: от 2 до 100 символов.');
  if(!/^[a-z0-9_]{3,24}$/.test(nickname))throw new ApiError('Никнейм: 3–24 латинские буквы, цифры или _.');
  if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw new ApiError('Проверьте адрес почты.');
  return {fullName,nickname,email};
}
export async function limitAuth(request: Request,email: string){
  const key=await digest(`${request.headers.get('cf-connecting-ip')||'local'}:${email.toLowerCase()}`), now=Date.now();
  const result=await db().prepare('INSERT INTO auth_attempts (key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END, reset_at=CASE WHEN reset_at<? THEN ? ELSE reset_at END RETURNING count').bind(key,now+900000,now,now,now+900000).first<{count:number}>();
  if(result && result.count>10)throw new ApiError('Слишком много попыток. Попробуйте через 15 минут.',429);
  return key;
}
