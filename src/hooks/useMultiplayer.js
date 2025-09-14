// juribly-web/src/hooks/useMultiplayer.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import socket from "../lib/socket.js";

export default function useMultiplayer() {
  const [connected, setConnected] = useState(false);
  const [self, setSelf] = useState(null);
  const [participants, setParticipants] = useState(new Map());
  const lastPoseSentAt = useRef(0);

  // Socket lifecycle + listeners
  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onPresenceState = ({ participants }) => {
      setParticipants(new Map(participants.map(p => [p.socketId, p])));
    };
    const onPresenceJoined = (p) => {
      setParticipants(prev => new Map(prev).set(p.socketId, p));
    };
    const onPresenceLeft = ({ socketId }) => {
      setParticipants(prev => {
        const m = new Map(prev);
        m.delete(socketId);
        return m;
      });
    };
    const onPose = ({ socketId, pose }) => {
      setParticipants(prev => {
        const m = new Map(prev);
        const p = m.get(socketId);
        if (p) m.set(socketId, { ...p, pose });
        return m;
      });
    };
    const onEmote = ({ socketId, emote }) => {
      setParticipants(prev => {
        const m = new Map(prev);
        const p = m.get(socketId);
        if (p) m.set(socketId, { ...p, emote });
        return m;
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("presence:state", onPresenceState);
    socket.on("presence:joined", onPresenceJoined);
    socket.on("presence:left", onPresenceLeft);
    socket.on("pose:broadcast", onPose);
    socket.on("emote:update", onEmote);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("presence:state", onPresenceState);
      socket.off("presence:joined", onPresenceJoined);
      socket.off("presence:left", onPresenceLeft);
      socket.off("pose:broadcast", onPose);
      socket.off("emote:update", onEmote);
    };
  }, []);

  const others = useMemo(() => {
    const arr = Array.from(participants.values());
    return self?.socketId ? arr.filter(p => p.socketId !== self.socketId) : arr;
  }, [participants, self]);

  const joinRoom = useCallback(({ trialId, role, name, handle, profile_id }) => {
    if (!socket.connected) socket.connect();
    socket.emit("room:join", { trialId, role, name, handle, profile_id }, (ack) => {
      if (ack?.ok) setSelf(ack.self);
      else console.error("join failed", ack);
    });
  }, []);

  const leaveRoom = useCallback(({ trialId }) => {
    socket.emit("room:leave", { trialId });
  }, []);

  const updatePose = useCallback(({ trialId, pose }) => {
    const now = performance.now();
    if (now - lastPoseSentAt.current < 33) return; // ~30fps
    lastPoseSentAt.current = now;
    socket.emit("pose:update", { trialId, pose });
  }, []);

  const sendEmote = useCallback(({ trialId, emote }) => {
    socket.emit("emote:update", { trialId, emote });
  }, []);

  const requestSeat = useCallback(({ trialId }) => {
    socket.emit("seat:request", { trialId });
  }, []);

  return { connected, self, participants, others, joinRoom, leaveRoom, updatePose, sendEmote, requestSeat };
}
