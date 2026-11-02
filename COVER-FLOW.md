# Categorized 3D cover-flow decks

Open `cover-flow-demo.html` for the standalone vanilla HTML/CSS/JavaScript example, or use the portfolio's Selected Work section. Serve files over HTTP so browser ES modules and JSON requests work:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

There are no runtime frameworks, remote font/icon dependencies, or WebGL packages. CSS perspective and the Web Animations API provide the depth and transitions. The component has no continuously running animation frame loop.

## Behavior

- **All** shows every project's renders; category tabs restrict the project list. A project tab loads only that project's images. Deck changes fade out/in; rapid changes keep only the newest selection.
- The active card uses `scale(1.08)`, opacity `1` and z-index `30`. Exactly two side previews use `scale(.85)`, opacity `.7`, z-index `10` and left/right Y rotations of `+10deg`/`-10deg`. Standby images have opacity zero and cannot receive focus or pointer hits.
- Single-image projects show one card. Two-image projects repeat the other image at the two edges so the circular deck still has left and right previews; the logical counter remains two images.
- Scroll the mouse wheel **over the cards**, drag/swipe, use focused left/right arrow keys, or select a side card to advance. Wheel input is normalized and throttled for trackpads; Ctrl+wheel keeps browser zoom. Page scrolling outside the stage is unaffected.
- Autoplay has a pause control, stops for manual interaction and pauses when offscreen, hidden or covered by a project viewer. Reduced motion disables automatic rotation and transitions by default. The portfolio's existing explicit Animations control can override that preference.
- Software, asset breakdown and lighting/render details appear below the cards. Missing values are shown as “Not specified”; the implementation does not invent software or render facts.
- Opening a render from its project deck opens the corresponding image in the project viewer. “All projects” switches to the grid, which shares the active category/project filter.

## Data and editor

Public fallback data lives in `data/projects.json`. The owner studio supports the same optional metadata; real CMS connection remains described in `CMS-SETUP.md`.

Each project accepts these optional strings:

```json
{
  "software": "Your actual software and versions",
  "breakdown": "Your actual asset construction, topology and materials",
  "renderInfo": "Your actual renderer and lighting setup"
}
```

Each image can also have a `label` (up to 100 characters), for example `Clay render`, `Wireframe`, `Textured beauty` or `Detail close-up`. Upload the real images and set the matching labels; no artificial clay/wireframe images are generated from beauty shots. Existing projects without these new fields remain valid.

## Reuse

`OrbitCarousel` is the lower-level looping card component. `ProjectDecks` adds accessible category/project tabs, metadata, auto-rotation and deck switching:

```html
<link rel="stylesheet" href="orbit-carousel.css">
<section id="my-decks"></section>
<script type="module">
  import {ProjectDecks} from './project-decks.js';
  const response = await fetch('data/projects.json');
  const data = await response.json();
  const decks = new ProjectDecks(document.getElementById('my-decks'), {
    prefix: 'myDeck', // unique control IDs if embedding several components
    onOpen: (project, triggerButton, imageIndex) => {
      // Open your own project viewer; preserve triggerButton for focus restoration.
      console.log(project.id, imageIndex);
    }
  });
  await decks.setProjects(data.projects);
</script>
```

## Validation

With the checkout's prepared Playwright/Chromium environment and local server:

```sh
node tests/orbit-browser.cjs
node tests/cms-browser.cjs
```

The cover-flow checks include exact depth values, category/project filtering, looping, wheel/drag/arrows, opening the selected image, filtering the grid, rapid-switch races, four viewport sizes, reduced motion, 1/2/12-image edge cases and the standalone demo. CMS checks use a simulated backend and include the new labels and metadata; a real Supabase project is still required to validate live authentication, storage and publishing policies.
