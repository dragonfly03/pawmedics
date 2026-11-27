// PawMedics site builder.
// Reads content/site.json (the ONE place to change clinic details) and writes the
// finished website + app files into dist/. Run with:  node build.mjs
// No packages to install: it uses only what comes with Node.js.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, "dist");
const SRC = path.join(ROOT, "src");
const C = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "site.json"), "utf8"));
const clinic = C.clinic;
const SITE = C.settings.siteUrl.replace(/\/$/, "");

// ---------- helpers ----------
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tel = `tel:${clinic.phoneInternational}`;
const mail = `mailto:${clinic.email}`;
// "Swatar BKR 4131" (locality then postcode, as Maltese addresses are written); postcode is optional.
// The postcode is joined with a non-breaking space so "BKR 4131" never splits across two lines.
const localityLine = [clinic.address.locality, String(clinic.address.postcode || "").trim().replace(/ /g, "\u00A0")].filter((x) => x && String(x).trim()).join(" ");
const fullAddress = `${clinic.address.line1}, ${localityLine}, ${clinic.address.country}`;
const fmtTime = (t) => { const [h, m] = t.split(":").map(Number); const ap = h >= 12 ? "pm" : "am"; const hh = h % 12 || 12; return m ? `${hh}:${String(m).padStart(2, "0")}${ap}` : `${hh}${ap}`; };
const hoursText = (h) => (h.closed ? "Closed" : `${fmtTime(h.open)} – ${fmtTime(h.close)}`);
// Phone version of the top-bar hours: open days only, so it fits on one line.
const hoursShort = () => C.hours.filter((h) => !h.closed).map((h) => `${h.short} ${fmtTime(h.open)}–${fmtTime(h.close)}`).join(" · ");
const hoursSummary = () => {
  const open = C.hours.filter((h) => !h.closed).map((h) => `${h.short} ${fmtTime(h.open)}–${fmtTime(h.close)}`);
  const closed = C.hours.filter((h) => h.closed).map((h) => h.short);
  return [...open, closed.length ? `${closed.join(" & ")} closed` : ""].filter(Boolean).join(" · ");
};

const ICONS = {
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  bug: '<path d="M8 2l1.9 1.9M16 2l-1.9 1.9M9 7.1V6a3 3 0 0 1 6 0v1.1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.5 13H3M21 13h-3.5M6 17l-3 2M18 17l3 2M6 9 3 7M18 9l3-2"/>',
  paw: '<circle cx="5.5" cy="10" r="2"/><circle cx="9.5" cy="5.5" r="2"/><circle cx="14.5" cy="5.5" r="2"/><circle cx="18.5" cy="10" r="2"/><path d="M12 12c-3 0-5.5 3.5-5.5 6 0 1.7 1.3 2.5 3 2.5 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.7 0 3-.8 3-2.5 0-2.5-2.5-6-5.5-6z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/>',
};
// Filled star for review ratings (separate from the outline icons above).
const star = (cls = "star") => `<svg class="${cls}" aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>`;
const stars = (n, cls) => Array.from({ length: 5 }, (_, i) => star(i < n ? cls : `${cls} star--off`)).join("");
// ---------- links ----------
// Every link and button is set in content/site.json under "links". This looks one up and stops the
// build with a clear message if it's missing, so a typo never puts a broken link on the live site.
function stop(msg) {
  console.error(`\nBuild stopped: ${msg}\nFix content/site.json and try again. The live site has not changed.\n`);
  process.exit(1);
}
function L(group, key, ...needed) {
  const entry = ((C.links || {})[group] || {})[key];
  if (!entry || typeof entry !== "object") stop(`links.${group}.${key} is missing.`);
  for (const f of needed) if (typeof entry[f] !== "string" || !entry[f].trim()) stop(`links.${group}.${key} needs a "${f}".`);
  return entry;
}
const LINK = {
  topBarAddress: L("everyPage", "topBarAddress", "text", "url"),
  topBarSisterClinic: L("everyPage", "topBarSisterClinic", "text", "url"),
  headerBook: L("everyPage", "headerBook", "text", "url"),
  phoneMenuCall: L("everyPage", "phoneMenuCall", "text"),
  footerBook: L("everyPage", "footerBook", "text", "url"),
  footerFacebook: L("everyPage", "footerFacebook", "text", "url"),
  footerMessenger: L("everyPage", "footerMessenger", "text"),
  footerPrivacy: L("everyPage", "footerPrivacy", "text", "url"),
  phoneBarCall: L("everyPage", "phoneBarCall", "text"),
  phoneBarMessage: L("everyPage", "phoneBarMessage", "text"),
  phoneBarBook: L("everyPage", "phoneBarBook", "text", "url"),
};
const MENU = (C.links && C.links.everyPage && C.links.everyPage.menu) || stop("links.everyPage.menu is missing.");
if (!Array.isArray(MENU)) stop("links.everyPage.menu must be a list [ ... ].");
MENU.forEach((m, i) => { if (!m || !m.text || !m.url) stop(`menu item ${i + 1} in links.everyPage.menu needs a "text" and a "url".`); });
const HOME = {
  heroBook: L("homePage", "heroBook", "text", "url"),
  heroCall: L("homePage", "heroCall", "text"),
  heroReviews: L("homePage", "heroReviews", "url"),
  heroSisterClinic: L("homePage", "heroSisterClinic", "text", "url"),
  reviewsAll: L("homePage", "reviewsAll", "text", "url"),
  quickBook: L("homePage", "quickBook", "text", "smallText", "url"),
  quickCall: L("homePage", "quickCall", "text", "smallText"),
  quickDirections: L("homePage", "quickDirections", "text", "url"),
  quickMessage: L("homePage", "quickMessage", "text", "smallText", "url"),
  quickMessenger: L("homePage", "quickMessenger", "text", "smallText"),
  acupunctureBook: L("homePage", "acupunctureBook", "text", "url"),
  acupunctureMore: L("homePage", "acupunctureMore", "text", "url"),
  servicesBook: L("homePage", "servicesBook", "text", "url"),
  thisClinicBook: L("homePage", "thisClinicBook", "text", "url"),
  sisterClinic: L("homePage", "sisterClinic", "text", "url"),
};
const ACU = {
  breadcrumbHome: L("acupuncturePage", "breadcrumbHome", "text", "url"),
  heroBook: L("acupuncturePage", "heroBook", "text", "url"),
  heroCall: L("acupuncturePage", "heroCall", "text"),
  feesBook: L("acupuncturePage", "feesBook", "text", "url"),
  bottomBook: L("acupuncturePage", "bottomBook", "text", "url"),
  bottomCall: L("acupuncturePage", "bottomCall", "text"),
};
const CONTACT_LINK = {
  breadcrumbHome: L("contactPage", "breadcrumbHome", "text", "url"),
  book: L("contactPage", "book", "text", "url"),
  map: L("contactPage", "map", "text", "url"),
  privacy: L("contactPage", "privacy", "text", "url"),
  thanksHome: L("contactPage", "thanksHome", "text", "url"),
  messengerButton: L("contactPage", "messengerButton", "text"),
  messengerDetails: L("contactPage", "messengerDetails", "text"),
};
const OTHER = {
  privacyBooking: L("otherPages", "privacyBooking", "text", "url"),
  notFoundHome: L("otherPages", "notFoundHome", "text", "url"),
  notFoundBook: L("otherPages", "notFoundBook", "text", "url"),
};
const APP = {
  bookShortcut: L("app", "bookShortcut", "text", "shortText", "url"),
  acupunctureShortcut: L("app", "acupunctureShortcut", "text", "shortText", "url"),
};
if (!APP.acupunctureShortcut.url.startsWith("/")) stop('links.app.acupunctureShortcut "url" must be a page on this site, starting with "/" (phones only allow app shortcuts to the app\'s own pages).');
// Reviews: check the section so a typo stops the build instead of showing a broken card.
const REVIEWS = C.reviews || stop("reviews is missing.");
if (!String(REVIEWS.rating || "").trim()) stop('reviews needs a "rating", e.g. "4.8".');
if (!Number.isInteger(REVIEWS.count) || REVIEWS.count < 1) stop('reviews "count" must be a whole number without quotes, e.g. 24.');
if (!Array.isArray(REVIEWS.items)) stop("reviews.items must be a list [ ... ].");
REVIEWS.items.forEach((r, i) => {
  if (r && r.show === false) return;
  if (!r || !String(r.name || "").trim() || !String(r.text || "").trim()) stop(`review ${i + 1} in reviews.items needs a "name" and a "text".`);
  if (!Number.isInteger(r.stars) || r.stars < 1 || r.stars > 5) stop(`review ${i + 1} in reviews.items needs "stars" from 1 to 5 (no quotes).`);
});
// Notices: bars at the top of every page that switch on and off by date in the visitor's browser.
const isDate = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d + "T00:00:00Z")) && new Date(d + "T00:00:00Z").toISOString().slice(0, 10) === d;
const NOTICES = C.notices === undefined ? [] : C.notices;
if (!Array.isArray(NOTICES)) stop("notices must be a list [ ... ].");
NOTICES.forEach((n, i) => {
  const w = `notice ${i + 1} in notices`;
  if (!n || typeof n !== "object") stop(`${w} is not written correctly.`);
  if (n.show === false) return;
  if (!String(n.text || "").trim()) stop(`${w} needs a "text".`);
  if (!isDate(n.from)) stop(`${w} needs a "from" date written like "2026-12-24".`);
  if (!isDate(n.until)) stop(`${w} needs an "until" date written like "2026-12-27".`);
  if (n.from > n.until) stop(`${w}: the "from" date is after the "until" date.`);
  const hasText = !!String(n.linkText || "").trim(), hasUrl = !!String(n.linkUrl || "").trim();
  if (hasText !== hasUrl) stop(`${w}: give both "linkText" and "linkUrl", or neither.`);
});
const noticesHtml = () => {
  const live = NOTICES.filter((n) => n.show !== false);
  if (!live.length) return "";
  return `<div class="notices" id="notices" hidden>
${live.map((n) => `  <div class="notice" data-from="${esc(n.from)}" data-until="${esc(n.until)}" role="status" hidden><div class="wrap"><span>${esc(n.text)}</span>${n.linkUrl && String(n.linkUrl).trim() ? ` <a href="${esc(String(n.linkUrl).trim())}">${esc(n.linkText)} →</a>` : ""}</div></div>`).join("\n")}
</div>`;
};
// Photos named in the content file must exist (as name-480.webp and name-900.webp in src/assets/img).
const photoExists = (name) => ["480", "900"].every((w) => fs.existsSync(path.join(SRC, "assets", "img", `${name}-${w}.webp`)));
const needPhoto = (name, where) => { if (!String(name || "").trim()) stop(`${where} needs a "photo".`); if (!photoExists(name)) stop(`${where}: no photo called "${name}" in src/assets/img.`); };
C.vets.forEach((v, i) => needPhoto(v.photo, `vet ${i + 1} (${v.name})`));
needPhoto(C.acupuncture.photo, "acupuncture photo");
if (C.acupuncture.pagePhoto) needPhoto(C.acupuncture.pagePhoto, "acupuncture pagePhoto");
const ACU_GALLERY = (C.acupuncture.gallery && Array.isArray(C.acupuncture.gallery.items)) ? C.acupuncture.gallery : null;
if (ACU_GALLERY) ACU_GALLERY.items.forEach((g, i) => needPhoto(g.photo, `acupuncture gallery photo ${i + 1}`));
const ABOUT = C.about || { show: false };
if (ABOUT.show !== false) { if (!Array.isArray(ABOUT.paragraphs)) stop("about.paragraphs must be a list [ ... ]."); if (ABOUT.photo) needPhoto(ABOUT.photo, "about photo"); }
const GALLERY = C.gallery || { show: false };
if (GALLERY.show !== false) { if (!Array.isArray(GALLERY.items)) stop("gallery.items must be a list [ ... ]."); GALLERY.items.forEach((g, i) => needPhoto(g.photo, `gallery photo ${i + 1}`)); }
const BOOK = C.bookOnline || { show: false };
if (BOOK.show !== false) {
  if (!Array.isArray(BOOK.items)) stop("bookOnline.items must be a list [ ... ].");
  BOOK.items.forEach((b, i) => { if (!b.title || !b.linkText || !String(b.linkUrl || "").trim()) stop(`bookOnline item ${i + 1} needs a "title", "linkText" and "linkUrl".`); });
}
const PARTNERS = C.vets.filter((v) => v.partner !== false).slice(0, 2);
// Contact page: every piece of wording must be present (a missing label would leave a blank field).
const CP = C.contactPage || stop("contactPage is missing.");
["title", "intro", "urgentNote", "formTitle", "button", "privacyNote", "detailsTitle", "hoursTitle", "thanksTitle", "thanksText", "privacyPageText"].forEach((k) => { if (!String(CP[k] || "").trim()) stop(`contactPage needs a "${k}".`); });
["name", "email", "phone", "pet", "message"].forEach((k) => { if (!CP.fields || !String(CP.fields[k] || "").trim()) stop(`contactPage.fields needs a "${k}" label.`); });
const ratingLine = `${REVIEWS.rating} on ${REVIEWS.source || "Google"} · ${REVIEWS.count} reviews`;
const href = (entry) => `href="${esc(entry.url.trim())}"`;

