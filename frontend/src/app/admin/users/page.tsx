'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { Users, RefreshCw, AlertCircle, Loader2, Shield, UserMinus, UserPlus, CheckCircle2, XCircle } from 'lucide-react';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { useAuth } from '@/hooks/useAuth';
import { adminApi, AdminUser } from '@/lib/api';
import RoleBadge from '@/components/admin/RoleBadge';

export default function AdminUsersPage() {
  useRequireAdmin();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [processingCategory, setProcessingCategory] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdUserCredentials, setCreatedUserCredentials] = useState<{
    username: string;
    password: string;
    email: string;
  } | null>(null);

  const categoryOptions = [
    { value: 'DEALER', label: 'Dealer' },
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'TECHNICIAN', label: 'Technician' },
    { value: 'STAKEHOLDER', label: 'Stakeholder' },
    { value: 'INTERN', label: 'Intern' },
    { value: 'VENDOR', label: 'Vendor' },
  ];

  const fetchUsers = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setNotification(null);

      const usersData = await adminApi.getUsers();
      setUsers(usersData);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      const errorMessage = err?.message || 'Failed to load users. Please try again.';
      setError(errorMessage);
      setNotification({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRoleChange = async (userId: string, newRole: 'ADMIN' | 'USER') => {
    if (currentUser?.id === userId) {
      showNotification('error', 'You cannot change your own role');
      return;
    }

    const user = users.find((u) => u.id === userId);
    const action = newRole === 'ADMIN' ? 'make admin' : 'revoke admin';
    
    if (!confirm(`Are you sure you want to ${action} for ${user?.email}?`)) {
      return;
    }

    try {
      setProcessingUser(userId);
      await adminApi.updateUserRole(userId, newRole);
      
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      
      showNotification('success', `User role updated to ${newRole} successfully.`);
    } catch (err: any) {
      console.error('Error updating user role:', err);
      const errorMessage = err?.message || 'Failed to update user role. Please try again.';
      showNotification('error', errorMessage);
    } finally {
      setProcessingUser(null);
    }
  };

  const handleCategoryChange = async (userId: string, newCategory: string) => {
    const user = users.find((u) => u.id === userId);
    
    if (!confirm(`Are you sure you want to change category for ${user?.email} from ${user?.categoryRole || 'N/A'} to ${newCategory}? The user will need to log in again.`)) {
      return;
    }

    try {
      setProcessingCategory(userId);
      await adminApi.updateUserCategory(userId, newCategory);
      
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, categoryRole: newCategory } : u))
      );
      
      showNotification('success', `User category updated to ${newCategory} successfully.`);
    } catch (err: any) {
      console.error('Error updating user category:', err);
      const errorMessage = err?.message || 'Failed to update user category. Please try again.';
      showNotification('error', errorMessage);
      // Revert optimistic update on error
      fetchUsers();
    } finally {
      setProcessingCategory(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-[#0B214A]" />
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            </div>
            <p className="text-gray-600">Manage users and their roles</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0B214A] rounded-lg hover:bg-[#0B214A]/90 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Create User
            </button>
            <button
              onClick={() => fetchUsers(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            className={`border px-4 py-3 rounded-lg flex items-center justify-between gap-2 ${
              notification.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && !notification && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
                {users.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {users.length} user{users.length !== 1 ? 's' : ''} total
                  </span>
                )}
              </div>
              {users.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-500 mb-4">There are no users registered on the platform yet.</p>
                  <button
                    onClick={() => fetchUsers(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0B214A] bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined At
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => {
                        const isCurrentUser = currentUser?.id === user.id;
                        const isAdmin = user.role.toUpperCase() === 'ADMIN';
                        
                        return (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-gray-900">{user.email}</div>
                                {isCurrentUser && (
                                  <span className="text-xs text-gray-500">(You)</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <RoleBadge role={user.role} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isCurrentUser ? (
                                <span className="text-sm text-gray-400">Cannot change own category</span>
                              ) : (
                                <select
                                  value={user.categoryRole || 'INTERN'}
                                  onChange={(e) => handleCategoryChange(user.id, e.target.value)}
                                  disabled={processingCategory === user.id}
                                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0B214A] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {categoryOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{formatDate(user.createdAt)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {isCurrentUser ? (
                                <span className="text-gray-400 text-sm">Cannot change own role</span>
                              ) : isAdmin ? (
                                <button
                                  onClick={() => handleRoleChange(user.id, 'USER')}
                                  disabled={processingUser === user.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {processingUser === user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <UserMinus className="h-4 w-4" />
                                  )}
                                  Revoke Admin
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRoleChange(user.id, 'ADMIN')}
                                  disabled={processingUser === user.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {processingUser === user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <UserPlus className="h-4 w-4" />
                                  )}
                                  Make Admin
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <CreateUserModal
            onClose={() => {
              setShowCreateModal(false);
              setCreatedUserCredentials(null);
            }}
            onSuccess={async (result) => {
              setShowCreateModal(false);
              if (result.password) {
                setCreatedUserCredentials({
                  username: result.user.username || '',
                  password: result.password,
                  email: result.user.email,
                });
              }
              await fetchUsers();
              showNotification('success', 'User created successfully!');
            }}
            onError={(error) => {
              showNotification('error', error);
            }}
          />
        )}

        {/* Credentials Display Modal */}
        {createdUserCredentials && (
          <CredentialsDisplayModal
            credentials={createdUserCredentials}
            onClose={() => setCreatedUserCredentials(null)}
            onSendEmail={async () => {
              try {
                await adminApi.createUser({
                  email: createdUserCredentials.email,
                  sendCredentialsEmail: true,
                });
                showNotification('success', 'Credentials email sent successfully!');
              } catch (err: any) {
                showNotification('error', err.message || 'Failed to send email');
              }
            }}
          />
        )}
      </div>
    </MainLayout>
  );
}

// Create User Modal Component
function CreateUserModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    categoryRole: 'INTERN',
    role: 'USER' as 'ADMIN' | 'USER' | 'EDITOR',
    generateUsername: true,
    generateTempPassword: true,
    sendCredentialsEmail: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categoryOptions = [
    { value: 'DEALER', label: 'Dealer' },
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'TECHNICIAN', label: 'Technician' },
    { value: 'STAKEHOLDER', label: 'Stakeholder' },
    { value: 'INTERN', label: 'Intern' },
    { value: 'VENDOR', label: 'Vendor' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!formData.email) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!formData.generateTempPassword && !formData.password) {
      setErrors({ password: 'Password is required when auto-generation is disabled' });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        email: formData.email,
        categoryRole: formData.categoryRole,
        role: formData.role,
        generateUsername: formData.generateUsername,
        generateTempPassword: formData.generateTempPassword,
        sendCredentialsEmail: formData.sendCredentialsEmail,
      };

      if (formData.name) {
        payload.name = formData.name;
      }

      if (!formData.generateTempPassword && formData.password) {
        payload.password = formData.password;
      }

      const result = await adminApi.createUser(payload);
      onSuccess(result.data);
    } catch (err: any) {
      onError(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Create New User</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Name (for username generation)
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
            />
            <p className="mt-1 text-xs text-gray-500">If not provided, username will be generated from email</p>
          </div>

          {/* Generate Username Toggle */}
          <div className="flex items-center gap-3">
            <input
              id="generateUsername"
              type="checkbox"
              checked={formData.generateUsername}
              onChange={(e) => setFormData({ ...formData, generateUsername: e.target.checked })}
              className="h-4 w-4 text-[#0B214A] focus:ring-[#0B214A] border-gray-300 rounded"
            />
            <label htmlFor="generateUsername" className="text-sm font-medium text-gray-700">
              Auto-generate username (recommended)
            </label>
          </div>

          {/* Generate Temp Password Toggle */}
          <div className="flex items-center gap-3">
            <input
              id="generateTempPassword"
              type="checkbox"
              checked={formData.generateTempPassword}
              onChange={(e) => setFormData({ ...formData, generateTempPassword: e.target.checked })}
              className="h-4 w-4 text-[#0B214A] focus:ring-[#0B214A] border-gray-300 rounded"
            />
            <label htmlFor="generateTempPassword" className="text-sm font-medium text-gray-700">
              Generate temporary password (user must change on first login)
            </label>
          </div>

          {/* Password (if not auto-generating) */}
          {!formData.generateTempPassword && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!formData.generateTempPassword}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>
          )}

          {/* Category Role */}
          <div>
            <label htmlFor="categoryRole" className="block text-sm font-medium text-gray-700 mb-2">
              Category Role
            </label>
            <select
              id="categoryRole"
              value={formData.categoryRole}
              onChange={(e) => setFormData({ ...formData, categoryRole: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              User Role
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'USER' | 'EDITOR' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
            >
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
              <option value="EDITOR">Editor</option>
            </select>
          </div>

          {/* Send Credentials Email Toggle */}
          <div className="flex items-center gap-3">
            <input
              id="sendCredentialsEmail"
              type="checkbox"
              checked={formData.sendCredentialsEmail}
              onChange={(e) => setFormData({ ...formData, sendCredentialsEmail: e.target.checked })}
              className="h-4 w-4 text-[#0B214A] focus:ring-[#0B214A] border-gray-300 rounded"
            />
            <label htmlFor="sendCredentialsEmail" className="text-sm font-medium text-gray-700">
              Send credentials email to user
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0B214A] rounded-lg hover:bg-[#0B214A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Credentials Display Modal Component
function CredentialsDisplayModal({
  credentials,
  onClose,
  onSendEmail,
}: {
  credentials: { username: string; password: string; email: string };
  onClose: () => void;
  onSendEmail: () => void;
}) {
  const [copied, setCopied] = useState<'username' | 'password' | null>(null);

  const copyToClipboard = (text: string, type: 'username' | 'password') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">User Credentials</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-medium mb-2">⚠️ Important: Save these credentials now</p>
            <p className="text-xs text-yellow-700">This is the only time you'll see the password. Make sure to securely share it with the user.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={credentials.username}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(credentials.username, 'username')}
                  className="px-3 py-2 text-sm text-[#0B214A] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {copied === 'username' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={credentials.password}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(credentials.password, 'password')}
                  className="px-3 py-2 text-sm text-[#0B214A] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {copied === 'password' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              onClick={onSendEmail}
              className="px-4 py-2 text-sm font-medium text-[#0B214A] border border-[#0B214A] rounded-lg hover:bg-[#0B214A] hover:text-white transition-colors"
            >
              Send Email
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0B214A] rounded-lg hover:bg-[#0B214A]/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

