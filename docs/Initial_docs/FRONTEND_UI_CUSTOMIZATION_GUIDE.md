# Frontend UI Customization Guide

This guide will help you customize the frontend UI, including adding logos, images, changing titles, icons, and more.

## Table of Contents
1. [Adding Logos and Images](#adding-logos-and-images)
2. [Changing Titles and Text](#changing-titles-and-text)
3. [Changing Icons](#changing-icons)
4. [Modifying Colors and Styling](#modifying-colors-and-styling)
5. [Common Customization Locations](#common-customization-locations)

---

## Adding Logos and Images

### Step 1: Create the Public Directory

In Next.js, static assets (images, logos, etc.) should be placed in a `public` directory at the root of the frontend folder.

```bash
# Navigate to frontend directory
cd frontend

# Create public directory if it doesn't exist
mkdir -p public
```

### Step 2: Add Your Assets

Place your logo and image files in the `public` directory:

```
frontend/
  public/
    logo.png          # Your main logo
    logo-white.png    # White version for dark backgrounds
    favicon.ico       # Browser favicon
    background.jpg    # Background images
    images/           # Other images
      hero-image.jpg
```

### Step 3: Use Images in Components

#### Option A: Using Next.js Image Component (Recommended)

```tsx
import Image from 'next/image';

// In your component
<Image 
  src="/logo.png" 
  alt="Your Logo" 
  width={150} 
  height={50}
  priority // For above-the-fold images
/>
```

#### Option B: Using Regular img Tag

```tsx
<img src="/logo.png" alt="Your Logo" className="h-12 w-auto" />
```

### Step 4: Update MainLayout with Logo

**File:** `frontend/src/components/layout/MainLayout.tsx`

**Current code (around line 119-121):**
```tsx
<Link href="/dashboard" className="flex items-center">
  <h1 className="text-2xl font-bold text-[#0B214A]">VS Platform</h1>
</Link>
```

**Replace with:**
```tsx
<Link href="/dashboard" className="flex items-center gap-3">
  <Image 
    src="/logo.png" 
    alt="Your Platform Logo" 
    width={40} 
    height={40}
    className="h-10 w-auto"
  />
  <h1 className="text-2xl font-bold text-[#0B214A]">VS Platform</h1>
</Link>
```

**Don't forget to add the import at the top:**
```tsx
import Image from 'next/image';
```

### Step 5: Update AuthLayout with Logo

**File:** `frontend/src/components/layout/AuthLayout.tsx`

**Current code (around line 16-20):**
```tsx
<div className="mb-8">
  <h1 className="text-4xl font-bold text-[#0B214A] mb-2">VS Platform</h1>
  <p className="text-lg text-gray-600">Welcome</p>
  <p className="text-sm text-gray-500 mt-1">Login with your email</p>
</div>
```

**Replace with:**
```tsx
<div className="mb-8">
  <div className="flex items-center gap-3 mb-4">
    <Image 
      src="/logo.png" 
      alt="Your Platform Logo" 
      width={60} 
      height={60}
      className="h-15 w-auto"
    />
    <h1 className="text-4xl font-bold text-[#0B214A]">VS Platform</h1>
  </div>
  <p className="text-lg text-gray-600">Welcome</p>
  <p className="text-sm text-gray-500 mt-1">Login with your email</p>
</div>
```

### Step 6: Update Favicon

1. Replace `frontend/public/favicon.ico` with your favicon
2. Or update the metadata in `frontend/src/app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  title: 'Your Platform Name',
  description: 'Your platform description',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png', // Optional
  },
};
```

---

## Changing Titles and Text

### 1. Page Titles (Browser Tab)

**File:** `frontend/src/app/layout.tsx`

```tsx
export const metadata: Metadata = {
  title: 'Your New Platform Name',  // Change this
  description: 'Your new description',  // Change this
};
```

### 2. Main Branding Title

**File:** `frontend/src/components/layout/MainLayout.tsx`

**Line 120:** Change "VS Platform" to your brand name:
```tsx
<h1 className="text-2xl font-bold text-[#0B214A]">Your Brand Name</h1>
```

**Line 221 (Mobile sidebar):** Also update here:
```tsx
<Link href="/dashboard" className="text-xl font-bold text-white">Your Brand Name</Link>
```

### 3. Auth Pages Title

**File:** `frontend/src/components/layout/AuthLayout.tsx`

**Line 17:** Change the title:
```tsx
<h1 className="text-4xl font-bold text-[#0B214A] mb-2">Your Brand Name</h1>
```

**Line 18:** Change welcome message:
```tsx
<p className="text-lg text-gray-600">Your Welcome Message</p>
```

### 4. Navigation Menu Labels

**File:** `frontend/src/components/layout/MainLayout.tsx`

**Lines 34-43:** Update navigation item labels:
```tsx
const navItems: NavItem[] = [
  { label: 'Your Dashboard Label', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Upload Video', href: '/upload', icon: Upload },
  { label: 'My Videos', href: '/my-videos', icon: Video },
  // ... etc
];
```

### 5. Page-Specific Titles

Each page component can have its own title. For example:

**File:** `frontend/src/app/dashboard/page.tsx`
```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Dashboard Title</h1>
      {/* ... rest of content */}
    </div>
  );
}
```

---

## Changing Icons

This project uses **Lucide React** for icons. You can browse all available icons at: https://lucide.dev/icons/

### 1. Import New Icons

**File:** `frontend/src/components/layout/MainLayout.tsx`

**Current imports (line 6-23):**
```tsx
import {
  LayoutDashboard,
  Upload,
  Video,
  // ... other icons
} from 'lucide-react';
```

**To add new icons, just add them to the import:**
```tsx
import {
  LayoutDashboard,
  Upload,
  Video,
  Home,           // New icon
  Settings,       // New icon
  // ... other icons
} from 'lucide-react';
```

### 2. Change Navigation Icons

**File:** `frontend/src/components/layout/MainLayout.tsx`

**Lines 34-43:** Update the icon for each nav item:
```tsx
const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },  // Changed from LayoutDashboard
  { label: 'Upload Video', href: '/upload', icon: Upload },
  // ... etc
];
```

### 3. Change Icons in Other Components

**Example - Login Page Icons:**

**File:** `frontend/src/app/login/page.tsx`

**Line 5:** Current imports:
```tsx
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
```

**To change the email icon:**
```tsx
import { Mail, Lock, Eye, EyeOff, AtSign } from 'lucide-react';

// Then in the component (line 67):
<AtSign className="h-5 w-5 text-gray-400" />  // Changed from Mail
```

### 4. Using Custom SVG Icons

If you need custom icons not in Lucide:

1. Create a component in `frontend/src/components/icons/`:

```tsx
// frontend/src/components/icons/CustomIcon.tsx
export default function CustomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      {/* Your SVG path here */}
    </svg>
  );
}
```

2. Import and use it:
```tsx
import CustomIcon from '@/components/icons/CustomIcon';

// In your component:
<CustomIcon className="h-5 w-5" />
```

---

## Modifying Colors and Styling

### 1. Primary Brand Color

The main brand color is `#0B214A` (dark blue). To change it:

**Search and replace across files:**
- `#0B214A` → Your new color (e.g., `#1a237e`)
- `#1a3d6b` → A darker/lighter variant of your new color

**Key files to update:**
- `frontend/src/components/layout/MainLayout.tsx`
- `frontend/src/components/layout/AuthLayout.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/register/page.tsx`
- All other page components

### 2. Tailwind Configuration

**File:** `frontend/tailwind.config.js`

You can add custom colors to your Tailwind config:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B214A',
          dark: '#1a3d6b',
          light: '#2d4a7a',
        },
        // Add more custom colors
      },
    },
  },
};
```

Then use them in components:
```tsx
className="bg-primary text-white"
className="bg-primary-dark"
```

### 3. Global Styles

**File:** `frontend/src/app/globals.css`

Add custom CSS here for global styles:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles */
@layer base {
  :root {
    --color-primary: #0B214A;
    --color-secondary: #1a3d6b;
  }
}

/* Custom component styles */
@layer components {
  .btn-primary {
    @apply bg-[#0B214A] text-white px-4 py-2 rounded-lg hover:bg-[#1a3d6b];
  }
}
```

