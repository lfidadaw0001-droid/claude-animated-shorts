import React from "react";
import { Composition } from "remotion";
import { BigBenShort, BIGBEN_FRAMES } from "./videos/bigben/Bridge";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BigBen"
        component={BigBenShort}
        durationInFrames={BIGBEN_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Bridge"
        component={BigBenShort}
        durationInFrames={BIGBEN_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
