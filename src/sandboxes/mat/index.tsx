import React from "react";
import { Composition, registerRoot } from "remotion";
import { BigBenShort, BIGBEN_FRAMES } from "../../videos/bigben_mat/Bridge";

export const SandboxRoot: React.FC = () => (
  <>
    <Composition id="BigBen" component={BigBenShort} durationInFrames={BIGBEN_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Bridge" component={BigBenShort} durationInFrames={BIGBEN_FRAMES} fps={30} width={1080} height={1920} />
  </>
);

registerRoot(SandboxRoot);
