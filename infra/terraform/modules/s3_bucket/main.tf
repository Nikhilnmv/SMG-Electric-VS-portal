# S3 Bucket Module
# This module creates S3 buckets for video storage (raw uploads, processed HLS files, analytics exports)
# Cloud-agnostic design: Can be adapted for GCP Cloud Storage, Azure Blob Storage, etc.

# Note: AWS provider configuration is commented out until credentials are provided
# Uncomment and configure when ready to deploy

# terraform {
#   required_providers {
#     aws = {
#       source  = "hashicorp/aws"
#       version = "~> 5.0"
#     }
#   }
# }

# provider "aws" {
#   region = var.region
#   # Credentials will be provided via environment variables or AWS config
# }

# S3 Bucket for raw video uploads
# resource "aws_s3_bucket" "raw_uploads" {
#   bucket = "${var.bucket_name_prefix}-raw-uploads-${var.environment}"
# 
#   tags = merge(
#     var.tags,
#     {
#       Name        = "${var.bucket_name_prefix}-raw-uploads-${var.environment}"
#       Environment = var.environment
#       Purpose     = "Raw video uploads"
#     }
#   )
# }

# resource "aws_s3_bucket_versioning" "raw_uploads" {
#   bucket = aws_s3_bucket.raw_uploads.id
#   versioning_configuration {
#     status = var.enable_versioning ? "Enabled" : "Disabled"
#   }
# }

# resource "aws_s3_bucket_server_side_encryption_configuration" "raw_uploads" {
#   bucket = aws_s3_bucket.raw_uploads.id
# 
#   rule {
#     apply_server_side_encryption_by_default {
#       sse_algorithm = var.encryption_algorithm
#     }
#   }
# }

# resource "aws_s3_bucket_public_access_block" "raw_uploads" {
#   bucket = aws_s3_bucket.raw_uploads.id
# 
#   block_public_acls       = true
#   block_public_policy     = true
#   ignore_public_acls      = true
#   restrict_public_buckets = true
# }

# S3 Bucket for processed HLS files
# resource "aws_s3_bucket" "hls_processed" {
#   bucket = "${var.bucket_name_prefix}-hls-processed-${var.environment}"
# 
#   tags = merge(
#     var.tags,
#     {
#       Name        = "${var.bucket_name_prefix}-hls-processed-${var.environment}"
#       Environment = var.environment
#       Purpose     = "Processed HLS video files"
#     }
#   )
# }

# resource "aws_s3_bucket_versioning" "hls_processed" {
#   bucket = aws_s3_bucket.hls_processed.id
#   versioning_configuration {
#     status = var.enable_versioning ? "Enabled" : "Disabled"
#   }
# }

# resource "aws_s3_bucket_server_side_encryption_configuration" "hls_processed" {
#   bucket = aws_s3_bucket.hls_processed.id
# 
#   rule {
#     apply_server_side_encryption_by_default {
#       sse_algorithm = var.encryption_algorithm
#     }
#   }
# }

# resource "aws_s3_bucket_public_access_block" "hls_processed" {
#   bucket = aws_s3_bucket.hls_processed.id
# 
#   block_public_acls       = true
#   block_public_policy     = true
#   ignore_public_acls      = true
#   restrict_public_buckets = true
# }

# S3 Bucket for analytics exports
# resource "aws_s3_bucket" "analytics_exports" {
#   bucket = "${var.bucket_name_prefix}-analytics-exports-${var.environment}"
# 
#   tags = merge(
#     var.tags,
#     {
#       Name        = "${var.bucket_name_prefix}-analytics-exports-${var.environment}"
#       Environment = var.environment
#       Purpose     = "Analytics data exports"
#     }
#   )
# }

# resource "aws_s3_bucket_versioning" "analytics_exports" {
#   bucket = aws_s3_bucket.analytics_exports.id
#   versioning_configuration {
#     status = var.enable_versioning ? "Enabled" : "Disabled"
#   }
# }

# resource "aws_s3_bucket_server_side_encryption_configuration" "analytics_exports" {
#   bucket = aws_s3_bucket.analytics_exports.id
# 
#   rule {
#     apply_server_side_encryption_by_default {
#       sse_algorithm = var.encryption_algorithm
#     }
#   }
# }

# Placeholder outputs (uncomment when provider is configured)
# output "raw_uploads_bucket_id" {
#   description = "ID of the raw uploads bucket"
#   value       = aws_s3_bucket.raw_uploads.id
# }
# 
# output "raw_uploads_bucket_arn" {
#   description = "ARN of the raw uploads bucket"
#   value       = aws_s3_bucket.raw_uploads.arn
# }
# 
# output "hls_processed_bucket_id" {
#   description = "ID of the HLS processed bucket"
#   value       = aws_s3_bucket.hls_processed.id
# }
# 
# output "hls_processed_bucket_arn" {
#   description = "ARN of the HLS processed bucket"
#   value       = aws_s3_bucket.hls_processed.arn
# }
# 
# output "analytics_exports_bucket_id" {
#   description = "ID of the analytics exports bucket"
#   value       = aws_s3_bucket.analytics_exports.id
# }
# 
# output "analytics_exports_bucket_arn" {
#   description = "ARN of the analytics exports bucket"
#   value       = aws_s3_bucket.analytics_exports.arn
# }

# Placeholder outputs for blueprint (actual values will be populated when deployed)
output "raw_uploads_bucket_id" {
  description = "ID of the raw uploads bucket (placeholder until provider configured)"
  value       = "${var.bucket_name_prefix}-raw-uploads-${var.environment}"
}

output "raw_uploads_bucket_arn" {
  description = "ARN of the raw uploads bucket (placeholder until provider configured)"
  value       = "arn:aws:s3:::${var.bucket_name_prefix}-raw-uploads-${var.environment}"
}

output "hls_processed_bucket_id" {
  description = "ID of the HLS processed bucket (placeholder until provider configured)"
  value       = "${var.bucket_name_prefix}-hls-processed-${var.environment}"
}

output "hls_processed_bucket_arn" {
  description = "ARN of the HLS processed bucket (placeholder until provider configured)"
  value       = "arn:aws:s3:::${var.bucket_name_prefix}-hls-processed-${var.environment}"
}

output "analytics_exports_bucket_id" {
  description = "ID of the analytics exports bucket (placeholder until provider configured)"
  value       = "${var.bucket_name_prefix}-analytics-exports-${var.environment}"
}

output "analytics_exports_bucket_arn" {
  description = "ARN of the analytics exports bucket (placeholder until provider configured)"
  value       = "arn:aws:s3:::${var.bucket_name_prefix}-analytics-exports-${var.environment}"
}

