import type { PersonalityAxis, VoiceProfile } from '@agentyoshka/shared';

const AXIS_ORDER: PersonalityAxis[] = [
  'slang',
  'warmth',
  'brevity',
  'emoji',
  'literary',
  'playfulness',
];

export function VoiceProfileCard({ voice }: { voice: VoiceProfile }) {
  const uniqPct = Math.round(voice.uniqueness * 100);

  return (
    <section className="rounded-card border border-line bg-paper p-4 shadow-card">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg leading-tight text-ink">Голос</p>
          <p className="text-sm text-ink-soft">
            {voice.grade} · {voice.gradeLabel} · {voice.ageDays} дн.
          </p>
        </div>
        <span className="rounded-full bg-honey-soft px-2 py-1 text-xs font-bold text-ink">
          {uniqPct}%
        </span>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-ink-soft">{voice.gradeRules}</p>
      <ul className="flex flex-col gap-2.5">
        {AXIS_ORDER.map((axis) => {
          const meta = voice.axisLabels[axis];
          const eff = Math.round(voice.effective[axis] * 100);
          const cap = voice.raw[axis] > voice.effective[axis];
          return (
            <li key={axis}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-semibold text-ink" title={meta.hint}>
                  {meta.label}
                </span>
                <span className="tabular-nums text-ink-soft">
                  {eff}%
                  {cap ? ' · потолок' : ''}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-cream">
                <div className="h-full rounded-full bg-teal" style={{ width: `${eff}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        Оси растут от уроков, железа и игры, но не выше потолка грейда.
      </p>
    </section>
  );
}
