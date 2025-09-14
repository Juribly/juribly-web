// juribly-web/src/hooks/useKeyboard.js
import { useEffect, useRef, useState } from "react";

export default function useKeyboard() {
  const [keys, setKeys] = useState({});
  const down = useRef({});

  useEffect(() => {
    const set = (code, pressed) => {
      down.current[code] = pressed;
      const k = {
        ArrowUp: !!down.current["ArrowUp"],
        ArrowDown: !!down.current["ArrowDown"],
        ArrowLeft: !!down.current["ArrowLeft"],
        ArrowRight: !!down.current["ArrowRight"],
        KeyW: !!down.current["KeyW"],
        KeyA: !!down.current["KeyA"],
        KeyS: !!down.current["KeyS"],
        KeyD: !!down.current["KeyD"],
        ShiftLeft: !!down.current["ShiftLeft"],
        ShiftRight: !!down.current["ShiftRight"],
      };
      setKeys({
        forward: k.KeyW || k.ArrowUp,
        back: k.KeyS || k.ArrowDown,
        left: k.KeyA || k.ArrowLeft,
        right: k.KeyD || k.ArrowRight,
        shift: k.ShiftLeft || k.ShiftRight,
      });
    };

    const onDown = (e) => set(e.code, true);
    const onUp = (e) => set(e.code, false);
    const onBlur = () => { down.current = {}; setKeys({}); };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return keys;
}
