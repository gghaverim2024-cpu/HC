import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import type { VoiceParticipant } from '../types';

// Mesh WebRTC voice chat: every participant connects directly to every other
// participant (no media server). Signaling (offer/answer/ICE) is relayed
// through the existing Socket.IO connection — the server never touches audio.
//
// Known limitation: mesh only scales to a handful of people (~6-8) before
// bandwidth/CPU degrade, and peers behind strict/symmetric NAT may fail to
// connect since there's no TURN relay server configured (STUN only).

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

interface UseVoiceRoomResult {
  joined: boolean;
  connecting: boolean;
  participants: VoiceParticipant[];
  selfMuted: boolean;
  error: string | null;
  join: () => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
}

export function useVoiceRoom(roomKey: string): UseVoiceRoomResult {
  const { socket } = useSocket();
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [selfMuted, setSelfMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const knownPeerIdsRef = useRef<Set<string>>(new Set());
  const joinedRef = useRef(false);

  const cleanupPeer = useCallback((socketId: string) => {
    peersRef.current.get(socketId)?.close();
    peersRef.current.delete(socketId);
    const audioEl = audioElsRef.current.get(socketId);
    if (audioEl) {
      audioEl.srcObject = null;
      audioEl.remove();
    }
    audioElsRef.current.delete(socketId);
    knownPeerIdsRef.current.delete(socketId);
  }, []);

  const createPeerConnection = useCallback(
    (peerSocketId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.onicecandidate = (e) => {
        if (e.candidate && socket) {
          socket.emit('voice:signal', {
            roomKey,
            toSocketId: peerSocketId,
            data: { type: 'ice', candidate: e.candidate },
          });
        }
      };

      pc.ontrack = (e) => {
        let audioEl = audioElsRef.current.get(peerSocketId);
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.autoplay = true;
          audioEl.style.display = 'none';
          document.body.appendChild(audioEl);
          audioElsRef.current.set(peerSocketId, audioEl);
        }
        audioEl.srcObject = e.streams[0];
      };

      peersRef.current.set(peerSocketId, pc);
      return pc;
    },
    [socket, roomKey]
  );

  const leave = useCallback(() => {
    if (!joinedRef.current) return;
    socket?.emit('voice:leave', { roomKey });
    for (const socketId of [...peersRef.current.keys()]) cleanupPeer(socketId);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    joinedRef.current = false;
    setJoined(false);
    setParticipants([]);
    setSelfMuted(false);
  }, [socket, roomKey, cleanupPeer]);

  const join = useCallback(async () => {
    if (!socket || joinedRef.current) return;
    setConnecting(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      socket.emit('voice:join', { roomKey });
      joinedRef.current = true;
      setJoined(true);
    } catch {
      setError('לא ניתן לגשת למיקרופון — בדוק הרשאות דפדפן');
    } finally {
      setConnecting(false);
    }
  }, [socket, roomKey]);

  useEffect(() => {
    if (!socket) return;

    const onParticipants = (payload: { roomKey: string; participants: VoiceParticipant[] }) => {
      if (payload.roomKey !== roomKey) return;
      setParticipants(payload.participants);
      if (!joinedRef.current) return;

      const currentIds = new Set(payload.participants.map((p) => p.socketId));
      // clean up peers who left
      for (const socketId of [...knownPeerIdsRef.current]) {
        if (!currentIds.has(socketId)) cleanupPeer(socketId);
      }
      // connect to newly-seen peers (deterministic tie-break avoids double offers)
      for (const p of payload.participants) {
        if (p.socketId === socket.id) continue;
        if (knownPeerIdsRef.current.has(p.socketId)) continue;
        knownPeerIdsRef.current.add(p.socketId);
        if (socket.id! < p.socketId) {
          const pc = createPeerConnection(p.socketId);
          pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer).then(() => offer))
            .then((offer) => {
              socket.emit('voice:signal', { roomKey, toSocketId: p.socketId, data: { type: 'offer', sdp: offer } });
            });
        }
      }
    };

    const onSignal = async ({ fromSocketId, data }: { fromSocketId: string; data: any }) => {
      if (!joinedRef.current) return;
      let pc = peersRef.current.get(fromSocketId);
      if (data.type === 'offer') {
        if (!pc) {
          knownPeerIdsRef.current.add(fromSocketId);
          pc = createPeerConnection(fromSocketId);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice:signal', { roomKey, toSocketId: fromSocketId, data: { type: 'answer', sdp: answer } });
      } else if (data.type === 'answer' && pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === 'ice' && pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch {
          // ignore late/invalid ICE candidates
        }
      }
    };

    socket.on('voice:participants', onParticipants);
    socket.on('voice:signal', onSignal);
    return () => {
      socket.off('voice:participants', onParticipants);
      socket.off('voice:signal', onSignal);
    };
  }, [socket, roomKey, createPeerConnection, cleanupPeer]);

  // leave the room automatically when navigating away
  useEffect(() => () => leave(), [leave]);

  const toggleMute = useCallback(() => {
    const next = !selfMuted;
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setSelfMuted(next);
    socket?.emit('voice:mute', { roomKey, muted: next });
  }, [selfMuted, socket, roomKey]);

  return { joined, connecting, participants, selfMuted, error, join, leave, toggleMute };
}
