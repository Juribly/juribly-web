// juribly-web/src/3d/CourtroomScene.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, Html, Text } from "@react-three/drei";
import useKeyboard from "../hooks/useKeyboard.js";
import socket from "../lib/socket.js";

// --- Helper Functions and Components (unchanged) ---

const damp = THREE.MathUtils.damp;
const clamp = THREE.MathUtils.clamp;

function keyAny(keys, names) { for (const n of names) if (keys[n]) return true; return false; }
function yawToward(x, z) { return Math.atan2(-x, -z); }
function yawFromVelocity(vx, vz) { return Math.atan2(vx, vz); }

function CuteBuddy({ role, name, getSpeed, emoteState, forcePose = "auto" }) {
  const primary = role === "Judge" ? "#f7c85f" : role === "Accused" ? "#ff6b6b" : "#7aa7ff";
  const body = useRef();
  const head = useRef();
  const legL = useRef();
  const legR = useRef();
  const uArmL = useRef(), fArmL = useRef(), handL = useRef();
  const uArmR = useRef(), fArmR = useRef(), handR = useRef();
  const eyelidL = useRef(), eyelidR = useRef();
  const browL = useRef(), browR = useRef();
  const mouth = useRef();
  const baseBodyY = 0.98;
  const SIT_BODY_Y = 0.5;
  const phase = useRef(0);
  const speedSm = useRef(0);
  const blink = useRef({ t: 1.8 + Math.random() * 2.2, closing: false });

  useFrame((_, dt) => {
    const t = performance.now();
    const speed = typeof getSpeed === "function" ? getSpeed() : 0;
    speedSm.current = damp(speedSm.current, speed, 10, dt);
    const walking = speedSm.current > 0.06 && forcePose !== "sit";
    const active = emoteState && emoteState.until > t ? emoteState.type : null;
    phase.current += (walking ? 4.6 * (0.33 + speedSm.current * 0.45) : 2.0) * dt;
    const targetY = forcePose === "sit" ? SIT_BODY_Y : baseBodyY;
    const bob = walking ? Math.abs(Math.sin(phase.current * 1.6)) * 0.04 : 0.012 * Math.sin(t * 0.0025);

    if (body.current) {
      body.current.position.y = damp(body.current.position.y, targetY + (walking ? bob : 0), 10, dt);
      const tilt = walking ? Math.sin(phase.current) * 0.045 : 0;
      body.current.rotation.z = damp(body.current.rotation.z, tilt, 10, dt);
      body.current.scale.y = damp(body.current.scale.y, walking ? 1 - bob * 0.12 : 1, 10, dt);
    }

    if (forcePose === "sit") {
      if (legL.current) legL.current.rotation.x = damp(legL.current.rotation.x, -1.2, 14, dt);
      if (legR.current) legR.current.rotation.x = damp(legR.current.rotation.x, -1.2, 14, dt);
    } else {
      const swing = walking ? Math.sin(phase.current * 2.0) * 0.45 : 0;
      if (legL.current) legL.current.rotation.x = damp(legL.current.rotation.x, swing, 12, dt);
      if (legR.current) legR.current.rotation.x = damp(legR.current.rotation.x, -swing, 12, dt);
    }

    if (!active && forcePose !== "sit") {
      const armSway = walking ? Math.sin(phase.current * 2.0 + Math.PI / 2) * 0.18 : 0.08 * Math.sin(t * 0.003);
      poseArm(uArmL, fArmL, handL, { u: [armSway, 0, 0] }, dt);
      poseArm(uArmR, fArmR, handR, { u: [-armSway, 0, 0] }, dt);
    }

    const setThumb = (h, rot, idx) => { if (!h.current) return; h.current.userData.thumbRot = rot; h.current.userData.indexExtend = idx; };
    if (active === "thumbs_up") {
      widenShoulder(uArmR, 0.18, dt);
      poseArm(uArmR, fArmR, handR, { u: [-0.15, 0.65, -1.05], f: [-0.50, 0.35, 0.10], h: [0.25, 0.10, 0.25] }, dt, 24);
      handOffsetForward(handR, 0.08, dt); setThumb(handR, -1.15, 0.05);
    } else if (active === "thumbs_down") {
      widenShoulder(uArmR, 0.10, dt);
      poseArm(uArmR, fArmR, handR, { u: [0.95, 0.15, 0.15], f: [0.45, -0.1, 0], h: [Math.PI, 0, 0.1] }, dt, 24);
      handOffsetForward(handR, 0.02, dt); setThumb(handR, 1.15, 0.0);
    } else if (active === "begging") {
      poseArm(uArmL, fArmL, handL, { u: [-1.02, 0.36, 0.18], f: [-0.95, 0, 0] }, dt, 20);
      poseArm(uArmR, fArmR, handR, { u: [-1.02, -0.36, -0.18], f: [-0.95, 0, 0] }, dt, 20);
      if (body.current) body.current.rotation.x = damp(body.current.rotation.x, 0.18, 10, dt);
    } else if (active === "argument") {
      const wave = Math.sin(phase.current * 3.0) * 0.95 - 0.22;
      poseArm(uArmR, fArmR, handR, { u: [-0.5, 0.3, 0.06], f: [wave, 0.4, 0], h: [0, 0.25, 0] }, dt, 24);
      poseArm(uArmL, fArmL, handL, { u: [0.78, 0, 0.6], f: [0.98, 0, 0] }, dt, 20);
    } else if (active === "point_forward") {
      widenShoulder(uArmR, 0.16, dt);
      poseArm(uArmR, fArmR, handR, { u: [-1.32, 0.28, 0], f: [-0.38, 0.35, 0], h: [0, 0.05, 0] }, dt, 22);
      setThumb(handR, 0, 0.55); handOffsetForward(handR, 0.04, dt);
    } else if (active === "point_up") {
      widenShoulder(uArmR, 0.20, dt);
      poseArm(uArmR, fArmR, handR, { u: [-0.10, 0.70, -1.56], f: [-0.22, 0.35, 0], h: [0, 0.12, 0] }, dt, 22);
      setThumb(handR, 0, 0.6); handOffsetForward(handR, 0.02, dt);
    } else {
      if (body.current) body.current.rotation.x = damp(body.current.rotation.x, 0, 10, dt);
      widenShoulder(uArmR, 0.0, dt);
    }

    updateHand(handL, dt);
    updateHand(handR, dt);

    const mood = active ? active : (walking ? "walk" : "idle");
    setFace(browL, browR, mouth, mood, dt);

    // blink
    blink.current.t -= dt;
    if (blink.current.t <= 0 && !blink.current.closing) {
      blink.current.closing = true; blink.current.t = 0.12;
    }
    if (blink.current.closing) {
      const s = Math.max(0, blink.current.t / 0.12), h = 0.12 * s + 0.02;
      if (eyelidL.current) eyelidL.current.scale.y = damp(eyelidL.current.scale.y, h, 20, dt);
      if (eyelidR.current) eyelidR.current.scale.y = damp(eyelidR.current.scale.y, h, 20, dt);
      blink.current.t -= dt;
      if (blink.current.t <= 0) {
        blink.current.closing = false; blink.current.t = 1.8 + Math.random() * 2.4;
        if (eyelidL.current) eyelidL.current.scale.y = 0.14;
        if (eyelidR.current) eyelidR.current.scale.y = 0.14;
      }
    }
  });

  return (
    <group>
      <group ref={legL} position={[-0.22, 0.16, 0]}>
        <mesh castShadow><capsuleGeometry args={[0.12, 0.12, 6, 12]} /><meshStandardMaterial color={"#2a2a2a"} roughness={0.8} /></mesh>
      </group>
      <group ref={legR} position={[0.22, 0.16, 0]}>
        <mesh castShadow><capsuleGeometry args={[0.12, 0.12, 6, 12]} /><meshStandardMaterial color={"#2a2a2a"} roughness={0.8} /></mesh>
      </group>

      <ArmGroup refU={uArmL} refF={fArmL} refH={handL} x={-0.78} y={1.02} primary={primary} left />
      <ArmGroup refU={uArmR} refF={fArmR} refH={handR} x={0.78} y={1.02} primary={primary} />

      <group ref={body} position={[0, baseBodyY, 0]}>
        <mesh castShadow position={[0, -0.36, 0]}><sphereGeometry args={[0.60, 22, 18]} /><meshStandardMaterial color={primary} roughness={0.65} metalness={0.05} /></mesh>
        <mesh castShadow><cylinderGeometry args={[0.60, 0.60, 1.20, 26]} /><meshStandardMaterial color={primary} roughness={0.65} metalness={0.05} /></mesh>
        <mesh castShadow position={[0, 0.64, 0]}><sphereGeometry args={[0.60, 22, 18]} /><meshStandardMaterial color={primary} roughness={0.65} metalness={0.05} /></mesh>
      </group>

      <group ref={head} position={[0, 2.12, 0.02]}>
        <mesh castShadow><sphereGeometry args={[0.46, 22, 20]} /><meshStandardMaterial color={primary} roughness={0.6} /></mesh>
        {role === "Judge" && <JudgeWigSafe />}
        <group position={[0, 0.03, 0.45]}>
          <EyeGroup left eyelidRef={eyelidL} />
          <EyeGroup eyelidRef={eyelidR} />
          <mesh ref={browL} position={[-0.16, 0.16, 0.11]}><boxGeometry args={[0.20, 0.04, 0.02]} /><meshStandardMaterial color={"#222"} /></mesh>
          <mesh ref={browR} position={[0.16, 0.16, 0.11]}><boxGeometry args={[0.20, 0.04, 0.02]} /><meshStandardMaterial color={"#222"} /></mesh>
          <group ref={mouth} position={[0, -0.08, 0.05]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.10, 0.016, 8, 20, Math.PI]} /><meshStandardMaterial color={"#222"} /></mesh>
          </group>
        </group>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} renderOrder={1}>
        <circleGeometry args={[0.55, 32]} /><meshBasicMaterial color={"#000"} transparent opacity={0.12} />
      </mesh>

      <Billboard position={[0, 2.9, 0]}>
        <group>
          <Text fontSize={0.28} color="#ffffff" outlineWidth={0.04} outlineColor="#000000" anchorX="center" anchorY="bottom" maxWidth={2.5}>{name || "You"}</Text>
          <Text position={[0, -0.18, 0]} fontSize={0.22} color="#d8e3ff" outlineWidth={0.03} outlineColor="#000000" anchorX="center" anchorY="top">{role}</Text>
        </group>
      </Billboard>

      {emoteState && emoteState.until > performance.now() && emoteState.emoji && (
        <Billboard position={[0, 3.35, 0]}>
          <Text fontSize={0.36} color="#000000">{emoteState.emoji}</Text>
        </Billboard>
      )}
    </group>
  );
}

