import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
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
            <h2 className="text-2xl font-bold mb-4 text-white">Agreement to Terms</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p>
                By accessing and using stepwords.xyz (the "Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use our Service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Use License</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p className="mb-3">Permission is granted to temporarily use the Service for personal, non-commercial purposes. This license does not include:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Modifying or copying the materials</li>
                <li>Using the materials for any commercial purpose</li>
                <li>Attempting to reverse engineer or extract source code</li>
                <li>Removing any copyright or proprietary notations</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">User Accounts and Data</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p className="mb-3">
                Our Service stores game progress and preferences locally in your browser. You are responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Maintaining the security of your device and browser</li>
                <li>Backing up your game data if desired</li>
                <li>Understanding that clearing your browser data will delete your game progress</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Puzzle Submissions</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p className="mb-3">If you submit a puzzle to Stepwords, you acknowledge and agree that:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Your puzzle may be edited or modified before publishing</li>
                <li>Stepwords will own the puzzle, but attribution will be provided</li>
                <li>There is no compensation for submissions</li>
                <li>You grant Stepwords the right to use, modify, and publish your submission</li>
                <li>You represent that the puzzle is your original work and does not infringe on any third-party rights</li>
                <li>Submission does not guarantee publication</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Privacy and Data Collection</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p className="mb-3">
                By using our Service, you acknowledge that we collect and process certain information as described in our Privacy Policy. This includes:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Usage data through Google Analytics and Google Tag Manager</li>
                <li>Device and browser information</li>
                <li>General location data (country/region level)</li>
                <li>Local storage of game progress and preferences</li>
              </ul>
              <p className="mt-3">
                You consent to the collection, processing, and association of this data with visitation information collected by Google Analytics, in accordance with our Privacy Policy and Google's Privacy Policy.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Prohibited Uses</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p className="mb-3">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Use the Service in any way that violates any applicable laws or regulations</li>
                <li>Attempt to gain unauthorized access to the Service or its systems</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use automated systems to access the Service without permission</li>
                <li>Reproduce, duplicate, or copy the Service for commercial purposes</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Disclaimer</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p>
                The Service is provided "as is" and "as available" without any warranties, expressed or implied. We do not guarantee that the Service will be uninterrupted, error-free, or free from viruses or other harmful components.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Limitation of Liability</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p>
                In no event shall Stepwords or its operators be liable for any damages arising out of the use or inability to use the Service, including but not limited to loss of data, loss of profits, or business interruption.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Changes to Terms</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p>
                We reserve the right to modify these Terms of Service at any time. We will notify users of any material changes by updating the "Last updated" date. Your continued use of the Service after such changes constitutes acceptance of the new terms.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Contact Information</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <p>
                If you have any questions about these Terms of Service, please contact us at{' '}
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
