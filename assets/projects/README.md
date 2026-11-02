# Project render folders

Each leaf folder belongs to one independent project gallery and contains four image slots. Known renders and videos have been moved here without altering their contents. Missing renders are real blank PNGs in slightly different dark navy shades so the 3D preview can already animate.

```text
assets/projects/
├── mocha-wood/
├── environment/
│   ├── forest/
│   ├── rain-night/
│   └── alcatraz/
├── characters/
│   ├── male-01/
│   ├── male-02/
│   ├── female-01/
│   └── female-02/
├── gameplay/
└── unreal-vfx/
```

## Replace a blank with your render — no code or Supabase needed

1. Open the appropriate folder on GitHub. Its own `README.md` lists the exact filenames and gallery link.
2. Export your image with the same **filename and extension**, for example `render-02.png`. Use an actual PNG for `.png` and an actual JPEG for `.jpg`; do not only rename an extension.
3. In that folder choose **Add file → Upload files** and upload the replacement.
4. Commit to `main`. Wait for **Actions → pages build and deployment** to complete successfully.
5. Refresh your portfolio. That slot changes in both the homepage's animated project preview and the independent gallery. Keep uppercase/lowercase exactly the same.

Replace one or all four slots whenever you are ready. Leave the others blank until you have renders. Existing real Mocha images are `render-01.jpg`, `render-02.jpg`, `render-03.jpg`; the blank fourth slot is `render-04.png`. Other existing projects have a JPEG in slot 01 and blank PNGs in slots 02–04. All four character galleries begin with four blank PNGs.

A folder containing a project film also has `film.mp4`, which can be replaced by another real MP4 of that filename. Character galleries have no fake film.

## Extra slots, captions and new projects

`data/projects.json` is the gallery manifest: it lists each project's image order, captions, title, category and optional video. Files added to a folder are **not** automatically discovered. To add a fifth render or a brand-new project, add its entry to the manifest (or use the owner CMS after connecting it).

Do not put different characters in one project folder. `male-01` and `male-02` are separate galleries, as are `female-01` and `female-02`.

The free GitHub replacement workflow above is available now and does not need login CMS setup. If you later connect and publish through Supabase, its saved project document takes priority over this fallback manifest; the referenced repository images still update when replaced at the same paths. Newly created local manifest projects will need to be added to the connected CMS too.
