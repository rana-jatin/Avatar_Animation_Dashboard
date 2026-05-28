// Armature detection + manual override.
// Detects a canonical "humanoid role -> bone" mapping for any uploaded GLB
// across Mixamo / CC4 / RPM / VRoid / Rigify / Unity / unknown rigs.

const ROLE_ALIASES = {
  hip:            ['Hips','mixamorigHips','CC_Base_Hip','J_Bip_C_Hips','hips','hip','pelvis','Pelvis','root.x','DEF-hips'],
  spine:          ['Spine','mixamorigSpine','CC_Base_Spine01','J_Bip_C_Spine','spine','spine.x','spine_01.x','DEF-spine'],
  chest:          ['Spine1','Chest','mixamorigSpine1','mixamorigSpine2','CC_Base_Spine02','J_Bip_C_Chest','spine_02.x','spine.001','DEF-spine.001'],
  upperChest:     ['Spine2','UpperChest','J_Bip_C_UpperChest','spine.002','spine_03.x','DEF-spine.002'],
  neck:           ['Neck','mixamorigNeck','CC_Base_NeckTwist01','J_Bip_C_Neck','neck.x','neck','DEF-neck'],
  head:           ['Head','mixamorigHead','CC_Base_Head','J_Bip_C_Head','head.x','head','DEF-head'],

  leftShoulder:   ['LeftShoulder','mixamorigLeftShoulder','CC_Base_L_Clavicle','J_Bip_L_Shoulder','shoulder.L','shoulder_l.x','DEF-shoulder.L'],
  leftUpperArm:   ['LeftArm','mixamorigLeftArm','CC_Base_L_Upperarm','J_Bip_L_UpperArm','upper_arm.L','upperarm_l.x','arm_upper.L','DEF-upper_arm.L'],
  leftLowerArm:   ['LeftForeArm','mixamorigLeftForeArm','CC_Base_L_Forearm','J_Bip_L_LowerArm','forearm.L','lowerarm_l.x','arm_lower.L','DEF-forearm.L'],
  leftHand:       ['LeftHand','mixamorigLeftHand','CC_Base_L_Hand','J_Bip_L_Hand','hand.L','hand_l.x','DEF-hand.L'],

  rightShoulder:  ['RightShoulder','mixamorigRightShoulder','CC_Base_R_Clavicle','J_Bip_R_Shoulder','shoulder.R','shoulder_r.x','DEF-shoulder.R'],
  rightUpperArm:  ['RightArm','mixamorigRightArm','CC_Base_R_Upperarm','J_Bip_R_UpperArm','upper_arm.R','upperarm_r.x','arm_upper.R','DEF-upper_arm.R'],
  rightLowerArm:  ['RightForeArm','mixamorigRightForeArm','CC_Base_R_Forearm','J_Bip_R_LowerArm','forearm.R','lowerarm_r.x','arm_lower.R','DEF-forearm.R'],
  rightHand:      ['RightHand','mixamorigRightHand','CC_Base_R_Hand','J_Bip_R_Hand','hand.R','hand_r.x','DEF-hand.R'],

  leftUpperLeg:   ['LeftUpLeg','mixamorigLeftUpLeg','CC_Base_L_Thigh','J_Bip_L_UpperLeg','thigh.L','thigh_l.x','upperleg.L','DEF-thigh.L'],
  leftLowerLeg:   ['LeftLeg','mixamorigLeftLeg','CC_Base_L_Calf','J_Bip_L_LowerLeg','shin.L','calf_l.x','lowerleg.L','DEF-shin.L'],
  leftFoot:       ['LeftFoot','mixamorigLeftFoot','CC_Base_L_Foot','J_Bip_L_Foot','foot.L','foot_l.x','DEF-foot.L'],

  rightUpperLeg:  ['RightUpLeg','mixamorigRightUpLeg','CC_Base_R_Thigh','J_Bip_R_UpperLeg','thigh.R','thigh_r.x','upperleg.R','DEF-thigh.R'],
  rightLowerLeg:  ['RightLeg','mixamorigRightLeg','CC_Base_R_Calf','J_Bip_R_LowerLeg','shin.R','calf_r.x','lowerleg.R','DEF-shin.R'],
  rightFoot:      ['RightFoot','mixamorigRightFoot','CC_Base_R_Foot','J_Bip_R_Foot','foot.R','foot_r.x','DEF-foot.R'],
};

