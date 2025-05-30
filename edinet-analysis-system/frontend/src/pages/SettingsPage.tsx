import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Shield, Bell, Database, Key } from 'lucide-react'
import { cn } from '../utils/cn'

const tabs = [
  { id: 'profile', name: 'プロフィール', icon: User },
  { id: 'security', name: 'セキュリティ', icon: Shield },
  { id: 'notifications', name: '通知設定', icon: Bell },
  { id: 'api', name: 'API設定', icon: Key },
  { id: 'data', name: 'データ管理', icon: Database },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)

  // Form states
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSaveProfile = async () => {
    setIsSaving(true)
    // TODO: Implement profile update
    setTimeout(() => {
      setIsSaving(false)
    }, 1000)
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('新しいパスワードが一致しません')
      return
    }
    setIsSaving(true)
    // TODO: Implement password change
    setTimeout(() => {
      setIsSaving(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }, 1000)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">プロフィール設定</h3>
              <p className="mt-1 text-sm text-gray-500">
                アカウントの基本情報を管理します
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  名前
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  メールアドレス
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  役割
                </label>
                <p className="mt-1 text-sm text-gray-500">
                  {user?.role === 'admin' ? '管理者' : 'ユーザー'}
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className={cn(
                    "inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white",
                    isSaving
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {isSaving ? '保存中...' : '変更を保存'}
                </button>
              </div>
            </div>
          </div>
        )

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">セキュリティ設定</h3>
              <p className="mt-1 text-sm text-gray-500">
                パスワードとセキュリティオプションを管理します
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
                  現在のパスワード
                </label>
                <input
                  type="password"
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                  新しいパスワード
                </label>
                <input
                  type="password"
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  新しいパスワード（確認）
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={handleChangePassword}
                  disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                  className={cn(
                    "inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white",
                    isSaving || !currentPassword || !newPassword || !confirmPassword
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {isSaving ? '変更中...' : 'パスワードを変更'}
                </button>
              </div>
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">通知設定</h3>
              <p className="mt-1 text-sm text-gray-500">
                メール通知の設定を管理します
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="analysis-complete"
                    type="checkbox"
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    defaultChecked
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="analysis-complete" className="font-medium text-gray-700">
                    分析完了通知
                  </label>
                  <p className="text-gray-500">財務分析が完了したときに通知を受け取る</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="report-ready"
                    type="checkbox"
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    defaultChecked
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="report-ready" className="font-medium text-gray-700">
                    レポート生成完了通知
                  </label>
                  <p className="text-gray-500">レポートの生成が完了したときに通知を受け取る</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="weekly-summary"
                    type="checkbox"
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="weekly-summary" className="font-medium text-gray-700">
                    週次サマリー
                  </label>
                  <p className="text-gray-500">毎週の分析サマリーを受け取る</p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'api':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">API設定</h3>
              <p className="mt-1 text-sm text-gray-500">
                外部API連携の設定を管理します
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Claude API キー
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  AI分析機能を使用するために必要です
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Yahoo Finance API キー
                </label>
                <input
                  type="password"
                  placeholder="API キー"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  株価データの取得に使用します
                </p>
              </div>
            </div>
          </div>
        )

      case 'data':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">データ管理</h3>
              <p className="mt-1 text-sm text-gray-500">
                システムデータの管理とメンテナンス
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900">データ使用状況</h4>
                <dl className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">登録企業数:</dt>
                    <dd className="text-gray-900 font-medium">1,234社</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">財務データ:</dt>
                    <dd className="text-gray-900 font-medium">45,678件</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">生成レポート:</dt>
                    <dd className="text-gray-900 font-medium">789件</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">ストレージ使用量:</dt>
                    <dd className="text-gray-900 font-medium">2.3 GB / 10 GB</dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-3">
                <button className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">キャッシュをクリア</span>
                    <span className="text-sm text-gray-500">125 MB</span>
                  </div>
                </button>

                <button className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">古いレポートを削除</span>
                    <span className="text-sm text-gray-500">30日以上前</span>
                  </div>
                </button>

                <button className="w-full text-left px-4 py-2 border border-red-300 rounded-md hover:bg-red-50 text-red-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">すべてのデータをリセット</span>
                    <span className="text-sm">危険</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          アカウントとシステムの設定を管理します
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
          <aside className="py-6 px-2 sm:px-6 lg:py-0 lg:px-0 lg:col-span-3">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "group rounded-md px-3 py-2 flex items-center text-sm font-medium w-full",
                    activeTab === tab.id
                      ? "bg-gray-50 text-blue-700 hover:text-blue-700 hover:bg-white"
                      : "text-gray-900 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <tab.icon
                    className={cn(
                      "flex-shrink-0 -ml-1 mr-3 h-6 w-6",
                      activeTab === tab.id
                        ? "text-blue-500"
                        : "text-gray-400 group-hover:text-gray-500"
                    )}
                  />
                  <span className="truncate">{tab.name}</span>
                </button>
              ))}
            </nav>
          </aside>

          <div className="space-y-6 sm:px-6 lg:px-0 lg:col-span-9">
            <div className="px-4 py-5 sm:p-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}