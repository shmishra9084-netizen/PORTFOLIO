# Mocha Wood — five uploaded renders

This folder feeds only this project's gallery:
https://shmishra9084-netizen.github.io/PORTFOLIO/gallery.html?project=project-2

## Replace the renders

- `render-01.jpeg` — first render / cover
- `render-02.jpeg` — second render
- `render-03.png` — third render
- `render-04.png` — fourth render
- `render-05.png` — fifth render

All five uploaded images are registered in `data/projects.json`, in this order. The homepage preview and centered gallery both use these files.

In GitHub, open this folder, select **Add file → Upload files**, and upload your replacement using the **exact same filename and extension**. Commit to `main`; GitHub Pages will rebuild. Use real JPEG files for `.jpeg` and real PNG files for `.png`. Keep filenames lowercase. `.jpg` and `.jpeg` are different paths on the website.

The old film was deleted, so this project currently shows images only. To add a film again, upload a real video and set its path in this project's `video` field in `data/projects.json`.

To change captions, project titles, add/remove slots or add a video, update this project's entry in `data/projects.json`. Merely adding a sixth file does not add it to the gallery. Do not put another project's images in this folder.
