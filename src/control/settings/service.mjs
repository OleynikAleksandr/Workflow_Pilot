import path from 'node:path';
import { normalizeChatColors, validateColorChange } from '../../contracts/chat-colors.mjs';
import { validateParallelSettings } from '../../contracts/parallel-settings.mjs';
import { queueProjectStatePurge } from '../projects/project-state-cleanup.mjs';

const workflowKeys = ['projectAutoPlan','reviewCheckpoint','automationCheckpoint','parallelExecutionBook'];
function preferences(value = {}) {
  return { chatgptChannel:['secure-tunnel','vps'].includes(value.chatgptChannel)?value.chatgptChannel:'secure-tunnel',
    shellTheme:value.shellTheme==='dark'?'dark':'light', hideToolCalls:typeof value.hideToolCalls==='boolean'?value.hideToolCalls:true,
    sidebarWidth:Number.isFinite(value.sidebarWidth)?Math.max(312,Math.round(value.sidebarWidth)):312,
    chatColors:normalizeChatColors(value.chatColors),
    projectsParent:typeof value.projectsParent==='string'&&path.isAbsolute(value.projectsParent)?value.projectsParent:null,
    parallelExecution:validateParallelSettings(value.parallelExecution),
  };
}

export class SettingsService {
  #values = preferences();
  #tail = Promise.resolve();
  #file; #files; #workflowSnapshot;
  constructor({file,files,workflowSnapshot}) { this.#file=file;this.#files=files;this.#workflowSnapshot=workflowSnapshot; }
  snapshot() { return structuredClone(this.#values); }
  get chatgptChannel() { return this.#values.chatgptChannel; }
  get shellTheme() { return this.#values.shellTheme; }
  get hideToolCalls() { return this.#values.hideToolCalls; }
  get sidebarWidth() { return this.#values.sidebarWidth; }
  get projectsParent() { return this.#values.projectsParent; }
  get chatColors() { return structuredClone(this.#values.chatColors); }
  get parallelExecution() { return structuredClone(this.#values.parallelExecution); }
  async load() {
    const value=await this.#files.readJson(this.#file);
    this.#values=preferences(value);
    return Object.fromEntries(workflowKeys.filter(key=>Object.hasOwn(value,key)).map(key=>[key,value[key]]));
  }
  save(overrides={}) { return this.#save(overrides, false); }
  setColor(input) {
    const {key,value}=validateColorChange(input);
    return this.#save({chatColors:{[key]:value}}, true);
  }
  #save(overrides, mergeColors) {
    const patch=structuredClone(overrides), workflow=this.#workflowSnapshot();
    const operation=this.#tail.catch(()=>{}).then(async()=>{
      const next=preferences({...this.#values,...patch,
        ...(mergeColors?{chatColors:{...this.#values.chatColors,...patch.chatColors}}:{})});
      const retained=Object.fromEntries(workflowKeys.filter(key=>Object.hasOwn(patch,key)).map(key=>[key,patch[key]]));
      await this.#files.writeJson(this.#file,{...next,...workflow,...retained});
      this.#values=next;
    });
    this.#tail=operation;return operation;
  }
  whenIdle() { return this.#tail; }
  purge(dataDir,identities) { this.#tail=queueProjectStatePurge(this.#tail,dataDir,identities);return this.#tail; }
}
