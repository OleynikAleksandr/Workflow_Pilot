import { COMMUNICATION_BUILD, COMMUNICATION_PROTOCOL } from '../../contracts/backend.mjs';

// A mounted Workflow Pilot panel publishes one immutable value about itself
// inside its own frame. The backend reads only that value, only in subframes
// of its own page, and never reads or changes the ChatGPT document.
export const PANEL_ATTESTATION_SCRIPT = `(() => { try {
  const value = globalThis.__workflowPilotPanel;
  return value && typeof value === 'object' ? { frame_instance_id: value.frame_instance_id,
    build_id: value.build_id, protocol_version: value.protocol_version } : document.readyState === 'complete' ? 'no-panel' : null;
} catch { return null; } })()`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validPanelAttestation(value, { build = COMMUNICATION_BUILD, protocol = COMMUNICATION_PROTOCOL } = {}) {
  return !!value && typeof value === 'object' && typeof value.frame_instance_id === 'string' && UUID.test(value.frame_instance_id)
    && value.build_id === build && value.protocol_version === protocol;
}

const sameFrame = (a, b) => a === b || a?.processId === b?.processId && a?.routingId === b?.routingId;
const originOf = frame => frame.origin || new URL(frame.url).origin;

// Lists the attested panel frames of one webContents. A frame that does not
// answer within timeoutMs, has no value or another build is not counted.
export async function inspectPanelFrames(contents, { timeoutMs = 1000, build, protocol } = {}) {
  const unknown = {presence:'unknown',frames:[]};
  const candidates = () => {
    const main = contents.mainFrame, tree = main.framesInSubtree;
    if (!Array.isArray(tree) || !tree.some(frame => sameFrame(frame,main))) throw Error('Frame tree unavailable');
    return tree.filter(frame => !sameFrame(frame, main) && !frame.detached && !frame.isDestroyed?.() && originOf(frame) !== originOf(main));
  };
  const read = async frame => {
    let timer;
    try {
      const value = await Promise.race([frame.executeJavaScript(PANEL_ATTESTATION_SCRIPT),
        new Promise(resolve => { timer = setTimeout(() => resolve(null), timeoutMs); timer.unref?.(); })]);
      if (frame.detached || frame.isDestroyed?.()) return null;
      return validPanelAttestation(value, { build, protocol }) ? value.frame_instance_id.toLowerCase() : value === 'no-panel' ? value : null;
    } catch { return null; } finally { clearTimeout(timer); }
  };
  try {
    if (!contents || contents.isDestroyed?.()) return unknown;
    const before=candidates(), found=await Promise.all(before.map(read)), after=candidates();
    if (before.length!==after.length || !before.every((f,i)=>sameFrame(f,after[i]))) return unknown;
    const frames=[...new Set(found.filter(id=>id && id!=='no-panel'))].map(frame_instance_id=>({frame_instance_id}));
    return {frames,presence:frames.length?'present':found.includes(null)?'unknown':'absent'};
  } catch { return unknown; }
}

export async function attestPanelFrames(contents, options) {
  return (await inspectPanelFrames(contents,options)).frames;
}
