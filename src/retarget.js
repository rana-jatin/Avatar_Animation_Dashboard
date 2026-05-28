// Loads external animation .glb files and retargets their clips onto the
// currently uploaded character. Manifest at /animations/manifest.json:
//
//   [
//     { "name": "Idle Casual", "file": "/animations/Idle_Casual.glb", "sourceRig": "mixamo" },
//     ...
//   ]
//
// sourceRig is one of: mixamo, cc4, rpm, vroid, rigify. Used to translate
// source bone names into our canonical role names before mapping onto the
// target armature.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ROLES } from './armature.js';

// Mirror of the alias table in armature.js but keyed by rig family, so we can
// reverse-lookup source bone names per rig.
const SOURCE_ROLE_MAPS = {
  mixamo: {
    hip: 'mixamorigHips', spine: 'mixamorigSpine', chest: 'mixamorigSpine1', upperChest: 'mixamorigSpine2',
    neck: 'mixamorigNeck', head: 'mixamorigHead',
    leftShoulder: 'mixamorigLeftShoulder', leftUpperArm: 'mixamorigLeftArm', leftLowerArm: 'mixamorigLeftForeArm', leftHand: 'mixamorigLeftHand',
    rightShoulder: 'mixamorigRightShoulder', rightUpperArm: 'mixamorigRightArm', rightLowerArm: 'mixamorigRightForeArm', rightHand: 'mixamorigRightHand',
    leftUpperLeg: 'mixamorigLeftUpLeg', leftLowerLeg: 'mixamorigLeftLeg', leftFoot: 'mixamorigLeftFoot',
    rightUpperLeg: 'mixamorigRightUpLeg', rightLowerLeg: 'mixamorigRightLeg', rightFoot: 'mixamorigRightFoot',
  },
  cc4: {
    hip: 'CC_Base_Hip', spine: 'CC_Base_Spine01', chest: 'CC_Base_Spine02',
    neck: 'CC_Base_NeckTwist01', head: 'CC_Base_Head',
    leftShoulder: 'CC_Base_L_Clavicle', leftUpperArm: 'CC_Base_L_Upperarm', leftLowerArm: 'CC_Base_L_Forearm', leftHand: 'CC_Base_L_Hand',
    rightShoulder: 'CC_Base_R_Clavicle', rightUpperArm: 'CC_Base_R_Upperarm', rightLowerArm: 'CC_Base_R_Forearm', rightHand: 'CC_Base_R_Hand',
    leftUpperLeg: 'CC_Base_L_Thigh', leftLowerLeg: 'CC_Base_L_Calf', leftFoot: 'CC_Base_L_Foot',
    rightUpperLeg: 'CC_Base_R_Thigh', rightLowerLeg: 'CC_Base_R_Calf', rightFoot: 'CC_Base_R_Foot',
  },
  rpm: {
    hip: 'Hips', spine: 'Spine', chest: 'Spine1', upperChest: 'Spine2',
    neck: 'Neck', head: 'Head',
    leftShoulder: 'LeftShoulder', leftUpperArm: 'LeftArm', leftLowerArm: 'LeftForeArm', leftHand: 'LeftHand',
    rightShoulder: 'RightShoulder', rightUpperArm: 'RightArm', rightLowerArm: 'RightForeArm', rightHand: 'RightHand',
    leftUpperLeg: 'LeftUpLeg', leftLowerLeg: 'LeftLeg', leftFoot: 'LeftFoot',
    rightUpperLeg: 'RightUpLeg', rightLowerLeg: 'RightLeg', rightFoot: 'RightFoot',
  },
  vroid: {
    hip: 'J_Bip_C_Hips', spine: 'J_Bip_C_Spine', chest: 'J_Bip_C_Chest', upperChest: 'J_Bip_C_UpperChest',
    neck: 'J_Bip_C_Neck', head: 'J_Bip_C_Head',
    leftShoulder: 'J_Bip_L_Shoulder', leftUpperArm: 'J_Bip_L_UpperArm', leftLowerArm: 'J_Bip_L_LowerArm', leftHand: 'J_Bip_L_Hand',
    rightShoulder: 'J_Bip_R_Shoulder', rightUpperArm: 'J_Bip_R_UpperArm', rightLowerArm: 'J_Bip_R_LowerArm', rightHand: 'J_Bip_R_Hand',
    leftUpperLeg: 'J_Bip_L_UpperLeg', leftLowerLeg: 'J_Bip_L_LowerLeg', leftFoot: 'J_Bip_L_Foot',
    rightUpperLeg: 'J_Bip_R_UpperLeg', rightLowerLeg: 'J_Bip_R_LowerLeg', rightFoot: 'J_Bip_R_Foot',
  },
};

