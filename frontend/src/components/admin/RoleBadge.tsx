'use client';

interface RoleBadgeProps {
  role: string;
  className?: string;
}

export default function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const roleConfig = {
    ADMIN: { label: 'Admin', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    EDITOR: { label: 'Editor', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    USER: { label: 'User', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  };

  const normalizedRole = role.toUpperCase() as keyof typeof roleConfig;
  const config = roleConfig[normalizedRole] || {
    label: role,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
}

