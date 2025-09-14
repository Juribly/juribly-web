import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CuteBuddy } from './CourtroomScene.jsx';

export default { title: 'Emotes/CuteBuddy' };

export const Preview = () => {
  const [emote, setEmote] = useState('thumbs_up');
  return (
    <Canvas camera={{ position: [0, 3, 6], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <CuteBuddy role="Judge" name="Buddy" getSpeed={() => 0} emoteState={{ type: emote, until: Infinity, emoji: '😀' }} />
    </Canvas>
  );
};
