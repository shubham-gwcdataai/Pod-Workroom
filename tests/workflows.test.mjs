import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { localDate } from '../src/utils/date.js';

async function setup(domoMode) {
 const rows = new Map([
  ['Admin_Login', [{ id:'admin', name:'Admin', email:'admin@qa.local', role:'admin' }]],
  ['POD_Members', [
   { id:'la', email:'lead-a@qa.local', name:'Lead A', role:'team-lead', managerEmail:'' },
   { id:'lb', email:'lead-b@qa.local', name:'Lead B', role:'team-lead', managerEmail:'' },
   { id:'ha', email:'head-a@qa.local', name:'Head A', role:'team-head', managerEmail:'lead-a@qa.local' },
   { id:'hb', email:'head-b@qa.local', name:'Head B', role:'team-head', managerEmail:'lead-b@qa.local' },
   { id:'ma', email:'member-a@qa.local', name:'Member A', role:'team-member', managerEmail:'head-a@qa.local' },
   { id:'mb', email:'member-b@qa.local', name:'Member B', role:'team-member', managerEmail:'head-b@qa.local' },
  ]],
  ['POD_WorkItems', [{ id:'t1', title:'Existing work', memberEmail:'member-a@qa.local', status:'Complete', completedAt:'2026-09-01' }]],
  ['POD_DailyUpdates', [
   { id:'u1', date:localDate(), name:'Member A', memberEmail:'member-a@qa.local', blockers:'Waiting for access', blockerStatus:'Not solved' },
   { id:'u2', date:localDate(), name:'Member B', memberEmail:'member-b@qa.local', blockers:'Other team issue', blockerStatus:'Not solved' },
  ]],
 ]);
 const memory = new Map([...rows].map(([key,value])=>['pod-demo:'+key,JSON.stringify(value)]));
 globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
 globalThis.window={location:{search:domoMode?'?domoDev=1':'',hostname:'localhost'}}; window.self=window; window.top=window;
 let auditFailure=false;
 const deniedReads=new Map();
 const readCalls=[];
 const writes=[];
 globalThis.workflowDomo={env:{userEmail:'admin@qa.local'},appdb:{
  list:async key=>{readCalls.push(key);if(deniedReads.has(key))throw Object.assign(new Error('Denied'),{status:deniedReads.get(key)});return rows.get(key).map(({id,...content})=>({id,content}));},
  update:async(key,id,value)=>{
   writes.push({key,id});
   if(auditFailure&&key==='Admin_Login')throw new Error('Audit unavailable');
   rows.set(key,rows.get(key).map(row=>row.id===id?{...value,id}:row));return{id,content:value};
  },
  remove:async(key,id)=>{ rows.set(key,rows.get(key).filter(row=>row.id!==id)); },
 }};
 const actor=email=>{if(domoMode)workflowDomo.env.userEmail=email;else localStorage.setItem('pod-demo:session',JSON.stringify({email}));}; actor('admin@qa.local');
 let source=await readFile(new URL('../src/podStore.js',import.meta.url),'utf8');
 source=source.replace("import Domo from 'ryuu.js';",'const Domo=globalThis.workflowDomo;')
  .replace("'./utils/hierarchy.js'",JSON.stringify(new URL('../src/utils/hierarchy.js',import.meta.url).href))
  .replace("'./utils/date.js'",JSON.stringify(new URL('../src/utils/date.js',import.meta.url).href))
  .replaceAll('import.meta.env','({VITE_ADMIN_EMAIL:"admin@qa.local"})');
 source+='\n// Isolated workflow instance '+Math.random();
 return{store:await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')),actor,failAudit:()=>{auditFailure=true;},denyRead:(key,status=403)=>deniedReads.set(key,status),readCalls,writes};
}

test('registered Domo lead can start with Admin_Login denied and performs no startup writes',async()=>{
 const{store,actor,denyRead,readCalls,writes}=await setup(true);
 actor('lead-a@qa.local');denyRead('Admin_Login');
 await store.initializeStore();
 assert.equal((await store.authenticateCurrentUser()).role,'team-lead');
 const data=await store.loadWorkspace();
 assert.deepEqual(data.members.map(p=>p.id),['la','ha','ma']);
 assert.equal(readCalls.includes('Admin_Login'),false);
 assert.equal(writes.length,0);
 await assert.rejects(store.createMember({}),/Only administrators/);
});

test('Domo collection read failures identify the collection and HTTP status without leaking response content',async()=>{
 const{store,actor,denyRead}=await setup(true);actor('lead-a@qa.local');
 denyRead('POD_WorkItems',403);
 await assert.rejects(store.loadWorkspace(),/Could not read POD_WorkItems \(HTTP 403\).*read_content/);
 denyRead('POD_WorkItems',404);
 await assert.rejects(store.loadWorkspace(),/Could not read POD_WorkItems \(HTTP 404\).*mapping/);
 denyRead('POD_WorkItems',401);
 await assert.rejects(store.loadWorkspace(),/Could not read POD_WorkItems \(HTTP 401\).*Sign in again/);
});

for(const mode of [false,true]) {
 test('bulk deletion and status changes enforce Admin and preserve retained records in '+(mode?'AppDB':'local storage'),async()=>{
  const{store,actor}=await setup(mode);
  actor('lead-a@qa.local');
  await assert.rejects(store.bulkDeleteTasks(['t1']),/Only administrators/);
  await assert.rejects(store.bulkDeletePeople(['member-a@qa.local']),/Only administrators/);
  await assert.rejects(store.bulkUpdateTaskStatus(['t1'],'In progress'),/Only administrators/);
  actor('admin@qa.local');
  let result=await store.bulkUpdateTaskStatus(['t1','missing','t1'],'In progress');
  assert.deepEqual(result.savedIds,['t1']);assert.deepEqual(result.failedIds,['missing']);
  assert.equal((await store.loadWorkspace()).tasks[0].completedAt,'');
  result=await store.bulkUpdateTaskStatus(['t1'],'Invalid');assert.equal(result.failed,1);
  result=await store.bulkDeletePeople(['head-a@qa.local','missing@qa.local','head-a@qa.local']);
  assert.equal(result.saved,1);assert.equal(result.failed,1);
  let data=await store.loadWorkspace();assert.equal(data.members.find(p=>p.id==='ma').managerEmail,'');
  assert.equal(data.dailyUpdates.length,2);assert.equal(data.tasks.length,1);
  result=await store.bulkDeleteTasks(['t1','t1','missing']);
  assert.equal(result.saved,1);assert.deepEqual(result.failedIds,['missing']);
  data=await store.loadWorkspace();assert.equal(data.tasks.length,0);assert.equal(data.dailyUpdates.length,2);
  assert.ok(data.activity.some(item=>item.action==='Deleted work'));
 });
 test('editing a lead email keeps escalated blockers linked in '+(mode?'AppDB':'local storage'),async()=>{
  const{store,actor}=await setup(mode);
  actor('head-a@qa.local');
  await store.followUpBlocker('u1',{note:'Need lead support',escalate:true});
  actor('admin@qa.local');
  await store.updateMember('lead-a@qa.local',{email:'updated-lead@qa.local'});
  actor('updated-lead@qa.local');
  const data=await store.loadWorkspace();
  assert.equal(data.dailyUpdates[0].escalatedTo,'updated-lead@qa.local');
  assert.equal(data.members.find(p=>p.id==='ha').managerEmail,'updated-lead@qa.local');
 });
 test('blocker follow-up and escalation enforce team scope in '+(mode?'AppDB':'local storage'),async()=>{
  const{store,actor}=await setup(mode);
  actor('head-a@qa.local');
  await assert.rejects(store.followUpBlocker('u2',{note:'Not my team'}),/outside your team/);
  await store.followUpBlocker('u1',{note:'Need lead support',escalate:true});
  actor('lead-a@qa.local');
  let data=await store.loadWorkspace();
  assert.equal(data.dailyUpdates.length,1);assert.equal(data.dailyUpdates[0].escalatedTo,'lead-a@qa.local');
  assert.equal(data.activity,undefined);
  await store.followUpBlocker('u1',{note:'Need admin support',escalate:true});
  assert.equal((await store.loadWorkspace()).dailyUpdates[0].escalatedTo,'admin@qa.local');
  actor('member-a@qa.local');
  await assert.rejects(store.followUpBlocker('u1',{note:'Forged manager note'}),/Only your head/);
  await store.saveDailyUpdate({memberEmail:'member-a@qa.local',date:localDate(),blockers:'Waiting for access',blockerStatus:'No blocker',followUp:'Forged',escalatedTo:'lead-b@qa.local'});
  data=await store.loadWorkspace();assert.equal(data.dailyUpdates[0].followUp,'Need admin support');assert.equal(data.dailyUpdates[0].blockerStatus,'Not solved');
  actor('lead-b@qa.local');await assert.rejects(store.followUpBlocker('u1',{note:'Wrong branch'}),/outside your team/);
  actor('admin@qa.local');await store.followUpBlocker('u1',{note:'Access granted',resolved:true});
  data=await store.loadWorkspace();assert.equal(data.dailyUpdates.find(u=>u.id==='u1').blockerStatus,'Solved');assert.equal(data.dailyUpdates.find(u=>u.id==='u1').escalatedTo,'');
 });
 test('bulk actions, activity records, and completion dates preserve permission boundaries in '+(mode?'AppDB':'local storage'),async()=>{
  const{store,actor,failAudit}=await setup(mode);
  let result=await store.bulkReassignTasks(['t1','missing','t1'],'member-b@qa.local');
  assert.equal(result.saved,1);assert.equal(result.failed,1);
  assert.equal((await store.loadWorkspace()).tasks[0].completedAt,'2026-09-01');
  result=await store.bulkReassignPeople(['member-a@qa.local','unknown@qa.local'],'head-b@qa.local');
  assert.equal(result.saved,1);assert.equal(result.failed,1);
  let data=await store.loadWorkspace();assert.equal(data.members.find(p=>p.id==='ma').managerEmail,'head-b@qa.local');assert.equal(data.activity.length,2);
  actor('head-a@qa.local');assert.equal((await store.loadWorkspace()).dailyUpdates.length,0);
  await assert.rejects(store.bulkReassignTasks(['t1'],'head-a@qa.local'),/Only administrators/);
  actor('member-b@qa.local');
  await assert.rejects(store.updateTask('t1',{memberEmail:'member-a@qa.local'}),/Only administrators/);
  await store.updateTask('t1',{status:'In progress'});assert.equal((await store.loadWorkspace()).tasks[0].completedAt,'');
  await store.updateTask('t1',{status:'Complete'});assert.equal((await store.loadWorkspace()).tasks[0].completedAt,localDate());
  actor('admin@qa.local');
  await assert.rejects(store.updateTask('t1',{status:'Invalid'}),/valid task status/);
  if(mode){failAudit();const saved=await store.updateMember('member-b@qa.local',{name:'Corrected Member'});assert.match(saved.warning,/activity history/);assert.equal((await store.loadWorkspace()).members.find(p=>p.id==='mb').name,'Corrected Member');}
 });
}
