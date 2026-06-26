import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { shouldSendAnalytics } from '../lib/autosolveUtils.js';
import { useLightMode, utilityPageClass, utilityCardClass, utilityMutedClass } from '../hooks/useLightMode.js';

function Section({ title, children }) {
  return (
    <section>
      <h2 className="font-serif text-2xl font-bold mb-4">{title}</h2>
      {children}
    </section>
  );
}

function GuideList({ items }) {
  return (
    <ul className="space-y-2.5 pl-5 list-disc marker:text-brand-500">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function LengthCard({ title, badge, rows, light, card }) {
  return (
    <div className={`${card} p-5 sm:p-6`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-serif text-lg font-bold">{title}</h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
            light ? 'bg-brand-100 text-brand-800' : 'bg-brand-500/20 text-brand-300'
          }`}
        >
          {badge}
        </span>
      </div>
      <dl className="space-y-3">
        {rows.map(({ days, length }) => (
          <div
            key={days}
            className={`flex items-baseline justify-between gap-4 border-b pb-3 last:border-0 last:pb-0 ${
              light ? 'border-parchment-200' : 'border-navyink-700'
            }`}
          >
            <dt className={`text-sm ${light ? 'text-navyink-700/75' : 'text-parchment-200/65'}`}>{days}</dt>
            <dd className="font-serif text-base font-semibold tabular-nums">{length}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function StyleGuide() {
  const light = useLightMode();
  const page = utilityPageClass(light);
  const card = utilityCardClass(light);
  const muted = utilityMutedClass(light);
  const link = light ? 'text-brand-700 hover:text-brand-800 underline' : 'text-brand-300 hover:text-brand-200 underline';
  const body = light ? 'text-navyink-800' : 'text-parchment-100/90';

  useEffect(() => {
    document.title = 'Stepwords — Style Guide';
    try {
      if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'style_guide_viewed', {});
      }
    } catch {}
  }, []);

  return (
    <div className={`${page} p-4 sm:p-6`}>
      <div className="mx-auto max-w-3xl">
        <header className="mb-10">
          <Link to="/create" className={`${link} text-sm font-medium`}>
            ← Back to Puzzle Creator
          </Link>
          <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl">Style Guide</h1>
          <p className={`mt-2 max-w-2xl text-base ${muted}`}>
            Guidelines for creating puzzles that feel fair, elegant, and unmistakably Stepwords.
          </p>
        </header>

        <div className={`space-y-10 ${body}`}>
          <Section title="Answer length requirements">
            <div className="grid gap-4 sm:grid-cols-2">
              <LengthCard
                light={light}
                card={card}
                title="Quick puzzles"
                badge="Quick"
                rows={[
                  { days: 'Monday – Thursday', length: '7 letters' },
                  { days: 'Friday – Sunday', length: '8 letters' },
                ]}
              />
              <LengthCard
                light={light}
                card={card}
                title="Main puzzles"
                badge="Daily"
                rows={[
                  { days: 'Monday – Tuesday', length: '9 letters' },
                  { days: 'Wednesday – Thursday', length: '10 letters' },
                  { days: 'Friday – Saturday', length: '11 letters' },
                  { days: 'Sunday', length: '11+ letters' },
                ]}
              />
            </div>
          </Section>

          <Section title="Answer selection">
            <div className={`${card} p-5 sm:p-6`}>
              <GuideList
                items={[
                  <>All words should be <strong className="font-semibold">common words and phrases</strong> in English.</>,
                  <>Use vocabulary that would appear in a mainstream American crossword.</>,
                  <>The final word should feel <strong className="font-semibold">pleasing and elegant</strong>.</>,
                  <>Avoid repeating words or phrases across answers in the same puzzle, except minor function words.</>,
                  <><strong className="font-semibold">Self-referential or themed cluing</strong> is encouraged.</>,
                ]}
              />
            </div>
          </Section>

          <Section title="Cluing guidelines">
            <div className={`${card} p-5 sm:p-6`}>
              <p className={`mb-4 text-sm sm:text-base ${muted}`}>
                Stepwords follows common American crossword cluing conventions:
              </p>
              <GuideList
                items={[
                  <>Clues should be <strong className="font-semibold">concise and clever</strong>.</>,
                  <>Use <strong className="font-semibold">wordplay, puns, and double meanings</strong> when appropriate.</>,
                  <>Include <strong className="font-semibold">abbreviations</strong> when the answer is abbreviated (e.g. &ldquo;Org.&rdquo; for organization).</>,
                  <>Use <strong className="font-semibold">question marks</strong> for puns, wordplay, or indirect clues.</>,
                  <>Fill in the <strong className="font-semibold">word breakdown</strong> field for phrases (e.g. &ldquo;3,4&rdquo; for a 3-letter word followed by a 4-letter word).</>,
                  <>Avoid <strong className="font-semibold">obscure or overly difficult</strong> references most solvers wouldn&apos;t know.</>,
                  <>Keep clues <strong className="font-semibold">fair and solvable</strong> without specialized knowledge.</>,
                  <>
                    <strong className="font-semibold">Difficulty progression:</strong> clues should get harder through the week.
                    Monday puzzles should be relatively straightforward; later in the week, expect more obfuscation, wordplay, and creative misdirection.
                  </>,
                ]}
              />
            </div>
          </Section>

          <Section title="Terms of submission">
            <div className={`${card} p-5 sm:p-6`}>
              <p className={`mb-4 text-sm sm:text-base ${muted}`}>
                By submitting a puzzle to Stepwords, you acknowledge and agree to the following:
              </p>
              <GuideList
                items={[
                  <><strong className="font-semibold">Editing rights:</strong> your puzzle may be edited or changed before publishing.</>,
                  <><strong className="font-semibold">Attribution:</strong> your name will appear on the site as the puzzle author.</>,
                  <><strong className="font-semibold">Ownership:</strong> Stepwords will own the puzzle, but attribution will always be shown.</>,
                  <><strong className="font-semibold">Compensation:</strong> there is no payment for submissions.</>,
                  <><strong className="font-semibold">Usage rights:</strong> you grant Stepwords the right to use, modify, and publish your submission.</>,
                  <><strong className="font-semibold">Original work:</strong> you represent that the puzzle is your own and does not infringe third-party rights.</>,
                  <><strong className="font-semibold">No guarantee:</strong> submission does not guarantee publication.</>,
                ]}
              />
            </div>
          </Section>

          <Section title="Questions?">
            <div className={`${card} p-5 sm:p-6`}>
              <p className="text-sm sm:text-base">
                Need clarification on any of the above? Email us at{' '}
                <a href="mailto:hello@stepwords.xyz" className={link}>
                  hello@stepwords.xyz
                </a>
                .
              </p>
              <div className={`mt-5 border-t pt-5 ${light ? 'border-parchment-200' : 'border-navyink-700'}`}>
                <Link
                  to="/create"
                  className={`inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    light
                      ? 'bg-brand-600 text-white hover:bg-brand-500'
                      : 'bg-brand-500 text-white hover:bg-brand-400'
                  }`}
                >
                  Open Puzzle Creator →
                </Link>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