function JudgeWigSafe() {
  const BACK_Z = -0.10, DROP_Y = -0.02, COLOR = "#ffffff";
  const curlRow = (r, y, z, c, s) =>
    Array.from({ length: c }).map((_, i) => {
      const a = (i/c) * Math.PI * 1.6 - Math.PI * .8;
      const x = Math.sin(a) * r;
      const y2 = y + Math.cos(a) * .12;
      return (
        <mesh key={`${r}-${i}-${y}`} position={[x, y2, z]}>
          <sphereGeometry args={[s, 16, 14]} />
          <meshStandardMaterial color={COLOR} roughness={0.35} />
        </mesh>
      );
    });

  return (
    <group position={[0, 0.10+DROP_Y, BACK_Z]}>
      <mesh position={[0,-.18,-.02]}><torusGeometry args={[.36,.06,12,36]}/><meshStandardMaterial color="#ececec" roughness={.25}/></mesh>
      <mesh rotation={[0,0,Math.PI/2]} position={[0,-.18,-.02]}><torusGeometry args={[.36,.025,8,30]}/><meshStandardMaterial color="#f3f3f3" roughness={.2}/></mesh>
      <mesh position={[-.43,-.05,-.06]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[.14,.05,10,24]}/><meshStandardMaterial color="#fff"/></mesh>
      <mesh position={[.43,-.05,-.06]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[.14,.05,10,24]}/><meshStandardMaterial color="#fff"/></mesh>
      {curlRow(.44,.02,-.1,18,.085)}
      {curlRow(.37,.14,-.12,16,.08)}
      {curlRow(.22,-.1,-.22,9,.075)}
      {curlRow(.2,-.28,-.32,9,.07)}
      {curlRow(.18,-.46,-.42,9,.065)}
      {curlRow(.16,-.62,-.5,9,.06)}
    </group>
  );
}

