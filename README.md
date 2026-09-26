# auto-import-demo

Static demo of the auto_parser public pages (live parser data, no backend).

- Published via GitHub Pages: https://yurch24.github.io/auto-import-demo/
- Source of truth: local project `E:\WEB_design\auto_parser` -> `deploy/export_demo.py --out docs/site`
- Contains only HTML/CSS/JS/images. No Python, no database, no admin panel.
- `noindex, follow` is set; forms and API are disabled by `static/js/demo.js`.

## Run locally

    python -m http.server 8080
