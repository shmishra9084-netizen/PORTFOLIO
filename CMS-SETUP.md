# Connect the portfolio CMS (free Supabase project)

The portfolio still works on GitHub Pages. `/admin.html` is its owner studio. A Supabase project provides real email/password authentication, project data and image storage. No passwords or GitHub tokens are embedded in the site.

Until the connection below is completed, the public site uses `data/projects.json` and the studio clearly shows that setup is needed. Login/upload/publishing are not live before configuration.

1. Create a free Supabase project at https://supabase.com/dashboard. Keep the database password private.
2. Open the project's **SQL Editor**. Paste and run the full contents of `supabase/setup.sql`. This creates the content table, owner permissions and public image bucket. The script can be rerun.
3. In **Authentication → Users → Add user**, create your own email/password account. Do not enable public signup; disable “Allow new users to sign up” in the project's authentication settings. Do not send your password in chat.
4. In the SQL Editor, replace the sample email with the account you just created, then run:

   ```sql
   insert into public.portfolio_admins(user_id)
   select id from auth.users where email = 'YOUR_OWNER_EMAIL'
   on conflict do nothing;
   ```

   Confirm one row appears in `portfolio_admins`. Merely creating an auth account does not grant permission to publish.
5. Find the **Project URL** and **publishable key** in the project's Connect/API settings (a legacy `anon` key also works). These are public browser configuration. Set them in `cms-config.js` and push that file to `main`:

   ```js
   export const cmsConfig = {
     url: 'https://YOUR_PROJECT.supabase.co',
     publishableKey: 'YOUR_PUBLIC_PUBLISHABLE_KEY'
   };
   ```

   Never use a `service_role`, `sb_secret_...`, database password, or personal password in this file. Anyone can read public website files. Database and storage policies restrict writes to your designated owner.
6. After GitHub Pages deploys, open `https://shmishra9084-netizen.github.io/PORTFOLIO/admin.html` and sign in with the owner email and password.
7. Existing projects load into the editor. **Add project**, enter details, and select multiple images. The first image is the cover. Reorder/remove images, add descriptions and use the gallery preview. **Save project changes** keeps the edit in the current editing session; **Publish to website** saves it permanently to Supabase. Refreshing/closing the tab before publication loses unsaved edits.
8. Open the public site in another tab. Each project has its own card. A normal click opens its gallery in an animated centered overlay on the same page. Its shareable direct page remains available at `gallery.html?project=PROJECT_ID`. A project gallery contains only that project's images, metadata and film. Image navigation never crosses into another project. Multiple images use the 3D cover flow; a one-image project shows just that image. Reserved character galleries and missing render slots use the requested blank PNG placeholders. Replace those files through GitHub at the same paths, or replace the images in the CMS. Use **Add project** for a new perfume, forest, gameplay or character; add different views of the same model inside its existing project.


## Media and limits

- Accepted images: JPG, PNG, WebP, AVIF; 8 MB each; 12 per project; 40 MB per editor publishing batch.
- The public portfolio and images are intentionally readable without login. Only the owner can insert/update content or upload images. Registered non-owner users cannot publish.
- Images use unique filenames. Removing a project/image removes it from the gallery, not from the storage bucket. Delete unused storage objects manually in the dashboard when needed. Failed publications may leave unused uploads. Keep an eye on the free plan's storage/egress limits.
- Video upload is not implemented: use an existing HTTPS MP4/WebM URL or a repository `assets/` video path. New image uploads go to Supabase storage.
- Login sessions are stored in this tab's session storage; signing out clears the session. Use a trusted browser. The studio has no public signup or password reset flow; manage your owner account in Supabase.
- Simultaneous edits are detected using a revision check. If publication conflicts, preserve your local text/images, reload and reapply the edits to the latest version. Nothing is silently overwritten.
- First publication moves project management to Supabase. `data/projects.json` stays as the fallback if the backend is unreachable; it does not automatically mirror CMS changes. Export/back up your content and storage from Supabase periodically.

## Verify the real backend after connection

- Owner can sign in, upload a two-image project and publish it.
- A second browser with no session sees the new project and both images.
- Owner can edit/reorder/delete a project and publish the change.
- Anonymous REST insert/update and storage upload requests are denied.
- A non-owner authenticated account is also denied writes.

Local browser integration checks use a simulated API because this repository has no Supabase account credentials or live project configured. Those checks do not prove your actual backend permissions. Complete the above real-service checks after running the SQL and supplying the public configuration.

## Browser integration regression test

With Python 3, Playwright and Chromium installed, serve the checkout with `python3 -m http.server 8000 --bind 127.0.0.1` and run `node tests/cms-browser.cjs`. `PORTFOLIO_TEST_BASE_URL` can override the local server address. This test intercepts the CMS configuration and remote API in its browser context; it does not modify `cms-config.js`, use real credentials or publish to an actual backend. It exercises login permissions, multi-image upload, ordering, publishing, viewing, edit/delete, concurrent-edit errors, logout and responsive layouts. Chromium is expected at `/usr/bin/chromium` in the prepared cloud environment.

Run `node tests/orbit-browser.cjs` against the same local server for 3D side-card selection, looping, pointer dragging, keyboard controls, grid switching, responsive layouts, reduced motion, and single/two/twelve-image edge cases. The carousel is implemented locally without the external libraries or sample photos used by the uploaded reference.
