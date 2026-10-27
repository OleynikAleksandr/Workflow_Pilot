import {eventCount} from '../../../contracts/work-progress.mjs';

export const progressClock=ms=>{if(ms==null)return '';const seconds=Math.max(0,Math.floor(ms/1000));return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');};
export const currentActionsCss=`
.wp-now{display:grid;gap:6px;min-width:0}
.wp-row{display:grid;grid-template-columns:14px minmax(0,1fr) auto;gap:8px;align-items:start;padding:9px 10px;border-radius:8px;background:var(--wp-card);border:1px solid var(--wp-line)}
.wp-row.me{border-color:var(--wp-selected-line);background:var(--wp-selected)}
.wp-row.secondary{font-size:.92em;background:transparent;padding:6px 10px}
.wp-what{min-width:0;white-space:normal;overflow-wrap:anywhere;line-height:1.5}.wp-what b{font-weight:600}
.wp-reason{display:block;margin-top:4px;color:var(--wp-muted)}
.wp-row.wait .wp-what{color:var(--wp-muted)}.wp-row.wait .wp-what b{color:var(--wp-fg)}
.wp-row.warn{border-color:var(--wp-choice);background:var(--wp-choice-soft)}
.wp-row.warn .wp-what,.wp-mark.warn{color:var(--wp-warn)}
.wp-flow{color:var(--wp-accent);font-weight:500}
.wp-mark{width:12px;text-align:center;color:var(--wp-dim)}.wp-mark.ok{color:var(--wp-ok)}
.wp-time{font:.88em/1.5 ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums;color:var(--wp-muted)}
.wp-next{display:block;margin-top:6px;font:inherit;white-space:normal;overflow-wrap:anywhere;cursor:pointer}
.wp-hist{border-radius:8px;background:var(--wp-card);border:1px solid var(--wp-line)}
.wp-hist>summary{list-style:none;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 10px;cursor:pointer;color:var(--wp-muted)}
.wp-count{margin-left:auto;border:1px solid var(--wp-line);border-radius:10px;padding:0 6px}
.wp-events{list-style:none;margin:0;border-top:1px solid var(--wp-line);padding:6px 10px;display:grid;gap:4px;max-height:260px;overflow-y:auto}
.wp-events li{display:grid;grid-template-columns:3em 14px minmax(0,1fr);gap:6px;align-items:start;font-size:.92em;color:var(--wp-muted)}
.wp-events .wp-at{font:inherit;color:var(--wp-dim)}
.wp-announcement{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@media(max-width:480px){.wp-row{grid-template-columns:14px minmax(0,1fr)}.wp-time{grid-column:2}.wp-time:empty{display:none}}
`;

// Both the MCP panel and the explicit client area draw this backend projection.
// Only semantic changes replace rows; ticks never replace focused controls or live announcements.
export function mountCurrentActions({document,now,events,count,announce,onAction=null}){
  const view=document.defaultView,make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el;};
  let signature='',historySignature='',timer=null,clockAt=0,current=[];
  const what=item=>{
    const node=make('span','wp-what');
    if(item.name)node.append(make('b',null,item.name),' ');
    if(/^[←→]/.test(item.text)){const [head,...rest]=item.text.split(' · ');node.append(make('span','wp-flow',head),rest.length?' · '+rest.join(' · '):'');}
    else node.append(item.text);
    if(item.reason)node.append(make('span','wp-reason',item.reason));
    if(item.action){const button=make(onAction?'button':'span','wp-next',onAction?item.action.label??'Открыть действие':'Откройте нужную сессию в приложении слева');
      if(onAction){button.type='button';button.addEventListener('click',()=>onAction(item.action));}node.append(button);}
    return node;
  };
  const paint=()=>{[...now.querySelectorAll('.wp-time')].forEach((el,i)=>{
    const item=current[i];el.textContent=progressClock(item?.elapsedMs==null?null:item.elapsedMs+view.performance.now()-clockAt);
  });};
  view.addEventListener('pagehide',()=>view.clearInterval(timer));
  return {render(value,{choice=null}={}){
    const primary=value?.primary??value?.now?.[0]??null;
    const covered=primary?.choiceId&&primary.choiceId===choice?.choice_id;
    const choosing=choice?.state==='offered';
    const others=(value?.now??[]).filter(item=>!((covered||primary?.kind==='warn')&&item.kind==='warn')&&item!==primary&&(!item.key||item.key!==primary?.key)
      &&item.actor!==primary?.actor&&['act','warn'].includes(item.kind)&&(!item.choiceId||item.choiceId!==choice?.choice_id));
    current=[...(!covered&&primary&&!(choosing&&primary.kind==='warn')?[primary]:[]),...others.filter(i=>!choosing||i.kind!=='warn')];clockAt=view.performance.now();
    const semantic=JSON.stringify([current.map(({elapsedMs,...item})=>item),!!choice,!!value?.closed]);
    if(semantic!==signature){signature=semantic;
      const rows=current.map((item,index)=>{const row=make('div','wp-row'+(item.kind==='act'?'':' '+item.kind)
        +(index||covered?' secondary':'')+(value?.self===item.actor?' me':''));
        const icon=make('span',item.kind==='act'?'wp-spin':'wp-mark'+(item.kind==='warn'?' warn':''),item.kind==='act'?'':item.kind==='warn'?'!':'·');
        icon.setAttribute('aria-hidden','true');row.append(icon,what(item),make('span','wp-time'));return row;});
      if(!rows.length&&!choice){const row=make('div','wp-row wait');row.append(make('span','wp-mark','·'),what({text:value?.closed?'План закрыт, активных действий нет':'Сейчас ничего не выполняется'}));rows.push(row);}
      now.replaceChildren(...rows);
    }
    if(announce){const text=choice?choice.state==='offered'?choice.question:choice.state==='saving'?'Сохраняем ваш выбор':choice.state==='chosen'?'Ваш выбор сохранён':'Выбор отложен'
      :primary?[primary.name,primary.text,primary.reason].filter(Boolean).join(' '):'';
      if(announce.textContent!==text)announce.textContent=text;}
    const history=value?.history??[],key=JSON.stringify(history);
    if(key!==historySignature){historySignature=key;count.textContent=eventCount(history.length);
      events.replaceChildren(...history.map(item=>{const li=make('li',value?.self===item.actor?'me':''),at=make('span','wp-at',item.at==null?'':new Date(item.at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}));
        li.dataset.eventId=item.id??'';li.append(at,make('span','wp-mark '+(item.kind==='warn'?'warn':'ok'),item.kind==='warn'?'!':'✓'),what(item));return li;}));}
    paint();view.clearInterval(timer);timer=view.setInterval(paint,1000);
  },dispose(){view.clearInterval(timer);timer=null;}};
}
