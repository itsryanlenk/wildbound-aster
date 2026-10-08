import React from 'react';
import {Composition, Still} from 'remotion';
import {WildboundTrailer, WildboundPoster} from './Trailer';
import storyboard from '../storyboard.json';

export const RemotionRoot = () => <>
  <Composition id="WildboundLaunch" component={WildboundTrailer}
    width={storyboard.width} height={storyboard.height} fps={storyboard.fps}
    durationInFrames={storyboard.duration * storyboard.fps} />
  <Still id="WildboundPoster" component={WildboundPoster}
    width={storyboard.width} height={storyboard.height} />
</>;
