// Surface of the Desktop model inside the backend. The model never waits for a
// client: state goes to the event stream, windows are requested from whichever
// client is connected, and a server-side folder is chosen by a backend dialog.
// Window requests go to the client that asked (the lease holder); a remote
// device never makes the Mac open windows or a folder dialog.
export function createRemoteSurface({host,dialog,beforeWindow=async()=>false}) {
  let events=null,holder=()=>null,holderIsRemote=()=>false;
  const initiator=()=>holder()??'local';
  return Object.freeze({
    // The event stream exists after the API port; earlier state is republished on attach.
    attach: (sink, control = {}) => { events = sink; holder = control.holder ?? holder; holderIsRemote = control.holderIsRemote ?? holderIsRemote; },
    alive: () => true,
    contentWidth: () => null,
    layout: sidebarWidth => events?.uiCommand('layout', { sidebarWidth }, { to: 'local' }),
    bounds: () => ({ browserBounds: null, windowSize: null }),
    showPage: id => host.show(id),
    hidePage: () => host.hide(),
    applyTheme: theme => events?.uiCommand('theme', { theme }),
    publish: state => events?.ui('state', state) ?? false,
    publishArchive: state => events?.ui('archive', state),
    publishColors: state => events?.ui('colors', state),
    openArchive: async () => events?.uiCommand('open-archive', {}, { to: initiator() }),
    closeArchive: () => events?.uiCommand('close-archive', {}, { to: initiator() }),
    openColors: () => events?.uiCommand('open-colors', {}, { to: initiator() }),
    // The project path belongs to the backend machine, never to a client's file system.
    showOpenDialog: options => {
      if (holderIsRemote()) throw Object.assign(new Error('С другого устройства укажите путь к папке на компьютере.'), { code: 'REMOTE_PATH_INPUT_REQUIRED' });
      return dialog.showOpenDialog(options);
    },
    beforeWindow,
    create: async () => {},
    loadUi: async () => {},
    runFixture: async () => { throw Object.assign(new Error('Fixture surface is local only.'), { code: 'BACKEND_FIXTURE_UNAVAILABLE' }); },
    close: () => {},
  });
}
