// StateField<DecorationSet> that emits LinkIconWidget decorations for each
// internal-link token in the current viewport.
//
// Convention: skip the widget when the cursor/selection overlaps the link
// range so the user sees the raw [[wikilink]] syntax while editing that
// specific link — matches Obsidian's own Live Preview UX.

import { EditorState, RangeSetBuilder, StateField, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { LinkIconWidget } from "./link-icon-widget";
import { IconResolution } from "./types";

export type ResolveIcon = (linkpath: string) => IconResolution | null;

// Node names Obsidian's markdown grammar uses for the parts of a wikilink.
// The exact names have shifted across Obsidian versions, so we accept any
// name containing "hmd-internal-link" or the plain link marker names.
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

      // Skip while cursor is on this link
      if (overlapsSelection(state, node.from, node.to)) return;

      const linkpath = state.doc.sliceString(node.from, node.to).trim();
      if (!linkpath) return;

      const resolution = resolve(linkpath);
      if (!resolution) return;

      const widget = new LinkIconWidget(resolution);
      // side: -1 puts the widget just BEFORE the link's first character.
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
      // If nothing that could affect decorations changed, keep the old set.
      // CM6 reuses widgets across updates when eq() returns true.
      if (!tr.docChanged && !tr.selection && !tr.effects.length) return oldSet;
      return buildDecorations(tr.state, resolve);
    },
    provide: (f) => EditorView.decorations.from(f),
  });
}