---

## Common Customization Locations

### Main Layout & Navigation
- **File:** `frontend/src/components/layout/MainLayout.tsx`
  - Brand name/logo (lines 119-121, 221)
  - Navigation items (lines 34-43)
  - Sidebar styling (line 130)
  - Top bar styling (line 108)

### Authentication Pages
- **File:** `frontend/src/components/layout/AuthLayout.tsx`
  - Branding section (lines 16-20)
  - Background image (lines 28-40)

### Login Page
- **File:** `frontend/src/app/login/page.tsx`
  - Form styling
  - Button colors
  - Input field icons

### Register Page
- **File:** `frontend/src/app/register/page.tsx`
  - Similar to login page

### Dashboard
- **File:** `frontend/src/app/dashboard/page.tsx`
  - Page title and content

### Metadata & SEO
- **File:** `frontend/src/app/layout.tsx`
  - Page title
  - Meta description
  - Favicon

---

## Quick Reference: File Structure

```
frontend/
├── public/                    # Static assets (logos, images)
│   ├── logo.png
│   ├── favicon.ico
│   └── images/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout (metadata, favicon)
│   │   ├── globals.css       # Global styles
│   │   ├── login/
│   │   ├── dashboard/
│   │   └── ...
│   └── components/
│       └── layout/
│           ├── MainLayout.tsx    # Main app layout
│           └── AuthLayout.tsx    # Auth pages layout
```

