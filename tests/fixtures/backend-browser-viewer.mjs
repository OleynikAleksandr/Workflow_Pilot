// Separate Electron frontend process; displays actual backend PNG in a hidden fixture window.
// It does not access the backend's WebContents, cookie partition or OS clipboard.
import {app,BrowserWindow,ipcMain,clipboard,dialog,screen} from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'wp-viewer-'));
app.setPath('userData',temporary);
app.setPath('sessionData',path.join(temporary,'browser'));
const [port,token,x,y]=process.argv.slice(2);
const report=value=>process.stdout.write(JSON.stringify(value)+'\n');
const url=`http://127.0.0.1:${port}`;
const api=async payload=>{
  const response=await fetch(url+'/fixture',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(payload)});
  const result=await response.json();if(!response.ok||result.error)throw Error(JSON.stringify(result));return result;
};
async function run() {
  await app.whenReady();
  const manual=process.argv.includes('--show');
  const viewer=new BrowserWindow({show:manual,width:900,height:880,webPreferences:{
    preload:path.join(import.meta.dirname,'backend-browser-viewer-preload.cjs'),sandbox:true,nodeIntegration:false,contextIsolation:true}});
  const checked=event=>{if(event.sender!==viewer.webContents)throw Error('INVALID_VIEWER');};
  ipcMain.handle('fixture-frame',async event=>{
    checked(event);
    const response=await fetch(url+'/frame',{method:'POST',headers:{authorization:`Bearer ${token}`}});
    if(!response.ok)throw Error('FRAME_DENIED_'+response.status);
    const logicalWidth=Number(response.headers.get('x-logical-width'));
    const logicalHeight=Number(response.headers.get('x-logical-height'));
    const rasterScale=Number(response.headers.get('x-raster-scale'));
    if(!logicalWidth||!logicalHeight||!rasterScale)throw Error('Тестовый backend старой версии. Остановите его и запустите повторно.');
    return {png:Buffer.from(await response.arrayBuffer()).toString('base64'),logicalWidth,logicalHeight,rasterScale,
      clientScale:screen.getDisplayMatching(viewer.getBounds()).scaleFactor};
  });
  ipcMain.handle('fixture-click',(event,coordinates)=>{checked(event);return api({op:'clickAt',...coordinates});});
  ipcMain.handle('fixture-insert',(event,text)=>{checked(event);if(typeof text!=='string'||text.length>2000)throw Error('INVALID_TEXT');return api({op:'input',text});});
  ipcMain.handle('fixture-copy',async event=>{checked(event);clipboard.writeText((await api({op:'state'})).state.draft);return {ok:true};});
  ipcMain.handle('fixture-paste',async event=>{checked(event);const text=clipboard.readText();if(text.length>2000)throw Error('TEXT_TOO_LONG');return api({op:'input',text});});
  ipcMain.handle('fixture-upload',(event,{name,text})=>{checked(event);return api({op:'upload',name,text});});
  ipcMain.handle('fixture-download',async event=>{
    checked(event);const {canceled,filePath}=await dialog.showSaveDialog(viewer,{defaultPath:'fixture-result.txt',filters:[{name:'Text',extensions:['txt']} ]});
    if(canceled||!filePath)return {canceled:true};
    const result=await api({op:'download'});fs.writeFileSync(filePath,result.text,{flag:'w'});return {ok:true};
  });
  try {
    viewer.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    viewer.webContents.on('will-navigate',event=>event.preventDefault());
    await viewer.loadFile(path.join(import.meta.dirname,'backend-browser-viewer.html'));
    const decoded=await viewer.webContents.executeJavaScript('window.fixtureReady');
    if(x!==undefined&&y!==undefined)await viewer.webContents.executeJavaScript(`window.fixtureSyntheticClick(${Number(x)},${Number(y)})`);
    const composited=(await viewer.webContents.capturePage()).toPNG();
    const state=await api({op:'state'});
    const display=screen.getDisplayMatching(viewer.getBounds());
    report({decoded,compositedBytes:composited.length,visible:viewer.isVisible(),state:state.state,
      clientScale:display.scaleFactor,rasterScale:state.rasterScale});
    if(manual)await new Promise(resolve=>viewer.once('closed',resolve));
  } finally {if(!viewer.isDestroyed())viewer.destroy();for(const action of ['frame','click','insert','copy','paste','upload','download'])ipcMain.removeHandler('fixture-'+action);}
}
void run().catch(error=>{report({fatal:error.message});process.exitCode=1;}).finally(()=>{app.quit();fs.rmSync(temporary,{recursive:true,force:true});});
