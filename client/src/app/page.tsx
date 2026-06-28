'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAccessCode, validateAccessCode, loginEmail, validateEmailAccessCode } from '../lib/api';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'phone' | 'email'>('phone');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'phone') {
        if (!phone) throw new Error('Please enter your phone number');
        await createAccessCode(phone);
      } else {
        if (!email) throw new Error('Please enter your email address');
        await loginEmail(email);
      }
      setStep('verify');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send code';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!code) throw new Error('Please enter the verification code');
      
      let res;
      if (authMode === 'phone') {
        res = await validateAccessCode(phone, code);
      } else {
        res = await validateEmailAccessCode(email, code);
      }

      if (res.success && res.user) {
        localStorage.setItem('userPhone', res.user.phone || phone);
        localStorage.setItem('userRole', res.role);
        localStorage.setItem('userName', res.user.name);
        localStorage.setItem('userEmail', res.user.email);

        if (res.role === 'instructor') {
          router.push('/instructor');
        } else {
          router.push('/student');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid access code';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-[420px] bg-white p-8 rounded-2xl border border-slate-100 shadow-xl relative">
        {/* Back button */}
        <button
          type="button"
          onClick={() => {
            if (step === 'verify') {
              setStep('request');
            } else {
              setAuthMode(authMode === 'phone' ? 'email' : 'phone');
            }
          }}
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 mb-6 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        {/* Title & Subtitle matching Figma */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {step === 'request' ? 'Sign In' : 'Phone verification'}
          </h1>
          <p className="text-xs text-slate-400">
            {step === 'request'
              ? authMode === 'phone'
                ? 'Please enter your phone to sign in'
                : 'Please enter your email to sign in'
              : 'Please enter your code that send to your phone'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium">
            {error}
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <input
                type={authMode === 'phone' ? 'text' : 'email'}
                placeholder={authMode === 'phone' ? 'Your Phone Number' : 'Your Email Address'}
                value={authMode === 'phone' ? phone : email}
                onChange={(e) => (authMode === 'phone' ? setPhone(e.target.value) : setEmail(e.target.value))}
                className="w-full px-4 py-3 text-sm figma-input"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 figma-btn-primary text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Next'}
            </button>

            <div className="pt-4 text-center space-y-2">
              <p className="text-[11px] text-slate-400">passwordless authentication methods.</p>
              <p className="text-xs text-slate-500">
                Don't having account?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'phone' ? 'email' : 'phone')}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Switch to {authMode === 'phone' ? 'Email' : 'Phone'}
                </button>
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Enter Your code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-3 text-sm figma-input text-center tracking-wider font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 figma-btn-primary text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Submit'}
            </button>

            <div className="pt-2 text-center">
              <p className="text-xs text-slate-500">
                Code not receive?{' '}
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Send again
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
