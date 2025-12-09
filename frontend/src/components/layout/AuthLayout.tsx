'use client';

import { ReactNode, useState } from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
  children: ReactNode;
  subtitle?: string;
}

export default function AuthLayout({ children, subtitle = 'Login with username' }: AuthLayoutProps) {
  const [imageError, setImageError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Segment (50%) - Login Functionality */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white pl-8 lg:pl-[120px] pr-8 py-12 lg:py-0">
        <div className="max-w-md w-full">
          {/* Branding Section */}
          <div className="text-center mb-10">
            {/* Logo Image */}
            <div className="mb-4 flex justify-center">
              {!logoError ? (
                <Image 
                  src="/logo.png" 
                  alt="SMG Logo" 
                  width={80} 
                  height={80}
                  className="object-contain"
                  priority
                  unoptimized
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-400 text-xs">Logo</span>
                </div>
              )}
            </div>
            
            {/* SMG Logo Text */}
            <h1 className="font-serif text-[56px] font-bold text-[#0A1A3A] mb-3 tracking-tight">
              SMG
            </h1>
            
            {/* Employee Portal Subheading */}
            <h2 className="font-sans text-[28px] font-semibold text-[#0A1A3A] mb-6">
              Video Streaming Platform
            </h2>
            
            {/* Welcome Text */}
            <p className="font-sans text-[21px] font-normal text-[#0A1A3A] mb-1">
              Welcome
            </p>
            
            {/* Login Subtext */}
            <p className="font-sans text-[13.5px] font-light text-[#7A7A7A]">
              {subtitle}
            </p>
          </div>

          {/* Form Content */}
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </div>

      {/* Right Segment (50%) - Image Container */}
      <div className="hidden lg:block w-1/2 relative overflow-hidden bg-gray-200">
        {/* 
          To replace the background image:
          1. Add your image file to /public/auth-background.jpg, OR
          2. Change the src path in the img tag below to your image path
        */}
        <img
          src="/auth-background.jpg"
          alt="Authentication Background"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            // Hide image and show placeholder if it fails to load
            e.currentTarget.style.display = 'none';
            setImageError(true);
          }}
        />
        {imageError && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
            <p className="text-gray-400 text-lg">Background Image</p>
            <p className="text-gray-400 text-sm mt-2">(Add /public/auth-background.jpg to replace)</p>
          </div>
        )}
      </div>
    </div>
  );
}

