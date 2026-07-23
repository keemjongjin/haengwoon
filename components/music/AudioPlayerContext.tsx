"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

export type NowPlayingTrack = {
  id: number;
  title: string;
  artist: string;
  coverImageUrl: string | null;
  previewUrl: string;
};

type AudioPlayerContextValue = {
  current: NowPlayingTrack | null;
  isPlaying: boolean;
  volume: number;
  /** 같은 곡이면 재생/일시정지 토글, 다른 곡이면 그 곡으로 전환 (한 번에 하나만 재생) */
  play: (track: NowPlayingTrack) => void;
  /** 순서대로 자동 재생 (앨범 전체 재생용) — 곡이 끝나면 다음 곡으로 자동 진행 */
  playQueue: (tracks: NowPlayingTrack[]) => void;
  pause: () => void;
  setVolume: (v: number) => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentRef = useRef<NowPlayingTrack | null>(null);
  const isPlayingRef = useRef(false);
  const volumeRef = useRef(1);
  const queueRef = useRef<NowPlayingTrack[]>([]);
  const queueIndexRef = useRef(0);

  const [current, setCurrentState] = useState<NowPlayingTrack | null>(null);
  const [isPlaying, setIsPlayingState] = useState(false);
  const [volume, setVolumeState] = useState(1);

  function setCurrent(t: NowPlayingTrack | null) {
    currentRef.current = t;
    setCurrentState(t);
  }
  function setIsPlaying(v: boolean) {
    isPlayingRef.current = v;
    setIsPlayingState(v);
  }

  function ensureAudio() {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.volume = volumeRef.current;
      audio.onended = () => {
        const q = queueRef.current;
        const nextIdx = queueIndexRef.current + 1;
        if (nextIdx < q.length) {
          queueIndexRef.current = nextIdx;
          playInternal(q[nextIdx]);
        } else {
          setIsPlaying(false);
        }
      };
      audioRef.current = audio;
    }
    return audioRef.current;
  }

  function playInternal(track: NowPlayingTrack) {
    const audio = ensureAudio();
    audio.src = track.previewUrl;
    audio.volume = volumeRef.current;
    setCurrent(track);
    setIsPlaying(true);
    // play()는 Promise를 반환 — 잘못된 URL이나 빠른 곡 전환(AbortError) 시 reject됨.
    // uncaught rejection을 막고, 이 곡이 여전히 현재 곡일 때만 정지 상태로 되돌린다
    // (전환 중이면 이미 다른 곡이 current라서 건드리지 않음).
    audio.play()?.catch(() => {
      if (currentRef.current?.id === track.id) setIsPlaying(false);
    });
  }

  const play = useCallback((track: NowPlayingTrack) => {
    queueRef.current = [track];
    queueIndexRef.current = 0;
    if (currentRef.current?.id === track.id) {
      if (isPlayingRef.current) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
        audioRef.current?.play()?.catch(() => setIsPlaying(false));
      }
      return;
    }
    playInternal(track);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playQueue = useCallback((tracks: NowPlayingTrack[]) => {
    if (tracks.length === 0) return;
    queueRef.current = tracks;
    queueIndexRef.current = 0;
    playInternal(tracks[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const setVolume = useCallback((v: number) => {
    volumeRef.current = v;
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  return (
    <AudioPlayerContext.Provider value={{ current, isPlaying, volume, play, playQueue, pause, setVolume }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}
