import { createViewer } from './viewer.js';
import { createIdle } from './idle.js';
import { buildUI } from './ui.js';

const DEFAULT_GLB_URL = new URL('../../Smur_male6.glb', import.meta.url).href;

const canvas = document.getElementById('stage');
const panelsEl = document.getElementById('panels');
const statusEl = document.getElementById('status');

function setStatus(msg) { statusEl.textContent = msg; }

(async () => {
  const viewer = await createViewer(canvas, setStatus);

  // Persistent idle controller — rebinds to each new armature.
  const idle = createIdle(null, null);
  viewer.setIdleUpdate(idle.update);

  async function onUploadFile(file) {
    setStatus(`Loading ${file.name}…`);
    try {
      const buf = await file.arrayBuffer();
      await viewer.loadGLB(buf, file.name);
    } catch (err) {
      console.error(err);
      setStatus(`Failed to load ${file.name}: ${err.message || err}`);
    }
  }

  viewer.onModelLoaded = (v) => {
    idle.rebind(v.armature, v.morphIndex);
    buildUI(panelsEl, { viewer: v, idle, onUploadFile });
    const counts = [];
    counts.push(`${v.animations.size} animation${v.animations.size === 1 ? '' : 's'}`);
    counts.push(`${v.procAnimations.actions.size} procedural`);
    counts.push(`${v.morphIndex.allNames.length} morphs (${v.morphIndex.arkit.length} ARKit)`);
    if (v.armature?.hasSkeleton) counts.push(`rig: ${v.armature.rig}`);
    setStatus(`${v.currentFileName || 'model'} · ${counts.join(' · ')}`);
  };

  // Render the upload-only UI immediately so the user can pick a file even if
  // the default GLB is missing.
  buildUI(panelsEl, { viewer, idle, onUploadFile });

  // Best-effort load of the default model. Failures are silent (we already
  // surface the upload UI).
  try {
    const probe = await fetch(DEFAULT_GLB_URL, { method: 'HEAD' });
    if (probe.ok) {
      await viewer.loadGLB(DEFAULT_GLB_URL, 'Smur_male6.glb');
    } else {
      setStatus('Upload a GLB to begin.');
    }
  } catch {
    setStatus('Upload a GLB to begin.');
  }
})().catch((err) => {
  console.error(err);
  setStatus('Failed to initialize — see console');
});
