// WidgetType for a folder-mapped icon rendered before an internal-link token.

import { WidgetType } from "@codemirror/view";
import { IconResolution } from "./types";

const TITLE_TAG_RE = /<title[^>]*>[\s\S]*?<\/title>/gi;

export class LinkIconWidget extends WidgetType {
  constructor(public readonly resolution: IconResolution) {
    super();
  }

  eq(other: LinkIconWidget): boolean {
    return (
      other.resolution.linkpath === this.resolution.linkpath &&
      other.resolution.color === this.resolution.color &&
      other.resolution.qualityClass === this.resolution.qualityClass &&
      other.resolution.svg === this.resolution.svg
    );
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.classList.add("ci-link-icon");
    span.setAttribute("data-linkpath", this.resolution.linkpath);
    // v1.6.3 lesson: <title> in inline SVG can bleed into surrounding token tooltips.
    const safeSvg = (this.resolution.svg || "").replace(TITLE_TAG_RE, "");
    span.innerHTML = safeSvg;
    const svg = span.querySelector("svg");
    if (svg) {
      const color = this.resolution.color;
      if (color) {
        (svg as SVGElement).style.stroke = color;
        (svg as SVGElement).style.color = color;
      }
      if (this.resolution.qualityClass) svg.classList.add(this.resolution.qualityClass);
      // Prevent the SVG from stealing pointer/focus events.
      (svg as SVGElement).style.pointerEvents = "none";
    }
    return span;
  }

  ignoreEvent(): boolean {
    // Return true so CM6 doesn't route the click into the editor selection.
    return true;
  }

  destroy(): void {
    // No-op; the DOM node is removed by CM6.
  }
}
