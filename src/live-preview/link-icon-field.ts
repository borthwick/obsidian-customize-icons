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

// For [[Target|Alias]] or [[Target#heading|Alias]] extract just "Target".
// Depth-first the outer node's slice may include the raw brackets; the inner
// sub-variants (hmd-internal-link-target / -alias) do not. Normalizing here
// lets the outer node resolve so we can suppress the inner duplicates.
function extractLinkTarget(raw: string): string | null {
  let s = raw.trim();
  if (s.startsWith("[[") && s.endsWith("]]")) s = s.slice(2, -2).trim();
  const pipe = s.indexOf("|");
  if (pipe !== -1) s = s.slice(0, pipe).trim();
  const hash = s.indexOf("#");
  if (hash !== -1) s = s.slice(0, hash).trim();
  return s || null;
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

  // Depth-first iteration visits the outer hmd-internal-link node before its
  // hmd-internal-link-target / -alias children (both of which also match the
  // `.includes("hmd-internal-link")` hint). Track the outermost handled range
  // and skip any node whose start falls inside it — otherwise aliased links
  // like [[entities/meta|Meta]] emit two or three widgets and render as
  // stacked duplicate icons.
  let handledUpTo = -1;

  tree.iterate({
    enter(node) {
      const name = node.name || "";
      if (!name.includes(INTERNAL_LINK_NODE_HINT)) return;
      if (node.from < handledUpTo) return;
      if (overlapsSelection(state, node.from, node.to)) return;

      const linkpath = extractLinkTarget(state.doc.sliceString(node.from, node.to));
      if (!linkpath) return;

      const resolution = resolve(linkpath);
      if (!resolution) return;

      const widget = new LinkIconWidget(resolution);
      const deco = Decoration.widget({ widget, side: -1 });
      builder.add(node.from, node.from, deco);
      handledUpTo = node.to;
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
