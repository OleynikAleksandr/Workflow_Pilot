import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';
import { schema } from 'prosemirror-schema-basic';

const initial = 'Контекст архивной сессии wp-request-old-draft';
globalThis.fixturePasteTransactions = 0;
globalThis.fixturePastedModel = null;
const view = new EditorView(document.querySelector('#editor-host'), {
  state: EditorState.create({ schema, doc: schema.node('doc', null, [schema.node('paragraph', null, schema.text(initial))]) }),
  dispatchTransaction(transaction) {
    view.updateState(view.state.apply(transaction));
    if (transaction.getMeta('uiEvent') === 'paste') {
      globalThis.fixturePasteTransactions++;
      globalThis.fixturePastedModel = globalThis.fixtureReadModel();
    }
  },
});
view.dom.id = 'prompt-textarea';
view.dom.style.whiteSpace = 'break-spaces';
globalThis.fixtureReadModel = () => view.state.doc.textBetween(0, view.state.doc.content.size, '\n');
globalThis.fixtureClearModel = () => view.dispatch(view.state.tr.delete(0, view.state.doc.content.size));
