// Monochrome template ring drawn in code; no image asset is shipped.
function templateIcon(nativeImage,size=18) {
  const pixels=Buffer.alloc(size*size*4),centre=(size-1)/2;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const distance=Math.hypot(x-centre,y-centre),ring=distance>=5.2&&distance<=7.8,dot=distance<=2.4;
    if(ring||dot)pixels.writeUInt32LE(0xff000000,(y*size+x)*4);
  }
  const image=nativeImage.createFromBitmap(pixels,{width:size,height:size});
  if(image.isEmpty?.())throw new Error('EMPTY_STATUS_ICON');
  image.setTemplateImage?.(true);
  return image;
}
const label=service=>service.phase==='draining'?'Остановка: ждём безопасной точки'
  :service.phase==='stopping'?'Фоновая служба останавливается…':'Фоновая служба работает';

// The backend owns both the icon and bounded recovery. A missing system tray
// never stops the service; the client menu retains status and stop actions.
export function createStatusMenu({Tray,Menu,nativeImage,onOpen,onStop,onCancelStop,onForceStop=null,onApprove=()=>{},onOpenHttp=null,
  onState=()=>{},schedule=setTimeout,cancel=clearTimeout,retryDelays=[1000,5000]}) {
  let tray=null,timer=null,disposed=false,last=null,attempts=0,phase='starting',errorCode=null;
  const view=()=>({available:!!tray&&!disposed,attempts,phase,errorCode});
  const report=()=>{try{onState(view());}catch{/* reporting never changes service availability */}};
  const destroyTray=value=>{try{if(value&&!value.isDestroyed?.())value.destroy();}catch{/* release is best effort */}};
  const itemsFor=({service,pages=0,pairings=[]})=>[
    {label:`${label(service)} · страниц: ${pages}`,enabled:false},
    ...service.reasons.slice(0,5).map(reason=>({label:reason.message,enabled:false})),
    ...(service.error?[{label:service.error.message,enabled:false}]:[]),
    ...pairings.slice(0,3).map(item=>({label:`Подключить «${item.name}» · код ${item.code}`,click:()=>onApprove(item.id)})),
    {type:'separator'},
    {label:'Открыть Workflow Pilot',click:onOpen},
    ...(onOpenHttp?[{label:'Окно через HTTP (тест)',click:onOpenHttp}]:[]),
    service.phase==='draining'?{label:'Отменить остановку',click:onCancelStop}
      :{label:'Остановить фоновую службу…',enabled:service.phase==='running',click:onStop},
    ...(onForceStop?[{label:'Принудительно остановить службу…',click:onForceStop}]:[])];
  const apply=(value,state)=>{
    value.setToolTip('Workflow Pilot — '+label(state.service).toLowerCase());
    value.setContextMenu(Menu.buildFromTemplate(itemsFor(state)));
  };
  const recover=code=>{
    destroyTray(tray);tray=null;phase='unavailable';errorCode=code;report();
    if(!disposed&&timer===null&&attempts<=retryDelays.length){
      timer=schedule(()=>{timer=null;create();},retryDelays[attempts-1]);timer?.unref?.();
    }
  };
  const create=()=>{
    if(disposed||tray)return;
    attempts++;let created=null,stage='TRAY_IMAGE_FAILED';
    try{
      const icon=templateIcon(nativeImage);stage='TRAY_CREATE_FAILED';created=new Tray(icon);
      if(created.isDestroyed?.())throw new Error('STATUS_ICON_DESTROYED');
      stage='TRAY_MENU_FAILED';created.setToolTip('Workflow Pilot');
      if(last)apply(created,last);
      tray=created;phase='available';errorCode=null;report();
    }catch{
      destroyTray(created);recover(stage);
    }
  };
  const update=state=>{
    if(disposed)return [];
    last=state;const items=itemsFor(state);
    if(tray)try{apply(tray,state);}catch{recover('TRAY_MENU_FAILED');}
    return items;
  };
  const api=Object.freeze({update,view,destroy(){
    if(disposed)return;
    disposed=true;if(timer!==null)cancel(timer);timer=null;
    destroyTray(tray);tray=null;phase='disposed';report();
  }});
  create();return api;
}
