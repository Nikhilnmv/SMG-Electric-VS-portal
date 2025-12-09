#!/bin/bash

# Helper script to update AWS credentials in backend .env file
# Usage: ./update-aws-credentials.sh

set -e

ENV_FILE="backend/.env"

echo "🔐 AWS S3 Credentials Setup"
echo "============================"
echo ""

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found!"
    echo "Creating from .env.example..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example "$ENV_FILE"
    else
        echo "Please create backend/.env file first"
        exit 1
    fi
fi

echo "📝 Current AWS configuration:"
echo ""
grep -E "^(AWS_|S3_)" "$ENV_FILE" || echo "No AWS config found"
echo ""

# Prompt for credentials
read -p "Enter AWS Region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

read -p "Enter AWS Access Key ID (starts with AKIA...): " AWS_ACCESS_KEY_ID
if [ -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "❌ Access Key ID is required!"
    exit 1
fi

read -sp "Enter AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
echo ""
if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ Secret Access Key is required!"
    exit 1
fi

read -p "Enter S3 Bucket Name: " S3_BUCKET
if [ -z "$S3_BUCKET" ]; then
    echo "❌ S3 Bucket name is required!"
    exit 1
fi

# Backup existing .env
cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backed up existing .env file"

# Update or add AWS configuration
if grep -q "^AWS_REGION=" "$ENV_FILE"; then
    sed -i.bak "s|^AWS_REGION=.*|AWS_REGION=$AWS_REGION|" "$ENV_FILE"
else
    echo "AWS_REGION=$AWS_REGION" >> "$ENV_FILE"
fi

if grep -q "^AWS_ACCESS_KEY_ID=" "$ENV_FILE"; then
    sed -i.bak "s|^AWS_ACCESS_KEY_ID=.*|AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID|" "$ENV_FILE"
else
    echo "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID" >> "$ENV_FILE"
fi

if grep -q "^AWS_SECRET_ACCESS_KEY=" "$ENV_FILE"; then
    sed -i.bak "s|^AWS_SECRET_ACCESS_KEY=.*|AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY|" "$ENV_FILE"
else
    echo "AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY" >> "$ENV_FILE"
fi

if grep -q "^S3_BUCKET=" "$ENV_FILE"; then
    sed -i.bak "s|^S3_BUCKET=.*|S3_BUCKET=$S3_BUCKET|" "$ENV_FILE"
else
    echo "S3_BUCKET=$S3_BUCKET" >> "$ENV_FILE"
fi

# Clean up backup files created by sed
rm -f "${ENV_FILE}.bak"

echo ""
echo "✅ AWS credentials updated successfully!"
echo ""
echo "📋 Updated configuration:"
grep -E "^(AWS_|S3_)" "$ENV_FILE"
echo ""
echo "🔄 Next step: Restart your backend service"
echo "   pnpm --filter backend dev"
echo ""

