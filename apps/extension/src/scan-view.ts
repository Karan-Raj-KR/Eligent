// Pure HTML for the four Scan result states. No DOM, no chrome — popup.ts paints
// the output, src/verify.test.ts asserts on it.

import type { DocDiff, FillOutcome } from "./form-scan";

export interface ScanView {
  /** result-box modifier class: filled | blocked | diff | error */
  cls: "filled" | "blocked" | "diff" | "error";
  headline: string;
  html: string;
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const ICON = {
  ok: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  block:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
  warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 20h20L12 2Z"/><path d="M12 9v5M12 17h.01"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
};

const strip = (icon: string, text: string) =>
  `<div class="strip">${icon}<span>${esc(text)}</span></div>`;

const listItems = (items: string[], bold = true) =>
  items.map((n) => `<li>${bold ? `<b>${esc(n)}</b>` : esc(n)}</li>`).join("");

function declBlock(fill: FillOutcome): string {
  if (!fill.declarations.length) return "";
  return `<div class="lead" style="font-size:12.5px">Declarations — you tick these, not Eligent:</div><ul class="list">${listItems(
    fill.declarations,
    false,
  )}</ul>`;
}

// ------------------------------------------------------------------- states ---

export function errorView(message: string): ScanView {
  return {
    cls: "error",
    headline: "Can't scan this page",
    html:
      strip(ICON.info, "Can't scan this page") +
      `<div class="inner"><p>${esc(message)}</p></div>`,
  };
}

export const BROWSER_PAGE_MESSAGE =
  "Browser pages are off limits to extensions. Open the application portal and try again.";

export interface BlockedInput {
  reason: string;
  clauseText: string;
  sourceText?: string | null;
  sourceUrl?: string | null;
}

export function blockedView(p: BlockedInput): ScanView {
  const headlines: Record<string, string> = {
    near_miss: "So close — but the portal will still say no",
    rejected: "You're not eligible for this",
    no_profile: "No profile yet",
  };
  const headline = headlines[p.reason] ?? "You're not eligible for this";
  const quote = p.sourceText?.trim();
  const link = p.sourceUrl
    ? `<p><a href="${esc(p.sourceUrl)}" target="_blank" rel="noreferrer">Source page</a></p>`
    : "";
  return {
    cls: "blocked",
    headline,
    html:
      strip(ICON.block, headline) +
      `<div class="inner">
        <div class="lead">${esc(p.clauseText)}</div>
        ${quote ? `<blockquote>${esc(quote)}</blockquote>` : ""}
        ${link}
        <p>Nothing was filled in. Applying anyway would be rejected on this clause.</p>
        <button class="ghost" id="scan-see-matches">See what you qualify for</button>
      </div>`,
  };
}

/** DOC DIFF when there are unlisted uploads, else FILLED. */
export function resultView(fill: FillOutcome, diff: DocDiff | undefined): ScanView {
  if (diff && diff.unlisted.length > 0) {
    const headline = `This form demands ${diff.formDemands} document${
      diff.formDemands === 1 ? "" : "s"
    }. Their page listed ${diff.pageListed}.`;
    return {
      cls: "diff",
      headline,
      html:
        strip(ICON.warn, headline) +
        `<div class="inner">
          <div class="lead">${diff.unlisted.length} upload${
            diff.unlisted.length === 1 ? "" : "s"
          } nobody told you about:</div>
          <ul class="list want">${listItems(diff.unlisted)}</ul>
          <p>${fillLine(fill)} Get these ready before you start — the portal won't let you submit without them.</p>
          ${declBlock(fill)}
        </div>`,
    };
  }

  const headline = `${fill.found} field${fill.found === 1 ? "" : "s"} found. ${fill.filled} filled from your profile. ${fill.need.length} need you.`;
  return {
    cls: "filled",
    headline,
    html:
      strip(ICON.ok, headline) +
      `<div class="inner">
        ${
          fill.need.length
            ? `<div class="lead">Left for you:</div><ul class="list">${listItems(fill.need.slice(0, 12))}</ul>`
            : `<p>Every field Eligent recognised is filled. Check them, then submit yourself.</p>`
        }
        ${
          diff && diff.formDemands > 0
            ? `<p>${diff.formDemands} document upload${
                diff.formDemands === 1 ? "" : "s"
              } on this page, all on the official list.</p>`
            : ""
        }
        ${declBlock(fill)}
        <p>Eligent stops before the submit button. Always.</p>
      </div>`,
  };
}

function fillLine(fill: FillOutcome): string {
  if (fill.found === 0) return "No form fields to fill on this page.";
  return `${fill.filled} of ${fill.found} field${fill.found === 1 ? "" : "s"} filled from your profile.`;
}
