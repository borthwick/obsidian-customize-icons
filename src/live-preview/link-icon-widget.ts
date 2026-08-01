// WidgetType for a folder-mapped icon rendered before an internal-link token.

import { WidgetType } from "@codemirror/view";

export interface IconResolution {
  svg: string;
  color: string | null;
  qualityClass: string | null;
  linkpath: string;
}

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
    span.classList.add("customize-icons-link-icon", "ci-live-preview-widget");
    span.setAttribute("data-linkpath", this.resolution.linkpath);
    // v1.6.3 lesson: <title> in inline SVG can bleed into surrounding tooltips.
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
      (svg as SVGElement).style.pointerEvents = "none";
    }
    return span;
  }

  ignoreEvent(): boolean {
    return true;
  }

  destroy(): void {}
}
