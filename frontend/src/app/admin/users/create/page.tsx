'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, User, Shield, Eye, EyeOff, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { adminApi } from '@/lib/api';

export default function CreateUserPage() {
  useRequireAdmin();
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    categoryRole: 'INTERN',
    role: 'USER' as 'ADMIN' | 'USER' | 'EDITOR',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ user: any; generatedPassword?: string } | null>(null);

  const categoryOptions = [
    { value: 'DEALER', label: 'Dealer' },
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'TECHNICIAN', label: 'Technician & Service' },
    { value: 'STAKEHOLDER', label: 'Stakeholder' },
    { value: 'INTERN', label: 'Intern' },
    { value: 'VENDOR', label: 'Vendor' },
  ];

  const roleOptions = [
    { value: 'USER', label: 'User' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'EDITOR', label: 'Editor' },
  ];

  // Generate a strong random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const length = 16;
    const password = Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setFormData({ ...formData, password });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // Validate email
      if (!formData.email.trim()) {
        throw new Error('Email is required');
      }

      // If password is provided, validate it
      if (formData.password && formData.password.length > 0) {
        if (formData.password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }
        if (!/[A-Z]/.test(formData.password)) {
          throw new Error('Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(formData.password)) {
          throw new Error('Password must contain at least one lowercase letter');
        }
        if (!/[0-9]/.test(formData.password)) {
          throw new Error('Password must contain at least one number');
        }
      }

      const userData: any = {
        email: formData.email.trim(),
        categoryRole: formData.categoryRole,
        role: formData.role,
      };

      // Only include password if provided
      if (formData.password && formData.password.trim() !== '') {
        userData.password = formData.password;
      }

      // Include name if provided
      if (formData.name && formData.name.trim() !== '') {
        userData.name = formData.name.trim();
      }

      const response = await adminApi.createUser(userData);

      if (response.success) {
        setSuccess({
          user: response.data.user,
          generatedPassword: response.data.password,
        });
        // Reset form
        setFormData({
          email: '',
          password: '',
          name: '',
          categoryRole: 'INTERN',
          role: 'USER',
        });
      }
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err?.message || 'Failed to create user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (success?.generatedPassword) {
      navigator.clipboard.writeText(success.generatedPassword);
      alert('Password copied to clipboard!');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <UserPlus className="h-8 w-8 text-[#0B214A]" />
              <h1 className="text-3xl font-bold text-gray-900">Create New User</h1>
            </div>
            <p className="text-gray-600">Create a new user account. Only admins can create users.</p>
          </div>
          <button
            onClick={() => router.push('/admin/users')}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Users
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 mb-2">User Created Successfully!</h3>
                <p className="text-green-800 mb-4">
                  User <strong>{success.user.email}</strong> has been created with role <strong>{success.user.role}</strong> and category <strong>{success.user.categoryRole}</strong>.
                </p>
                {success.generatedPassword && (
                  <div className="bg-white border border-green-200 rounded p-4 mb-4">
                    <p className="text-sm font-medium text-green-900 mb-2">Generated Password:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-50 px-3 py-2 rounded font-mono text-sm border border-gray-200">
                        {success.generatedPassword}
                      </code>
                      <button
                        onClick={handleCopyPassword}
                        className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-green-700 mt-2">
                      ⚠️ Please securely share this password with the user. It will not be shown again.
                    </p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setSuccess(null);
                    router.push('/admin/users');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  View All Users
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        {!success && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="user@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Name (Optional) */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Full Name"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password (Optional - will be auto-generated if left empty)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave empty to auto-generate"
                    className="w-full pl-10 pr-24 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A] focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 right-0 pr-1 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                      title="Generate strong password"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Generate
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  If left empty, a secure random password will be generated and displayed after creation.
                </p>
              </div>

              {/* Category Role */}
              <div>
                <label htmlFor="categoryRole" className="block text-sm font-medium text-gray-700 mb-2">
                  User Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="categoryRole"
                  value={formData.categoryRole}
                  onChange={(e) => setFormData({ ...formData, categoryRole: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A] focus:border-transparent"
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
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'USER' | 'EDITOR' })}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A] focus:border-transparent"
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-[#0B214A] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#0B214A]/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating User...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5 mr-2" />
                      Create User
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/admin/users')}
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

