// Desktop owns presentation only. Execution owns the lifetime of each created page.
export class DesktopBrowserHost {
  #views = new Map();
  #visible = null;
  #container = null;
  #suspended = false;
  constructor(createView) { this.createView = createView; }
  create(id) {
    if (this.#views.has(id)) throw new Error('BROWSER_HOST_CONFLICT');
    const view = this.createView();
    this.#views.set(id, view);
    return view.webContents;
  }
  view(id) { return this.#views.get(id); }
  visibleView() { return this.#visible === null ? null : this.#views.get(this.#visible) ?? null; }
  show(id, container) {
    const view = this.#views.get(id);
    if (!view) throw new Error('SESSION_RUNTIME_RELEASED');
    if (this.#visible === id && this.#container === container) return;
    this.hide(); this.#visible = id; this.#container = container;
    if(!this.#suspended)container?.addChildView(view); view.setVisible?.(!this.#suspended);
  }
  hide() {
    if (this.#visible !== null) {
      const view = this.#views.get(this.#visible);
      view?.setVisible?.(false); if (view&&!this.#suspended) this.#container?.removeChildView(view);
    }
    this.#visible = null; this.#container = null;
  }
  suspend(value){
    if(this.#suspended===value)return;const view=this.visibleView();
    if(view){if(value)this.#container?.removeChildView(view);else this.#container?.addChildView(view);view.setVisible?.(!value);}
    this.#suspended=value;
  }
  close(id) {
    const view = this.#views.get(id);
    if (!view) return;
    if (this.#visible === id) this.hide();
    if (!view.webContents.isDestroyed()) view.webContents.close({ waitForBeforeUnload: false });
    this.#views.delete(id);
  }
}
