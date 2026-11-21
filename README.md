# PawMedics website and app

This folder holds the complete PawMedics website for **pawmedicsmalta.com**. The same files
also work as an installable app on Android phones and iPhones, so every change is made in
one place and shows up on the website and in the app together.

You don't need to understand code to use this. Almost everything you'd ever want to change
is in one file, `content/site.json`, and this guide explains all of it.

---

## 1. What's inside

| Folder / file | What it is | Do you need to touch it? |
|---|---|---|
| `content/site.json` | **All the clinic details:** logo, hours, phone, services, vets, FAQs, acupuncture page. | **Yes, this is the one place to change things.** |
| `dist/` | The finished website, ready to upload. Rebuilt from the content file every time. | Only to upload it (see section 2). Never edit it, because it's overwritten on every rebuild. |
| `src/assets/img/` | The vet and acupuncture photos. | Only to swap photos (see section 6). |
| `src/assets/icons/` | The placeholder paw icons, used until the real logo is added. | No |
| `src/assets/fonts/` | The fonts (Montserrat, Inter, Caveat), stored here so the site loads nothing from Google. | No |
| `src/styles.css` | The design: colours, sizes, layout. | No (ask Claude) |
| `build.mjs` | The builder that turns the content file into the finished website. | No |
| `netlify.toml` | Hosting settings for Netlify. | No |

---

## 2. Going live (one-time setup)

Use **Netlify** or **Cloudflare Pages**. Both are free for a site this size and give the site
HTTPS (the padlock), which the app features need.

best for the long run (changes publish themselves)**
1. Put this whole folder in a GitHub repository (Claude can walk you through this).
2. In Netlify or Cloudflare Pages, choose *Import from GitHub* and pick the repository.
3. Settings: build command `node build.mjs`, publish / output folder `dist`.
4. Add the domain as in Option A, step 3.

From then on, saving a change to `content/site.json` on GitHub (you can edit it straight in the
browser on github.com) rebuilds and publishes the site within a minute or two.

---

## 3. Making changes

**The easy way:** ask Claude, for example *"change Saturday hours to 9am–1pm"* or *"hide the
dentistry service"*. Claude edits `content/site.json`, rebuilds, and gives you the updated folder.

**Doing it yourself:** open `content/site.json` in any text editor (or on github.com) and change
the text between the quotes. Rules that keep the file working:

- Only change text **inside** the quotes `"…"`. Keep the quotes, the colons `:` and the commas `,`.
- `true` and `false` have **no** quotes.
- When you add an item to a list, copy an existing item **including its curly brackets** `{ … }`
  and put a comma between items, but **not** after the last one.
- To check the file before publishing, paste it into **jsonlint.com**. It points out any
  missing comma or quote.
- If something is wrong in the file, the build stops with an error and **the live site stays as
  it was**. Nothing breaks for visitors.

**Updates on phones:** the website, the installed Android app and the installed iPhone app all
use the same files. Every rebuild gets a new version number automatically, and phones switch to
it the next time the app is opened.

---

## 4. The content file, section by section

The same guide is at the top of `content/site.json`, under `_howTo`. The builder ignores that
section, so it's safe to leave it there.

