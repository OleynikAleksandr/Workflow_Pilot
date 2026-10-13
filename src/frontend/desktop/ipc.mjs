import { DESKTOP_CHANNELS } from '../../contracts/desktop.mjs';
import { fail } from '../../contracts/errors.mjs';

export function assertTrustedSender(event, target) {
  const contents = target?.contents;
  if (!contents || contents.isDestroyed() || event.sender !== contents
      || event.senderFrame !== contents.mainFrame || event.senderFrame.url !== target.url)
    throw fail('IPC_FORBIDDEN', 'Недопустимый источник команды.');
}

// Only the packaged main frame can invoke a registered capability. The check
// runs before queuing work, opening dialogs or reading any Control state.
export class DesktopIpc {
  #handlers = new Set();
  constructor(ipcMain, targets) { this.ipc = ipcMain; this.targets = targets; }
  assert(surface, event) { assertTrustedSender(event, this.targets[surface]?.()); }
  handle(surface, channel, action) {
    if (!DESKTOP_CHANNELS[surface]?.includes(channel) || this.#handlers.has(channel))
      throw fail('IPC_CHANNEL_INVALID', 'Недопустимый или повторный канал Desktop.');
    this.ipc.handle(channel, (event, input) => {
      this.assert(surface, event);
      return action(input);
    });
    this.#handlers.add(channel);
  }
  dispose() {
    for (const channel of this.#handlers) this.ipc.removeHandler(channel);
    this.#handlers.clear();
  }
}
