import { COMMUNICATION_BUILD, COMMUNICATION_PROTOCOL } from '../../contracts/backend.mjs';

// A mounted Workflow Pilot panel publishes one immutable value about itself
// inside its own frame. The backend reads only that value, only in subframes
// of its own page, and never reads or changes the ChatGPT document.
export const PANEL_ATTESTATION_SCRIPT = `(() => { try {
  const value = globalThis.__workflowPilotPanel;
  return value && typeof value === 'object' ? { frame_instance_id: value.frame_instance_id,
    build_id: value.build_id, protocol_version: value.protocol_version } : null;
} catch { return null; } })()`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validPanelAttestation(value, { build = COMMUNICATION_BUILD, protocol = COMMUNICATION_PROTOCOL } = {}) {
  return !!value && typeof value === 'object' && typeof value.frame_instance_id === 'string' && UUID.test(value.frame_instance_id)
    && value.build_id === build && value.protocol_version === protocol;
}

const alive = frame => { try { return !!frame && !frame.detached && !frame.isDestroyed?.(); } catch { return false; } };
const sameFrame = (a, b) => a === b || a?.processId === b?.processId && a?.routingId === b?.routingId;
const originOf = frame => { try { return frame.origin || new URL(frame.url).origin; } catch { return ''; } };

// Lists the attested panel frames of one webContents. A frame that does not
// answer within timeoutMs, has no value or another build is not counted.
export async function attestPanelFrames(contents, { timeoutMs = 1000, build, protocol } = {}) {
  if (!contents || contents.isDestroyed?.()) return [];
  let main, frames;
  try { main = contents.mainFrame; frames = main?.framesInSubtree ?? []; } catch { return []; }
  const mainOrigin = originOf(main);
  const candidates = frames.filter(frame => alive(frame) && !sameFrame(frame, main) && originOf(frame) !== mainOrigin);
  const read = async frame => {
    let timer;
    try {
      const value = await Promise.race([frame.executeJavaScript(PANEL_ATTESTATION_SCRIPT),
        new Promise(resolve => { timer = setTimeout(() => resolve(null), timeoutMs); timer.unref?.(); })]);
      return alive(frame) && validPanelAttestation(value, { build, protocol }) ? value.frame_instance_id.toLowerCase() : null;
    } catch { return null; } finally { clearTimeout(timer); }
  };
  const found = await Promise.all(candidates.map(read));
  return [...new Set(found.filter(Boolean))].map(frame_instance_id => ({ frame_instance_id }));
}