export const ROLES = Object.keys(ROLE_ALIASES);

// Rig family is inferred from which alias matched the head bone.
const RIG_SIGNATURES = [
  { rig: 'mixamo', test: (n) => n.startsWith('mixamorig') },
  { rig: 'cc4',    test: (n) => n.startsWith('CC_Base_') },
  { rig: 'vroid',  test: (n) => n.startsWith('J_Bip_') },
  { rig: 'rigify', test: (n) => n.startsWith('DEF-') || /\.x$/.test(n) },
  { rig: 'rpm',    test: (n) => n === 'Head' || n === 'Hips' },
];

const SMURF_ROLE_MAP = {
  hip: 'Bone001',
  spine: 'Bone002',
  chest: 'Bone002',
  upperChest: 'Bone002',
  neck: 'Bone002',
  head: 'head',

  leftShoulder: 'Bone003',
  leftUpperArm: 'Bone004',
  leftLowerArm: 'Bone005',
  leftHand: 'Bone006',
  rightShoulder: 'Bone048',
  rightUpperArm: 'Bone027',
  rightLowerArm: 'Bone028',
  rightHand: 'Bone029',

  leftUpperLeg: 'Bone023',
  leftLowerLeg: 'Bone024',
  leftFoot: 'Bone025',
  rightUpperLeg: 'Bone050',
  rightLowerLeg: 'Bone045',
  rightFoot: 'Bone046',
};

function inferRig(headName) {
  if (!headName) return 'unknown';
  for (const { rig, test } of RIG_SIGNATURES) if (test(headName)) return rig;
  return 'unknown';
}

function applySmurfMapping(bones, resolved) {
  const required = ['Bone101', 'Bone001', 'Bone002', 'head', 'Bone052'];
  if (!required.every((name) => bones.has(name))) return false;

  for (const [role, boneName] of Object.entries(SMURF_ROLE_MAP)) {
    if (bones.has(boneName)) resolved[role] = bones.get(boneName);
  }
  return true;
}

function collectBones(root) {
  const bones = new Map();
  let firstSkeletonRoot = null;
  root.traverse((o) => {
    if (o.isBone) {
      bones.set(o.name, o);
      if (!firstSkeletonRoot) firstSkeletonRoot = o;
    } else if (o.isSkinnedMesh && o.skeleton && !firstSkeletonRoot) {
      firstSkeletonRoot = o.skeleton.bones[0];
    }
  });
  return { bones, firstBone: firstSkeletonRoot };
}

// Walk upward to find the topmost ancestor that's still a bone.
function rootBone(bone) {
  let cur = bone;
  while (cur.parent && cur.parent.isBone) cur = cur.parent;
  return cur;
}

// Choose the longest single-child descendant chain — typically the spine.
function longestChain(bone) {
  const chain = [bone];
  let cur = bone;
  while (cur.children && cur.children.length > 0) {
    const boneChildren = cur.children.filter((c) => c.isBone);
    if (boneChildren.length === 0) break;
    // Prefer the child whose subtree is the deepest.
    let best = boneChildren[0];
    let bestDepth = depth(best);
    for (let i = 1; i < boneChildren.length; i++) {
      const d = depth(boneChildren[i]);
      if (d > bestDepth) { best = boneChildren[i]; bestDepth = d; }
    }
    chain.push(best);
    cur = best;
  }
  return chain;
}

function depth(bone) {
  let d = 1;
  for (const c of bone.children) if (c.isBone) d = Math.max(d, 1 + depth(c));
  return d;
}

// Fallback: identify left vs right by suffix or X position.
function isLeftName(n)  { return /(_l|\.L|Left|_L_|_left)/i.test(n); }
function isRightName(n) { return /(_r|\.R|Right|_R_|_right)/i.test(n); }

