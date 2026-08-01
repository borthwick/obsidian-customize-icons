// Bundles the link-icon StateField with any needed helpers into a single
// Extension array for use with plugin.registerEditorExtension().

import { Extension } from "@codemirror/state";
import { createLinkIconField, ResolveIcon } from "./link-icon-field";

export function createLinkIconExtension(resolve: ResolveIcon): Extension[] {
  return [createLinkIconField(resolve)];
}
