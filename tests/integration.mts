import EmbeddedPostgres from 'embedded-postgres';
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { chromium, type Page, type Download } from '@playwright/test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
const directory = await mkdtemp(join(tmpdir(), 'rankings-test-'));
const pg = new EmbeddedPostgres({databaseDir: join(directory,'db'),user:'postgres',password:'test-only',port:55439,persistent:false,onLog:()=>{},onError:()=>{}});
let app: ReturnType<typeof spawn> | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const secret = 'isolated-test-secret-at-least-32-characters';
const base = 'http://127.0.0.1:3181';
try {
 await pg.initialise(); await pg.start();
 const client = pg.getPgClient(); await client.connect();
 await migrate(drizzle(client),{migrationsFolder:'database/migrations'});
 await client.query("INSERT INTO users(username,password_hash,display_name) VALUES('test','unused','Test')");
 await client.query("INSERT INTO sessions(user_id,token,expires_at) VALUES(1,'test-session',NOW()+INTERVAL '20 minutes')");
 await client.query("INSERT INTO rankings(name,is_default) VALUES('Test ranking',true)");
 const token = await new SignJWT({userId:1,username:'test',displayName:'Test'}).setJti('test-session').setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('20m').sign(new TextEncoder().encode(secret));
 app=spawn('node',['node_modules/next/dist/bin/next','start','-p','3181'],{env:{...process.env,NODE_ENV:'production',CRON_SECRET:'isolated-cron',TRASH_CLEANUP_ENABLED:'true',VERCEL_ENV:'production',DATABASE_URL:'postgresql://postgres:test-only@127.0.0.1:55439/postgres?sslmode=disable',POSTGRES_URL:'postgresql://postgres:test-only@127.0.0.1:55439/postgres?sslmode=disable',JWT_SECRET:secret,NEXTAUTH_SECRET:secret,TURNSTILE_SECRET_KEY:'1x0000000000000000000000000000000AA',NEXT_PUBLIC_TURNSTILE_SITE_KEY:'1x00000000000000000000AA'},stdio:'ignore'});
 let ready=false;
 for(let i=0;i<120;i++){try { if((await fetch(base+'/api/rankings',{signal:AbortSignal.timeout(2000)})).ok){ready=true;break;} }catch{} await new Promise(r=>setTimeout(r,500));}
 assert.ok(ready,'isolated application starts');
 const request=async(path:string,body?:unknown,cookie=token)=>fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:cookie?`session_token=${cookie}`:''},body:body?JSON.stringify(body):undefined});
 assert.equal((await request('/api/ranking/general?page=abc')).status,400);
 assert.equal((await request('/api/ranking/stages',{name:'Denied',rankingId:1},'')).status,401);
 const created=await request('/api/ranking/stages',{name:'Stage',rankingId:1,players:[{position:1,name:'Mario Rossi',points_awarded:12,t1:6,presenze:1}]});
 assert.equal(created.status,200); const stage=await created.json();
 const results=await Promise.all([request('/api/ranking/merge',{stageId:stage.id}),request('/api/ranking/merge',{stageId:stage.id})]);
 assert.equal(results.filter(r=>r.ok).length,1);
 const totals=await client.query('SELECT total_points FROM general_ranking'); assert.equal(totals.rows[0].total_points,12);
 await client.query('UPDATE stages SET deleted_at=NOW()');
 assert.deepEqual(await (await request('/api/ranking/stages?rankingId=1')).json(),[]);
 await client.query("INSERT INTO rankings(name) VALUES('Restore test')");
 await client.query("INSERT INTO stages(name,ranking_id,status,deleted_at) VALUES('Old deletion',2,'active',NOW()),('Cascade deletion',2,'active',NULL)");
 assert.equal((await fetch(base+'/api/rankings/2',{method:'DELETE',headers:{Cookie:`session_token=${token}`}})).status,200);
 assert.equal((await request('/api/ranking/trash',{action:'restoreRanking',rankingId:2})).status,200);
 const restored=await client.query('SELECT name,deleted_at FROM stages WHERE ranking_id=2 ORDER BY id');
 assert.ok(restored.rows[0].deleted_at);assert.equal(restored.rows[1].deleted_at,null);
 // Trash regressions use only the isolated database.
 assert.equal((await request('/api/ranking/trash',{action:'restoreStage',stageId:1.5})).status,400);
 assert.equal((await request('/api/ranking/trash',{action:'restoreStage',stageId:999999})).status,404);
 assert.equal((await request('/api/ranking/trash',{action:'deletePermanentlyRanking',rankingId:1})).status,409);
 const trashCount=await (await request('/api/ranking/trash/count')).json();
 assert.equal(typeof trashCount.count,'number');
 assert.equal(trashCount.count,trashCount.rankings+trashCount.generalEntries+trashCount.stages);
 await client.query("INSERT INTO rankings(name) VALUES('Repeated deletion')");
 await client.query("INSERT INTO stages(name,ranking_id) VALUES('Repeated child',3)");
 for(let i=0;i<2;i++) assert.equal((await fetch(base+'/api/rankings/3',{method:'DELETE',headers:{Cookie:`session_token=${token}`}})).status,200);
 const repeatedGroup=await client.query('SELECT deletion_group,trash_expires_at FROM rankings WHERE id=3');assert.ok(repeatedGroup.rows[0].trash_expires_at);
 assert.equal((await request('/api/ranking/trash',{action:'restoreStage',stageId:4})).status,409);
 assert.equal((await request('/api/ranking/trash',{action:'restoreRanking',rankingId:3})).status,200);
 assert.equal((await client.query('SELECT deleted_at FROM stages WHERE ranking_id=3')).rows[0].deleted_at,null);
 await client.query("INSERT INTO stages(name,ranking_id,deleted_at,trash_expires_at) VALUES('Expired',1,NOW()-INTERVAL '6 days',NOW()-INTERVAL '1 day')");
 const expired=(await client.query("SELECT id FROM stages WHERE name='Expired'")).rows[0].id;
 assert.equal((await request('/api/ranking/trash',{action:'restoreStage',stageId:expired})).status,409);
 assert.equal((await fetch(base+'/api/cron/trash')).status,401);
 const cronHeaders={Authorization:'Bearer isolated-cron'};
 assert.equal((await fetch(base+'/api/cron/trash?dryRun=true',{headers:cronHeaders})).status,200);
 assert.equal((await client.query('SELECT id FROM stages WHERE id=$1',[expired])).rowCount,1);
 assert.equal((await fetch(base+'/api/cron/trash',{headers:cronHeaders})).status,200);
 assert.equal((await client.query('SELECT id FROM stages WHERE id=$1',[expired])).rowCount,0);
 assert.equal((await fetch(base+'/api/cron/trash',{headers:cronHeaders})).status,200);
 assert.equal((await client.query('SELECT id FROM rankings WHERE id=1')).rowCount,1);

 const trash=await (await request('/api/ranking/trash?limit=1')).json();assert.ok(trash.stages.length<=1);assert.ok(trash.pagination.stages.totalPages>=1);
 await mkdir('/tmp/local-rankings-screenshots',{recursive:true});
 browser=await chromium.launch({headless:!process.env.DISPLAY});
 for(const width of [390,1440]){
  const page: Page=await browser.newPage({viewport:{width,height:900}});const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')console.log('browser:',m.text().slice(0,300))}); page.on('response',r=>{if(r.status()>=400 || r.url().includes('/api/rankings'))console.log('HTTP',r.status(),new URL(r.url()).pathname)}); page.on('requestfailed',r=>console.log('requestfailed',new URL(r.url()).pathname,r.failure()?.errorText));
  await page.goto(base+'/dashboard');await page.getByRole('heading',{name:'Classifica Generale',exact:true}).waitFor();
  await page.screenshot({path:`/tmp/local-rankings-screenshots/debug-${width}.png`,fullPage:true});
  try { await page.getByText('Mario Rossi',{exact:true}).waitFor({timeout:45000}); } catch(error) { console.log((await page.locator('body').innerText()).slice(0,2500),errors); throw error; }
  await page.screenshot({path:`/tmp/local-rankings-screenshots/dashboard-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);
  if(width === 1440) {
    await page.getByRole('button',{name:'Accetto',exact:true}).click();
    const downloading: Promise<Download>=page.waitForEvent('download');
    await page.getByRole('button',{name:'PDF',exact:true}).click();
    const download: Download=await downloading;
    assert.equal((await readFile((await download.path())!)).subarray(0,5).toString(),'%PDF-');
  }
  await page.close();
 }
 // Browser regressions for trash interaction, network errors and layout.
 const trashContext=await browser.newContext();
 await trashContext.addCookies([{name:'session_token',value:token,url:base}]);
 const trashPage=await trashContext.newPage();const trashErrors:string[]=[];
 trashPage.on('pageerror',e=>trashErrors.push(e.message));
 await trashPage.goto(base+'/dashboard/trash');
 await trashPage.getByText('Old deletion',{exact:true}).waitFor();
 assert.equal(await trashPage.locator('a[href="/dashboard/trash"]').count()>0,true);
 for(const width of [320,390,768,1440]) {
  await trashPage.setViewportSize({width,height:900});
  assert.ok(await trashPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 const oldRow=trashPage.getByText('Old deletion',{exact:true}).locator('../../..');
 await oldRow.getByRole('button',{name:'Ripristina',exact:true}).click();
 await trashPage.getByRole('button',{name:'Annulla',exact:true}).click();
 assert.ok((await client.query('SELECT deleted_at FROM stages WHERE id=2')).rows[0].deleted_at);
 await trashPage.route('**/api/ranking/trash*',async route=>route.request().method()==='POST'?route.abort('failed'):route.continue());
 await oldRow.getByRole('button',{name:'Ripristina',exact:true}).click();
 await trashPage.getByRole('button',{name:'Sì, ripristina',exact:true}).click();
 await trashPage.getByText('Connessione interrotta. Aggiorna il cestino prima di riprovare.',{exact:true}).waitFor();
 assert.deepEqual(trashErrors,[]);
 await trashPage.unroute('**/api/ranking/trash*');
 await trashPage.getByRole('dialog').getByRole('button',{name:'Annulla',exact:true}).click();
 await oldRow.getByRole('button',{name:'Ripristina',exact:true}).click();
 await trashPage.getByRole('button',{name:'Sì, ripristina',exact:true}).click();
 await trashPage.getByRole('dialog').waitFor({state:'hidden'});
 assert.equal((await client.query('SELECT deleted_at FROM stages WHERE id=2')).rows[0].deleted_at,null);
 await trashContext.close();
 assert.equal((await request('/api/auth/logout',{})).status,200);
 assert.equal((await request('/api/ranking/stages',{name:'Revoked',rankingId:1})).status,401);
 console.log('PASS: migrations, validation, authorization, concurrent merge, trash filter, logout revocation, desktop/mobile rendering');
 await client.end();
} finally {
 await browser?.close();
 if(app && app.exitCode === null){app.kill('SIGTERM');await new Promise<void>(resolve=>app!.once('exit',()=>resolve()));}
 await pg.stop();await rm(directory,{recursive:true,force:true});
}