---

## Best Practices

1. **Image Optimization:**
   - Use Next.js `Image` component for automatic optimization
   - Provide appropriate `width` and `height` for better performance
   - Use `priority` prop for above-the-fold images

2. **Icons:**
   - Stick with Lucide React icons for consistency
   - Use consistent icon sizes (typically `h-5 w-5` for nav, `h-6 w-6` for headers)

3. **Colors:**
   - Define colors in `tailwind.config.js` for reusability
   - Use CSS variables for dynamic theming

4. **Responsive Design:**
   - Test changes on mobile, tablet, and desktop
   - Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`)

5. **Accessibility:**
   - Always provide `alt` text for images
   - Use semantic HTML
   - Ensure sufficient color contrast

---

## Example: Complete Logo Integration

Here's a complete example of adding a logo to the main layout:

1. **Add logo to public folder:**
   ```bash
   # Place your logo at: frontend/public/logo.png
   ```

2. **Update MainLayout.tsx:**
   ```tsx
   import Image from 'next/image';
   
   // In the component, replace the brand section:
   <Link href="/dashboard" className="flex items-center gap-3">
     <Image 
       src="/logo.png" 
       alt="Your Platform Logo" 
       width={40} 
       height={40}
       className="h-10 w-auto"
       priority
     />
     <h1 className="text-2xl font-bold text-[#0B214A]">Your Brand Name</h1>
   </Link>
   ```

3. **For dark backgrounds (sidebar), use a white logo:**
   ```tsx
   <Image 
     src="/logo-white.png" 
     alt="Your Platform Logo" 
     width={40} 
     height={40}
     className="h-10 w-auto"
   />
   ```

---

## Need Help?

- **Next.js Image Docs:** https://nextjs.org/docs/app/building-your-application/optimizing/images
- **Lucide Icons:** https://lucide.dev/icons/
- **Tailwind CSS:** https://tailwindcss.com/docs

