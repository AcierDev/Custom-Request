import { appPath } from "../appPaths";

/**
 * Launch iOS AR Quick Look for a prepared `.usdz` URL. Call this SYNCHRONOUSLY
 * from a user tap. `#allowsContentScaling=0` locks real-world (life-size) scale;
 * `canonicalWebPageURL` gives Quick Look a sane page to share back to.
 */
export function launchAR(usdzUrl: string, canonicalWebPageURL?: string): void {
  const fragments = ["allowsContentScaling=0"];
  if (canonicalWebPageURL) {
    fragments.push(
      "canonicalWebPageURL=" + encodeURIComponent(canonicalWebPageURL)
    );
  }
  const href = `${appPath(usdzUrl)}#${fragments.join("&")}`;

  const anchor = document.createElement("a");
  anchor.setAttribute("rel", "ar");
  anchor.setAttribute("href", href);
  // WebKit only intercepts the tap as AR when the anchor's single child is an
  // <img> (it may be empty); otherwise it downloads/links the file instead.
  anchor.appendChild(document.createElement("img"));
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