const ArmGroup = React.forwardRef(function ArmGroup({ refU, refF, refH, x, y, primary }, _f) {
  return (
    <group ref={refU} position={[x,y,0]}>
      <mesh castShadow><capsuleGeometry args={[.1,.34,6,12]}/><meshStandardMaterial color={primary} roughness={.7}/></mesh>
      <group ref={refF} position={[0,-.36,0]}>
        <mesh castShadow position={[0,-.22,0]}><capsuleGeometry args={[.095,.3,6,12]}/><meshStandardMaterial color={primary} roughness={.7}/></mesh>
        <group ref={refH} position={[0,-.54,0]}>
          <mesh castShadow><boxGeometry args={[.22,.12,.18]}/><meshStandardMaterial color="#ffd7a3" roughness={.75}/></mesh>
          <mesh position={[x>.0? .13:-.13,.02,0]}><boxGeometry args={[.06,.06,.06]}/><meshStandardMaterial color="#ffd7a3"/></mesh>
          <mesh position={[x>.0? -.12:.12,0,0]} userData={{index:!0}}><boxGeometry args={[.12,.04,.04]}/><meshStandardMaterial color="#ffd7a3"/></mesh>
        </group>
      </group>
    </group>
  );
});

function EyeGroup({ left = false, eyelidRef }) {
  return (
    <group position={[left?-.16:.16,.06,0]}>
      <mesh><sphereGeometry args={[.13,16,14]}/><meshStandardMaterial color="#fff"/></mesh>
      <mesh position={[0,0,.06]}><sphereGeometry args={[.06,14,12]}/><meshStandardMaterial color="#101010"/></mesh>
      <mesh ref={eyelidRef} position={[0,.02,.105]}><planeGeometry args={[.26,.14]}/><meshStandardMaterial color="#f4f7fb"/></mesh>
    </group>
  );
}

function poseArm(u,f,h,{u:r=[0,0,0],f:e=[0,0,0],h:t=[0,0,0]},a,p=14){
  u.current&&(u.current.rotation.x=damp(u.current.rotation.x,r[0],p,a),u.current.rotation.y=damp(u.current.rotation.y,r[1],p,a),u.current.rotation.z=damp(u.current.rotation.z,r[2],p,a));
  f.current&&(f.current.rotation.x=damp(f.current.rotation.x,e[0],p,a),f.current.rotation.y=damp(f.current.rotation.y,e[1],p,a),f.current.rotation.z=damp(f.current.rotation.z,e[2],p,a));
  h.current&&(h.current.rotation.x=damp(h.current.rotation.x,t[0],p,a),h.current.rotation.y=damp(h.current.rotation.y,t[1],p,a),h.current.rotation.z=damp(h.current.rotation.z,t[2],p,a))
}
function widenShoulder(u,a,p){u.current&&(u.current.position.x=damp(u.current.position.x,(u.current.position.x>.0?.78:-.78)+(u.current.position.x>.0?a:-a),16,p))}
function handOffsetForward(h,d,t){h.current&&(h.current.position.z=damp(h.current.position.z,d,18,t))}
function updateHand(h,d){
  if(h.current){
    const e=h.current,t=e.children[1],a=e.children.find(c=>c.userData&&c.userData.index),n=e.userData.thumbRot||0,o=e.userData.indexExtend||0;
    t&&(t.rotation.z=damp(t.rotation.z,n,18,d));
    a&&(a.scale.x=damp(a.scale.x||1,1+o,18,d));
    e.userData.thumbRot=damp(n,0,6,d); e.userData.indexExtend=damp(o,0,6,d)
  }
}
function setFace(bL, bR, mouth, mood, dt) {
  const s = {
    idle:{bl:[0,0],br:[0,0],m:{open:0,smile:0}},
    walk:{bl:[.1,-.15],br:[-.1,.15],m:{open:.08,smile:.1}},
    thumbs_up:{bl:[-.2,.2],br:[.2,-.2],m:{open:.05,smile:.7}},
    thumbs_down:{bl:[.3,.3],br:[-.3,-.3],m:{open:0,smile:-.4}},
    begging:{bl:[.25,.2],br:[-.25,-.2],m:{open:.15,smile:-.1}},
    argument:{bl:[-.25,0],br:[.25,0],m:{open:.2,smile:0}},
    point_forward:{bl:[0,.15],br:[0,-.15],m:{open:.05,smile:.2}},
    point_up:{bl:[0,.2],br:[0,-.2],m:{open:.05,smile:.3}}
  };
  const t = s[mood]||s.idle;
  if(bL.current&&bR.current){bL.current.rotation.z=damp(bL.current.rotation.z,t.bl[0],12,dt); bR.current.rotation.z=damp(bR.current.rotation.z,t.br[0],12,dt);}
  if(mouth.current){
    const sx=clamp(1+t.m.smile,.6,1.6);
    mouth.current.scale.x=damp(mouth.current.scale.x||1,sx,10,dt);
    mouth.current.scale.y=damp(mouth.current.scale.y||1,1+t.m.open,10,dt);
  }
}

function WallsPillarsAndDome() {
  const W=27,P=W-.8,H=12;
  const g=useMemo(()=>{
    const s=256,c=document.createElement("canvas"); c.width=c.height=s;
    const g=c.getContext("2d"), d=g.createRadialGradient(s/2,s/2,10,s/2,s/2,s/2);
    d.addColorStop(0,"rgba(255,255,255,0.35)"); d.addColorStop(1,"rgba(255,255,255,0.05)");
    g.fillStyle=d; g.beginPath(); g.arc(s/2,s/2,s/2,0,Math.PI*2); g.fill();
    const t=new THREE.CanvasTexture(c);
    return new THREE.MeshStandardMaterial({map:t,transparent:!0,opacity:.9,roughness:.1,metalness:.1})
  },[]);
  return (
    <group>
      <mesh><sphereGeometry args={[90,36,28]}/><meshBasicMaterial color="#eef3f8" side={THREE.BackSide}/></mesh>
      <group position={[0,H/2,0]}>
        <mesh><cylinderGeometry args={[W,W,H,120,1,!0]}/><meshStandardMaterial color="#fafcff" side={THREE.BackSide} roughness={.95}/></mesh>
        <mesh><cylinderGeometry args={[W+.5,W+.5,H+.1,120,1,!0]}/><meshStandardMaterial color="#f1f5fa" side={THREE.FrontSide} roughness={.95}/></mesh>
      </group>
      <group>
        {Array.from({length:32}).map((_,i)=>{
          const a=i/32*Math.PI*2,x=Math.cos(a)*P,z=Math.sin(a)*P;
          return (
            <group key={i} position={[x,0,z]} rotation={[0,-a,0]}>
              <mesh position={[0,.4,0]} castShadow><cylinderGeometry args={[.9,1,.8,24]}/><meshStandardMaterial color="#fff"/></mesh>
              <mesh position={[0,4.2,0]} castShadow><cylinderGeometry args={[.65,.75,7.6,32]}/><meshStandardMaterial color="#fff" roughness={.6}/></mesh>
              <mesh position={[0,7.9,0]} castShadow><cylinderGeometry args={[.95,.95,.6,24]}/><meshStandardMaterial color="#fff"/></mesh>
              {i%2===0 && (
                <group position={[0,6.2,-1.2]}>
                  <mesh><boxGeometry args={[3,3.6,.12]}/><meshStandardMaterial color="#e9eef5"/></mesh>
                  <mesh position={[0,0,-.08]}><planeGeometry args={[2.6,3]}/><meshStandardMaterial color="#d7ebff" emissive="#d7ebff" emissiveIntensity={.18} transparent opacity={.9}/></mesh>
                </group>
              )}
            </group>
          );
        })}
        <mesh position={[0,8.4,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[P-.8,P+.8,128]}/><meshStandardMaterial color="#fff" side={THREE.DoubleSide}/></mesh>
      </group>
      <group position={[0,11.5,0]}>
        <mesh><sphereGeometry args={[23,36,24,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#f7fbff" side={THREE.BackSide} roughness={.95}/></mesh>
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,.3,0]}><ringGeometry args={[2.6,3.2,48]}/><meshStandardMaterial color="#d5b36b" metalness={.35} roughness={.3}/></mesh>
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,.31,0]} material={g}><circleGeometry args={[2.6,40]}/></mesh>
      </group>
    </group>
  );
}