// Facebook Messenger (clinic.messenger in content/site.json). Leave it "" and every Messenger button
// disappears. Messenger links always open in a new tab.
const MESSENGER = String(clinic.messenger || "").trim();
if (MESSENGER && !/^https:\/\//.test(MESSENGER)) stop('clinic.messenger must start with https:// (for example "https://m.me/vetsmalta"), or be "" to hide the Messenger buttons.');
const msgr = `href="${esc(MESSENGER)}" target="_blank" rel="noopener"`;

// Shortcut-card label: "phoneText" (optional) is shown instead of "text" on narrow phones.
const quickLabel = (entry, extra = "") => {
  const long = `${esc(entry.text)}${extra}`;
  const short = String(entry.phoneText || "").trim();
  return short ? `<span class="quick__long">${long}</span><span class="quick__short">${esc(short)}${extra}</span>` : long;
};

const icon = (name, cls = "icon") => `<svg class="${cls}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

// Responsive photo: uses the 480px and 900px WebP files made from each photo.
// Each photo address ends in ?v=<fingerprint of the file>, so when a photo is replaced (same name, new
// picture) browsers and the offline copy fetch the new one instead of reusing the old one they saved.
const imgV = {};
const imgUrl = (file) => {
  if (!(file in imgV)) {
    const f = path.join(SRC, "assets", "img", file);
    imgV[file] = fs.existsSync(f) ? crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex").slice(0, 8) : "0";
  }
  return `/assets/img/${file}?v=${imgV[file]}`;
};
const photo = (name, alt, sizes, attrs = "") =>
  `<img src="${imgUrl(`${name}-900.webp`)}" srcset="${imgUrl(`${name}-480.webp`)} 480w, ${imgUrl(`${name}-900.webp`)} 900w" sizes="${sizes}" alt="${esc(alt)}" ${attrs}>`;

// ---------- shared page parts ----------
// Logo and app icon: set in content/site.json ("logo"). Empty = placeholder paw.
const BRAND = { logo: null, appIcon: null };
let ASSET_V = "dev"; // replaced with a content hash so browsers and the app pick up changes

function head({ title, description, pathName, noindex, ogType, image, imageAlt, extraLd, article }) {
  const url = SITE + pathName;
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "VeterinaryCare",
    name: clinic.name,
    url: SITE + "/",
    telephone: clinic.phoneInternational,
    email: clinic.email,
    image: SITE + `/assets/img/${C.acupuncture.photo}.jpg`,
    address: { "@type": "PostalAddress", streetAddress: clinic.address.line1, addressLocality: clinic.address.locality, ...(clinic.address.postcode ? { postalCode: clinic.address.postcode } : {}), addressCountry: clinic.address.countryCode },
    hasMap: LINK.topBarAddress.url.trim(),
    openingHoursSpecification: C.hours.filter((h) => !h.closed && h.schemaDays).map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: h.schemaDays, opens: h.open, closes: h.close })),
    sameAs: [LINK.footerFacebook.url.trim()],
  };
  return `<!doctype html>
<html lang="${C.settings.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">${noindex || /\/(thanks|offline)\/$|^\/404$/.test(pathName) ? '\n<meta name="robots" content="noindex">' : ""}
<link rel="canonical" href="${url}">
<meta name="theme-color" content="${C.settings.themeColor}">
<link rel="manifest" href="/manifest.webmanifest">
${BRAND.appIcon ? `<link rel="icon" href="${esc(BRAND.appIcon)}">
<link rel="apple-touch-icon" href="${esc(BRAND.appIcon)}">` : `<link rel="icon" href="/assets/icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">`}
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="${esc(clinic.name)}">
<meta property="og:type" content="${ogType || "website"}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/img/${image || C.acupuncture.photo}.jpg">${image ? `
<meta property="og:image:alt" content="${esc(imageAlt || "")}">
<meta property="og:site_name" content="${esc(clinic.name)}">
<meta name="twitter:card" content="summary_large_image">` : ""}${article ? `
<meta property="article:published_time" content="${article.published}">
<meta property="article:modified_time" content="${article.modified}">
<meta property="article:section" content="${esc(article.section)}">` : ""}
<link rel="preload" href="/assets/fonts/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/montserrat-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css?v=${ASSET_V}">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>${(extraLd || []).map((ld) => `
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`).join("")}
</head>`;
}

function header(pathName) {
  // Menu items come from links.everyPage.menu; the one for the current page is marked.
  const isCurrent = (u) => u === pathName || (u === "/advice/" && pathName.startsWith("/advice/"));
  const links = MENU.map((m) => `<a ${href(m)}${isCurrent(m.url.trim()) ? ' aria-current="page"' : ""}>${esc(m.text)}</a>`).join("\n");
  return `<a class="skip" href="#main">Skip to content</a>
${noticesHtml()}
<div class="topbar">
  <div class="wrap">
    <div class="topbar__group">
      <span>${icon("clock")}<span class="topbar__hours-full">${esc(hoursSummary())}</span><span class="topbar__hours-short">${esc(hoursShort())}</span></span>
      <a class="topbar__hide-sm" ${href(LINK.topBarAddress)}>${icon("pin")}${esc(LINK.topBarAddress.text)}</a>
    </div>
    <div class="topbar__group topbar__hide-sm">
      <a class="topbar__sister" ${href(LINK.topBarSisterClinic)}>${esc(LINK.topBarSisterClinic.text)} ${icon("arrow")}</a>
      <a href="${mail}">${icon("mail")}${esc(clinic.email)}</a>
    </div>
  </div>
</div>
<header class="header">
  <div class="wrap">
    <a class="brand" href="/" aria-label="${esc(clinic.name)} home">
      ${BRAND.logo
        ? `<img class="brand__logo" src="${esc(BRAND.logo)}" alt="${C.logo.showNameNextToLogo ? "" : esc(C.logo.alt)}">`
        : `<img class="brand__mark" src="/assets/icons/favicon.svg" alt="" width="46" height="46">`}
      ${C.logo.showNameNextToLogo || !BRAND.logo ? `<span><span class="brand__name">${esc(clinic.name)}</span><span class="brand__tag">${esc(clinic.tagline)}</span></span>` : ""}
    </a>
    <nav class="nav" aria-label="Main">
${links}
    </nav>
    <div class="header__actions">
      <a class="btn btn--outline" href="${tel}">${icon("phone")}${esc(clinic.phone)}</a>
      <a class="btn btn--book" ${href(LINK.headerBook)}>${icon("calendar")}${esc(LINK.headerBook.text)}</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open menu">${icon("menu")}</button>
    </div>
  </div>
  <nav class="mobile-nav" id="mobile-nav" aria-label="Mobile">
${links}
    <a href="${tel}">${esc(LINK.phoneMenuCall.text)} ${esc(clinic.phone)}</a>
  </nav>
</header>`;
}

function footer() {
  const year = new Date().getFullYear();
  return `<footer class="footer">
  <div class="wrap">
    <div class="footer__col" style="max-width: 360px">
      <span class="footer__brand">${esc(clinic.name)}</span>
      <span>Compassionate veterinary care in ${esc(clinic.address.locality)}. Part of the Vetcare family with ${esc(C.sisterClinic.name)}, ${esc(C.sisterClinic.place)}.</span>
    </div>
    <div class="footer__col">
      <span class="footer__title">Visit</span>
      <span>${esc(clinic.address.line1)}, ${esc(localityLine)}</span>
      <a href="${tel}">${esc(clinic.phone)}</a>
      <a href="${mail}">${esc(clinic.email)}</a>
    </div>
    <div class="footer__col">
      <span class="footer__title">Opening hours</span>
      ${C.hours.map((h) => `<span>${esc(h.days)}: ${hoursText(h)}</span>`).join("\n      ")}
    </div>
    <div class="footer__col">
      <span class="footer__title">More</span>
      <a ${href(LINK.footerBook)}>${esc(LINK.footerBook.text)}</a>
      <a ${href(LINK.footerFacebook)}>${esc(LINK.footerFacebook.text)}</a>
      ${MESSENGER ? `<a ${msgr}>${esc(LINK.footerMessenger.text)}</a>` : ""}${ADV.list.length ? `
      <a href="/advice/">${esc(ADV.settings.title)}</a>` : ""}
      <a ${href(LINK.footerPrivacy)}>${esc(LINK.footerPrivacy.text)}</a>
      <button class="btn btn--ghost install-btn" type="button" hidden>${icon("download")}Install the app</button>
    </div>
  </div>
  <div class="footer__legal"><div class="wrap"><span>© ${year} ${esc(clinic.legalName)}</span><span>${esc(SITE.replace(/^https?:\/\//, ""))}</span></div></div>
</footer>
<div class="action-bar${MESSENGER ? " action-bar--3" : ""}" role="region" aria-label="Quick actions">
  <a class="btn btn--primary" href="${tel}">${icon("phone")}${esc(LINK.phoneBarCall.text)}</a>
  ${MESSENGER ? `<a class="btn btn--outline" ${msgr}>${icon("chat")}${esc(LINK.phoneBarMessage.text)}</a>` : ""}
  <a class="btn btn--book" ${href(LINK.phoneBarBook)}>${icon("calendar")}${esc(LINK.phoneBarBook.text)}</a>
</div>
<script src="/app.js?v=${ASSET_V}" defer></script>
</body>
</html>`;
}

const page = (meta, main) => `${head(meta)}
<body data-install="${C.settings.showInstallButton ? "on" : "off"}">
${header(meta.pathName)}
<main id="main">
${main}
</main>
${footer()}`;

// ---------- the Vet / Not Vets photo pair ----------
// Drawn on a fixed 380 x 352 grid; the box keeps that shape at every screen size,
// so the arrow tips always stop just short of each head.
function vetsPair() {
  const [a, t] = C.vets;
  const P = "#52215F", O = "#B5501F";
  const arrows = [
    [P, "M22 34 C 24 50, 36 60, 52 61", "M42 55 L 52 61 L 42 66"],
    [O, "M170 36 C 160 62, 138 84, 126 104", "M135 98 L 126 104 L 127 93"],
    [O, "M212 36 C 222 72, 239 114, 242 147", "M246 137 L 242 147 L 236 137"],
    [P, "M356 34 C 354 50, 342 60, 326 61", "M336 55 L 326 61 L 336 65"],
  ];
  const paths = arrows.map(([c, d, h]) => [["#FFFFFF", 6], [c, 2.6]].map(([col, w]) =>
    `<path d="${d}" stroke="${col}" stroke-width="${w}"/><path d="${h}" stroke="${col}" stroke-width="${w}" stroke-linejoin="round"/>`).join("")).join("");
  const label = (x, anchor, rot, color, text) => `<text x="${x}" y="27" text-anchor="${anchor}" transform="rotate(${rot} ${x} 20)" fill="${color}" font-family="Caveat, cursive" font-weight="700" font-size="30">${text}</text>`;
  return `<div class="vets-pair">
  <div class="vets-pair__stage">
    <figure class="vets-pair__photo vets-pair__photo--left">${photo(a.photo, a.photoAlt, "(max-width: 760px) 45vw, 230px", 'fetchpriority="high"')}</figure>
    <figure class="vets-pair__photo vets-pair__photo--right">${photo(t.photo, t.photoAlt, "(max-width: 760px) 45vw, 230px", 'fetchpriority="high"')}</figure>
    <svg class="vets-pair__arrows" viewBox="0 0 380 352" aria-hidden="true" fill="none" stroke-linecap="round">${paths}${label(6, "start", -6, P, "Vet")}${label(190, "middle", -2, O, "Not Vets")}${label(374, "end", 6, P, "Vet")}</svg>
  </div>
  <div class="vets-pair__names"><span>${esc(a.name)}</span><span>${esc(t.name)}</span></div>
</div>`;
}

// ---------- pet care advice (content/advice) ----------
// Each article is a .md file in content/advice, with its details between the two --- lines at the top.
// "status: draft" articles appear only on the preview site (Netlify branch deploys) and on local
// builds, with a Draft banner and "noindex". The live site (Netlify production) shows only articles
// with "status: published", and those must name the vet who checked them in "reviewedBy".
// If the folder is missing (for example in the PawMedics CMS's own preview), the site builds without it.
// Same as stop(), but points at the article files rather than content/site.json.
function advStop(msg) {
  console.error(`\nBuild stopped: ${msg}\nFix the file in content/advice and try again. The live site has not changed.\n`);
  process.exit(1);
}
const ADV = (() => {
  const dir = path.join(ROOT, "content", "advice");
  const empty = { settings: {}, list: [], all: [], tipLink: () => null, files: "", isLive: false };
  if (!fs.existsSync(dir)) return empty;
  const ctx = process.env.CONTEXT || (process.env.CF_PAGES_BRANCH ? (process.env.CF_PAGES_BRANCH === "main" ? "production" : "branch-deploy") : "local");
  const isLive = ctx === "production";
  const setFile = path.join(dir, "_settings.json");
  if (!fs.existsSync(setFile)) advStop("content/advice/_settings.json is missing.");
  let S;
  try { S = JSON.parse(fs.readFileSync(setFile, "utf8")); } catch (e) { advStop(`content/advice/_settings.json is not written correctly (${e.message}).`); }
  ["title", "heading", "intro", "seoTitle", "description", "author", "outOfHours", "draftBanner"].forEach((k) => { if (!String(S[k] || "").trim()) advStop(`content/advice/_settings.json needs a "${k}".`); });
  const unq = (s) => { s = s.trim(); return s.length > 1 && s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1).replace(/\\"/g, '"') : s; };
  const LISTS = ["keyPoints"];
  let filesText = fs.readFileSync(setFile, "utf8");
  const all = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => {
    const raw = fs.readFileSync(path.join(dir, f), "utf8").replace(/\r\n?/g, "\n");
    filesText += raw;
    const where = `content/advice/${f}`;
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) advStop(`${where} must start with its details between two lines of three dashes (---).`);
    const a = { slug: f.replace(/\.md$/, ""), body: m[2], file: where };
    let listKey = null;
    m[1].split("\n").forEach((line) => {
      if (!line.trim()) return;
      const item = line.match(/^\s*-\s+(.*)$/);
      if (item && listKey) { a[listKey].push(unq(item[1])); return; }
      const kv = line.match(/^([A-Za-z]+):\s*(.*)$/);
      if (!kv) advStop(`${where}: can't read the line "${line.trim()}" at the top of the file.`);
      if (LISTS.includes(kv[1])) { a[kv[1]] = []; listKey = kv[1]; } else { a[kv[1]] = unq(kv[2]); listKey = null; }
    });
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug)) advStop(`${where}: file names must be lower-case words joined by dashes, e.g. "summer-heat.md".`);
    ["title", "seoTitle", "description", "summary", "category", "photo", "photoAlt", "date", "status"].forEach((k) => { if (!String(a[k] || "").trim()) advStop(`${where} needs a "${k}".`); });
    if (!["draft", "published"].includes(a.status)) advStop(`${where}: "status" must be draft or published.`);
    if (!isDate(a.date)) advStop(`${where}: "date" must be written like 2026-11-27.`);
    a.updated = String(a.updated || "").trim() || a.date;
    if (!isDate(a.updated)) advStop(`${where}: "updated" must be written like 2026-11-27.`);
    needPhoto(a.photo, where);
    if (!fs.existsSync(path.join(SRC, "assets", "img", `${a.photo}.jpg`))) advStop(`${where}: the photo "${a.photo}" also needs a ${a.photo}.jpg in src/assets/img (used when the article is shared).`);
    a.keyPoints = a.keyPoints || [];
    a.reviewedBy = String(a.reviewedBy || "").trim();
    a.related = String(a.related || "").split(",").map((s) => s.trim()).filter(Boolean);
    a.order = Number(a.order) || 999;
    a.draft = a.status === "draft";
    a.url = `/advice/${a.slug}/`;
    if (!a.draft) {
      if (!a.reviewedBy) advStop(`${where} is marked "published" but "reviewedBy" is empty. Add the name of the vet who checked it.`);
      if (/\[\[TO CONFIRM/.test(a.body)) advStop(`${where} is marked "published" but still has a [[TO CONFIRM ...]] note. Remove it once the detail is checked.`);
    }
    if (a.seoTitle.length > 65) console.warn(`Note: ${where} seoTitle is ${a.seoTitle.length} characters; Google shows about 60.`);
    if (a.description.length > 165) console.warn(`Note: ${where} description is ${a.description.length} characters; Google shows about 155.`);
    return a;
  });
  const bySlug = Object.fromEntries(all.map((a) => [a.slug, a]));
  all.forEach((a) => a.related.forEach((r) => { if (!bySlug[r]) advStop(`${a.file}: "related" names "${r}", but there's no content/advice/${r}.md.`); }));
  const list = all.filter((a) => !isLive || !a.draft).sort((x, y) => x.order - y.order || x.title.localeCompare(y.title));
  const shown = new Set(list.map((a) => a.slug));
  // The "Pet care" menu item goes to the advice section once there is something to show.
  if (list.length && S.menu && S.menu.replacesUrl) MENU.forEach((m) => { if (m.url.trim() === S.menu.replacesUrl) { m.url = "/advice/"; if (S.menu.text) m.text = S.menu.text; } });
  const tips = S.homeTipLinks || {};
  Object.entries(tips).forEach(([k, slug]) => { if (!bySlug[slug]) advStop(`content/advice/_settings.json: homeTipLinks "${k}" names "${slug}", but there's no content/advice/${slug}.md.`); });
  const tipLink = (title) => (tips[title] && shown.has(tips[title]) ? bySlug[tips[title]] : null);
  return { settings: S, list, all, bySlug, shown, tipLink, files: filesText, isLive, ctx };
})();

