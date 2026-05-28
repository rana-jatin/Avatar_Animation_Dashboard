// Runtime-generated AnimationClips that work on any uploaded armature.
// Each clip is built additively (relative to the rest pose) so it composes
// cleanly with the existing mixer and the idle behaviors.

import * as THREE from 'three';

const PI = Math.PI;
const D2R = PI / 180;

function quatTrack(bone, times, eulerOffsets) {
  const restQ = bone.quaternion.clone();
  const values = new Float32Array(times.length * 4);
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (let i = 0; i < times.length; i++) {
    const [x, y, z] = eulerOffsets[i];
    e.set(x, y, z, 'XYZ');
    q.setFromEuler(e).multiply(restQ);
    values[i * 4 + 0] = q.x;
    values[i * 4 + 1] = q.y;
    values[i * 4 + 2] = q.z;
    values[i * 4 + 3] = q.w;
  }
  return new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, values);
}

function posTrack(bone, times, positionOffsets) {
  const rest = bone.position.clone();
  const values = new Float32Array(times.length * 3);
  for (let i = 0; i < times.length; i++) {
    const [dx, dy, dz] = positionOffsets[i];
    values[i * 3 + 0] = rest.x + dx;
    values[i * 3 + 1] = rest.y + dy;
    values[i * 3 + 2] = rest.z + dz;
  }
  return new THREE.VectorKeyframeTrack(`${bone.name}.position`, times, values);
}

// ---- Clip generators (each takes the resolved armature, returns AnimationClip|null) ----

