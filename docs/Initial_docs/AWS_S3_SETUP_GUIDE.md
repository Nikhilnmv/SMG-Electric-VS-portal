# AWS S3 Setup Guide for Video Upload

Follow these steps to set up AWS S3 for video uploads.

## Step 1: Create AWS Account (If You Don't Have One)

1. Go to https://aws.amazon.com/
2. Click "Create an AWS Account"
3. Follow the registration process:
   - Enter email address
   - Create password
   - Provide payment information (free tier available)
   - Verify phone number
   - Select a support plan (Basic/Free is fine)
4. Wait for account activation (usually instant)

## Step 2: Create S3 Bucket

1. **Sign in to AWS Console:**
   - Go to https://console.aws.amazon.com/
   - Sign in with your credentials

2. **Navigate to S3:**
   - In the search bar at the top, type "S3"
   - Click on "S3" service

3. **Create Bucket:**
   - Click "Create bucket" button
   - **Bucket name:** Enter a unique name (e.g., `vs-platform-uploads-yourname` or `my-video-platform`)
     - Bucket names must be globally unique across all AWS accounts
     - Use lowercase letters, numbers, and hyphens only
     - Example: `vs-platform-uploads-dev-2024`
   - **AWS Region:** Select `us-east-1` (N. Virginia) or your preferred region
   - **Object Ownership:** Keep default (ACLs disabled)
   - **Block Public Access:** 
     - ✅ **Uncheck "Block all public access"** if you want public video access
     - ✅ **Keep checked** if videos should be private (recommended)
   - **Bucket Versioning:** Disable (unless you need it)
   - **Default encryption:** Enable (recommended)
     - Encryption type: AWS managed keys (SSE-S3)
   - **Object Lock:** Disable
   - Click "Create bucket"

4. **Note the bucket name** - you'll need it for the `.env` file

## Step 3: Create IAM User with S3 Permissions

1. **Navigate to IAM:**
   - In AWS Console search bar, type "IAM"
   - Click on "IAM" service

2. **Create User:**
   - Click "Users" in the left sidebar
   - Click "Create user" button
   - **User name:** Enter `vs-platform-uploader` (or any name you prefer)
   - Click "Next"

3. **Set Permissions:**
   - Select "Attach policies directly"
   - Search for and select: **`AmazonS3FullAccess`**
     - (Or create a custom policy with minimal permissions - see below)
   - Click "Next"

4. **Review and Create:**
   - Review the settings
   - Click "Create user"

5. **Create Access Keys:**
   - Click on the user you just created
   - Go to "Security credentials" tab
   - Scroll down to "Access keys" section
   - Click "Create access key"
   - **Use case:** Select "Application running outside AWS"
   - Click "Next"
   - **Description (optional):** Enter "Video platform upload"
   - Click "Create access key"
   - **IMPORTANT:** Copy both:
     - **Access key ID** (starts with `AKIA...`)
     - **Secret access key** (click "Show" to reveal)
   - ⚠️ **Save these credentials immediately** - you won't be able to see the secret key again!
   - Click "Done"

## Step 4: (Optional) Create Custom IAM Policy (More Secure)

Instead of using `AmazonS3FullAccess`, you can create a policy with minimal permissions:

1. **Create Policy:**
   - In IAM, go to "Policies" → "Create policy"
   - Click "JSON" tab
   - Paste this policy (replace `YOUR-BUCKET-NAME` with your actual bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
    }
  ]
}
```

2. **Name the policy:** `VSPlatformS3Access`
3. Click "Create policy"
4. Attach this policy to your IAM user instead of `AmazonS3FullAccess`

## Step 5: Update Backend .env File

**Option A: Using the Helper Script (Recommended)**

```bash
cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
./update-aws-credentials.sh
```

The script will:
- Ask for your AWS credentials
- Update the `.env` file automatically
- Create a backup of your existing `.env` file

**Option B: Manual Edit**

1. **Open backend .env file:**
   ```bash
   cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform/backend"
   nano .env
   # Or use your favorite editor: code .env, vim .env, etc.
   ```

2. **Update AWS credentials:**
   Replace the placeholder values with your actual credentials:

   ```env
   # AWS S3
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=AKIA...your-actual-access-key-id
   AWS_SECRET_ACCESS_KEY=...your-actual-secret-access-key
   S3_BUCKET=vs-platform-uploads-yourname
   ```

   **Important:**
   - Replace `us-east-1` with your bucket's region if different
   - Replace `AKIA...` with your actual Access Key ID
   - Replace `...` with your actual Secret Access Key
   - Replace bucket name with the one you created

3. **Save the file** (Ctrl+O, Enter, Ctrl+X in nano)

## Step 6: Verify Credentials (Optional)

Test if your credentials work:

```bash
# Set your credentials as environment variables temporarily
export AWS_ACCESS_KEY_ID=your-access-key-id
export AWS_SECRET_ACCESS_KEY=your-secret-access-key
export AWS_REGION=us-east-1

# Test S3 access (install AWS CLI if needed: brew install awscli)
aws s3 ls s3://your-bucket-name
```

If successful, you'll see an empty list (bucket exists but has no files).

## Step 7: Restart Backend

1. **Stop current backend:**
   - Go to the terminal where backend is running
   - Press `Ctrl+C` to stop it

2. **Restart backend:**
   ```bash
   cd "/Users/nikhilsmac/Documents/SMG Electric/VS platform"
   pnpm --filter backend dev
   ```

3. **Verify it starts without errors:**
   - Should see: "Backend server running on port 3001"
   - Check for any AWS/S3 related errors

## Step 8: Test Upload

1. **Open frontend:** http://localhost:3000
2. **Login to your account**
3. **Go to Upload page**
4. **Select a video file**
5. **Fill in title and description**
6. **Click "Upload Video"**

**If successful:**
- Progress bar should appear
- Video uploads to S3
- Success message appears
- Video is registered in database

**If you see errors:**
- Check backend terminal for error messages
- Verify credentials are correct
- Check bucket name matches
- Ensure bucket exists in the specified region

## Troubleshooting

### Error: "Access Denied"
- Check IAM user has correct permissions
- Verify bucket name is correct
- Check region matches

### Error: "Bucket does not exist"
- Verify bucket name in `.env` matches actual bucket name
- Check bucket region matches `AWS_REGION` in `.env`

### Error: "Invalid credentials"
- Double-check Access Key ID and Secret Access Key
- Make sure there are no extra spaces in `.env` file
- Try recreating access keys

### Error: "Network timeout"
- Check internet connection
- Verify AWS service is accessible
- Try a smaller test file first

## Security Best Practices

1. **Never commit `.env` file to Git** - it should be in `.gitignore`
2. **Rotate credentials regularly** - create new access keys periodically
3. **Use minimal permissions** - create custom policy instead of full access
4. **Enable MFA** - add multi-factor authentication to AWS account
5. **Monitor usage** - check AWS CloudWatch for unusual activity

## Next Steps

Once upload is working:
- Test with different video formats
- Monitor S3 storage usage
- Set up S3 lifecycle policies for old videos
- Configure CloudFront CDN for video delivery (optional)

## Need Help?

- AWS S3 Documentation: https://docs.aws.amazon.com/s3/
- AWS IAM Documentation: https://docs.aws.amazon.com/iam/
- Check backend logs for detailed error messages