| Section | What it controls | Notes |
|---|---|---|
| `settings` | Web address, language, app colour, install button. | `showInstallButton`: `false` for now; set to `true` in the app phase (section 8). `themeColor` is the colour of the phone's top bar when the app is open. |
| `logo` | Logo in the header, app icon on phones. | See section 5. |
| `clinic` | Name, phone, email, address, Facebook rating line. | `phone` is how the number is **shown**; `phoneInternational` is what phones **dial** (keep the `+356`). Every Call and Email button uses these. Update `facebookRating` now and then; it's shown as written. |
| `links` | **Every link and button on the site**, each with its own wording (`text`) and address (`url`), grouped by page: `everyPage` (top bar, menu, footer, phone bottom bar), `homePage`, `acupuncturePage`, `otherPages` (privacy and "page not found") and `app` (the installed app's long-press shortcuts). | Each booking button has its **own** link, so "Book an appointment", "Book online" and "Book an acupuncture session" can go to different places. A `url` can be a web address (`https://…`) or a page on this site (`/acupuncture/`, `/#contact`). Entries with `text` but no `url` are Call or Email buttons, which always use the phone and email in `clinic`. The `menu` is a list; copy an item to add a menu link. The app's acupuncture shortcut must be a page on this site. Fixed on purpose: the logo (always goes home) and the hidden "Skip to content" link for screen readers. If a link entry is missing or empty, the build stops and says which one. |
| `hours` | Opening hours: top bar, contact section, footer, offline page, and Google's opening-hours data. | Times use 24-hour format (`"19:00"`) and are shown as 7pm. For a closed day use `"closed": true`. `schemaDays` tells Google which days a row covers (English day names). |
| `emergency` | The emergency text. | The same message also appears in the first FAQ and the "Summer heat" tip; update those too if it changes. |
| `sisterClinic` | The Vetcare card in "Two clinics, one team". | Vetcare is linked from three places, each set separately in `links`: `everyPage.topBarSisterClinic` (top bar, hidden on phones), `homePage.heroSisterClinic` (under the main booking buttons) and `homePage.sisterClinic` (the Vetcare card). |
| `hero` | The big headline, small label and intro text at the top of the home page. | |
| `vets` | Names, roles, bios and photos. | Keep **Dr. Andrew first and Dr. Teresa second**: the home-page photo pair and the acupuncture page rely on this order (section 6). An empty `bio` (`""`) is simply hidden. |
| `services` | The service cards. | `"show": false` hides a service without deleting it. `"featured": true` gives a card the purple outline. `"link"` adds a link at the bottom of the card; `"linkText"` is its wording ("Learn more" if left out). |
| `maltaTips` | The four "Pet care in Malta" cards. | `icon` can be `bug`, `sun`, `plane` or `paw`. |
| `faq` | Home-page questions. | The first one is shown open. |
| `acupuncture` | Everything on the acupuncture page plus the acupuncture block on the home page. | `homeTeaser` is the home-page text. `fees` starts empty, so no fees box is shown; add rows like `{ "label": "Initial consultation", "price": "€XX" }` and the box appears with a Book button. |

---

## 5. Logo and app icon (via ImgBB)

1. Go to **imgbb.com** and upload the logo.
2. Open the uploaded image, choose **"Direct links"** from the embed-codes menu, and copy the link
   that starts with `https://i.ibb.co/…` and ends in `.png` or `.jpg`.
   The ordinary page link (`https://ibb.co/…`) **won't work**, because it points at a web page, not the image.
3. Paste it into `logo.url` in `content/site.json`.
4. For the **app icon** (shown on the phone's home screen and as the browser-tab icon), upload a
   **square** version, ideally **512 × 512 pixels, PNG**, and paste its direct link into `logo.appIconUrl`.
5. If the logo already contains the word "PawMedics", set `"showNameNextToLogo": false` so the name
   isn't shown twice. `logo.alt` is the description read out by screen readers.

**What happens behind the scenes:**
- When the site is built, the builder **downloads a copy** of the logo and icon from ImgBB and saves it
  inside the site (`dist/assets/brand/`). Visitors never load anything from ImgBB, the logo still
  shows when the app is offline, and it keeps working even if the ImgBB upload is later deleted.
- If the download fails (a wrong link, ImgBB unavailable, or the build running somewhere without
  internet access), **the build still finishes**: it prints a warning and the page links straight to
  the ImgBB address instead. The logo still displays, but it's loaded from ImgBB and won't show offline.
- Claude's own workspace can't reach ImgBB. A build made by Claude therefore uses the direct ImgBB
  link. A build on Netlify or Cloudflare Pages (Option B in section 2) downloads the proper copy.
- While both fields are empty (`""`), the placeholder purple paw is used everywhere.

---

## 6. Photos and the "Vet / Not Vets" arrows

The photos live in `src/assets/img/`. Each comes in two sizes (`-480.webp` for phones,
`-900.webp` for larger screens) plus a `.jpg`:

| File name | Used for |
|---|---|
| `dr-andrew` | Home-page photo pair (left) and Dr. Andrew's "Meet our vets" card |
| `dr-teresa` | Home-page photo pair (right), Dr. Teresa's card, and "Your acupuncturist" on the acupuncture page |
| `acupuncture` | Home-page acupuncture block, acupuncture-page header, and the preview image when the site is shared on social media |

They were cropped and lightly brightened for the web, and are kept small so pages load quickly.

**Important:** the hand-drawn **"Vet" / "Not Vets" arrows** on the home page were measured for
**these exact photos**. Each arrow stops just before a vet's or dog's head. The photo box keeps the same
shape on every screen, so the arrows line up on phones and desktops alike. **If a photo is replaced,
ask Claude to redraw the arrows**, otherwise they'll point at the wrong spots.

---

## 7. Already built in

- **Works on every screen.** On phones there's a menu button and a **Call / Book bar** fixed at the
  bottom of the screen.
- **App-ready:** an app manifest, app icons and offline support. On Android, long-pressing the
  installed app icon shows **Book** and **Acupuncture** shortcuts (`/book/` forwards to the link set in
  `links.app.bookShortcut`).
- **Opens offline:** pages already visited still load; anything else shows a page with the phone
  number and opening hours.
- **Google-friendly:** page titles and descriptions, a sitemap, and the clinic's address, phone and
  opening hours in the format Google uses for local search results.
- **Privacy-friendly:** no cookies, no analytics, no trackers, and fonts and photos served from the
  site itself, so **no cookie banner is needed**. A short Privacy page explains this.
- **Booking stays on Provet** (`my.provet.com/pawmedics-limited/pawmedics-limited`), so appointments, records and
  invoices aren't duplicated and no client data is stored by the website.
- **Emergency handling:** the clinic has no out-of-hours service, so the site directs people to the
  government's National Veterinary Emergency Service clinic in Reggie Miller Square, Fgura.

**Choices made on purpose:**
- **No EN/MT language switch** yet, because there's no Maltese version of the text. It can be added
  once the text is translated.
- **A "Open in Google Maps" button instead of an embedded map.** An embedded Google map would load
  Google tracking and need a cookie banner.

---

## 8. Phase 2: the app

**Step 1: let people install it from the website (free).**
In `content/site.json` set `"showInstallButton": true`. An **"Install the app"** button then appears
in the footer on Android phones and desktop Chrome. iPhone users install it with
Share → *Add to Home Screen* (Apple doesn't allow an install button).

**Step 2: list it in the app stores (optional).**
Use PWABuilder (pwabuilder.com): enter `https://pawmedicsmalta.com` and it generates the store
packages **from this same website**, so it's still one place to edit.
- **Google Play** needs a Google Play developer account (one-time fee). PWABuilder also gives you a
  small `assetlinks.json` file. Claude adds it to the site so Android trusts the app.
- **Apple App Store** needs an Apple Developer account (yearly fee) and a Mac to submit. Apple
  sometimes rejects apps that are just a website, so add genuinely useful app features first, such
  as vaccination reminders.

**Notifications** (booster reminders, closure notices) need a small extra service. They're best
added in this phase. Push notifications work on Android, and on iPhones once the app has been added
to the home screen.

---

## 9. Before-launch checklist

- [ ] **Logo and app icon:** paste the ImgBB direct links into `logo.url` and `logo.appIconUrl` (section 5).
- [ ] **Vet bios:** fill in each vet's `bio` (section 4, `vets`).
- [ ] **Services:** set `"show": false` on anything the Swatar clinic doesn't offer.
- [ ] **Emergency text:** confirm the wording about the Fgura clinic, and add its phone number if wanted.
- [ ] Optional: **acupuncture fees** (section 4, `acupuncture.fees`).
- [ ] After going live: submit `https://pawmedicsmalta.com/sitemap.xml` in Google Search Console,
      and add the website link to the PawMedics Facebook page and Google Business profile.

---

## 10. Notes for a developer

- Plain static site: `node build.mjs` (Node 18+, no npm packages) reads `content/site.json` and
  writes `dist/`. Templates live in `build.mjs`; styles in `src/styles.css`.
- `sw.js` is generated with a version hash of the content, code and styles. Pages are network-first
  with an offline fallback, and assets are cache-first and precached. Old caches are removed on activate.
- `_headers` (used by Netlify and Cloudflare Pages) disables caching of `sw.js` and sets basic security headers.
- Logo and app icon are fetched at build time into `dist/assets/brand/`; on failure the remote URL is used.
- No link is hard-coded in the templates except the logo (`/`) and the skip link (`#main`). Every other
  `href` comes from `links` in `content/site.json`, or from `clinic.phoneInternational` / `clinic.email`
  for `tel:` and `mailto:` links. `build.mjs` checks every `links` entry up front and exits with a
  plain-English error if one is missing or empty.
- The arrow overlay is an SVG on a fixed 380 × 352 grid over an `aspect-ratio` box, with
  `object-position: 50% 25%` on both photos.
