import {cmsConfig} from './cms-config.js';
import {validateDocument} from './project-store.js';
function publicKeyOnly(key){
  if(typeof key!=='string')return false;
  if(key.startsWith('sb_publishable_'))return true;
  try{return JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon'}catch{return false}
}
export const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cmsConfig.url) && publicKeyOnly(cmsConfig.publishableKey);
export class CMSClient {
  constructor(){this.base=cmsConfig.url.replace(/\/$/,'');this.session=null;this.revision=null;}
  async request(path,{method='GET',body,headers={},authenticated=false}={}){
    if(!configured)throw Error('Connect your Supabase project first. Follow CMS-SETUP.md.');
    if(authenticated)await this.refreshSession();
    const response=await fetch(this.base+path,{method,headers:{apikey:cmsConfig.publishableKey,...(authenticated?{Authorization:`Bearer ${this.session.access_token}`}:{}),...(body instanceof Blob?{}:{'Content-Type':'application/json'}),...headers},...(body!==undefined?{body:body instanceof Blob?body:JSON.stringify(body)}:{})});
    if(!response.ok){
      if(response.status===400&&path.startsWith('/auth/v1/token'))throw Error('Email/password is incorrect or your session expired. Please sign in again.');
      if(response.status===401)throw Error('Your login expired or the email/password is incorrect. Please sign in again.');
      if(response.status===403)throw Error('This account does not have permission to edit this portfolio. Check the owner setup.');
      if(response.status===409)throw Error('The portfolio changed. Reload the published projects before trying again.');
      throw Error(`Request failed (${response.status}). Check the CMS setup and connection; your changes have not been published.`);
    }
    const text=await response.text();return text?JSON.parse(text):null;
  }
  remember(session){this.session=session;try{session?sessionStorage.setItem('portfolio-session',JSON.stringify(session)):sessionStorage.removeItem('portfolio-session')}catch{}}
  async restore(){try{const raw=sessionStorage.getItem('portfolio-session');if(raw)this.session=JSON.parse(raw)}catch{this.remember(null)}if(!this.session)return false;try{await this.checkOwner();return true}catch{this.remember(null);return false}}
  async login(email,password){
    const session=await this.request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
    session.expires_at=Date.now()/1000+session.expires_in;this.remember(session);
    try{await this.checkOwner()}catch(error){await this.logout();throw error}
  }
  async refreshSession(){
    if(!this.session)throw Error('Sign in to publish.');
    if(this.session.expires_at>Date.now()/1000+60)return;
    const session=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:this.session.refresh_token}});
    session.expires_at=Date.now()/1000+session.expires_in;this.remember(session);
  }
  async checkOwner(){const owner=await this.request('/rest/v1/rpc/is_portfolio_admin',{method:'POST',body:{},authenticated:true});if(owner!==true)throw Error('This account is not the portfolio owner. Complete the owner setup before signing in.');}
  async logout(){try{if(this.session)await this.request('/auth/v1/logout',{method:'POST',authenticated:true})}finally{this.remember(null)}}
  async read(){const rows=await this.request('/rest/v1/portfolio_content?id=eq.1&select=data,revision');this.revision=rows[0]?.revision||null;return rows[0]?validateDocument(rows[0].data):null;}
  async upload(file){
    const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
    if(!extensions[file.type]||file.size>8*1024*1024)throw Error('Use a JPG, PNG, WebP or AVIF image under 8 MB.');
    const path=`models/${crypto.randomUUID()}.${extensions[file.type]}`;
    await this.request(`/storage/v1/object/portfolio-media/${path}`,{method:'POST',body:file,headers:{'Content-Type':file.type},authenticated:true});
    return this.base+`/storage/v1/object/public/portfolio-media/${path}`;
  }
  async publish(data){
    validateDocument(data);const revision=crypto.randomUUID();
    const rows=await this.request(this.revision?`/rest/v1/portfolio_content?id=eq.1&revision=eq.${this.revision}`:'/rest/v1/portfolio_content',{method:this.revision?'PATCH':'POST',body:{id:1,data,revision},headers:{Prefer:'return=representation'},authenticated:true});
    if(!rows?.length)throw Error('Another edit was published first. Reload the latest projects before publishing.');
    this.revision=revision;return rows[0];
  }
}
