import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  return (
    <>
      <Head>
        <title>Clueso Clone - AI-Powered Video Creation</title>
        <meta name="description" content="Transform screen recordings into stunning videos" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        {/* Header */}
        <header className="container mx-auto px-6 py-6">
          <nav className="flex items-center justify-between">
            <div className="text-2xl font-bold text-primary-600">
              Clueso Clone
            </div>
            <div className="space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 px-4 py-2"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
              >
                Start Free Trial
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Product videos<br />
            <span className="text-primary-600">in minutes</span> with AI
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Transform rough screen recordings into stunning videos & documentation
          </p>

          <div className="space-x-4">
            <Link
              href="/signup"
              className="inline-block bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 transition"
            >
              Start Free Trial
            </Link>
            <a
              href="#features"
              className="inline-block border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400 transition"
            >
              Learn More
            </a>
          </div>

          {/* Features Preview */}
          <div className="mt-20 grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">🎬</div>
              <h3 className="text-xl font-bold mb-2">AI Video Editing</h3>
              <p className="text-gray-600">
                Remove filler words, add voiceovers, and auto-zoom automatically
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-xl font-bold mb-2">Auto Documentation</h3>
              <p className="text-gray-600">
                Generate step-by-step guides from your videos instantly
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-xl font-bold mb-2">31+ Languages</h3>
              <p className="text-gray-600">
                Translate videos and docs to reach a global audience
              </p>
            </div>
          </div>
        </main>

        {/* Features Section */}
        <section id="features" className="bg-gray-50 py-20">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold text-center mb-16">
              Major video edits, automated
            </h2>

            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <h3 className="text-2xl font-bold mb-4">Perfect Video Scripts</h3>
                <p className="text-gray-600">
                  AI removes filler words and rewrites your script clearly and concisely
                </p>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Lifelike AI Voiceovers</h3>
                <p className="text-gray-600">
                  Your recorded audio is swapped with AI voiceovers that sound professional
                </p>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Smart Auto-Zooms</h3>
                <p className="text-gray-600">
                  AI automatically zooms into key actions, highlighting what viewers need to see
                </p>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Beautiful Captions</h3>
                <p className="text-gray-600">
                  Instantly engage viewers with eye-catching, AI-generated captions
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300 py-12">
          <div className="container mx-auto px-6 text-center">
            <p>© 2025 Clueso Clone - Technical Assignment</p>
            <p className="mt-2 text-sm text-gray-500">
              This is a functional clone for demonstration purposes
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
