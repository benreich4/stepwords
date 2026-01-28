import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-gray-400">Last updated: January 2025</p>
          <div className="mt-4">
            <Link 
              to="/" 
              className="text-blue-400 hover:text-blue-300 underline"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Introduction</h2>
            <p className="mb-4">
              Stepwords ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our website at stepwords.xyz (the "Service").
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Information We Collect</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-3">Automatically Collected Information</h3>
              <p className="mb-3">When you visit our website, we automatically collect certain information, including:</p>
              <ul className="list-disc list-inside space-y-2 mb-4">
                <li><strong>Usage Data:</strong> Pages visited, time spent on pages, clicks, and navigation patterns</li>
                <li><strong>Device Information:</strong> Browser type, device type, operating system, and screen resolution</li>
                <li><strong>Location Data:</strong> General geographic location (country/region level) based on IP address</li>
                <li><strong>Referral Information:</strong> The website that referred you to our Service</li>
              </ul>
              
              <h3 className="text-xl font-semibold mb-3 mt-4">Information Stored Locally</h3>
              <p className="mb-3">We store the following information in your browser's local storage:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Game Progress:</strong> Your puzzle completion status and progress</li>
                <li><strong>Preferences:</strong> Your display preferences (light mode, header collapsed state)</li>
                <li><strong>Statistics:</strong> Your game statistics and streaks</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">How We Use Your Information</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p className="mb-3">We use the collected information for the following purposes:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>To provide and maintain our Service</li>
                <li>To analyze how our Service is used and improve user experience</li>
                <li>To understand traffic patterns and optimize our website</li>
                <li>To provide personalized game experiences (saving your progress and preferences)</li>
                <li>To detect and prevent technical issues</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Google Analytics and Google Tag Manager</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p className="mb-3">
                We use Google Analytics and Google Tag Manager to collect and analyze usage data. These services use cookies and similar technologies to track your interactions with our website.
              </p>
              <p className="mb-3">
                The information collected by Google Analytics and Google Tag Manager may be associated with your visitation information and may be used by Google for its own purposes in accordance with Google's Privacy Policy.
              </p>
              <p className="mb-3">
                You can opt out of Google Analytics by installing the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Analytics Opt-out Browser Add-on</a>.
              </p>
              <p>
                For more information about how Google uses data, please visit: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">https://policies.google.com/privacy</a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Data Storage</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p className="mb-3">
                All game progress and preferences are stored locally in your browser using localStorage. We do not store this information on our servers.
              </p>
              <p>
                Analytics data is processed and stored by Google Analytics in accordance with their data retention policies.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Data Sharing</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p className="mb-3">We do not sell, trade, or rent your personal information to third parties. We may share aggregated, anonymized data with:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Google Analytics and Google Tag Manager (as described above)</li>
                <li>Service providers who help us operate our website (hosting, analytics)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Your Rights</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p className="mb-3">You have the right to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Access the information we collect about you</li>
                <li>Delete your local game data by clearing your browser's localStorage</li>
                <li>Opt out of Google Analytics tracking using the browser add-on mentioned above</li>
                <li>Disable cookies in your browser settings (note: this may affect website functionality)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Children's Privacy</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p>
                Our Service is intended for users of all ages. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at hello@stepwords.xyz.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Changes to This Privacy Policy</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Contact Us</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p>
                If you have any questions about this Privacy Policy, please contact us at{' '}
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
