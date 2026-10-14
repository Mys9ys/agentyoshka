import { useEffect, useState } from 'react';

const POSE_SRC = {
  idle: '/art/bear-idle.png',
  joy: '/art/bear-joy.png',
  think: '/art/bear-think.png',
  honey: '/art/bear-honey.png',
  eat: '/art/bear-eat.png',
} as const;

export type BearPose = keyof typeof POSE_SRC;

const INTRO: { pose: BearPose; ms: number; motion: string }[] = [
  { pose: 'idle', ms: 1300, motion: 'ay-sit' },
  { pose: 'honey', ms: 1600, motion: 'ay-pop' },
  { pose: 'eat', ms: 2200, motion: 'ay-nom' },
  { pose: 'joy', ms: 1100, motion: 'ay-spin' },
];

const SKIN_FILTER: Record<string, string> = {
  bear_cream: 'none',
  bear_amber: 'sepia(0.35) saturate(1.3)',
  bear_slate: 'grayscale(0.7) brightness(1.05)',
  bear_rose: 'sepia(0.25) hue-rotate(-28deg) saturate(1.25)',
};

type AgentAvatarProps = {
  skinId: string;
  size?: 'md' | 'lg';
  pose?: BearPose;
  /** Один раз: сидит → банка мёда → ест → радуется → тихо покачивается. */
  playIntro?: boolean;
};

export function AgentAvatar({
  skinId,
  size = 'md',
  pose = 'idle',
  playIntro = false,
}: AgentAvatarProps) {
  const [step, setStep] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const height = size === 'lg' ? 'h-72' : 'h-56';
  const tint = SKIN_FILTER[skinId];
  const shadow = 'drop-shadow(0 16px 18px rgba(122, 74, 28, 0.18))';

  useEffect(() => {
    if (!playIntro || pose !== 'idle') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIntroDone(true);
      return;
    }

    setIntroDone(false);
    setStep(0);
    let index = 0;
    let timer = 0;

    const schedule = () => {
      const beat = INTRO[index];
      if (!beat) {
        setIntroDone(true);
        return;
      }
      timer = window.setTimeout(() => {
        index += 1;
        if (index >= INTRO.length) {
          setIntroDone(true);
          return;
        }
        setStep(index);
        schedule();
      }, beat.ms);
    };

    schedule();
    return () => window.clearTimeout(timer);
  }, [playIntro, pose]);

  const intro = playIntro && pose === 'idle' && !introDone ? INTRO[step] : null;
  const shown = intro?.pose ?? pose;
  const motion =
    intro?.motion ?? (playIntro && pose === 'idle' && introDone ? 'ay-bob' : '');

  return (
    <img
      src={POSE_SRC[shown]}
      alt=""
      draggable={false}
      className={`mx-auto w-full max-w-[20rem] object-contain ${height} ${motion}`}
      style={{ filter: tint && tint !== 'none' ? `${tint} ${shadow}` : shadow }}
    />
  );
}
