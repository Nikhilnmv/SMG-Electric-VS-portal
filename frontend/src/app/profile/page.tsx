'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { User, Mail, Shield, Calendar, Edit, Lock, Bell, Trash2, X } from 'lucide-react';
import { getCurrentUser, isAdmin, logout } from '@/lib/auth';
import { profileApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isUserAdmin = isAdmin();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const profileData = await profileApi.getProfile();
      setUser(profileData);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      // Fallback to JWT data
      const currentUser = getCurrentUser();
      if (currentUser) {
        setUser({
          email: currentUser.email,
          role: currentUser.role,
          categoryRole: currentUser.categoryRole,
          id: currentUser.id,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = async (email: string) => {
    try {
      setError(null);
      const response = await profileApi.updateProfile(email);
      if (response.success) {
        setSuccess('Profile updated successfully');
        setShowEditModal(false);
        await fetchProfile();
        // Update JWT token if needed (would require re-login in production)
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setError(null);
      const response = await profileApi.changePassword(currentPassword, newPassword);
      if (response.success) {
        setSuccess('Password changed successfully. Please log in again.');
        setShowPasswordModal(false);
        setTimeout(() => {
          logout();
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to change password');
    }
  };

  const handleDeleteAccount = async (password: string) => {
    try {
      setError(null);
      const response = await profileApi.deleteAccount(password);
      if (response.success) {
        setSuccess('Account deleted successfully');
        setTimeout(() => {
          logout();
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete account');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B214A]"></div>
          </div>
        ) : user ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
              <div className="w-20 h-20 bg-[#0B214A] rounded-full flex items-center justify-center">
                <User className="h-10 w-10 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{user.email}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded capitalize">
                    {user.role?.toLowerCase() || 'user'}
                  </span>
                  {/* Only show category if not admin */}
                  {!isUserAdmin && user.categoryRole && (
                    <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded capitalize">
                      {user.categoryRole.toLowerCase()}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
            </div>

            {/* Profile Details */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Mail className="h-5 w-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Shield className="h-5 w-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <p className="text-gray-900 capitalize">{user.role?.toLowerCase()}</p>
                </div>
              </div>

              {/* Only show category if not admin */}
              {!isUserAdmin && user.categoryRole && (
                <div className="flex items-start gap-4">
                  <Shield className="h-5 w-5 text-gray-400 mt-1" />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">Category</label>
                    <div className="mt-1">
                      <span className="px-3 py-1 text-sm font-semibold bg-blue-100 text-blue-700 rounded capitalize">
                        {user.categoryRole.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4">
                <Calendar className="h-5 w-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">Member Since</label>
                  <p className="text-gray-900">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Account Actions */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Change Password
                </button>
                <button
                  onClick={() => setShowNotificationsModal(true)}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Bell className="h-4 w-4" />
                  Notification Settings
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full text-left px-4 py-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Unable to load profile</p>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          user={user}
          onClose={() => {
            setShowEditModal(false);
            setError(null);
          }}
          onSave={handleEditProfile}
          error={error}
        />
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => {
            setShowPasswordModal(false);
            setError(null);
          }}
          onSave={handleChangePassword}
          error={error}
        />
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => {
            setShowDeleteModal(false);
            setError(null);
          }}
          onConfirm={handleDeleteAccount}
          error={error}
        />
      )}

      {/* Notification Settings Modal */}
      {showNotificationsModal && (
        <NotificationSettingsModal
          onClose={() => setShowNotificationsModal(false)}
        />
      )}
    </MainLayout>
  );
}

// Edit Profile Modal Component
function EditProfileModal({ user, onClose, onSave, error }: any) {
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      return;
    }
    setLoading(true);
    await onSave(email.trim());
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#0B214A] text-white rounded-lg hover:bg-[#1a3d6b] transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Change Password Modal Component
function ChangePasswordModal({ onClose, onSave, error }: any) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return;
    }
    if (newPassword.length < 6) {
      return;
    }
    setLoading(true);
    await onSave(currentPassword, newPassword);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showPasswords.current ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              id="newPassword"
              type={showPasswords.new ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
            />
            <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
            />
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
              className="flex-1 px-4 py-2 bg-[#0B214A] text-white rounded-lg hover:bg-[#1a3d6b] transition-colors disabled:opacity-50"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Account Modal Component
function DeleteAccountModal({ onClose, onConfirm, error }: any) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== 'DELETE') {
      return;
    }
    if (!password) {
      return;
    }
    setLoading(true);
    await onConfirm(password);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-red-600">Delete Account</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <p className="text-gray-700 mb-4">
            This action cannot be undone. This will permanently delete your account and all associated data.
          </p>
          <p className="text-sm text-gray-600 mb-4">
            To confirm, type <strong>DELETE</strong> in the box below:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700 mb-2">
              Enter your password to confirm
            </label>
            <input
              id="deletePassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || confirmText !== 'DELETE' || !password}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Notification Settings Modal Component
function NotificationSettingsModal({ onClose }: any) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [videoUploads, setVideoUploads] = useState(true);
  const [comments, setComments] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In a real app, this would save to backend
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Notification Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4 text-sm">
            Settings saved successfully!
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Email Notifications</label>
              <p className="text-xs text-gray-500">Receive notifications via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Video Uploads</label>
              <p className="text-xs text-gray-500">Notify when videos are uploaded</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={videoUploads}
                onChange={(e) => setVideoUploads(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Comments</label>
              <p className="text-xs text-gray-500">Notify about comments on your videos</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={comments}
                onChange={(e) => setComments(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-[#0B214A] text-white rounded-lg hover:bg-[#1a3d6b] transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
