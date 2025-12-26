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

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        {/* Header */}
        <header className="container mx-auto px-6 py-6 relative z-10">
          <nav className="flex items-center justify-between">
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-purple-600">
              Clueso Clone
            </div>
            <div className="space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 px-4 py-2 font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Start Free Trial
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-6 py-20 text-center relative z-10">
          <div className="animate-fade-in-up">
            <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Product videos<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600">in minutes</span> with AI
            </h1>
            
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Transform rough screen recordings into stunning videos & documentation
            </p>

            <div className="space-x-4">
              <Link
                href="/signup"
                className="inline-block bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                Start Free Trial
              </Link>
              <a
                href="#features"
                className="inline-block bg-white border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-primary-600 hover:text-primary-600 transition-all duration-300"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Features Preview */}
          <div className="mt-24 grid md:grid-cols-3 gap-8">
            <div className="glass-card p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-5xl mb-6 animate-float">🎬</div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">AI Video Editing</h3>
              <p className="text-gray-600 leading-relaxed">
                Remove filler words, add voiceovers, and auto-zoom automatically
              </p>
            </div>

            <div className="glass-card p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="text-5xl mb-6 animate-float animation-delay-2000">📝</div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">Auto Documentation</h3>
              <p className="text-gray-600 leading-relaxed">
                Generate step-by-step guides from your videos instantly
              </p>
            </div>

            <div className="glass-card p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <div className="text-5xl mb-6 animate-float animation-delay-4000">🌍</div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">31+ Languages</h3>
              <p className="text-gray-600 leading-relaxed">
                Translate videos and docs to reach a global audience
              </p>
            </div>
          </div>
        </main>

        {/* Features Section */}
        <section id="features" className="bg-white/50 backdrop-blur-sm py-20 relative z-10">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold text-center mb-16 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              Major video edits, automated
            </h2>

            <div className="grid md:grid-cols-2 gap-12">
              <div className="p-6 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 group">
                <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-primary-600 transition-colors">Perfect Video Scripts</h3>
                <p className="text-gray-600">
                  AI removes filler words and rewrites your script clearly and concisely
                </p>
              </div>

              <div className="p-6 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 group">
                <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-primary-600 transition-colors">Lifelike AI Voiceovers</h3>
                <p className="text-gray-600">
                  Your recorded audio is swapped with AI voiceovers that sound professional
                </p>
              </div>

              <div className="p-6 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 group">
                <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-primary-600 transition-colors">Smart Auto-Zooms</h3>
                <p className="text-gray-600">
                  AI automatically zooms into key actions, highlighting what viewers need to see
                </p>
              </div>

              <div className="p-6 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 group">
                <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-primary-600 transition-colors">Beautiful Captions</h3>
                <p className="text-gray-600">
                  Instantly engage viewers with eye-catching, AI-generated captions
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300 py-12 relative z-10">
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

