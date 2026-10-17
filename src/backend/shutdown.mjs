// Explicit stop: draining -> safe point -> own services stop -> confirmed exit.
// There is no timeout and no kill: while anything runs the stop waits, shows
// why, and can be cancelled.
// What still holds a stop. An answer, a send and a Kit command are waited for;
// context preparation that has not started sending changes nothing in ChatGPT,
// so a stuck preparation never holds the service forever.
export function drainReasons({sessions=[],states=[]}) {
  const reasons=[];
  for(const {name,busy,sending,preparing} of sessions) {
    if(busy)reasons.push({code:'ANSWER_RUNNING',message:`Ждём завершения ответа ChatGPT: ${name}.`});
    else if(sending||preparing==='sending')reasons.push({code:'SEND_RUNNING',message:`Ждём завершения отправки: ${name}.`});
  }
  for(const state of states)
    if((state.commands??[]).some(command=>command.state&&command.state!=='completed'))
      reasons.push({code:'COMMAND_RUNNING',message:`Ждём завершения команды Kit: ${state.name}.`});
  return reasons;
}

export function createStopController({drainState,pause,stop,onChange=()=>{},intervalMs=1000,now=Date.now}) {
  let phase='running',reasons=[],since=null,timer=null,error=null;
  const view=()=>structuredClone({phase,reasons,since,error});
  const changed=()=>{try{onChange(view());}catch{ /* a status listener never blocks stopping */ }};
  async function check() {
    timer=null;
    if(phase!=='draining')return;
    reasons=drainState();
    if(reasons.length){changed();timer=setTimeout(check,intervalMs);timer.unref?.();return;}
    phase='stopping';reasons=[];changed();
    try{await stop();}
    catch(failure){phase='draining';error={code:failure?.code??'BACKEND_STOP_FAILED',message:'Остановка не подтверждена. Повторите позже.'};changed();
      timer=setTimeout(check,intervalMs);timer.unref?.();}
  }
  return Object.freeze({
    view,
    request() {
      if(phase!=='running')return view();
      phase='draining';since=now();error=null;pause(true);changed();void check();
      return view();
    },
    cancel() {
      if(phase!=='draining')return view();
      clearTimeout(timer);timer=null;phase='running';since=null;reasons=[];error=null;pause(false);changed();
      return view();
    },
    dispose(){clearTimeout(timer);timer=null;},
  });
}
