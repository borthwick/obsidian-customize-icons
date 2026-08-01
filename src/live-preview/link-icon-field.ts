// StateField<DecorationSet> that emits LinkIconWidget decorations for each
// internal-link token in the current viewport. Skips widgets whose range
// overlaps the selection so the user sees raw [[wikilink]] while editing.

import { EditorState, RangeSetBuilder, StateField, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { IconResolution, LinkIconWidget } from "./link-icon-widget";

export type ResolveIcon = (linkpath: string) => IconResolution | null;

const INTERNAL_LINK_NODE_HINT = "hmd-internal-link";

function overlapsSelection(state: EditorState, from: number, to: number): boolean {
  for (const range of state.selection.ranges) {
    if (range.from <= to && range.to >= from) return true;
  }
  return false;
}

function buildDecorations(state: EditorState, resolve: ResolveIcon): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  let tree;
  try {
    tree = syntaxTree(state);
  } catch (e) {
    return builder.finish();
  }
  if (!tree) return builder.finish();

  tree.iterate({
    enter(node) {
      const name = node.name || "";
      if (!name.includes(INTERNAL_LINK_NODE_HINT)) return;

      if (overlapsSelection(state, node.from, node.to)) return;

      const linkpath = state.doc.sliceString(node.from, node.to).trim();
      if (!linkpath) return;

      const resolution = resolve(linkpath);
      if (!resolution) return;

      const widget = new LinkIconWidget(resolution);
      const deco = Decoration.widget({ widget, side: -1 });
      builder.add(node.from, node.from, deco);
    },
  });

  return builder.finish();
}

export function createLinkIconField(resolve: ResolveIcon): StateField<DecorationSet> {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildDecorations(state, resolve);
    },
    update(oldSet, tr: Transaction) {
      if (!tr.docChanged && !tr.selection && !tr.effects.length) return oldSet;
      return buildDecorations(tr.state, resolve);
    },
    provide: (f) => EditorView.decorations.from(f),
  });
}
