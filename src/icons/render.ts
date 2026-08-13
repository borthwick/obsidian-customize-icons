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
  // ringColor accepted for signature stability but is now handled by the
  // caller on its own outer wrapper element (see applyBothHighRing below) —
  // otherwise the ring lands on a nested inner span and CSS misses it.
  _ringColor: string | null = null,
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
    }
  }
  return span;
}

// Draws the "high on both" ring on the SVG itself — the SVG is always
// sized exactly to the icon (12–24px square), so border-radius: 50% +
// box-shadow gives a true circle. Various wrapper elements aren't
// (the title uses a full-width flex row), so applying the ring to
// them would produce an ellipse.
export function applyBothHighRing(wrapper: HTMLElement, ringColor: string | null): void {
  if (!ringColor) return;
  const svg = wrapper.querySelector("svg") as SVGElement | null;
  if (!svg) return;
  svg.classList.add("ci-both-high");
  svg.style.setProperty("--ci-ring-color", ringColor);
}

export function createEmojiElement(emoji: string): HTMLElement {
  const span = document.createElement("span");
  span.classList.add("ci-emoji");
  span.textContent = emoji;
  return span;
}
