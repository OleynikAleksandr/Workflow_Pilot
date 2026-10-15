import {protocolError,wireCopy} from './backend.mjs';

const id = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(value);
const uint = value => Number.isSafeInteger(value) && value >= 0;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const fail = () => { throw protocolError('BROWSER_PRESENTATION_INVALID', 'Недопустимое событие браузера.'); };
const assert = condition => { if(!condition)fail(); };

export function validateBrowserInput(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input)
    && Object.keys(input).every(key=>['browserSessionId','documentGeneration','sequence','leaseGeneration','type','data'].includes(key))
    && id(input.browserSessionId) && uint(input.documentGeneration) && uint(input.sequence)
    && uint(input.leaseGeneration)
    && ['pointer','wheel','key','text','composition'].includes(input.type)
    && input.data && typeof input.data === 'object' && !Array.isArray(input.data));
  const data=input.data;
  if(input.type==='pointer') {
    assert(Object.keys(data).every(key=>['action','x','y','button','clickCount'].includes(key))
      && ['move','down','up','leave'].includes(data.action) && finite(data.x) && finite(data.y)
      && (data.button===undefined || ['none','left','right','middle'].includes(data.button))
      && (data.clickCount===undefined || Number.isSafeInteger(data.clickCount) && data.clickCount>=0 && data.clickCount<=3));
  } else if(input.type==='wheel') {
    assert(Object.keys(data).every(key=>['x','y','deltaX','deltaY'].includes(key))
      && ['x','y','deltaX','deltaY'].every(key=>finite(data[key])));
  } else if(input.type==='key') {
    assert(Object.keys(data).every(key=>['action','key','code','modifiers'].includes(key))
      && ['down','up'].includes(data.action) && typeof data.key==='string' && data.key.length>0 && data.key.length<=40
      && (data.code===undefined || typeof data.code==='string' && data.code.length<=40)
      && (data.modifiers===undefined || Array.isArray(data.modifiers) && data.modifiers.length<=4
        && data.modifiers.every(value=>['shift','control','alt','meta'].includes(value))));
  } else if(input.type==='text') {
    assert(Object.keys(data).every(key=>key==='text') && typeof data.text==='string' && data.text.length>0 && data.text.length<=8192);
  } else {
    assert(Object.keys(data).every(key=>['phase','text','selectionStart','selectionEnd'].includes(key))
      && ['start','update','end'].includes(data.phase) && typeof data.text==='string' && data.text.length<=8192
      && uint(data.selectionStart) && uint(data.selectionEnd) && data.selectionStart<=data.text.length
      && data.selectionEnd<=data.text.length);
  }
  return wireCopy(input);
}

export function validateFrame(input) {
  assert(input && typeof input==='object' && !Array.isArray(input)
    && Object.keys(input).every(key=>['browserSessionId','documentGeneration','frameSequence','logicalWidth','logicalHeight','pixelWidth','pixelHeight','scale'].includes(key))
    && id(input.browserSessionId) && uint(input.documentGeneration) && uint(input.frameSequence)
    && uint(input.logicalWidth) && input.logicalWidth>0 && input.logicalWidth<=16384
    && uint(input.logicalHeight) && input.logicalHeight>0 && input.logicalHeight<=16384
    && uint(input.pixelWidth) && uint(input.pixelHeight)
    && finite(input.scale) && input.scale>=1 && input.scale<=5
    && Math.abs(input.pixelWidth-input.logicalWidth*input.scale)<=1
    && Math.abs(input.pixelHeight-input.logicalHeight*input.scale)<=1);
  return wireCopy(input);
}

// Client pixels always become logical CSS coordinates; deviceScaleFactor does
// not change event target positions. Keep the viewer's viewport out of the page.
export function clientPointToBrowser({x,y,bounds,frame}) {
  validateFrame(frame);
  assert(bounds && [x,y,bounds.x,bounds.y,bounds.width,bounds.height].every(finite)
    && bounds.width>0 && bounds.height>0);
  const result={x:(x-bounds.x)*frame.logicalWidth/bounds.width,
    y:(y-bounds.y)*frame.logicalHeight/bounds.height};
  assert(result.x>=0 && result.y>=0 && result.x<=frame.logicalWidth && result.y<=frame.logicalHeight);
  return result;
}

// A stale frame/input must be rejected, never silently redirected or replayed.
export function verifyInputTarget(input,{browserSessionId,documentGeneration,leaseGeneration,lastSequence}) {
  validateBrowserInput(input);
  if(input.browserSessionId!==browserSessionId || input.documentGeneration!==documentGeneration)
    throw protocolError('BROWSER_DOCUMENT_CHANGED');
  if(input.leaseGeneration!==leaseGeneration)throw protocolError('BACKEND_LEASE_STALE');
  if(input.sequence<=lastSequence)throw protocolError('BROWSER_INPUT_REPLAY');
  return true;
}