export function detectArmature(root) {
  const { bones, firstBone } = collectBones(root);

  if (!firstBone || bones.size === 0) {
    return {
      bones: new Map(),
      root: null,
      resolved: emptyResolved(),
      rig: 'unknown',
      hasSkeleton: false,
      setOverride() {},
      getRole() { return null; },
    };
  }

  const resolved = emptyResolved();

  // 1) Alias lookup.
  for (const role of ROLES) {
    for (const alias of ROLE_ALIASES[role]) {
      if (bones.has(alias)) { resolved[role] = bones.get(alias); break; }
    }
  }

  // 2) Hierarchy fallback for spine/chest/neck/head if any missing.
  const hip = resolved.hip || rootBone(firstBone);
  if (!resolved.hip) resolved.hip = hip;

  if (!resolved.head || !resolved.spine) {
    const chain = longestChain(hip);
    // chain[0] = hip; chain[1] = spine; ... last bone = head/neck candidate.
    if (chain.length >= 4) {
      resolved.spine = resolved.spine || chain[1];
      resolved.chest = resolved.chest || chain[Math.min(2, chain.length - 1)];
      resolved.head  = resolved.head  || chain[chain.length - 1];
      resolved.neck  = resolved.neck  || chain[chain.length - 2];
    } else if (chain.length >= 2) {
      resolved.spine = resolved.spine || chain[1];
      resolved.head  = resolved.head  || chain[chain.length - 1];
    }
  }

  // 3) Left/right limbs: if not found by alias, scan all bones by name + arm-like keywords.
  function findByKeywords(role, keywords, side) {
    if (resolved[role]) return;
    for (const [name, b] of bones) {
      const lower = name.toLowerCase();
      if (!keywords.some((k) => lower.includes(k))) continue;
      const left  = isLeftName(name);
      const right = isRightName(name);
      if (side === 'left'  && !left  && right) continue;
      if (side === 'right' && !right && left)  continue;
      if (side === 'left'  && !left  && !right) continue;
      if (side === 'right' && !right && !left) continue;
      resolved[role] = b;
      return;
    }
  }
  findByKeywords('leftShoulder',  ['clavicle','shoulder'], 'left');
  findByKeywords('rightShoulder', ['clavicle','shoulder'], 'right');
  findByKeywords('leftUpperArm',  ['upperarm','upper_arm','arm'], 'left');
  findByKeywords('rightUpperArm', ['upperarm','upper_arm','arm'], 'right');
  findByKeywords('leftLowerArm',  ['forearm','lowerarm','lower_arm'], 'left');
  findByKeywords('rightLowerArm', ['forearm','lowerarm','lower_arm'], 'right');
  findByKeywords('leftHand',  ['hand'], 'left');
  findByKeywords('rightHand', ['hand'], 'right');
  findByKeywords('leftUpperLeg',  ['thigh','upleg','upperleg'], 'left');
  findByKeywords('rightUpperLeg', ['thigh','upleg','upperleg'], 'right');
  findByKeywords('leftLowerLeg',  ['calf','shin','lowerleg'], 'left');
  findByKeywords('rightLowerLeg', ['calf','shin','lowerleg'], 'right');
  findByKeywords('leftFoot',  ['foot'], 'left');
  findByKeywords('rightFoot', ['foot'], 'right');

  const isSmurfRig = applySmurfMapping(bones, resolved);
  const rig = isSmurfRig ? 'smurf' : inferRig(resolved.head?.name);

  const armature = {
    bones,
    root: resolved.hip || hip,
    resolved,
    rig,
    hasSkeleton: true,

    setOverride(role, boneName) {
      if (!ROLES.includes(role)) return false;
      if (boneName === '' || boneName == null) {
        resolved[role] = null;
        return true;
      }
      const b = bones.get(boneName);
      if (!b) return false;
      resolved[role] = b;
      return true;
    },

    getRole(role) { return resolved[role] || null; },
  };

  return armature;
}

function emptyResolved() {
  const out = {};
  for (const role of ROLES) out[role] = null;
  return out;
}

// Translate a source bone name (from a clip authored in `sourceRig`) into the
// canonical role string. Returns null if unknown.
export function sourceNameToRole(sourceRig, boneName) {
  for (const role of ROLES) {
    if (ROLE_ALIASES[role].includes(boneName)) return role;
  }
  return null;
}
