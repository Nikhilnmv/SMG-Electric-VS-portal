# Quick Testing Reference

## ✅ Setup Complete

- Database migrations applied
- Prisma clients generated
- All services ready

## 🚀 Quick Test (5 Minutes)

### 1. Create Module (Admin)
```bash
TOKEN="your-admin-token"
curl -X POST http://localhost:3001/api/admin/modules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Module", "allowedCategories": ["DEALER"]}'
# Save MODULE_ID from response
```

### 2. Create Lesson
```bash
curl -X POST http://localhost:3001/api/admin/modules/$MODULE_ID/lessons \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Lesson", "order": 0}'
# Save LESSON_ID from response
```

### 3. Upload Video
```bash
curl -X POST http://localhost:3001/api/admin/lessons/$LESSON_ID/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@test-video.mp4"
```

### 4. Check Status
```bash
# Wait ~30 seconds for processing, then:
curl http://localhost:3001/api/admin/modules/$MODULE_ID \
  -H "Authorization: Bearer $TOKEN"
# Lesson status should be "READY"
```

### 5. Test User Access
```bash
USER_TOKEN="dealer-user-token"
curl http://localhost:3001/api/modules \
  -H "Authorization: Bearer $USER_TOKEN"
# Should see your module
```

## 📋 Full Testing Guide

See: `docs/Initial_docs/TESTING_GUIDE_MODULES_LESSONS.md`

## 🔍 Verify Everything Works

- [ ] Admin can create modules
- [ ] Admin can add lessons
- [ ] Admin can upload videos
- [ ] Worker processes videos
- [ ] Users see modules (category-restricted)
- [ ] Video lock prevents skipping
- [ ] Progress tracking works

## 🐛 Common Issues

**Migration not applied?**
```bash
cd backend && npx prisma migrate deploy && npx prisma generate
```

**Worker not processing?**
- Check Redis connection
- Check worker logs
- Verify video file format

**Access denied?**
- Check user category matches module's allowedCategories
- Verify previous lesson is completed (for video lock)

## 📚 Documentation

- Quick Start: `docs/Initial_docs/QUICK_START.md`
- Testing Guide: `docs/Initial_docs/TESTING_GUIDE_MODULES_LESSONS.md`
- Admin Guide: `docs/Initial_docs/ADMIN_CONTENT_MANAGEMENT_FLOW.md`
- User Guide: `docs/Initial_docs/USER_LEARNING_FLOW.md`

