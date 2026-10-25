import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BrowserWindow} from 'electron';

// Real Chromium layout, isolated hidden window; no ChatGPT, SDK or model calls.
export async function verifyCurrentActionsLayout(dataDir){
  const window=new BrowserWindow({show:false,focusable:false,width:900,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});
  const screenshots=[];
  try{
    await window.loadFile(fileURLToPath(new URL('../../src/frontend/plugin/index.html',import.meta.url)));
    await window.webContents.executeJavaScript(`(async()=>{const {mountPanel}=await import(${JSON.stringify(new URL('../../src/frontend/plugin/panel.mjs',import.meta.url).href)});
      window.layoutPanel=mountPanel({document});})()`);
    for(const width of [320,480,900])for(const theme of ['light','dark'])for(const scale of [1,2]){
      window.setContentSize(width,1000);
      const proof=await window.webContents.executeJavaScript(`(()=>{
        document.documentElement.dataset.theme=${JSON.stringify(theme)};document.body.style.fontSize=${13}*${scale}+'px';window.scrollTo(0,0);
        const text='ждёт вашей проверки и запуска. Нажмите «Начать выполнение плана» слева. '+ 'ДлинныйИдентификатор'.repeat(15);
        const item={actor:'PLAN',name:'План',text,kind:'wait',key:'ready',elapsedMs:45000};
        layoutPanel.progress({primary:item,now:[item],history:[{id:'startup:m',at:null,name:'Приложение',text:'Контекст получен и подтверждён'}]});
        const row=document.querySelector('#progress-now .wp-row'),what=row.querySelector('.wp-what'),time=row.querySelector('.wp-time');
        const r=row.getBoundingClientRect(),w=what.getBoundingClientRect(),t=time.getBoundingClientRect();
        return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,rowRight:r.right,textRight:w.right,rowBottom:r.bottom,textBottom:w.bottom,
          overlap:!(w.right<=t.left||t.right<=w.left||w.bottom<=t.top||t.bottom<=w.top),text:what.textContent,
          wrap:getComputedStyle(what).whiteSpace,overflow:what.scrollWidth<=what.clientWidth+1,historyTime:document.querySelector('.wp-at').textContent};
      })()`);
      assert.equal(proof.viewport,width);assert.ok(proof.scroll<=width+1,JSON.stringify(proof));
      assert.ok(proof.textRight<=proof.rowRight&&proof.textBottom<=proof.rowBottom,JSON.stringify(proof));
      assert.equal(proof.overlap,false);assert.equal(proof.overflow,true);assert.equal(proof.wrap,'normal');
      assert.match(proof.text,/ДлинныйИдентификатор/);assert.equal(proof.historyTime,'');
      await window.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      const file=path.join(dataDir,`current-actions-${width}-${theme}-${scale*100}.png`);
      await fs.writeFile(file,(await window.webContents.capturePage()).toPNG());screenshots.push(file);
      await window.webContents.executeJavaScript(`(()=>{layoutPanel.choice({choice_id:'layout',generation:1,state:'offered',question:'Как выполнять план этой сессии?',
        reason:'Проверяем доступный выбор',options:[{id:'go',label:'Оркестрация с исполнителями',detail:'Длинная инструкция '.repeat(15),recommended:true}]});})()`);
      assert.equal(await window.webContents.executeJavaScript('document.documentElement.scrollWidth<=innerWidth+1'),true);
      await window.webContents.executeJavaScript('layoutPanel.choice(null)');
    }
    return {scenarios:12,screenshots};
  }finally{window.destroy();}
}
