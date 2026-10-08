import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {
  AbsoluteFill, Audio, Freeze, OffthreadVideo, Sequence, cancelRender,
  continueRender, delayRender, staticFile, useCurrentFrame,
} from 'remotion';
import storyboard from '../storyboard.json';
import {createEditorialRenderer} from '../trailer-art.mjs';

type Shot = {asset: string; sourceStart?: number; duration: number};
type Segment = {
  id: string; kind: string; start: number; duration: number; asset: string;
  shots?: Shot[]; kicker: string; headline: string; subtitle?: string; line: string;
};

const story = storyboard;
const FPS = story.fps;
const smooth = (value: number) => {
  const x = Math.min(1, Math.max(0, value));
  return x * x * (3 - 2 * x);
};

// Fonts and the animated illustration are shared with the native production
// renderer. There are no external URLs, webfonts, or paid media requests.
let assetsPromise: Promise<HTMLImageElement> | undefined;
function loadAssets(): Promise<HTMLImageElement> {
  if (!assetsPromise) {
    assetsPromise = (async () => {
      // Local system fonts are used; no font files are distributed or fetched.
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Could not load public/opening.png'));
        image.src = staticFile('opening.png');
      });
    })();
  }
  return assetsPromise;
}

function EditorialCanvas({segment}: {segment: Segment}) {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [handle] = useState(() => delayRender('Wildbound original illustration'));
  useEffect(() => {
    let alive = true;
    loadAssets().then((loaded) => {
      if (alive) setImage(loaded);
      continueRender(handle);
    }).catch(cancelRender);
    return () => {alive = false;};
  }, [handle]);
  useLayoutEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !image) return;
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, story.width, story.height);
    const draw = createEditorialRenderer(ctx, story, image);
    draw(segment, frame / FPS);
  }, [frame, image, segment]);
  return <canvas ref={canvasRef} width={story.width} height={story.height}
    style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />;
}

function Scene({segment}: {segment: Segment}) {
  let cursor = 0;
  const shots = segment.shots ?? [{asset: segment.asset, duration: segment.duration, sourceStart: 0}];
  return <AbsoluteFill style={{background: '#071b20'}}>
    {segment.kind === 'gameplay' && shots.map((shot, index) => {
      const from = cursor;
      cursor += Math.round(shot.duration * FPS);
      return <Sequence key={`${shot.asset}-${index}`} from={from} durationInFrames={Math.round(shot.duration * FPS)}>
        <OffthreadVideo src={staticFile(shot.asset)} muted
          startFrom={Math.round((shot.sourceStart ?? 0) * FPS)}
          style={{width: '100%', height: '100%', objectFit: 'fill', imageRendering: 'pixelated'}} />
      </Sequence>;
    })}
    <EditorialCanvas segment={segment} />
  </AbsoluteFill>;
}

function PreviousDissolve({previous}: {previous: Segment}) {
  const frame = useCurrentFrame();
  if (frame >= 6) return null;
  return <AbsoluteFill style={{opacity: 1 - smooth(frame / 6)}}>
    <Freeze frame={Math.round(previous.duration * FPS) - 1}>
      <Scene segment={previous} />
    </Freeze>
  </AbsoluteFill>;
}

export function WildboundTrailer() {
  return <AbsoluteFill style={{background: story.palette.ink}}>
    {(story.segments as Segment[]).map((segment, index, segments) =>
      <Sequence key={segment.id} from={Math.round(segment.start * FPS)} durationInFrames={Math.round(segment.duration * FPS)}>
        <Scene segment={segment} />
        {index > 0 && <PreviousDissolve previous={segments[index - 1]} />}
      </Sequence>)}
    <Audio src={staticFile('audio/mix.wav')} />
  </AbsoluteFill>;
}

export function WildboundPoster() {
  return <Freeze frame={46 * FPS}><WildboundTrailer /></Freeze>;
}
