import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10 text-center">
          <h2 className="text-xl font-bold text-navy-900 mb-2">Reset Clinical Account Password</h2>
          <p className="text-xs text-slate-500 mb-6">
            Enter your registered email address to receive password reset instructions.
          </p>

          {submitted ? (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-left">
              <div className="flex items-center gap-2 text-teal-800 font-bold text-sm mb-1">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                Reset Link Dispatched
              </div>
              <p className="text-xs text-teal-700">
                If an account matches <span className="font-semibold">{email}</span>, password reset credentials have been routed. Please check your inbox.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-clinical-600 hover:bg-clinical-700 text-white rounded-lg text-sm font-bold shadow-xs transition-colors"
              >
                Send Password Reset Email
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-200">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