function buildWave(arm) {
  const sh = arm.resolved.rightUpperArm;
  const fa = arm.resolved.rightLowerArm;
  if (!sh) return null;
  // Raise arm overhead, then wave the forearm side-to-side.
  const t = [0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.5];
  const upZ = -110 * D2R;
  const shoulder = [
    [0, 0, 0],
    [0, 0, upZ],
    [0, 0, upZ],
    [0, 0, upZ],
    [0, 0, upZ],
    [0, 0, upZ],
    [0, 0, upZ * 0.4],
    [0, 0, 0],
  ];
  const tracks = [quatTrack(sh, t, shoulder)];
  if (fa) {
    const swing = 35 * D2R;
    const forearm = [
      [0, 0, 0],
      [0,  swing, 0],
      [0, -swing, 0],
      [0,  swing, 0],
      [0, -swing, 0],
      [0,  swing, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    tracks.push(quatTrack(fa, t, forearm));
  }
  return new THREE.AnimationClip('Wave', 2.5, tracks);
}

function buildNod(arm) {
  const h = arm.resolved.head; if (!h) return null;
  const a = 10 * D2R;
  const t = [0, 0.3, 0.6, 0.9, 1.2, 1.5];
  const eul = [[0,0,0], [a,0,0], [-a*0.3,0,0], [a,0,0], [-a*0.3,0,0], [0,0,0]];
  return new THREE.AnimationClip('Nod yes', 1.5, [quatTrack(h, t, eul)]);
}

function buildShake(arm) {
  const h = arm.resolved.head; if (!h) return null;
  const a = 15 * D2R;
  const t = [0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8];
  const eul = [[0,0,0], [0,a,0], [0,-a,0], [0,a,0], [0,-a,0], [0,a*0.4,0], [0,0,0]];
  return new THREE.AnimationClip('Shake no', 1.8, [quatTrack(h, t, eul)]);
}

function buildLookAround(arm) {
  const h = arm.resolved.head; if (!h) return null;
  const a = 22 * D2R;
  const p = 6 * D2R;
  const t = [0, 0.8, 1.6, 2.4, 3.2, 4.0];
  const eul = [
    [0, 0, 0],
    [-p,  a, 0],
    [ p,  a, 0],
    [ p, -a, 0],
    [-p, -a, 0],
    [0, 0, 0],
  ];
  return new THREE.AnimationClip('Look around', 4.0, [quatTrack(h, t, eul)]);
}

function buildShrug(arm) {
  const L = arm.resolved.leftShoulder  || arm.resolved.leftUpperArm;
  const R = arm.resolved.rightShoulder || arm.resolved.rightUpperArm;
  if (!L && !R) return null;
  const t = [0, 0.4, 0.9, 1.3, 1.6];
  const up = 14 * D2R;
  const tracks = [];
  if (L) tracks.push(quatTrack(L, t, [[0,0,0], [0,0,-up], [0,0,-up], [0,0,-up*0.3], [0,0,0]]));
  if (R) tracks.push(quatTrack(R, t, [[0,0,0], [0,0, up], [0,0, up], [0,0, up*0.3], [0,0,0]]));
  return new THREE.AnimationClip('Shrug', 1.6, tracks);
}

function buildBounce(arm) {
  const hip = arm.resolved.hip; if (!hip) return null;
  const t = [0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8];
  // Hip height oscillation — small absolute amount; works in meters.
  const amp = 0.06;
  const ofs = [
    [0, 0, 0],
    [0,  amp, 0],
    [0,  0, 0],
    [0,  amp, 0],
    [0,  0, 0],
    [0,  amp * 0.6, 0],
    [0,  0, 0],
  ];
  return new THREE.AnimationClip('Bounce', 1.8, [posTrack(hip, t, ofs)]);
}

function buildDance(arm) {
  const hip   = arm.resolved.hip;
  const spine = arm.resolved.spine || arm.resolved.chest;
  const lUA   = arm.resolved.leftUpperArm;
  const rUA   = arm.resolved.rightUpperArm;
  if (!hip && !spine && !lUA && !rUA) return null;
  const t = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
  const tracks = [];
  if (hip) {
    const sway = 12 * D2R;
    tracks.push(quatTrack(hip, t, [
      [0,0,0], [0,0, sway], [0,0,-sway], [0,0, sway], [0,0,-sway],
      [0,0, sway], [0,0,-sway], [0,0, sway], [0,0,0],
    ]));
  }
  if (spine) {
    const a = 8 * D2R;
    tracks.push(quatTrack(spine, t, [
      [0,0,0], [0, a,-a*0.5], [0,-a, a*0.5], [0, a,-a*0.5], [0,-a, a*0.5],
      [0, a,-a*0.5], [0,-a, a*0.5], [0, a,-a*0.5], [0,0,0],
    ]));
  }
  if (lUA) {
    const z = -70 * D2R;
    tracks.push(quatTrack(lUA, t, [
      [0,0,0], [0,0, z*0.6], [0,0, z], [0,0, z*0.6], [0,0, z],
      [0,0, z*0.6], [0,0, z], [0,0, z*0.6], [0,0,0],
    ]));
  }
  if (rUA) {
    const z = 70 * D2R;
    tracks.push(quatTrack(rUA, t, [
      [0,0,0], [0,0, z], [0,0, z*0.6], [0,0, z], [0,0, z*0.6],
      [0,0, z], [0,0, z*0.6], [0,0, z], [0,0,0],
    ]));
  }
  return new THREE.AnimationClip('Dance', 4.0, tracks);
}

function buildIdleVariation(arm) {
  const h = arm.resolved.head;
  const s = arm.resolved.spine;
  if (!h && !s) return null;
  const t = [0, 1.2, 2.4, 3.6, 4.8, 6.0];
  const tracks = [];
  if (h) {
    const y = 5 * D2R;
    const x = 3 * D2R;
    tracks.push(quatTrack(h, t, [
      [0,0,0], [x, y, 0], [-x*0.5, -y, 0], [x, y*0.5, 0], [-x, -y*0.5, 0], [0,0,0],
    ]));
  }
  if (s) {
    const a = 2 * D2R;
    tracks.push(quatTrack(s, t, [
      [0,0,0], [0, a, 0], [0, -a, 0], [0, a*0.5, 0], [0, -a*0.5, 0], [0,0,0],
    ]));
  }
  return new THREE.AnimationClip('Idle variation', 6.0, tracks);
}

const GENERATORS = [
  { name: 'Wave',           needs: ['rightUpperArm'],            build: buildWave,          loop: false },
  { name: 'Nod yes',        needs: ['head'],                     build: buildNod,           loop: false },
  { name: 'Shake no',       needs: ['head'],                     build: buildShake,         loop: false },
  { name: 'Look around',    needs: ['head'],                     build: buildLookAround,    loop: false },
  { name: 'Shrug',          needs: ['leftShoulder','rightShoulder','leftUpperArm','rightUpperArm'], build: buildShrug, loop: false, anyOf: true },
  { name: 'Bounce',         needs: ['hip'],                      build: buildBounce,        loop: true  },
  { name: 'Dance',          needs: ['hip','spine','leftUpperArm','rightUpperArm'], build: buildDance, loop: true, anyOf: true },
  { name: 'Idle variation', needs: ['head','spine'],             build: buildIdleVariation, loop: true,  anyOf: true },
];

export function createProcAnimations(armature, mixer) {
  const actions = new Map();
  const status = []; // [{name, ready, missing[]}]
  if (!armature || !armature.hasSkeleton) {
    return { actions, status, gateInfo: () => 'No skeleton detected' };
  }

  for (const gen of GENERATORS) {
    const missing = gen.needs.filter((r) => !armature.resolved[r]);
    const ready = gen.anyOf
      ? missing.length < gen.needs.length    // any one bone is enough
      : missing.length === 0;                // all bones required

    if (ready) {
      const clip = gen.build(armature);
      if (clip && clip.tracks.length > 0) {
        // Additive blend so the clip composes with idle (blink/breathing/sway)
        // and any other clip playing. Frame 0 is the rest pose, so makeClipAdditive
        // converts the remaining frames to offsets from rest.
        THREE.AnimationUtils.makeClipAdditive(clip);
        const action = mixer.clipAction(clip, null, THREE.AdditiveAnimationBlendMode);
        action.setLoop(gen.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
        action.clampWhenFinished = !gen.loop;
        actions.set(gen.name, action);
        status.push({ name: gen.name, ready: true, missing: [] });
        continue;
      }
    }
    status.push({ name: gen.name, ready: false, missing });
  }

  return { actions, status };
}
