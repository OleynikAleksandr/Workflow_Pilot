const {app,Tray,Menu,nativeImage}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=process.argv[2];
if(!path.isAbsolute(root)||!path.basename(root).startsWith('wp-status-icon-'))process.exit(2);
app.setName('Workflow Pilot Status Fixture');app.setPath('userData',path.join(root,'profile'));app.setPath('sessionData',path.join(root,'browser'));
const deadline=setTimeout(()=>app.exit(2),15000);deadline.unref();
app.whenReady().then(async()=>{
  const {createStatusMenu}=await import(pathToFileURL(path.resolve(__dirname,'../../src/backend/status-menu.mjs')));
  const states=[],icon=createStatusMenu({Tray,Menu,nativeImage,onOpen(){},onStop(){},onCancelStop(){},onState:s=>states.push(s)});
  icon.update({service:{phase:'running',reasons:[]},pages:0});
  const initial=icon.view();icon.destroy();
  process.stdout.write(JSON.stringify({ok:initial.available,initial,disposed:icon.view(),states,electron:process.versions.electron})+'\n');
  clearTimeout(deadline);app.exit(initial.available?0:1);
}).catch(()=>app.exit(1));
