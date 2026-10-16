// Monochrome template ring drawn in code; no image asset is shipped.
function templateIcon(nativeImage,size=18) {
  const pixels=Buffer.alloc(size*size*4),centre=(size-1)/2;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const distance=Math.hypot(x-centre,y-centre),ring=distance>=5.2&&distance<=7.8,dot=distance<=2.4;
    if(ring||dot)pixels.writeUInt32LE(0xff000000,(y*size+x)*4);
  }
  const image=nativeImage.createFromBitmap(pixels,{width:size,height:size});
  image.setTemplateImage?.(true);
  return image;
}

const label=service=>service.phase==='draining'?'Остановка: ждём безопасной точки'
  :service.phase==='stopping'?'Фоновая служба останавливается…':'Фоновая служба работает';

// The status icon lives with the backend, independently of any client window.
// Without a system tray (some Linux desktops) it is absent; the client menu
// offers the same status and stop.
export function createStatusMenu({Tray,Menu,nativeImage,onOpen,onStop,onCancelStop,onApprove=()=>{}}) {
  let tray;
  try{tray=new Tray(templateIcon(nativeImage));}catch{return null;}
  tray.setToolTip('Workflow Pilot');
  const update=({service,pages=0,pairings=[]})=>{
    const items=[{label:`${label(service)} · страниц: ${pages}`,enabled:false},
      ...service.reasons.slice(0,5).map(reason=>({label:reason.message,enabled:false})),
      ...(service.error?[{label:service.error.message,enabled:false}]:[]),
      // A remote device waits for confirmation: the code matches its screen.
      ...pairings.slice(0,3).map(item=>({label:`Подключить «${item.name}» · код ${item.code}`,click:()=>onApprove(item.id)})),
      {type:'separator'},
      {label:'Открыть Workflow Pilot',click:onOpen},
      service.phase==='draining'?{label:'Отменить остановку',click:onCancelStop}
        :{label:'Остановить фоновую службу…',enabled:service.phase==='running',click:onStop}];
    tray.setToolTip('Workflow Pilot — '+label(service).toLowerCase());
    tray.setContextMenu(Menu.buildFromTemplate(items));
    return items;
  };
  return Object.freeze({update,destroy(){if(!tray.isDestroyed?.())tray.destroy();}});
}