const fmtDate = (d) => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const slugify = (s) => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Turns the article's Markdown into HTML. Supports ## and ### headings, paragraphs, - and 1. lists,
// | tables |, **bold**, *italic*, [links](url), {{phone}} {{tel}} {{book}} {{email}} {{messenger}},
// {{outOfHours}} on its own line, and [[TO CONFIRM: ...]] notes (shown on drafts only).
function renderArticle(a) {
  const fill = (s) => s
    .replace(/\{\{phone\}\}/g, clinic.phone).replace(/\{\{tel\}\}/g, tel).replace(/\{\{email\}\}/g, clinic.email)
    .replace(/\{\{book\}\}/g, LINK.headerBook.url.trim()).replace(/\{\{messenger\}\}/g, MESSENGER || "/contact/");
  const inline = (s) => esc(fill(s))
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (all, text, url) => {
      const u = url.replace(/&amp;/g, "&");
      const adv = u.match(/^\/advice\/([a-z0-9-]+)\/?(#.*)?$/);
      if (adv) {
        if (!ADV.bySlug[adv[1]]) advStop(`${a.file}: the link to /advice/${adv[1]}/ points to an article that doesn't exist.`);
        if (!ADV.shown.has(adv[1])) return text; // that article isn't on this version of the site yet
      }
      const ext = /^https?:\/\//.test(u) && !u.startsWith(SITE);
      return `<a href="${esc(u)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
    });
  const out = [], toc = [], faq = [];
  let section = "", q = null;
  const blocks = a.body.trim().split(/\n\s*\n/);
  for (const b of blocks) {
    const lines = b.split("\n").map((l) => l.trimEnd());
    const first = lines[0].trim();
    if (first === "{{outOfHours}}") { out.push(`<p class="advice-note">${icon("clock")}<span>${esc(ADV.settings.outOfHours)}</span></p>`); continue; }
    const todo = first.match(/^\[\[TO CONFIRM:?\s*(.*)\]\]$/);
    if (todo) { if (a.draft) out.push(`<p class="advice-todo"><strong>To confirm before publishing:</strong> ${esc(todo[1])}</p>`); continue; }
    let h;
    if ((h = first.match(/^(##|###)\s+(.*)$/)) && lines.length === 1) {
      const level = h[1].length, text = h[2].trim(), id = slugify(text);
      if (level === 2) { section = text; q = null; if (!/^sources$/i.test(text)) toc.push({ id, text }); }
      if (level === 3 && /^common questions$/i.test(section)) { q = { q: text, a: [] }; faq.push(q); }
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      continue;
    }
    if (lines.every((l) => /^\s*-\s+/.test(l))) { out.push(`<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*-\s+/, ""))}</li>`).join("")}</ul>`); continue; }
    if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) { out.push(`<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+\.\s+/, ""))}</li>`).join("")}</ol>`); continue; }
    if (lines.every((l) => /^\s*\|/.test(l)) && lines.length >= 2) {
      const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const [head, , ...rows] = lines;
      out.push(`<div class="table-wrap"><table><thead><tr>${cells(head).map((c) => `<th scope="col">${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${cells(r).map((c, i) => (i === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    const para = lines.map((l) => l.trim()).join(" ");
    if (q) q.a.push(fill(para).replace(/\*\*|\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"));
    out.push(`<p>${inline(para)}</p>`);
  }
  const words = a.body.replace(/[#*|\[\]()_-]/g, " ").split(/\s+/).filter(Boolean).length;
  return { html: out.join("\n"), toc, faq, minutes: Math.max(1, Math.round(words / 200)), words };
}

// Article photos may also have a sharper 1400px version (name-1400.webp) for large screens.
const advPhoto = (name, alt, sizes, attrs = "") => {
  const big = fs.existsSync(path.join(SRC, "assets", "img", `${name}-1400.webp`));
  return `<img src="${imgUrl(`${name}-900.webp`)}" srcset="${imgUrl(`${name}-480.webp`)} 480w, ${imgUrl(`${name}-900.webp`)} 900w${big ? `, ${imgUrl(`${name}-1400.webp`)} 1400w` : ""}" sizes="${sizes}" alt="${esc(alt)}" ${attrs}>`;
};
const photoCredit = (a) => (a.photoCredit ? `<figcaption>Photo: ${a.photoCreditUrl ? `<a href="${esc(a.photoCreditUrl)}" target="_blank" rel="noopener">${esc(a.photoCredit)}</a>` : esc(a.photoCredit)}</figcaption>` : "");

const advCard = (a) => `<a class="advice-card" href="${a.url}">
        ${advPhoto(a.photo, "", "(max-width: 760px) 92vw, 380px", 'loading="lazy"')}
        <span class="advice-card__body"><span class="eyebrow">${esc(a.category)}${a.draft ? ' · <span class="advice-card__draft">Draft</span>' : ""}</span><strong>${esc(a.title)}</strong><span>${esc(a.summary)}</span><span class="advice-card__more">Read more →</span></span>
      </a>`;

const advFeature = (a) => `<a class="advice-feature" href="${a.url}">
      ${advPhoto(a.photo, "", "(max-width: 900px) 92vw, 640px", 'fetchpriority="high"')}
      <span class="advice-feature__body"><span class="eyebrow">${esc(a.category)}${a.draft ? ' · <span class="advice-card__draft">Draft</span>' : ""}</span><strong>${esc(a.title)}</strong><span>${esc(a.summary)}</span><span class="advice-card__more">Read the article →</span></span>
    </a>`;

const helpBox = (onIndex) => `<aside class="advice-help" aria-label="Contact ${esc(clinic.name)}">
    <h2>Worried about your pet?</h2>
    <p>Every pet is different, and ${onIndex ? "advice online" : "this article"} can't replace an examination. Call us and we'll tell you whether your pet needs to be seen.</p>
    <div class="btn-row">
      <a class="btn btn--primary" href="${tel}">${icon("phone")}Call ${esc(clinic.phone)}</a>
      <a class="btn btn--book" ${href(LINK.headerBook)}>${icon("calendar")}${esc(LINK.headerBook.text)}</a>
      ${MESSENGER ? `<a class="btn btn--outline" ${msgr}>${icon("chat")}Message us</a>` : ""}
    </div>
  </aside>`;

const publisherLd = () => ({ "@type": "VeterinaryCare", name: clinic.name, url: SITE + "/", logo: SITE + "/assets/icons/icon-512.png", telephone: clinic.phoneInternational });
const crumbsLd = (items) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, u], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + u })) });

function advicePage(a) {
  const S = ADV.settings;
  const r = renderArticle(a);
  const related = a.related.map((s) => ADV.bySlug[s]).filter((x) => ADV.shown.has(x.slug));
  const checked = a.reviewedBy ? `Checked by ${esc(a.reviewedBy)}` : "Awaiting check by a PawMedics vet";
  const main = `<section class="page-hero page-hero--slim advice-hero">
  <div class="wrap">
    <div class="page-hero__copy">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/advice/">${esc(S.title)}</a> / ${esc(a.category)}</nav>
      <h1>${esc(a.title)}</h1>
      <p>${esc(a.summary)}</p>
      <p class="advice-meta"><span>${checked}</span><span>Updated <time datetime="${a.updated}">${fmtDate(a.updated)}</time></span><span>${r.minutes} min read</span></p>
    </div>
  </div>
</section>
${a.draft ? `<div class="advice-draft" role="note"><div class="wrap">${esc(S.draftBanner)}</div></div>\n` : ""}<article class="section advice">
  <div class="wrap advice__wrap">
    <figure class="advice__photo">${advPhoto(a.photo, a.photoAlt, "(max-width: 820px) 92vw, 760px", 'fetchpriority="high"')}${photoCredit(a)}</figure>
    ${a.keyPoints.length ? `<aside class="advice-key" aria-labelledby="key-points"><h2 id="key-points">Key points</h2><ul class="ticks ticks--stack">${a.keyPoints.map((k) => `<li>${icon("check")}<span>${esc(k)}</span></li>`).join("")}</ul></aside>` : ""}
    ${r.toc.length > 2 ? `<nav class="advice-toc" aria-label="On this page"><h2>On this page</h2><ol>${r.toc.map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join("")}</ol></nav>` : ""}
    <div class="advice__body">
${r.html}
    </div>
    ${helpBox()}
    <p class="advice-disclaimer">This article gives general information for pet owners in Malta and does not replace advice from a vet who has examined your pet. Written by the ${esc(S.author)}${a.reviewedBy ? `, checked by ${esc(a.reviewedBy)}` : ""}. First published <time datetime="${a.date}">${fmtDate(a.date)}</time>.</p>
  </div>
</article>
${related.length ? `<section class="section section--cream">
  <div class="wrap">
    <div class="section-head"><div><h2>Related advice</h2></div><a href="/advice/" style="font-weight: 600">All ${esc(S.title.toLowerCase())} →</a></div>
    <div class="advice-grid">
      ${related.map(advCard).join("\n      ")}
    </div>
  </div>
</section>` : ""}`;
  const pageUrl = SITE + a.url;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": pageUrl + "#article",
      headline: a.title,
      description: a.description,
      image: [SITE + `/assets/img/${a.photo}.jpg`],
      datePublished: a.date,
      dateModified: a.updated,
      inLanguage: C.settings.language,
      articleSection: a.category,
      wordCount: r.words,
      author: { "@type": "Organization", name: S.author, url: SITE + "/" },
      publisher: publisherLd(),
      mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl, ...(a.reviewedBy ? { reviewedBy: { "@type": "Person", name: a.reviewedBy, jobTitle: "Veterinary surgeon", worksFor: { "@type": "VeterinaryCare", name: clinic.name } }, lastReviewed: a.updated } : {}) },
      ...(a.pets ? { about: String(a.pets).split(",").map((p) => ({ "@type": "Thing", name: p.trim() })) } : {}),
    },
    crumbsLd([["Home", "/"], [S.title, "/advice/"], [a.title, a.url]]),
    ...(r.faq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: r.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a.join(" ") } })) }] : []),
  ];
  return page({ title: a.seoTitle, description: a.description, pathName: a.url, noindex: a.draft, ogType: "article", image: a.photo, imageAlt: a.photoAlt, extraLd: ld, article: { published: a.date, modified: a.updated, section: a.category } }, main);
}

function adviceIndexPage() {
  const S = ADV.settings;
  const anyPublished = ADV.list.some((a) => !a.draft);
  const main = `<section class="page-hero page-hero--slim advice-index-hero">
  <div class="wrap">
    <div class="page-hero__copy">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / ${esc(S.title)}</nav>
      <h1>${esc(S.heading)}</h1>
      <p>${esc(S.intro)}</p>
      <div class="btn-row"><a class="btn btn--book" ${href(LINK.headerBook)}>${icon("calendar")}${esc(LINK.headerBook.text)}</a><a class="btn btn--ghost" href="${tel}">${icon("phone")}${esc(clinic.phone)}</a></div>
    </div>
  </div>
</section>
${anyPublished ? "" : `<div class="advice-draft" role="note"><div class="wrap">Preview only: every article here is a draft waiting for a vet to check it.</div></div>\n`}<section class="section">
  <div class="wrap">
    ${ADV.list.length > 3 ? advFeature(ADV.list[0]) : ""}
    <div class="advice-grid">
      ${(ADV.list.length > 3 ? ADV.list.slice(1) : ADV.list).map(advCard).join("\n      ")}
    </div>
  </div>
</section>
${helpBox(true).replace('<aside class="advice-help"', '<aside class="advice-help advice-help--wide wrap"')}`;
  const ld = [
    { "@context": "https://schema.org", "@type": "CollectionPage", name: S.heading, description: S.description, url: SITE + "/advice/", inLanguage: C.settings.language, publisher: publisherLd(),
      mainEntity: { "@type": "ItemList", itemListElement: ADV.list.map((a, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + a.url, name: a.title })) } },
    crumbsLd([["Home", "/"], [S.title, "/advice/"]]),
  ];
  return page({ title: S.seoTitle, description: S.description, pathName: "/advice/", noindex: !anyPublished, extraLd: ld }, main);
}

// ---------- pages ----------
function homePage() {
  const ac = C.acupuncture;
  const main = `<section class="hero">
  <div class="wrap">
    <div class="hero__copy">
      <span class="pill">${esc(C.hero.eyebrow)}</span>
      <h1>${esc(C.hero.title)}</h1>
      <p>${esc(C.hero.text)}</p>
      <div class="btn-row">
        <a class="btn btn--book btn--lg" ${href(HOME.heroBook)}>${icon("calendar")}${esc(HOME.heroBook.text)}</a>
        <a class="btn btn--primary btn--lg" href="${tel}">${icon("phone")}${esc(HOME.heroCall.text)} ${esc(clinic.phone)}</a>
      </div>
      <div class="trust">
        <a class="trust__rating" ${href(HOME.heroReviews)}><span class="trust__stars">${stars(5, "star")}</span><span>${esc(ratingLine)}</span></a>
        <a class="trust__link" ${href(HOME.heroSisterClinic)}>${icon("check")}<span>${esc(HOME.heroSisterClinic.text)}</span> ${icon("arrow", "icon icon--sm")}</a>
      </div>
    </div>
    ${vetsPair()}
  </div>
</section>

<section class="quick" aria-label="Quick actions">
  <div class="wrap quick__grid">
    <a ${href(HOME.quickBook)}><span class="quick__icon quick__icon--book">${icon("calendar")}</span><span><strong>${quickLabel(HOME.quickBook)}</strong><small>${esc(HOME.quickBook.smallText)}</small></span></a>
    <a href="${tel}"><span class="quick__icon">${icon("phone")}</span><span><strong>${quickLabel(HOME.quickCall, ` ${esc(clinic.phone)}`)}</strong><small>${esc(HOME.quickCall.smallText)}</small></span></a>
    <a ${href(HOME.quickDirections)}><span class="quick__icon">${icon("pin")}</span><span><strong>${quickLabel(HOME.quickDirections)}</strong><small>${esc(clinic.address.locality)}, ${esc(clinic.address.country)}</small></span></a>
    ${MESSENGER
      ? `<a ${msgr}><span class="quick__icon">${icon("chat")}</span><span><strong>${quickLabel(HOME.quickMessenger)}</strong><small>${esc(HOME.quickMessenger.smallText)}</small></span></a>`
      : `<a ${href(HOME.quickMessage)}><span class="quick__icon">${icon("mail")}</span><span><strong>${quickLabel(HOME.quickMessage)}</strong><small>${esc(HOME.quickMessage.smallText)}</small></span></a>`}
  </div>
</section>

<section class="section" id="acupuncture">
  <div class="wrap">
    <div class="feature">
      <div class="feature__copy">
        <span class="eyebrow">Featured service</span>
        <h2>Veterinary acupuncture with ${esc(C.vets[1].name)}</h2>
        <p>${esc(ac.homeTeaser)}</p>
        <ul class="ticks">${ac.helpsWith.map((x) => `<li>${icon("check")}${esc(x)}</li>`).join("")}</ul>
        <div class="btn-row">
          <a class="btn btn--book" ${href(HOME.acupunctureBook)}>${esc(HOME.acupunctureBook.text)}</a>
          <a class="btn btn--ghost" ${href(HOME.acupunctureMore)}>${esc(HOME.acupunctureMore.text)} ${icon("arrow")}</a>
        </div>
      </div>
      ${photo(ac.photo, ac.photoAlt, "(max-width: 760px) 92vw, 480px", 'loading="lazy"')}
    </div>
  </div>
</section>

${BOOK.show !== false && BOOK.items.length ? `<section class="section" id="book-online" style="padding-top: 24px; padding-bottom: 24px">
  <div class="wrap">
    <div class="section-head"><div><h2>${esc(BOOK.title || "What you can book online")}</h2>${BOOK.text ? `<p>${esc(BOOK.text)}</p>` : ""}</div></div>
    <div class="grid book-types">
${BOOK.items.map((b) => `      <div class="book-type">${icon("calendar", "card__icon")}<h3>${esc(b.title)}</h3><p>${esc(b.text || "")}</p><a class="btn btn--book" href="${esc(String(b.linkUrl).trim())}">${esc(b.linkText)}</a></div>`).join("\n")}
    </div>
    ${BOOK.notSure ? `<p class="book-types__note">${esc(BOOK.notSure)} <a href="${tel}">${esc(clinic.phone)}</a> · <a href="${mail}">${esc(clinic.email)}</a></p>` : ""}
  </div>
</section>

` : ""}<section class="section" id="services" style="padding-top: 24px">
  <div class="wrap">
    <div class="section-head">
      <div><h2>Our services</h2><p>Everything your dog, cat or small pet needs, from the first puppy jab to care in later life.</p></div>
      <a ${href(HOME.servicesBook)} style="font-weight: 600">${esc(HOME.servicesBook.text)} →</a>
    </div>
    <div class="grid grid--services">
${C.services.filter((s) => s.show !== false).map((s) => `      <div class="card${s.featured ? " card--featured" : ""}"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${s.link && s.link.trim() ? `<a href="${esc(s.link.trim())}">${esc(s.linkText || "Learn more")} →</a>` : ""}</div>`).join("\n")}
    </div>
  </div>
</section>

<section class="section section--cream" id="pet-care">
  <div class="wrap">
    <div class="section-head"><div><h2>Pet care in Malta</h2><p>Malta's climate brings its own challenges. These are the ones we're asked about most.</p></div>${ADV.list.length ? `
      <a href="/advice/" style="font-weight: 600">All pet care advice →</a>` : ""}</div>
    <div class="grid grid--tips">
${C.maltaTips.map((t) => { const a = ADV.tipLink(t.title); return `      <div class="card card--plain">${icon(t.icon, "card__icon")}<h3>${esc(t.title)}</h3><p>${esc(t.text)}</p>${a ? `<a href="${a.url}" aria-label="Read more: ${esc(a.title)}">Read more →</a>` : ""}</div>`; }).join("\n")}
    </div>
  </div>
</section>

<section class="section" id="team">
  <div class="wrap">
    <div class="section-head"><div><h2>Meet our vets</h2></div></div>
    <div class="grid team">
${C.vets.map((v) => `      <article class="vet">${photo(v.photo, v.photoAlt || v.name, "(max-width: 760px) 92vw, 360px", 'loading="lazy"')}<div class="vet__body"><h3>${esc(v.name)}</h3><span class="vet__role">${esc(v.role)}</span>${v.bio ? `<p>${esc(v.bio)}</p>` : ""}</div></article>`).join("\n")}
    </div>
  </div>
</section>

${REVIEWS.show !== false && REVIEWS.items.some((r) => r.show !== false) ? `<section class="section section--cream" id="reviews">
  <div class="wrap">
    <div class="section-head">
      <div><h2>${esc(REVIEWS.title || "What pet owners say")}</h2>
        <p class="rating-summary"><strong>${esc(REVIEWS.rating)}</strong><span class="rating-summary__stars">${stars(5, "star")}</span><span>from ${esc(String(REVIEWS.count))} ${esc(REVIEWS.source || "Google")} reviews</span></p>
      </div>
      <a ${href(HOME.reviewsAll)} style="font-weight: 600">${esc(HOME.reviewsAll.text)} →</a>
    </div>
    <div class="reviews" role="list">
${REVIEWS.items.filter((r) => r.show !== false).map((r) => `      <figure class="review" role="listitem"><div class="review__stars" aria-label="${r.stars} out of 5 stars" role="img">${stars(r.stars, "star")}</div><blockquote>${esc(r.text)}</blockquote><figcaption>${esc(r.name)}<span>${esc(REVIEWS.source || "Google")} review</span></figcaption></figure>`).join("\n")}
    </div>
  </div>
</section>

` : ""}${ABOUT.show !== false ? `<section class="section" id="about">
  <div class="wrap about">
    <div class="prose">
      <h2>${esc(ABOUT.title || "About us")}</h2>
${ABOUT.paragraphs.map((t) => `      <p>${esc(t)}</p>`).join("\n")}
    </div>
    ${ABOUT.photo ? `<figure class="about__photo">${photo(ABOUT.photo, ABOUT.photoAlt || "", "(max-width: 760px) 92vw, 520px", 'loading="lazy"')}${ABOUT.caption ? `<figcaption>${esc(ABOUT.caption)}</figcaption>` : ""}</figure>` : ""}
  </div>
</section>

` : ""}${GALLERY.show !== false && GALLERY.items.length ? `<section class="section section--cream" id="care-in-action">
  <div class="wrap">
    <div class="section-head"><div><h2>${esc(GALLERY.title || "Care in action")}</h2>${GALLERY.text ? `<p>${esc(GALLERY.text)}</p>` : ""}</div></div>
    <div class="gallery">
${GALLERY.items.map((g) => `      <figure>${photo(g.photo, g.alt || "", "(max-width: 760px) 84vw, 380px", 'loading="lazy"')}${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ""}</figure>`).join("\n")}
    </div>
  </div>
</section>

` : ""}<section class="section section--tint">
  <div class="wrap">
    <div class="section-head"><div><h2>Two clinics, one team</h2><p>${esc(clinic.name)} and ${esc(C.sisterClinic.name)} are both run by ${PARTNERS.map((v) => esc(v.name)).join(" and ")}, so you can visit whichever is nearer.</p></div></div>
    <div class="grid grid--two">
      <div class="clinic clinic--here"><span class="eyebrow">You are here</span><h3>${esc(clinic.name)}, ${esc(clinic.address.locality)}</h3><p>${esc(clinic.address.line1)}, ${esc(localityLine)}<br>${esc(clinic.phone)} · ${esc(clinic.email)}</p><a ${href(HOME.thisClinicBook)}>${esc(HOME.thisClinicBook.text)} →</a></div>
      <div class="clinic"><span class="eyebrow">${esc(C.sisterClinic.badge)}</span><h3>${esc(C.sisterClinic.name)}, ${esc(C.sisterClinic.place)}</h3><p>${esc(C.sisterClinic.address)}<br>${esc(C.sisterClinic.phone)} · ${esc(C.sisterClinic.email)}</p><a ${href(HOME.sisterClinic)}>${esc(HOME.sisterClinic.text)} →</a></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap faq">
    <h2 style="margin-bottom: 24px">Common questions</h2>
${C.faq.map((f, i) => `    <details${i === 0 ? " open" : ""}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n")}
  </div>
</section>`;
  return page({ title: `${clinic.name} | Vet clinic in ${clinic.address.locality}, Malta`, description: clinic.description, pathName: "/" }, main);
}

function acupuncturePage() {
  const ac = C.acupuncture;
  const teresa = C.vets[1];
  const fees = ac.fees && ac.fees.length
    ? `<div class="fees"><h2 style="font-size: 1.6rem">Fees</h2>${ac.fees.map((f) => `<div class="fees__row"><span>${esc(f.label)}</span><strong>${esc(f.price)}</strong></div>`).join("")}<a class="btn btn--book" ${href(ACU.feesBook)}>${esc(ACU.feesBook.text)}</a></div>`
    : "";
  const main = `<section class="page-hero">
  <div class="wrap">
    <div class="page-hero__copy">
      <span class="crumbs"><a ${href(ACU.breadcrumbHome)}>${esc(ACU.breadcrumbHome.text)}</a> / Acupuncture</span>
      <h1>${esc(ac.title)}</h1>
      <p>${esc(ac.intro)}</p>
      <div class="btn-row">
        <a class="btn btn--book btn--lg" ${href(ACU.heroBook)}>${esc(ACU.heroBook.text)}</a>
        <a class="btn btn--ghost btn--lg" href="${tel}">${esc(ACU.heroCall.text)} ${esc(clinic.phone)}</a>
      </div>
    </div>
    ${photo(ac.pagePhoto || ac.photo, ac.pagePhotoAlt || ac.photoAlt, "(max-width: 760px) 92vw, 520px", 'fetchpriority="high"')}
  </div>
</section>

<section class="section">
  <div class="wrap split">
    <div class="prose"><h2>What is veterinary acupuncture?</h2>${ac.whatIsIt.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
    <div class="split__panel"><h3 style="font-size: 1.35rem">Often used to help with</h3><ul class="ticks ticks--stack">${ac.helpsWith.map((x) => `<li>${icon("check")}${esc(x)}</li>`).join("")}</ul></div>
  </div>
</section>

${ACU_GALLERY && ACU_GALLERY.items.length ? `<section class="section" style="padding-top: 0">
  <div class="wrap">
    <div class="section-head"><div><h2>${esc(ACU_GALLERY.title || "")}</h2>${ACU_GALLERY.text ? `<p>${esc(ACU_GALLERY.text)}</p>` : ""}</div></div>
    <div class="gallery gallery--acu">
${ACU_GALLERY.items.map((g) => `      <figure>${photo(g.photo, g.alt || "", "(max-width: 760px) 84vw, 380px", 'loading="lazy"')}${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ""}</figure>`).join("\n")}
    </div>
  </div>
</section>

` : ""}<section class="section" style="padding-top: 0">
  <div class="wrap">
    <h2 style="margin-bottom: 28px">How it works</h2>
    <ol class="steps">${ac.steps.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join("")}</ol>
  </div>
</section>

<section class="section section--tint">
  <div class="wrap profile">
    ${photo(teresa.photo, teresa.photoAlt, "(max-width: 760px) 92vw, 440px", 'loading="lazy"')}
    <div class="prose">
      <span class="eyebrow">Your acupuncturist</span>
      <h2>${esc(teresa.name)}</h2>
      <p>${esc(teresa.role)}</p>
      ${teresa.bio ? `<p>${esc(teresa.bio)}</p>` : ""}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap ${fees ? "split" : ""}">
    ${fees}
    <div class="faq" style="max-width: none">
      <h2 style="margin-bottom: 20px">Acupuncture questions</h2>
${ac.faq.map((f, i) => `      <details${i === 0 ? " open" : ""}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n")}
    </div>
  </div>
</section>

<section class="cta-band">
  <div class="wrap">
    <div><h2>Wondering if acupuncture could help?</h2><p>${esc(clinic.name)} · ${esc(clinic.address.line1)}, ${esc(clinic.address.locality)} · ${esc(clinic.email)}</p></div>
    <div class="btn-row"><a class="btn btn--book btn--lg" ${href(ACU.bottomBook)}>${esc(ACU.bottomBook.text)}</a><a class="btn btn--ghost btn--lg" href="${tel}">${esc(ACU.bottomCall.text)} ${esc(clinic.phone)}</a></div>
  </div>
</section>`;
  return page({ title: `Veterinary acupuncture in Malta | ${clinic.name}`, description: ac.intro, pathName: "/acupuncture/" }, main);
}

function privacyPage() {
  const main = `<div class="wrap text-page">
  <h1>Privacy</h1>
  <p>This website does not use cookies, analytics or advertising trackers. The only personal information it collects is what you choose to send us through the contact form. Fonts and images are served from this website itself.</p>
  <h2>Contact form</h2>
  <p>${esc(CP.privacyPageText)}</p>
  <h2>Booking appointments</h2>
  <p>Online bookings are handled by our booking system, Provet Cloud, at <a ${href(OTHER.privacyBooking)}>${esc(OTHER.privacyBooking.text)}</a>. Information you enter there is processed under Provet's privacy policy and ours as your veterinary practice.</p>
  <h2>Installing the app</h2>
  <p>If you add ${esc(clinic.name)} to your home screen, your phone stores copies of these pages so they open quickly and work offline. No personal data is stored.</p>
  <h2>Contact</h2>
  <p>For any privacy question, email <a href="${mail}">${esc(clinic.email)}</a> or call <a href="${tel}">${esc(clinic.phone)}</a>.</p>
</div>`;
  return page({ title: `Privacy | ${clinic.name}`, description: `How ${clinic.name} handles your information.`, pathName: "/privacy/" }, main);
}

function contactPage() {
  const F = CP.fields;
  const field = (name, label, type, extra = "") => `<label class="field"><span>${esc(label)}</span>${type === "textarea" ? `<textarea name="${name}" rows="6" ${extra}></textarea>` : `<input type="${type}" name="${name}" ${extra}>`}</label>`;
  const main = `<section class="page-hero page-hero--slim">
  <div class="wrap">
    <div class="page-hero__copy">
      <span class="crumbs"><a ${href(CONTACT_LINK.breadcrumbHome)}>${esc(CONTACT_LINK.breadcrumbHome.text)}</a> / ${esc(CP.title)}</span>
      <h1>${esc(CP.title)}</h1>
      <p>${esc(CP.intro)}</p>
      <div class="btn-row"><a class="btn btn--book" ${href(CONTACT_LINK.book)}>${icon("calendar")}${esc(CONTACT_LINK.book.text)}</a></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap contact-page">
    <div class="contact-form-card">
      <h2>${esc(CP.formTitle)}</h2>
      <p class="contact-urgent">${icon("phone")}<span>${esc(CP.urgentNote)} <a href="${tel}">${esc(clinic.phone)}</a></span></p>
      ${MESSENGER ? `<p class="contact-messenger">${String(CP.messengerNote || "").trim() ? `<span>${esc(CP.messengerNote)}</span>` : ""}<a class="btn btn--outline" ${msgr}>${icon("chat")}${esc(CONTACT_LINK.messengerButton.text)}</a></p>` : ""}
      <form class="contact-form" name="contact" method="POST" action="/contact/thanks/" data-netlify="true" netlify-honeypot="company">
        <p class="hp" aria-hidden="true"><label>Leave this empty <input name="company" tabindex="-1" autocomplete="off"></label></p>
        ${field("name", F.name, "text", 'required autocomplete="name" maxlength="120"')}
        ${field("email", F.email, "email", 'required autocomplete="email" maxlength="200"')}
        <div class="field-row">${field("phone", F.phone, "tel", 'autocomplete="tel" maxlength="40"')}${field("pet", F.pet, "text", 'maxlength="120"')}</div>
        ${field("message", F.message, "textarea", 'required maxlength="4000"')}
        <button class="btn btn--book btn--lg" type="submit">${icon("mail")}${esc(CP.button)}</button>
        <p class="contact-form__privacy">${esc(CP.privacyNote)} <a ${href(CONTACT_LINK.privacy)}>${esc(CONTACT_LINK.privacy.text)}</a>.</p>
      </form>
    </div>
    <aside class="contact-details">
      <h2>${esc(CP.detailsTitle)}</h2>
      <a class="contact__phone" href="${tel}">${icon("phone")}${esc(clinic.phone)}</a>
      <a class="contact-details__email" href="${mail}">${icon("mail")}${esc(clinic.email)}</a>
      ${MESSENGER ? `<a class="contact-details__messenger" ${msgr}>${icon("chat")}${esc(CONTACT_LINK.messengerDetails.text)}</a>` : ""}
      <p class="contact-details__address">${icon("pin")}<span>${esc(clinic.name)}<br>${esc(fullAddress)}</span></p>
      <a class="btn btn--primary" ${href(CONTACT_LINK.map)}>${esc(CONTACT_LINK.map.text)}</a>
      <h3 id="hours">${esc(CP.hoursTitle)}</h3>
      <dl class="hours">${C.hours.map((h) => `<dt>${esc(h.days)}</dt><dd>${hoursText(h)}</dd>`).join("")}</dl>
    </aside>
  </div>
</section>`;
  return page({ title: `${CP.title} | ${clinic.name}`, description: `${CP.intro}`, pathName: "/contact/" }, main);
}

function contactThanksPage() {
  return simplePage(CP.thanksTitle, `<h1>${esc(CP.thanksTitle)}</h1><p>${esc(CP.thanksText)} <a href="${tel}">${esc(clinic.phone)}</a></p><p style="margin-top: 16px"><a class="btn btn--primary" ${href(CONTACT_LINK.thanksHome)}>${esc(CONTACT_LINK.thanksHome.text)}</a></p>`, "/contact/thanks/");
}

function simplePage(title, body, pathName) {
  return page({ title: `${title} | ${clinic.name}`, description: clinic.description, pathName }, `<div class="wrap text-page">${body}</div>`);
}

function bookRedirect() {
  // Short link used by the app's "Book" shortcut: /book/ forwards to links.app.bookShortcut.url.
  const to = APP.bookShortcut.url.trim();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Booking…</title><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${esc(to)}"><script>location.replace(${JSON.stringify(to).replace(/</g, "\\u003c")})</script></head><body><p><a href="${esc(to)}">Continue to online booking</a></p></body></html>`;
}

// ---------- app files ----------
function manifest() {
  return JSON.stringify({
    name: `${clinic.name} Vet Clinic`,
    short_name: clinic.name,
    description: clinic.description,
    id: "/",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: C.settings.themeColor,
    lang: C.settings.language,
    categories: ["health", "lifestyle", "medical"],
    icons: BRAND.appIcon
      ? [
          { src: BRAND.appIcon, sizes: "192x192", purpose: "any" },
          { src: BRAND.appIcon, sizes: "512x512", purpose: "any" },
        ]
      : [
          { src: "/assets/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/assets/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/assets/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    shortcuts: [
      { name: APP.bookShortcut.text, short_name: APP.bookShortcut.shortText, url: "/book/", icons: [{ src: BRAND.appIcon || "/assets/icons/icon-192.png", sizes: "192x192" }] },
      { name: APP.acupunctureShortcut.text, short_name: APP.acupunctureShortcut.shortText, url: APP.acupunctureShortcut.url.trim(), icons: [{ src: BRAND.appIcon || "/assets/icons/icon-192.png", sizes: "192x192" }] },
    ],
  }, null, 2);
}

function serviceWorker(version, precache) {
  return `// PawMedics service worker — lets the site install as an app and open offline.
// VERSION changes automatically every time the site is rebuilt, so phones pick up updates.
const VERSION = ${JSON.stringify(version)};
const CACHE = "pawmedics-" + VERSION;
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("pawmedics-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // booking system, maps etc. go straight to the network

  // Pages: try the network first so changes show straight away; fall back to the saved copy, then the offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("/offline/")))
    );
    return;
  }

  // Styles, fonts, images: use the saved copy, fetch and save it if missing.
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
`;
}

const appJs = () => `// Small helpers: mobile menu, app install, offline support.
(function () {
  var btn = document.querySelector(".menu-btn");
  var nav = document.getElementById("mobile-nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    nav.addEventListener("click", function (e) { if (e.target.tagName === "A") { nav.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); } });
  }

  // Notices: show only those whose dates include today (Malta time), so they switch on and off by themselves.
  var box = document.getElementById("notices");
  if (box) {
    var today;
    try { today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Malta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { var d = new Date(); today = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
    var any = false;
    box.querySelectorAll(".notice").forEach(function (n) {
      if (today >= n.getAttribute("data-from") && today <= n.getAttribute("data-until")) { n.hidden = false; any = true; }
    });
    if (any) box.hidden = false;
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
  }

  // "Install the app" button — only appears when showInstallButton is true in content/site.json
  if (document.body.dataset.install === "on") {
    var deferred = null;
    var installBtns = document.querySelectorAll(".install-btn");
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault(); deferred = e;
      installBtns.forEach(function (b) { b.hidden = false; });
    });
    installBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        if (!deferred) return;
        deferred.prompt();
        deferred.userChoice.finally(function () { deferred = null; installBtns.forEach(function (x) { x.hidden = true; }); });
      });
    });
  }
})();
`;

// ---------- build ----------
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, e.name), d = path.join(to, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}
function write(rel, data) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
}
function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join("/")];
  });
}

fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(SRC, "assets"), path.join(OUT, "assets"));

// Fetch the logo / app icon from their links (e.g. ImgBB) and save copies inside the site,
// so visitors never load anything from ImgBB and the app still shows the logo offline.
async function saveRemoteImage(url, baseName) {
  if (!url) return null;
  // A path starting with "/" is a file already inside the site (src/assets/...), e.g. "/assets/brand/logo-mark.png".
  if (url.startsWith("/")) {
    if (!fs.existsSync(path.join(SRC, url.replace(/^\//, "")))) stop(`logo: the file ${url} doesn't exist in src${url}.`);
    return url;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const type = (res.headers.get("content-type") || "").split(";")[0];
    const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg", "image/gif": "gif" }[type];
    if (!ext) throw new Error("not an image (" + type + ") — use the ImgBB *direct* link");
    const rel = `assets/brand/${baseName}.${ext}`;
    fs.mkdirSync(path.join(OUT, "assets", "brand"), { recursive: true });
    fs.writeFileSync(path.join(OUT, rel), Buffer.from(await res.arrayBuffer()));
    console.log(`Saved ${baseName} from ${url}`);
    return "/" + rel;
  } catch (err) {
    console.warn(`Warning: couldn't download ${baseName} (${err.message}). Linking to it directly instead.`);
    return url;
  }
}
const logoCfg = C.logo || {};
BRAND.logo = await saveRemoteImage((logoCfg.url || "").trim(), "logo");
BRAND.appIcon = await saveRemoteImage((logoCfg.appIconUrl || "").trim(), "app-icon");

const css = fs.readFileSync(path.join(SRC, "styles.css"), "utf8");
const js = appJs();
// Version = fingerprint of the content + code, so any change produces a new version.
ASSET_V = crypto.createHash("sha256")
  .update(JSON.stringify(C)).update(ADV.files).update(css).update(js).update(fs.readFileSync(new URL(import.meta.url)))
  .digest("hex").slice(0, 10);

write("styles.css", css);
write("app.js", js);
write("index.html", homePage());
write("acupuncture/index.html", acupuncturePage());
write("privacy/index.html", privacyPage());
write("contact/index.html", contactPage());
write("contact/thanks/index.html", contactThanksPage());
write("offline/index.html", simplePage("You're offline", `<h1>You're offline</h1><p>We can't load this page without an internet connection. You can still call us on <a href="${tel}">${esc(clinic.phone)}</a>.</p><p style="margin-top: 16px"><strong>Opening hours</strong><br>${C.hours.map((h) => `${esc(h.days)}: ${hoursText(h)}`).join("<br>")}</p>`, "/offline/"));
write("404.html", simplePage("Page not found", `<h1>Page not found</h1><p>Sorry, that page doesn't exist. <a ${href(OTHER.notFoundHome)}>${esc(OTHER.notFoundHome.text)}</a> or <a ${href(OTHER.notFoundBook)}>${esc(OTHER.notFoundBook.text)}</a>.</p>`, "/404"));
write("book/index.html", bookRedirect());
if (ADV.list.length) {
  write("advice/index.html", adviceIndexPage());
  ADV.list.forEach((a) => write(`advice/${a.slug}/index.html`, advicePage(a)));
}
write("manifest.webmanifest", manifest());
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
// Sitemap: drafts are never listed (they are only on the preview site, marked "noindex").
const advPublished = ADV.list.filter((a) => !a.draft);
const sitemapUrls = [["/"], ["/acupuncture/"], ["/contact/"], ["/privacy/"],
  ...(advPublished.length ? [["/advice/", advPublished.map((a) => a.updated).sort().pop()]] : []),
  ...advPublished.map((a) => [a.url, a.updated])];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map(([u, d]) => `  <url><loc>${SITE}${u}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`);
// Hosting rules (Netlify and Cloudflare Pages both read this file)
write("_headers", `/sw.js
  Cache-Control: no-cache
/manifest.webmanifest
  Content-Type: application/manifest+json
/assets/*
  Cache-Control: public, max-age=604800
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`);

const precache = ["/", "/acupuncture/", "/contact/", "/privacy/", "/offline/", `/styles.css?v=${ASSET_V}`, `/app.js?v=${ASSET_V}`, "/manifest.webmanifest",
  ...walk(path.join(OUT, "assets")).filter((f) => !f.endsWith(".txt") && !f.endsWith(".jpg") && !f.startsWith("img/") && !f.endsWith(".gitkeep")).map((f) => "/assets/" + f)];
// Photos are left out of the preload above to keep each new visitor's download small (Netlify bandwidth);
// the service worker still saves each photo the first time it is shown, so viewed pages work offline.
write("sw.js", serviceWorker(ASSET_V, precache));

console.log(`Built ${clinic.name} site → dist/  (version ${ASSET_V}, ${walk(OUT).length} files)`);
if (ADV.all.length) console.log(`Pet care advice: ${ADV.list.length} of ${ADV.all.length} articles on this version (${ADV.isLive ? "live site: published articles only" : "preview/local: drafts included"}).`);
