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
      if (qualityClass) svg.classList.add(qualityClass);
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
