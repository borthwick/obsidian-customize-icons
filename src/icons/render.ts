// Icon rendering helpers: SVG span, emoji span, isEmoji check.

export function isEmoji(str: string): boolean {
  if (!str) return false;
  // Simple check: if it's 1-4 chars and doesn't start with a letter prefix
  return str.length <= 4 && !/^[A-Z][a-z]/.test(str);
}

export function createIconElement(
  svgString: string | null,
  color: string | null,
  qualityClass: string | null,
  ringColor: string | null = null,
): HTMLElement {
  const span = document.createElement("span");
  if (svgString) {
    span.innerHTML = svgString;
    const svg = span.querySelector("svg");
    if (svg) {
      if (color) {
        (svg as SVGElement).style.stroke = color;
        (svg as SVGElement).style.color = color;
      }
      if (qualityClass) {
        for (const cls of qualityClass.split(/\s+/).filter(Boolean)) svg.classList.add(cls);
      }
      if (ringColor) {
        // Two stacked drop-shadows give the ring enough opacity to read at
        // 12-24px without adding a border element that would shift layout.
        (svg as SVGElement).style.filter =
          `drop-shadow(0 0 0.75px ${ringColor}) drop-shadow(0 0 0.75px ${ringColor})`;
      }
    }
  }
  return span;
}

export function createEmojiElement(emoji: string): HTMLElement {
  const span = document.createElement("span");
  span.classList.add("ci-emoji");
  span.textContent = emoji;
  return span;
}