function JudgePodium({ position = [0,0,0] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0,.75,.05]}><boxGeometry args={[.9,.22,.6]}/><meshStandardMaterial color="#b07a4e"/></mesh>
      <mesh castShadow position={[0,.38,0]}><boxGeometry args={[.75,.5,.5]}/><meshStandardMaterial color="#a27345"/></mesh>
      <mesh position={[0,.85,.15]}><boxGeometry args={[.6,.04,.3]}/><meshStandardMaterial color="#e5dfc8"/></mesh>
    </group>
  );
}

function BannerFlag({ pos = [0,0,0], color = "#2b6cb0", flip = false }) {
  return (
    <group position={pos}>
      <mesh position={[0,1.4,0]}><cylinderGeometry args={[.04,.04,2.8,8]}/><meshStandardMaterial color="#a77a4d"/></mesh>
      <mesh position={[flip?-.6:.6,1.6,0]}><planeGeometry args={[1.2,.8]}/><meshStandardMaterial color={color}/></mesh>
      <mesh position={[0,.05,0]}><sphereGeometry args={[.07,10,10]}/><meshStandardMaterial color="#d5b36b"/></mesh>
    </group>
  );
}

function Lectern({ position = [0,0,0], rotationY = 0 }) {
  return (
    <group position={position} rotation={[0,rotationY,0]} renderOrder={3}>
      <mesh castShadow position={[0,.25,0]}><boxGeometry args={[.6,.5,.5]}/><meshStandardMaterial color="#b78656"/></mesh>
      <mesh castShadow position={[0,.95,0]}><boxGeometry args={[.18,1.4,.18]}/><meshStandardMaterial color="#a27345"/></mesh>
      <group position={[0,1.65,-.05]} rotation={[-.5,0,0]}>
        <mesh castShadow><boxGeometry args={[.8,.06,.5]}/><meshStandardMaterial color="#b07a4e"/></mesh>
        <mesh position={[0,.05,-.22]} castShadow><boxGeometry args={[.8,.06,.06]}/><meshStandardMaterial color="#a27345"/></mesh>
      </group>
      <mesh castShadow position={[0,.02,0]}><boxGeometry args={[.9,.04,.9]}/><meshStandardMaterial color="#a77a4d"/></mesh>
    </group>
  );
}

function WitnessBox({ position = [0,0,0] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0,.45,0]}><boxGeometry args={[1,.9,.8]}/><meshStandardMaterial color="#a97c4f"/></mesh>
      <mesh castShadow position={[0,.95,-.35]}><boxGeometry args={[1,.6,.08]}/><meshStandardMaterial color="#8f673f"/></mesh>
      <mesh castShadow position={[0,.05,0]}><boxGeometry args={[1.1,.1,.9]}/><meshStandardMaterial color="#b07a4e"/></mesh>
    </group>
  );
}

function CounselTable({ position = [0,0,0], label = "" }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0,.6,0]}><boxGeometry args={[2,.12,1]}/><meshStandardMaterial color="#b78656"/></mesh>
      <mesh castShadow position={[.85,.3,.45]}><boxGeometry args={[.1,.6,.1]}/><meshStandardMaterial color="#8f673f"/></mesh>
      <mesh castShadow position={[-.85,.3,.45]}><boxGeometry args={[.1,.6,.1]}/><meshStandardMaterial color="#8f673f"/></mesh>
      <mesh castShadow position={[.6,.35,0]}><boxGeometry args={[.5,.35,.5]}/><meshStandardMaterial color="#8a8a8a"/></mesh>
      <mesh castShadow position={[-.6,.35,0]}><boxGeometry args={[.5,.35,.5]}/><meshStandardMaterial color="#8a8a8a"/></mesh>
      <Text position={[0,.9,.55]} fontSize={.22} color="#fff" anchorX="center" anchorY="middle" outlineWidth={.02} outlineColor="#000">{label}</Text>
    </group>
  );
}

function Tier({ inner, outer, y, seatRadius }) {
  const c=Math.max(18,Math.round(2*Math.PI*seatRadius/1.5)),a=[25*(Math.PI/180),205*(Math.PI/180)],g=.22;
  const i=useMemo(()=>[...Array(c).keys()],[c]);
  return (
    <group position={[0,y,0]}>
      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow renderOrder={3}><ringGeometry args={[inner,outer,96]}/><meshStandardMaterial color="#f0f4fa" side={THREE.DoubleSide}/></mesh>
      {i.map(i=>{
        const p=(i/c)*Math.PI*2,x=Math.cos(p)*seatRadius,z=Math.sin(p)*seatRadius;
        if(a.some(a=>Math.abs((p-a+Math.PI*3)%(Math.PI*2)-Math.PI)<g))return null;
        const y=Math.atan2(x,z);
        return (
          <group key={i} position={[x,0,z]} rotation={[0,y,0]}>
            <mesh position={[0,.35,0]} castShadow><boxGeometry args={[1.5,.22,.5]}/><meshStandardMaterial color="#b07a4e"/></mesh>
            <mesh position={[0,.75,.28]} castShadow><boxGeometry args={[1.5,.6,.08]}/><meshStandardMaterial color="#a27345"/></mesh>
            <mesh position={[0,.11,0]} castShadow><boxGeometry args={[.2,.22,.42]}/><meshStandardMaterial color="#a97c4f"/></mesh>
          </group>
        );
      })}
    </group>
  );
}

