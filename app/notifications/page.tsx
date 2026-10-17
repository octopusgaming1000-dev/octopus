'use client'

import { useState } from 'react'
import NotificationBell from '@/components/NotificationBell'
import Feed from '@/components/Feed'

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'feed'>('notifications')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Notifications & Feed</h1>
        
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'feed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Feed
            </button>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {activeTab === 'notifications' ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Notifications</h2>
                  <p className="text-gray-600">Notifications will appear here</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Personalized Feed</h2>
                  <Feed />
                </div>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-1">
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Unread Notifications</span>
                    <span className="text-sm font-medium text-gray-900">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Feed Items Today</span>
                    <span className="text-sm font-medium text-gray-900">24</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
