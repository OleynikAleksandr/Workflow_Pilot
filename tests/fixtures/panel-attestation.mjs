// Test equivalent of a backend page that hosts the fixture's own panels: every
// bound protocol 9 panel frame of the participant is attested in its current
// document. Ownership tests that need foreign clients supply their own port.
export const attestBoundPanels=getCommunication=>async(target,{frame_instance_id=null}={})=>{
  const c=getCommunication();if(!c)return null;
  const sessionOf=panel=>Object.values(c.runs.get(panel.runId)?.members??{}).find(m=>m.id===panel.memberId)?.target?.local_session_id;
  return {browserSessionId:'fixture:'+target.local_session_id,incarnation:'fixture',stale:false,
    documentId:c.workflow.observe(target)?.documentId??null,
    frames:[...[...c.panels.values()].filter(p=>p.frameId&&sessionOf(p)===target.local_session_id).map(p=>p.frameId),
      ...(frame_instance_id?[frame_instance_id]:[])].map(id=>({frame_instance_id:id}))};
};
import {PluginCommunication} from '../../src/control/plugin/communication.mjs';
import {PluginProjects} from '../../src/control/plugin/service.mjs';
// The fixture page hosts the panels it binds; an explicit attest option replaces it.
export class AttestedCommunication extends PluginCommunication {
  constructor(options={}){super({attest:attestBoundPanels(()=>this),...options});}
}
export class AttestedProjects extends PluginProjects {
  constructor(options={}){super({attest:attestBoundPanels(()=>this.communication),...options});}
}