function RadialStair({ steps, startR, stepDepth, stepHeight, angleDeg }) {
  const a=angleDeg*Math.PI/180;
  return (
    <group rotation={[0,a,0]}>
      {Array.from({length:steps}).map((_,i)=>{
        const r=startR+i*stepDepth,y=1+Math.max(0,i-1)*stepHeight-.02,x=r;
        return <mesh key={i} position={[x,y,0]} rotation={[0,Math.PI/2,0]} castShadow><boxGeometry args={[stepDepth*.98,.12,.8]}/><meshStandardMaterial color="#e6ecf3"/></mesh>;
      })}
    </group>
  );
}

function AudienceTiers() {
  const r=5,s=2,h=.6,t=12;
  const e=useMemo(()=>{
    const e=[];
    for(let i=0;i<r;i++){
      const n=t+i*s,o=n+s*1.02,a=1+i*h,d=(n+o)*.5;
      e.push({inner:n,outer:o,y:a,seatRadius:d,idx:i})
    }
    return e
  },[]);
  return (
    <group>
      {e.map(t=><Tier key={t.idx} {...t}/>)}
      {e.map((r,i)=><mesh key={`sk-${i}`} rotation={[-Math.PI/2,0,0]} position={[0,r.y-.18,0]} renderOrder={2}><ringGeometry args={[r.inner-.2,r.outer+.35,96]}/><meshStandardMaterial color="#e9eef5" side={THREE.DoubleSide}/></mesh>)}
      <RadialStair steps={r+2} startR={t-.5} stepDepth={s} stepHeight={h} angleDeg={25}/>
      <RadialStair steps={r+2} startR={t-.5} stepDepth={s} stepHeight={h} angleDeg={205}/>
    </group>
  );
}

function Guard({ position=[0,0,0], heading=0, mirrored=false }) {
  return (
    <group position={position} rotation={[0,heading,0]}>
      <mesh position={[-.18,.13,0]}><capsuleGeometry args={[.11,.1,6,12]}/><meshStandardMaterial color="#222"/></mesh>
      <mesh position={[.18,.13,0]}><capsuleGeometry args={[.11,.1,6,12]}/><meshStandardMaterial color="#222"/></mesh>
      <mesh position={[0,.95,0]} castShadow><capsuleGeometry args={[.45,.9,12,16]}/><meshStandardMaterial color="#3a5a9b"/></mesh>
      <group position={[0,1.7,0]}>
        <mesh castShadow><sphereGeometry args={[.35,18,16]}/><meshStandardMaterial color="#ffe0bd"/></mesh>
        <mesh position={[0,.2,0]} castShadow><sphereGeometry args={[.38,18,16,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#2f3e5e"/></mesh>
        <mesh position={[0,.33,0]} castShadow><coneGeometry args={[.18,.22,12]}/><meshStandardMaterial color="#d5b36b"/></mesh>
      </group>
      <group position={[mirrored?-.56:.56,1.1,0]}>
        <mesh castShadow><capsuleGeometry args={[.08,.25,6,10]}/><meshStandardMaterial color="#3a5a9b"/></mesh>
        <group position={[0,-.28,0]}>
          <mesh castShadow position={[0,-.18,0]}><capsuleGeometry args={[.07,.22,6,10]}/><meshStandardMaterial color="#3a5a9b"/></mesh>
          <group position={[mirrored?-.05:.05,-.42,0]}>
            <mesh rotation={[0,0,Math.PI/2]} position={[mirrored?-.05:.05,0,0]} castShadow><cylinderGeometry args={[.03,.03,2.2,8]}/><meshStandardMaterial color="#8f673f"/></mesh>
            <mesh position={[mirrored?-1.15:1.15,.22,0]} rotation={[0,0,mirrored?-Math.PI/6:Math.PI/6]}><coneGeometry args={[.12,.4,10]}/><meshStandardMaterial color="#d8dbe2" metalness={.6} roughness={.3}/></mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

function SceneGeometry() {
  const arenaR=10.2;
  const gridTex=useMemo(()=>{
    const s=256,c=document.createElement("canvas"); c.width=c.height=s;
    const t=c.getContext("2d");
    t.clearRect(0,0,s,s);
    t.strokeStyle="rgba(0,0,0,0.08)"; t.lineWidth=1;
    for(let x=0;x<=s;x+=32){t.beginPath();t.moveTo(x+.5,0);t.lineTo(x+.5,s);t.stroke()}
    for(let y=0;y<=s;y+=32){t.beginPath();t.moveTo(0,y+.5);t.lineTo(s,y+.5);t.stroke()}
    const e=new THREE.CanvasTexture(c);
    e.wrapS=e.wrapT=THREE.RepeatWrapping; e.anisotropy=8; return e
  },[]);
  return (
    <group>
      <WallsPillarsAndDome/>
      <mesh receiveShadow rotation={[-Math.PI/2,0,0]} renderOrder={1}><circleGeometry args={[arenaR+5,64]}/><meshStandardMaterial color="#f4f7fb" polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1}/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.02,0]} renderOrder={2}><planeGeometry args={[40,40,1,1]}/><meshBasicMaterial map={gridTex} transparent opacity={.45} depthWrite={false}/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.11,0]} renderOrder={9}><ringGeometry args={[3.6,3.9,64]}/><meshStandardMaterial color="#e7d6ad"/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.12,0]} renderOrder={10}><circleGeometry args={[5,128]}/><meshStandardMaterial color="#d14a4a" polygonOffset polygonOffsetFactor={16} polygonOffsetUnits={16}/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.11,-2.2]} renderOrder={9}><planeGeometry args={[2.2,4.2]}/><meshStandardMaterial color="#e06a6a" polygonOffset polygonOffsetFactor={12} polygonOffsetUnits={12}/></mesh>
      <mesh position={[0,.95,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[9,.06,8,192]}/><meshStandardMaterial color="#8f673f" roughness={.7}/></mesh>
      <group>
        {Array.from({length:14}).map((_,i)=>{
          const a=i/14*Math.PI*2,x=Math.cos(a)*9,z=Math.sin(a)*9;
          return <mesh key={i} position={[x,.45,z]} castShadow renderOrder={3}><cylinderGeometry args={[.085,.085,.9,12]}/><meshStandardMaterial color="#a77a4d" roughness={.8}/></mesh>;
        })}
      </group>
      <group position={[0,0,-4.5]} renderOrder={3}>
        <mesh castShadow><cylinderGeometry args={[2.2,2.2,1.4,32]}/><meshStandardMaterial color="#b78656"/></mesh>
        <mesh position={[0,1.25,-.2]} castShadow><boxGeometry args={[4.2,1,1.2]}/><meshStandardMaterial color="#a27345"/></mesh>
        <JudgePodium position={[-1.2,0,.4]}/><JudgePodium position={[0,0,.4]}/><JudgePodium position={[1.2,0,.4]}/>
      </group>
      <group position={[0,6.2,-8.5]}>
        <mesh><torusGeometry args={[1,.08,8,48]}/><meshStandardMaterial color="#d5b36b" metalness={.3} roughness={.3}/></mesh>
        <mesh position={[0,-.1,0]}><circleGeometry args={[.6,32]}/><meshStandardMaterial color="#f7dfa1" emissive="#f7dfa1" emissiveIntensity={.15}/></mesh>
        <BannerFlag pos={[-2.8,-1,0.1]} color="#2b6cb0"/><BannerFlag pos={[2.8,-1,0.1]} color="#b83280" flip/>
      </group>
      <Lectern position={[0,0,.8]} rotationY={Math.PI}/>
      <WitnessBox position={[1.2,0,-3]}/>
      <CounselTable position={[3.6,0,-1.2]} label="Prosecution"/>
      <CounselTable position={[-3.6,0,-1.2]} label="Defense"/>
      <AudienceTiers/>
    </group>
  );
}

