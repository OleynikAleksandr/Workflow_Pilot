// One palette for the app sidebar and the Workflow Pilot panel (work-progress-ui, section 5).
// Values come from the agreed prototype; both themes of the sidebar use them.
export const PALETTE=Object.freeze({
  light:Object.freeze({page:'#f4f6f8',card:'#ffffff',line:'#dae4e9',fg:'#243346',muted:'#708092',dim:'#8a9aa8',accent:'#087e80',
    selected:'#e4f1f0',selectedLine:'#bddad7',onAccent:'#ffffff',button:'#ffffff',buttonLine:'#d6e0e6',ok:'#087e80',
    warn:'#a8641f',warnSoft:'#fbf1e4',warnLine:'#e7c9a1'}),
  dark:Object.freeze({page:'#1b1d22',card:'#22272d',line:'#363e48',fg:'#e7edf4',muted:'#9aa8b6',dim:'#7d8b98',accent:'#7fd0cb',
    selected:'#203536',selectedLine:'#356061',onAccent:'#10201f',button:'#252b32',buttonLine:'#414b56',ok:'#70c9c2',
    warn:'#dfac74',warnSoft:'#2b2620',warnLine:'#66503a'}),
});
// Window background before the first paint, so the shell never flashes another color.
export const shellBackground=Object.freeze({light:PALETTE.light.page,dark:PALETTE.dark.page});

const kebab=name=>name.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
const variables=tokens=>Object.entries(tokens).map(([name,value])=>'--wp-'+kebab(name)+':'+value).join(';');
// The sidebar keeps its former variable names (--teal, --muted, --line) bound to the same tokens.
const legacy=tokens=>';--teal:'+tokens.accent+';--muted:'+tokens.muted+';--line:'+tokens.line;
// CSS text for an inline <style>: an explicit theme attribute or the host color scheme selects the dark tokens.
export function paletteCss({mode='attribute',aliases=true}={}) {
  const light=variables(PALETTE.light)+(aliases?legacy(PALETTE.light):''),dark=variables(PALETTE.dark)+(aliases?legacy(PALETTE.dark):'');
  if(mode==='media')return ':root{'+light+'}@media (prefers-color-scheme:dark){:root{'+dark+'}}';
  return ':root{'+light+'}:root[data-theme=dark]{'+dark+'}';
}
// Shared spinner: a running action; reduced motion keeps a still ring.
export const spinnerCss='.wp-spin{display:inline-block;flex:0 0 auto;width:11px;height:11px;border-radius:50%;border:2px solid currentColor;'
  +'border-right-color:transparent;animation:wp-spin .9s linear infinite;color:var(--wp-accent)}@keyframes wp-spin{to{transform:rotate(360deg)}}'
  +'@media (prefers-reduced-motion:reduce){.wp-spin{animation:none;border-right-color:currentColor;opacity:.6}}';
