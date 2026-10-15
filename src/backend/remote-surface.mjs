// Surface of the Desktop model inside the backend. The model never waits for a
// client: state goes to the event stream, windows are requested from whichever
// client is connected, and a server-side folder is chosen by a backend dialog.
export function createRemoteSurface({host,dialog,beforeWindow=async()=>false}) {
  let events=null;
  return Object.freeze({
    // The event stream exists after the API port; earlier state is republished on attach.
    attach: sink => { events = sink; },
    alive: () => true,
    contentWidth: () => null,
    layout: sidebarWidth => events?.uiCommand('layout', { sidebarWidth }),
    bounds: () => ({ browserBounds: null, windowSize: null }),
    showPage: id => host.show(id),
    hidePage: () => host.hide(),
    applyTheme: theme => events?.uiCommand('theme', { theme }),
    publish: state => events?.ui('state', state) ?? false,
    publishArchive: state => events?.ui('archive', state),
    publishColors: state => events?.ui('colors', state),
    openArchive: async () => events?.uiCommand('open-archive', {}),
    closeArchive: () => events?.uiCommand('close-archive', {}),
    openColors: () => events?.uiCommand('open-colors', {}),
    // The project path belongs to the backend machine, never to a client's file system.
    showOpenDialog: options => dialog.showOpenDialog(options),
    beforeWindow,
    create: async () => {},
    loadUi: async () => {},
    runFixture: async () => { throw Object.assign(new Error('Fixture surface is local only.'), { code: 'BACKEND_FIXTURE_UNAVAILABLE' }); },
    close: () => {},
  });
}
