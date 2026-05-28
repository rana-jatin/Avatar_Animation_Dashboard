# Avatar Animation Dashboard

This is a Vite-based Three.js dashboard for loading and inspecting avatar GLB files. It ships with a lightweight UI for viewing the model, checking animation and morph counts, and uploading alternate GLB assets at runtime.

## Features

- Interactive 3D avatar viewer powered by `three`
- Upload a local `.glb` file to inspect a different model
- Animation, procedural action, and morph summary in the UI
- Best-effort auto-load of the bundled `Smur_male6.glb` asset when available

## Getting Started

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal, then use the upload UI to load a GLB file if needed.

## Scripts

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run preview` - preview the production build locally

## Notes

- The app expects the bundled model at `Smur_male6.glb` if you want the default avatar to load automatically.
- `node_modules/` and build output are ignored in version control.