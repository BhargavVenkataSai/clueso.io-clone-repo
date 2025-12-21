import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { feedbackAPI } from '../../lib/api';

export default function SubmitFeedback() {
  const router = useRouter();
  const { projectId: projectSlug } = router.query; // Using the existing file structure, but treating ID as slug
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = new FormData(e.target);
    const data = {
      message: formData.get('message'),
      sentiment: formData.get('sentiment'),
      submitter: {
        name: formData.get('name'),
        email: formData.get('email'),
      }
    };

    try {
      await feedbackAPI.submitPublic(projectSlug, data);
      setSubmitted(true);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full text-center border border-gray-700">
          <div className="w-16 h-16 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
          <p className="text-gray-400 mb-6">Your feedback has been submitted successfully.</p>
          <button 
            onClick={() => setSubmitted(false)}
            className="text-pink-400 hover:text-pink-300 font-medium"
          >
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Submit Feedback - Clueso Clone</title>
      </Head>

      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl max-w-lg w-full p-8 border border-gray-700 shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">
              Submit Feedback
            </h1>
            <p className="text-gray-400">
              We value your feedback! Please let us know what you think.
            </p>
          </div>

          {error && (
            <div className="bg-red-900 bg-opacity-50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
              <textarea
                name="message"
                required
                rows={5}
                className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition"
                placeholder="Please describe your feedback..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Sentiment (Optional)</label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" name="sentiment" value="positive" className="text-pink-500 focus:ring-pink-500" />
                  <span className="text-white">Positive</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" name="sentiment" value="neutral" defaultChecked className="text-pink-500 focus:ring-pink-500" />
                  <span className="text-white">Neutral</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" name="sentiment" value="negative" className="text-pink-500 focus:ring-pink-500" />
                  <span className="text-white">Negative</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Your Name (Optional)</label>
                <input
                  name="name"
                  type="text"
                  className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email (Optional)</label>
                <input
                  name="email"
                  type="email"
                  className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-4 rounded-lg font-bold text-lg hover:from-pink-600 hover:to-purple-600 transition shadow-lg ${
                submitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

