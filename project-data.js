import {CMSClient,configured} from './cms-client.js';
import {validateDocument} from './project-store.js';
export async function loadProjects(){
  if(configured){try{const data=await new CMSClient().read();if(data)return data}catch{console.warn('CMS unavailable; showing repository projects.')}}
  const response=await fetch('data/projects.json',{cache:'no-store'});
  if(!response.ok)throw Error('Project galleries could not be loaded. Please try again.');
  return validateDocument(await response.json());
}
