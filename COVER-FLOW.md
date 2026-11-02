# Independent project galleries

The homepage lists project cover cards. Each card opens an independent page:

- `gallery.html?project=project-2` — Mocha Wood perfume
- `gallery.html?project=project-4` — Forest Light Study
- `gallery.html?project=gameplay-prototype` — Unreal Gameplay Prototype

Each page contains exactly one project's renders, metadata and optional film. Its image carousel loops within that project. It cannot advance into another project's work. Homepage category filters only filter the cover cards; “All projects” lists all cards, never a combined image deck.

New projects get a new stable ID and gallery URL when added through the owner editor. Put all angles/renders of the same model inside that project. A different model gets a separate project. The four reserved character galleries and missing render slots use explicitly requested blank PNGs. They contain no invented character artwork or unrelated project images. An unknown URL displays “Project not found.”

All 10 project galleries have four slots so the 3D animation works before the remaining renders are supplied. The homepage also previews each project with its own independent, non-interactive 3D carousel; selecting the card opens that project’s full gallery. The supplied Mocha Wood images are in one perfume gallery. The duplicate Product Motion Study entry used the same Mocha image and video, which remain in Mocha's gallery. Existing media files are preserved. Gameplay's existing screenshot and clip now have their own project entry. Four separate character galleries are prepared with blank render slots: male-01, male-02, female-01 and female-02. See assets/projects/README.md for replacement instructions.

## 3D cover-flow mechanics

`OrbitCarousel` in `orbit-carousel.js` and `orbit-carousel.css` uses vanilla JavaScript, CSS perspective and Web Animations. No external frameworks, icon/font libraries or WebGL packages are required.

- Front card: scale `1.08`, opacity `1`, z-index `30`, strong shadow.
- Two side previews: scale `.85`, opacity `.7`, z-index `10`, Y rotations `+10deg` and `-10deg`.
- Standby cards: zero opacity, no keyboard or pointer interaction.
- Wheel input over the stage, drag/swipe, focused arrow keys, buttons and side clicks navigate within the same project.
- Autoplay pauses offscreen, when the page is hidden, or on manual interaction. Reduced motion disables transitions and automatic rotation by default.
- One image means one card. Two images repeat the other image at both edges without changing the logical image count.

## Data and owner editor

`data/projects.json` is the public fallback collection. A connected CMS supplies the same structure. See `CMS-SETUP.md` for the still-required Supabase setup before real login/uploads can work.

Projects accept `software`, `breakdown` and `renderInfo` text fields. Images can have a `label`, such as `Clay render`, `Wireframe`, `Beauty shot` or `Detail close-up`, and descriptive `alt` text. Upload real images for each view; no artificial clay/wireframe content is generated. Missing metadata displays “Not specified.”

The editor's **Add project** creates a separate gallery. **Save project changes** saves within the editing session; **Publish** persists to the connected CMS. Published entries have an **Open gallery** link.

## Standalone demonstration and reuse

Serve the checkout over HTTP:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

`cover-flow-demo.html` demonstrates the standalone project switcher. It also selects one project at a time; there is no combined render deck.

For a dedicated gallery, pass exactly one project to `ProjectDecks`:

```js
import {ProjectDecks} from './project-decks.js';
const gallery = new ProjectDecks(document.getElementById('my-gallery'), {
  prefix: 'myGallery',
  singleProject: true,
  onOpen: (project, triggerButton, imageIndex) => {
    // Open this project's full-size image, preserving focus as appropriate.
  }
});
await gallery.setProjects([yourProject]);
```

`singleProject` rejects a collection containing more than one project. Even in the standalone switcher, render items are built only from the selected project.

## Validation

```sh
node tests/orbit-browser.cjs
node tests/cms-browser.cjs
```

Browser checks cover distinct gallery URLs, reloading deep links, image isolation, correct project films, unknown/unuploaded projects, exact depth mechanics, looping, wheel/drag/arrows, card filtering, four viewport sizes, reduced motion and 1/2/12-image edge cases. CMS integration tests use a simulated backend and verify a newly published project opens its own gallery. Real Supabase authentication, storage and authorization remain unverified until the external project is connected.

## Replace render files directly in GitHub

See [the project folder guide](assets/projects/README.md). Every project has its own folder and per-folder README. Existing media is preserved in the new folders; the missing views are blank PNGs. Keep each slot filename/extension and commit your replacement to main. This path does not require the optional Supabase CMS. Run `node tests/render-slots-browser.cjs` to verify all folders, media URLs, character galleries and preview animations.
