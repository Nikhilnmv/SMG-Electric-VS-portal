# Fix Upload "Load failed" Error

## Problem Identified

The upload error is caused by **missing or invalid AWS S3 credentials**. The backend needs AWS credentials to generate presigned URLs for video uploads.

## Solution: Configure AWS S3

You have **two options**:

### Option 1: Use Real AWS S3 (Recommended for Production)

1. **Create an AWS Account** (if you don't have one)
   - Go to https://aws.amazon.com/
   - Sign up for a free account

2. **Create an S3 Bucket:**
   ```bash
   aws s3 mb s3://vs-platform-uploads --region us-east-1
   ```

3. **Create IAM User with S3 Permissions:**
   - Go to AWS IAM Console
   - Create a new user (e.g., `vs-platform-uploader`)
   - Attach policy: `AmazonS3FullAccess` (or create custom policy with PutObject, GetObject permissions)
   - Create access keys for the user

4. **Update Backend .env:**
   ```bash
   cd backend
   nano .env  # or use your favorite editor
   ```

   Replace the placeholder values:
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=AKIA...your-actual-access-key
   AWS_SECRET_ACCESS_KEY=...your-actual-secret-key
   S3_BUCKET=vs-platform-uploads
   ```

5. **Restart Backend:**
   ```bash
   # Stop current backend (Ctrl+C)
   # Then restart:
   pnpm --filter backend dev
   ```

6. **Test Upload Again**

### Option 2: Use LocalStack for Local Development (No AWS Account Needed)

LocalStack provides a local AWS-compatible S3 service.

1. **Install LocalStack:**
   ```bash
   pip install localstack
   # OR using Docker:
   docker run -d -p 4566:4566 localstack/localstack
   ```

2. **Update Backend S3 Configuration:**
   
   Modify `backend/src/services/s3.ts` to use LocalStack endpoint:
   ```typescript
   const s3Client = new S3Client({
     region: process.env.AWS_REGION || 'us-east-1',
     endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566', // Add this
     forcePathStyle: true, // Add this for LocalStack
     credentials: process.env.AWS_ACCESS_KEY_ID
       ? {
           accessKeyId: process.env.AWS_ACCESS_KEY_ID,
           secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
         }
       : {
           accessKeyId: 'test',
           secretAccessKey: 'test',
         },
   });
   ```

3. **Create Bucket in LocalStack:**
   ```bash
   aws --endpoint-url=http://localhost:4566 s3 mb s3://vs-platform-uploads
   ```

4. **Update .env:**
   ```env
   AWS_REGION=us-east-1
   AWS_ENDPOINT=http://localhost:4566
   AWS_ACCESS_KEY_ID=test
   AWS_SECRET_ACCESS_KEY=test
   S3_BUCKET=vs-platform-uploads
   ```

### Option 3: Mock S3 Service (Quick Test Only)

For quick testing without AWS, you can temporarily modify the backend to skip S3 and just store metadata. **Note:** Videos won't actually be stored, but you can test the upload flow.

## Quick Test

After configuring AWS, test if presigned URL generation works:

```bash
# First, get your auth token (from browser localStorage or by logging in)
TOKEN="your-token-here"

# Test presigned URL generation
curl -X POST http://localhost:3001/api/upload/presigned-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"contentType":"video/mp4","fileSize":1000000}'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://...",
    "fileKey": "raw/..."
  }
}
```

**If you get an error:**
- Check backend terminal for AWS SDK errors
- Verify credentials are correct
- Ensure bucket exists
- Check network connectivity to AWS

## Verify Current Configuration

Check what's currently in your backend .env:

```bash
cd backend
cat .env | grep -E "AWS|S3"
```

If you see `your-access-key` or `your-secret-key`, those are placeholders and need to be replaced.

## Next Steps

1. Choose an option above (Option 1 for production, Option 2 for local dev)
2. Update backend `.env` with real credentials
3. Restart backend service
4. Try uploading again
5. Check browser console for any remaining errors

## Still Having Issues?

See detailed troubleshooting: `UPLOAD_TROUBLESHOOTING.md`