// --- Main Scene Component (with Multiplayer additions) ---

export default function CourtroomScene({ trialId, role: roleProp, name, cameraMode }) {
  const normalizedRole = (roleProp || "Audience").toString().trim().toLowerCase();
  const initialRole = normalizedRole === "judge" ? "Judge" : normalizedRole === "accused" ? "Accused" : "Audience";
  const [role, setRole] = useState(initialRole);

  const bodyRef = useRef();
  const keys = useKeyboard();
  const vel = useRef([0, 0, 0]);
  const speedRef = useRef(0);
  const [bubbles, setBubbles] = useState([]);
  const [banner, setBanner] = useState(null);

  const usedSeatsRef = useRef(new Set());

  const SEATING = useMemo(() => {
    const rows = 5, startR = 12.0, stepDepth = 2.0, stepHeight = 0.6;
    const allSeats = [];
    for (let i = 0; i < rows; i++) {
      const inner = startR + i * stepDepth;
      const seatRadius = (inner + stepDepth * 1.02 + inner) * 0.5;
      const benchCount = Math.max(18, Math.round((2 * Math.PI * seatRadius) / 1.5));
      for (let j = 0; j < benchCount; j++) {
        const a = (j / benchCount) * Math.PI * 2;
        const x = Math.cos(a) * seatRadius;
        const z = Math.sin(a) * seatRadius;
        const seatWorldY = (1.0 + i * stepHeight) + 0.35 + 0.11;
        const yaw = Math.atan2(-x, -z);
        allSeats.push({ key: `${i}-${j}`, x, z, yaw, seatWorldY, angle: a });
      }
    }
    function findClosestSeat(x, z) {
      if (!allSeats.length) return null;
      let closest = null, minDistSq = Infinity;
      for (const seat of allSeats) { const distSq = (seat.x - x) ** 2 + (seat.z - z) ** 2; if (distSq < minDistSq) { minDistSq = distSq; closest = seat; } }
      return closest;
    }
    return { allSeats, findClosestSeat };
  }, []);

  const [audSeat, setAudSeat] = useState(null);
  const [emoteState, setEmoteState] = useState(null);

  // -------- Multiplayer state --------
  const [others, setOthers] = useState([]); // [{socketId, role, pose, display_name, handle, emote}]
  const lastPoseSentAt = useRef(0);
  const remoteSmooth = useRef({}); // socketId -> { pos: Vector3, ry }

  // Always ensure socket is connected (handles autoConnect:false setups)
  useEffect(() => {
    if (!socket.connected) socket.connect();
    return () => {
      // optional: leave room on unmount
      if (trialId) socket.emit("room:leave", { trialId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync role from props
  useEffect(() => {
    if (!roleProp) return;
    const n = roleProp.toString().trim().toLowerCase();
    const mapped = n === "judge" ? "Judge" : n === "accused" ? "Accused" : "Audience";
    if (mapped !== role) { setRole(mapped); }
  }, [roleProp, role]);

  // Handle role changes
  useEffect(() => {
    if (!bodyRef.current) return;

    // Reset velocity on any role change to prevent sliding
    vel.current = [0, 0, 0];
    speedRef.current = 0;

    if (role === 'Judge') {
      if (audSeat) setAudSeat(null); // Clean up previous seat state
      bodyRef.current.position.set(0, 0, -5.3);
      bodyRef.current.rotation.y = 0;
    } else if (role === 'Accused') {
      if (audSeat) setAudSeat(null); // Clean up previous seat state
      bodyRef.current.position.set(0, 0, 2.4);
      bodyRef.current.rotation.y = 0;
    } else if (role === 'Audience') {
      // Find an available seat if we don't have one or if the current one is taken
      const availableSeats = SEATING.allSeats.filter(s => !usedSeatsRef.current.has(s.key));
      const seat = availableSeats.length > 0
        ? availableSeats[Math.floor(Math.random() * availableSeats.length)]
        : SEATING.allSeats[0];

      if (seat) {
        if (audSeat && audSeat.key !== seat.key) {
          usedSeatsRef.current.delete(audSeat.key);
        }
        usedSeatsRef.current.add(seat.key);
        setAudSeat(seat);
        bodyRef.current.position.set(seat.x, seat.seatWorldY, seat.z);
        bodyRef.current.rotation.y = seat.yaw;
        if (trialId) {
          socket.emit("seat:request", { trialId, hint: { x: seat.x, z: seat.z } });
        }
      }
    }

    // notify server of role change (multiplayer) – support either event name
    if (trialId) {
      socket.emit("role:change", { trialId, role });
      socket.emit("role:set", { trialId, role });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]); // This effect is the single source of truth for role transitions

  // Socket room join + presence listeners (multiplayer)
  useEffect(() => {
    if (!trialId) return;

    const onJoinAck = ({ self, participants }) => {
      const myId = self?.socketId ?? socket.id;
      const othersArr = (participants || []).filter(p => p.socketId !== myId);
      setOthers(othersArr);
    };
    const onPresenceState = ({ participants }) => {
      const myId = socket.id;
      const othersArr = (participants || []).filter(p => p.socketId !== myId);
      setOthers(othersArr);
    };
    const onPresenceUpdate = ({ participants }) => {
      const myId = socket.id;
      const othersArr = (participants || []).filter(p => p.socketId !== myId);
      setOthers(othersArr);
    };
    const onPresenceJoined = (p) => {
      setOthers(prev => {
        const exists = prev.some(x => x.socketId === p.socketId);
        return exists ? prev : [...prev, p];
      });
    };
    const onPresenceLeft = ({ socketId }) => {
      setOthers(prev => prev.filter(p => p.socketId !== socketId));
      delete remoteSmooth.current[socketId];
    };

    const onPoseBroadcast = ({ socketId, pose }) => {
      setOthers(prev => prev.map(p => p.socketId === socketId ? { ...p, pose } : p));
    };
    const onEmoteUpdate = ({ socketId, emote }) => {
      setOthers(prev => prev.map(p => p.socketId === socketId ? { ...p, emote } : p));
    };

    socket.emit("room:join", { trialId, role, name }, (ack) => {
      // support servers that use ACK callback
      if (ack?.ok && ack?.self && Array.isArray(ack?.participants)) {
        onJoinAck({ self: ack.self, participants: ack.participants });
      }
    });
    socket.on("room:join:ack", onJoinAck);

    // presence variants
    socket.on("presence:state", onPresenceState);
    socket.on("presence:update", onPresenceUpdate);
    socket.on("presence:joined", onPresenceJoined);
    socket.on("presence:left", onPresenceLeft);
    socket.on("participant:left", onPresenceLeft); // alt name

    // updates
    socket.on("pose:broadcast", onPoseBroadcast);
    socket.on("emote:update", onEmoteUpdate);

    return () => {
      socket.off("room:join:ack", onJoinAck);
      socket.off("presence:state", onPresenceState);
      socket.off("presence:update", onPresenceUpdate);
      socket.off("presence:joined", onPresenceJoined);
      socket.off("presence:left", onPresenceLeft);
      socket.off("participant:left", onPresenceLeft);
      socket.off("pose:broadcast", onPoseBroadcast);
      socket.off("emote:update", onEmoteUpdate);
    };
  }, [trialId, role, name]);

  // Clear seat usage on trial change
  useEffect(() => { usedSeatsRef.current.clear(); }, [trialId]);

  // Emote hotkeys + notify server
  useEffect(() => {
    const map = { Digit1: "thumbs_up", Digit2: "thumbs_down", Digit3: "begging", Digit4: "argument", Digit5: "point_forward", Digit6: "point_up" };
    const emojis = { thumbs_up: "👍", thumbs_down: "👎", begging: "🙏", argument: "🗣️", point_forward: "👉", point_up: "☝️" };
    const onDown = (e) => {
      const ae = document.activeElement;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.getAttribute("contenteditable") === "true")) return;
      const type = map[e.code]; if (!type) return;
      const DUR = 1600;
      const next = { type, emoji: emojis[type], until: performance.now() + DUR };
      setEmoteState(next);
      if (trialId) {
        socket.emit("emote:set", { trialId, emote: type });
        socket.emit("emote:update", { trialId, emote: type }); // alt
      }
    };
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  }, [trialId]);

  // Chat bindings
  useEffect(() => {
    const input = document.getElementById("juribly-chat-input"); const btn = document.getElementById("juribly-chat-send");
    if (!input || !btn) return;
    const send = () => {
      const txt = (input.value || "").trim(); if (!txt) return;
      const p = bodyRef.current ? bodyRef.current.position : new THREE.Vector3();
      socket.emit("chat:msg", { trialId, payload: { text: txt, position: { x: p.x, y: p.y, z: p.z } } });
      input.value = "";
    };
    const onKey = (e) => { if (e.key === "Enter") send(); };
    btn.addEventListener("click", send); input.addEventListener("keydown", onKey);
    return () => { btn.removeEventListener("click", send); input.removeEventListener("keydown", onKey); };
  }, [trialId]);

  // Incoming chat/banner
  useEffect(() => {
    const onMsg = (msg) => {
      const id = msg.id ?? Math.random().toString(36).slice(2);
      const entry = {
        id,
        text: `${msg.from ?? "user"}: ${msg.text ?? msg.payload?.text ?? ""}`,
        position: msg.position || msg.payload?.position || { x: 0, y: 0, z: 0 },
        expires: performance.now() + 4000
      };
      setBubbles((prev) => [...prev.filter((b) => b.expires > performance.now()), entry].slice(-20));
      setTimeout(() => setBubbles((prev) => prev.filter((b) => b.id !== id)), 4200);
    };
    const onBanner = (b) => { setBanner(b.text || String(b)); setTimeout(() => setBanner(null), 4000); };
    socket.on("chat:msg", onMsg); socket.on("court:banner", onBanner);
    return () => { socket.off("chat:msg", onMsg); socket.off("court:banner", onBanner); };
  }, []);

  const { camera } = useThree();
  const chaseSmooth = useRef([0, 7.6, 14.2]);
  const playerR = 0.35;
  const obstacles = useMemo(() => [{ x: 0, z: -4.5, r: 2.35 }, { x: 0, z: 0.8, r: 0.7 }, { x: -3.6, z: -1.2, r: 1.2 }, { x: 3.6, z: -1.2, r: 1.2 }, { x: 1.2, z: -3.0, r: 0.9 }, { x: -2.1, z: -3.1, r: 0.6 }, { x: 2.1, z: -3.1, r: 0.6 }, { x: 0, z: 9.0, r: 0.45 }], []);

  useFrame((_, dtRaw) => {
    if (!bodyRef.current) return;
    const dt = clamp(dtRaw, 0, 0.05);
    const pNow = bodyRef.current.position;

    // Audience camera logic (no movement)
    if (role === "Audience") {
      vel.current = [0, 0, 0]; speedRef.current = 0;
      const seatVec = audSeat ? new THREE.Vector3(audSeat.x, 0, audSeat.z) : new THREE.Vector3(0, 0, 14);
      const dir = seatVec.clone().normalize();
      const WALL_R = 27.0; const camR = Math.min(WALL_R - 2.6, seatVec.length() + 10.2);
      const camTarget = dir.multiplyScalar(camR);
      const target = [camTarget.x, Math.max(9.5, camera.position.y), camTarget.z];
      chaseSmooth.current[0] = damp(chaseSmooth.current[0], target[0], 6, dt);
      chaseSmooth.current[1] = damp(chaseSmooth.current[1], target[1], 6, dt);
      chaseSmooth.current[2] = damp(chaseSmooth.current[2], target[2], 6, dt);
      camera.position.set(...chaseSmooth.current);
      camera.lookAt(0, 1.6, -2.2);
    } else {
      // Judge/Accused movement logic
      const ae = document.activeElement; const typing = ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.getAttribute("contenteditable") === "true");
      const isShift = keyAny(keys, ["ShiftLeft", "ShiftRight"]) || keys.shift;
      const accel = (isShift ? 2.2 : 1.4) * dt;
      const friction = 0.90;
      let [vx, vy, vz] = vel.current;
      if (!typing) {
        if (keys["KeyW"] || keys["ArrowUp"] || keys.forward) vz -= accel;
        if (keys["KeyS"] || keys["ArrowDown"] || keys.back) vz += accel;
        if (keys["KeyA"] || keys["ArrowLeft"] || keys.left) vx -= accel;
        if (keys["KeyD"] || keys["ArrowRight"] || keys.right) vx += accel;
      }
      vx *= friction; vz *= friction;
      const p = pNow.clone();
      p.x += vx; p.z += vz;
      const arenaMaxR = 9.4; const rNow = Math.hypot(p.x, p.z);
      if (rNow > arenaMaxR) { const s = arenaMaxR / rNow; p.x *= s; p.z *= s; vx = 0; vz = 0; }
      for (const o of obstacles) {
        const dx = p.x - o.x, dz = p.z - o.z; const d = Math.hypot(dx, dz); const minD = o.r + playerR;
        if (d < minD && d > 0.0001) { const push = (minD - d) + 0.001; p.x += (dx / d) * push; p.z += (dz / d) * push; vx = 0; vz = 0; }
      }
      bodyRef.current.position.set(p.x, 0, p.z); // Keep on the ground
      vel.current = [vx, vy, vz];
      const speed = Math.hypot(vx, vz) / Math.max(dt, 1e-4);
      speedRef.current = speed;
      if (speed > 0.001) { bodyRef.current.rotation.y = yawFromVelocity(vx, vz); }
      const desired = [p.x + 0, 7.6, p.z + 14.2];
      chaseSmooth.current[0] = damp(chaseSmooth.current[0], desired[0], 6, dt);
      chaseSmooth.current[1] = damp(chaseSmooth.current[1], desired[1], 6, dt);
      chaseSmooth.current[2] = damp(chaseSmooth.current[2], desired[2], 6, dt);
      camera.position.set(...chaseSmooth.current);
      camera.lookAt(p.x, 1.0, p.z);
    }

    // Send pose ~20Hz (support both event names)
    const now = performance.now();
    if (now - lastPoseSentAt.current > 50) {
      lastPoseSentAt.current = now;
      const pose = {
        x: bodyRef.current.position.x,
        y: bodyRef.current.position.y,
        z: bodyRef.current.position.z,
        ry: bodyRef.current.rotation.y,
      };
      if (trialId) {
        socket.emit("pose:set", { trialId, pose });
        socket.emit("pose:update", { trialId, pose }); // alt
      }
    }
  });

  // Smooth remote avatars motion
  useFrame((_, dt) => {
    const k = Math.min(1, dt);
    for (const p of others) {
      const sm = (remoteSmooth.current[p.socketId] ||= {
        pos: new THREE.Vector3(p.pose?.x||0, p.pose?.y||0, p.pose?.z||0),
        ry: p.pose?.ry || 0
      });
      sm.pos.x = damp(sm.pos.x, (p.pose?.x ?? 0), 8, k);
      sm.pos.y = damp(sm.pos.y, (p.pose?.y ?? 0), 8, k);
      sm.pos.z = damp(sm.pos.z, (p.pose?.z ?? 0), 8, k);
      sm.ry    = damp(sm.ry,   (p.pose?.ry ?? 0), 8, k);
    }
  });

  // The role change is now handled by the useEffect hook watching `role`.
  const handleRoleChange = (e) => { setRole(e.target.value); };

  return (
    <>
      <Html transform={false} position={[0,0,0]}>
        <div style={{ position:"fixed", top:12, left:12, zIndex:50, background:"rgba(17,24,39,.85)", color:"#fff", padding:"8px 10px", borderRadius:10, display:"flex", gap:8, alignItems:"center" }}>
          <span style={{fontWeight:600, fontSize:12}}>Role</span>
          <select value={role} onChange={handleRoleChange} style={{background:"#111827", color:"#fff", border:"1px solid #374151", borderRadius:6, padding:"4px 6px"}}>
            <option>Judge</option>
            <option>Accused</option>
            <option>Audience</option>
          </select>
          <span style={{opacity:.8,fontSize:12,marginLeft:6}}>Emotes: 1–6</span>
        </div>
      </Html>

      <hemisphereLight skyColor={"#f9fbff"} groundColor={"#e7edf5"} intensity={0.55} />
      <directionalLight castShadow color={"#ffeec7"} intensity={0.7} position={[-30, 40, 20]} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <SceneGeometry />

      {/* Local player */}
      <group ref={bodyRef}>
        <CuteBuddy role={role} name={name} getSpeed={() => speedRef.current} emoteState={emoteState} forcePose={role === "Audience" ? "sit" : "auto"} />
      </group>

      {/* Remote players */}
      {others.map((p) => {
        const sm = remoteSmooth.current[p.socketId];
        const rr = sm ? sm.pos : new THREE.Vector3(p.pose?.x||0, p.pose?.y||0, p.pose?.z||0);
        const ry = sm ? sm.ry : (p.pose?.ry||0);
        const isAudience = p.role === "Audience";
        const emote = p.emote ? { type: p.emote, emoji: "", until: Number.MAX_SAFE_INTEGER } : null;
        return (
          <group key={p.socketId} position={[rr.x, rr.y, rr.z]} rotation={[0, ry, 0]}>
            <CuteBuddy role={p.role || "Audience"} name={p.display_name || p.handle || "Guest"} getSpeed={() => 0} emoteState={emote} forcePose={isAudience ? "sit" : "auto"} />
          </group>
        );
      })}

      <Guard position={[-2.1, 0, -3.1]} heading={Math.PI / 12} />
      <Guard position={[2.1, 0, -3.1]} heading={-Math.PI / 12} mirrored />

      {bubbles.map((b) => (
        <Billboard key={b.id} position={[b.position.x, (b.position.y || 0) + 2.6, b.position.z]}>
          <Text fontSize={0.24} color="#ffffff" outlineWidth={0.04} outlineColor="#000000" maxWidth={6}>{b.text}</Text>
        </Billboard>
      ))}
      {banner && (
        <Billboard position={[0, 5.2, 0]}>
          <Text fontSize={0.5} color="#2d2415" outlineWidth={0.04} outlineColor="#e7d48e" maxWidth={18}>{banner}</Text>
        </Billboard>
      )}
    </>
  );
}
