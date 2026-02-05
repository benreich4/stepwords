import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { shouldSendAnalytics } from '../lib/autosolveUtils.js';

export default function StyleGuide() {
  useEffect(() => {
    try {
      if (shouldSendAnalytics() && window.gtag && typeof window.gtag === 'function') {
        window.gtag('event', 'style_guide_viewed', {});
      }
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Stepwords Style Guide</h1>
          <p className="text-gray-400">Guidelines for creating Stepwords puzzles</p>
          <div className="mt-4">
            <Link 
              to="/create" 
              className="text-blue-400 hover:text-blue-300 underline"
            >
              ← Back to Puzzle Creator
            </Link>
          </div>
        </div>

        <div className="space-y-8">
          {/* Answer Length Requirements */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Answer Length Requirements</h2>
            
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 mb-4">
              <h3 className="text-xl font-semibold mb-3">Quick Puzzles</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li><strong>Monday - Thursday:</strong> Final word should be <strong>7 letters</strong></li>
                <li><strong>Friday - Sunday:</strong> Final word should be <strong>8 letters</strong></li>
              </ul>
            </div>

            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-3">Main Puzzles</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li><strong>Monday - Tuesday:</strong> Final word should be <strong>9 letters</strong></li>
                <li><strong>Wednesday - Thursday:</strong> Final word should be <strong>10 letters</strong></li>
                <li><strong>Friday - Saturday:</strong> Final word should be <strong>11 letters</strong></li>
                <li><strong>Sunday:</strong> <strong>11+ letters</strong> or more experimental puzzles</li>
              </ul>
            </div>
          </section>

          {/* Answer Selection */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Answer Selection</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>All words should be <strong>common words and phrases</strong> in English</li>
                <li>Use words that would be found in common crossword puzzles</li>
                <li>The final word should be particularly <strong>pleasing and elegant</strong></li>
                <li>Words and phrases should not be repeated across answers in the same puzzle, except for some prepositions or minor words</li>
                <li><strong>Self-referential or themed cluing</strong> is encouraged</li>
              </ul>
            </div>
          </section>

          {/* Cluing Guidelines */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Cluing Guidelines</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p className="text-gray-300 mb-4">
                Stepwords follows common American crossword cluing rules:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Clues should be <strong>concise and clever</strong></li>
                <li>Use <strong>wordplay, puns, and double meanings</strong> when appropriate</li>
                <li>Include <strong>abbreviations</strong> when the answer is abbreviated (e.g., "Org." for organization)</li>
                <li>Use <strong>question marks</strong> for puns, wordplay, or indirect clues</li>
                <li>Fill in the <strong>word breakdown</strong> field for phrases (e.g. "3,4" for a phrase with a 3-letter word followed by a 4-letter word)</li>
                <li>Avoid <strong>obscure or overly difficult</strong> references that most solvers wouldn't know</li>
                <li>Keep clues <strong>fair and solvable</strong> without requiring specialized knowledge</li>
                <li><strong>Difficulty progression:</strong> Clues should get harder throughout the week. <strong>Monday</strong> puzzles should be relatively straightforward with direct clues</li>
                <li>As the week progresses, clues should become more <strong>obfuscated</strong> and incorporate more <strong>wordplay</strong>, puns, and indirect references</li>
                <li>Later in the week (especially Friday-Sunday), solvers should expect more challenging and creative cluing</li>
              </ul>
            </div>
          </section>

          {/* Terms of Submission */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Terms of Submission</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p className="text-gray-300 mb-4">
                By submitting a puzzle to Stepwords, you acknowledge and agree to the following terms:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li><strong>Editing Rights:</strong> Your puzzle may be edited or changed before publishing</li>
                <li><strong>Attribution:</strong> Your name will be shown on the website as the puzzle author</li>
                <li><strong>Ownership:</strong> Stepwords will own this puzzle, but attribution will always be presented</li>
                <li><strong>Compensation:</strong> There is no compensation for submissions</li>
                <li><strong>Usage Rights:</strong> You grant Stepwords the right to use, modify, and publish your submission</li>
                <li><strong>Original Work:</strong> You represent that the puzzle is your original work and does not infringe on any third-party rights</li>
                <li><strong>No Guarantee:</strong> Submission does not guarantee publication</li>
              </ul>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Questions?</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p className="text-gray-300">
                If you have questions about creating puzzles or need clarification on the style guide, please contact us at{' '}
                <a href="mailto:hello@stepwords.xyz" className="text-blue-400 hover:text-blue-300 underline">
                  hello@stepwords.xyz
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

