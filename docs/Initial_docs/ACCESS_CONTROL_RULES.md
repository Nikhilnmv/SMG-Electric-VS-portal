# Access Control Rules

## Overview

This document describes the access control system for the educational platform, including category-based restrictions and video lock features.

## Category-Based Access Control

### Module Access

A user can access a module if and only if:

```
user.categoryRole ∈ module.allowedCategories
```

**Special Cases:**
- **Admins**: Can access all modules regardless of `allowedCategories`
- **Empty Array**: If `module.allowedCategories = []`, module is accessible to all users

### Lesson Access

A user can access a lesson if:

1. **Category Check**: User's category is in the module's `allowedCategories` (or user is admin)
2. **Status Check**: Lesson status is `READY`
3. **Video Lock Check**: Previous lesson in the module is completed (if not the first lesson)

### Implementation

**Backend Check (Module):**
```typescript
const userCategory = req.user.categoryRole;
const isAdmin = req.user.role === 'ADMIN';

if (!isAdmin && !module.allowedCategories.includes(userCategory)) {
  return res.status(403).json({ error: 'Access denied' });
}
```

**Backend Check (Lesson):**
```typescript
// 1. Category check
if (!isAdmin && !lesson.module.allowedCategories.includes(userCategory)) {
  return res.status(403).json({ error: 'Access denied' });
}

// 2. Status check
if (lesson.status !== 'READY') {
  return res.status(400).json({ error: 'Lesson not ready' });
}

// 3. Video lock check
if (!isAdmin && previousLesson) {
  const previousProgress = await getUserProgress(userId, previousLesson.id);
  if (!previousProgress?.completed) {
    return res.status(403).json({ 
      error: 'Complete previous lesson first',
      requiredLessonId: previousLesson.id 
    });
  }
}
```

## User Categories

### Available Categories

- `DEALER`
- `EMPLOYEE`
- `TECHNICIAN`
- `STAKEHOLDER`
- `INTERN`
- `VENDOR`

### Category Assignment

- Categories are assigned by admins when creating users
- Users cannot change their own category
- Categories determine which modules users can access

## Video Lock Feature

### Purpose

Ensures users complete lessons in sequential order, preventing skipping ahead.

### Rules

1. **First Lesson**: Always accessible (no lock)
2. **Subsequent Lessons**: Accessible only if previous lesson is completed
3. **Completion Criteria**: Lesson marked complete when user watches ≥90% of video
4. **Admin Override**: Admins can access any lesson regardless of completion status

### Implementation

**Check Previous Lesson:**
```typescript
const previousLesson = await prisma.lesson.findFirst({
  where: {
    moduleId: lesson.moduleId,
    order: { lt: lesson.order }
  },
  orderBy: { order: 'desc' }
});

if (previousLesson) {
  const progress = await prisma.userLessonProgress.findUnique({
    where: {
      userId_lessonId: {
        userId: userId,
        lessonId: previousLesson.id
      }
    }
  });

  if (!progress?.completed) {
    // Access denied
  }
}
```

## Role-Based Access

### Admin Role

**Capabilities:**
- Create, update, delete modules
- Create, update, delete lessons
- Upload videos for lessons
- Access all modules regardless of category
- Bypass video lock restrictions
- Manage users and categories

### User Role

**Capabilities:**
- View modules assigned to their category
- Access lessons (subject to video lock)
- Track progress
- View analytics for their own activity

### Editor Role

**Capabilities:**
- Similar to admin but may have limited permissions
- Can moderate content
- Cannot manage users

## API Endpoint Protection

### User Endpoints

All user endpoints require:
- Authentication (`requireAuth` middleware)
- Category check (in controller logic)

**Protected Endpoints:**
- `GET /api/modules`
- `GET /api/modules/:id`
- `GET /api/lessons/:id`
- `GET /api/lessons/:id/stream`
- `POST /api/lessons/:id/progress`

### Admin Endpoints

All admin endpoints require:
- Authentication (`requireAuth` middleware)
- Admin role (`requireAdmin` middleware)

**Protected Endpoints:**
- `POST /api/admin/modules`
- `GET /api/admin/modules`
- `PATCH /api/admin/modules/:id`
- `DELETE /api/admin/modules/:id`
- `POST /api/admin/modules/:moduleId/lessons`
- `POST /api/admin/lessons/:lessonId/upload`
- `PATCH /api/admin/lessons/:lessonId`
- `DELETE /api/admin/lessons/:lessonId`

## Security Considerations

### Data Isolation

- Users can only see modules for their category
- Progress data is user-specific
- Analytics events are tagged with user ID and category

### Validation

- All IDs are validated as UUIDs
- Category values are validated against enum
- Module/lesson existence is verified before access

### Error Messages

- Generic errors for security (don't reveal internal structure)
- Specific errors for user guidance (e.g., "Complete previous lesson")

## Testing Access Control

### Test Cases

1. **Category Access**: User with DEALER category can only see modules with DEALER in `allowedCategories`
2. **Video Lock**: User cannot access lesson 2 if lesson 1 is not completed
3. **Admin Override**: Admin can access any module/lesson
4. **Empty Categories**: Module with empty `allowedCategories` is accessible to all
5. **Status Check**: User cannot access lesson with status != READY

### Test Scenarios

```typescript
// Test 1: Category restriction
const dealerUser = { categoryRole: 'DEALER' };
const module = { allowedCategories: ['EMPLOYEE'] };
// Expected: Access denied

// Test 2: Video lock
const user = { id: 'user-1' };
const lesson1 = { id: 'lesson-1', order: 0 };
const lesson2 = { id: 'lesson-2', order: 1 };
const progress = { completed: false };
// Expected: Cannot access lesson2

// Test 3: Admin override
const admin = { role: 'ADMIN' };
// Expected: Can access any module/lesson
```

## Best Practices

1. **Principle of Least Privilege**: Assign minimal categories needed
2. **Clear Error Messages**: Guide users on how to gain access
3. **Regular Audits**: Review category assignments and module access
4. **Documentation**: Keep `allowedCategories` documented for each module
5. **Testing**: Test access control after creating new modules

