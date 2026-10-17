'use client'

import { useState, useEffect } from 'react'

interface BookingCodeInputProps {
  onAnalyze: (code: string) => Promise<void>
  isLoading?: boolean
}

export default function BookingCodeInput({
  onAnalyze,
  isLoading = false,
}: BookingCodeInputProps) {
  const [code, setCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim()) {
      await onAnalyze(code.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="booking-code" className="block text-sm font-medium text-gray-700 mb-2">
          Enter Booking Code
        </label>
        <textarea
          id="booking-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your booking code here..."
          className="booking-code-textarea input-professional w-full opacity-50 cursor-not-allowed"
          rows={4}
          disabled={true}
        />
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">
              Bookmaker code analysis is coming soon. We're working on it.
            </h3>
            <div className="mt-2 text-sm text-amber-700">
              <p>
                Please use manual match entry below to analyze matches immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={true}
        className="button-primary w-full opacity-50 cursor-not-allowed"
      >
        Booking Code Analysis Temporarily Disabled
      </button>
    </form>
  )
}