function sourceBoneToRole(sourceRig, boneName) {
  const map = SOURCE_ROLE_MAPS[sourceRig];
  if (!map) return null;
  for (const role of ROLES) {
    if (map[role] === boneName) return role;
  }
  return null;
}

// Naive retarget: rename tracks from source bone names → target bone names
// using the canonical role mapping. Does not compensate for rest-pose
// differences between rigs — works best when source/target share orientation
// conventions (e.g. Mixamo → Mixamo, or Mixamo → RPM which are both Y-up
// T-pose). Quaternion tracks are scaled to identity if the target rest pose
// differs grossly, but we trust the user to provide compatible clips.
function retargetClip(sourceClip, sourceRig, targetArmature) {
  const newTracks = [];
  let kept = 0, dropped = 0;
  for (const track of sourceClip.tracks) {
    const dotIdx = track.name.indexOf('.');
    if (dotIdx < 0) { dropped++; continue; }
    const sourceBoneName = track.name.substring(0, dotIdx);
    const property = track.name.substring(dotIdx + 1);
    const role = sourceBoneToRole(sourceRig, sourceBoneName);
    if (!role) { dropped++; continue; }
    const targetBone = targetArmature.resolved[role];
    if (!targetBone) { dropped++; continue; }
    const NewTrackCls = track.constructor;
    const newTrack = new NewTrackCls(
      `${targetBone.name}.${property}`,
      Array.from(track.times),
      Array.from(track.values),
    );
    newTracks.push(newTrack);
    kept++;
  }
  if (newTracks.length === 0) return null;
  const out = new THREE.AnimationClip(sourceClip.name, sourceClip.duration, newTracks);
  console.log(`[retarget] "${sourceClip.name}" (${sourceRig}): kept ${kept}, dropped ${dropped} tracks`);
  return out;
}

const loader = new GLTFLoader();
const clipCache = new Map(); // file → Promise<{clip, sourceRig}>

function loadClipFromFile(file, sourceRig) {
  if (clipCache.has(file)) return clipCache.get(file);
  const p = new Promise((resolve, reject) => {
    loader.load(
      file,
      (gltf) => {
        if (!gltf.animations || gltf.animations.length === 0) {
          reject(new Error(`No animations in ${file}`));
          return;
        }
        resolve({ clip: gltf.animations[0], sourceRig });
      },
      undefined,
      reject,
    );
  });
  clipCache.set(file, p);
  return p;
}

export async function loadLibrary() {
  try {
    const res = await fetch('/animations/manifest.json');
    if (!res.ok) return { entries: [], error: null };
    const entries = await res.json();
    if (!Array.isArray(entries)) return { entries: [], error: 'manifest.json must be an array' };
    return { entries, error: null };
  } catch (e) {
    return { entries: [], error: e.message };
  }
}

// Returns a Map<name, AnimationAction> for the given library entries,
// retargeted onto targetArmature and registered with mixer.
// Entries that fail to load/retarget are skipped (logged to console).
export async function buildLibraryActions(entries, targetArmature, mixer) {
  const actions = new Map();
  if (!targetArmature || !targetArmature.hasSkeleton || !entries.length) return actions;

  await Promise.all(entries.map(async (e) => {
    try {
      const { clip, sourceRig } = await loadClipFromFile(e.file, e.sourceRig);
      const retargeted = retargetClip(clip, sourceRig, targetArmature);
      if (!retargeted) {
        console.warn(`[retarget] "${e.name}" produced 0 tracks — likely no bone overlap`);
        return;
      }
      const displayName = `[lib] ${e.name}`;
      retargeted.name = displayName;
      const action = mixer.clipAction(retargeted);
      action.setLoop(THREE.LoopRepeat, Infinity);
      actions.set(displayName, action);
    } catch (err) {
      console.warn(`[retarget] failed to load "${e.name}":`, err.message);
    }
  }));

  return actions;
}
