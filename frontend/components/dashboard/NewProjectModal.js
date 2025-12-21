import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useRouter } from 'next/router';
import { projectAPI } from '../../lib/api';

export default function NewProjectModal({ isOpen, onClose }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      website: formData.get('website')
    };

    try {
      const response = await projectAPI.create(data);
      const project = response.data.data;
      // Redirect to project details
      router.push(`/projects/${project._id}`);
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#0f1115] border border-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-white mb-4">
                  Create New Project
                </Dialog.Title>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full bg-[#1a1d21] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      placeholder="My Awesome Project"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows="3"
                      className="w-full bg-[#1a1d21] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      placeholder="What is this project about?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Website (Optional)
                    </label>
                    <input
                      type="url"
                      name="website"
                      className="w-full bg-[#1a1d21] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create Project'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

