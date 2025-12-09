# IAM Role Module for Worker Transcoding
# This module creates IAM roles and policies for video transcoding workers
# Cloud-agnostic design: Can be adapted for GCP Service Accounts, Azure Managed Identities, etc.

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
# }

# IAM Role for transcoding worker
# resource "aws_iam_role" "transcoding_worker" {
#   name = "${var.role_name_prefix}-transcoding-worker-${var.environment}"
# 
#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = "sts:AssumeRole"
#         Effect = "Allow"
#         Principal = {
#           Service = var.service_principal # e.g., "ecs-tasks.amazonaws.com" or "ec2.amazonaws.com"
#         }
#       }
#     ]
#   })
# 
#   tags = merge(
#     var.tags,
#     {
#       Name        = "${var.role_name_prefix}-transcoding-worker-${var.environment}"
#       Environment = var.environment
#       Purpose     = "Video transcoding worker"
#     }
#   )
# }

# IAM Policy for S3 access (read raw uploads, write processed HLS)
# resource "aws_iam_policy" "s3_access" {
#   name        = "${var.role_name_prefix}-s3-access-${var.environment}"
#   description = "Policy for S3 bucket access for transcoding worker"
# 
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect = "Allow"
#         Action = [
#           "s3:GetObject",
#           "s3:GetObjectVersion",
#           "s3:ListBucket"
#         ]
#         Resource = [
#           "${var.raw_uploads_bucket_arn}",
#           "${var.raw_uploads_bucket_arn}/*"
#         ]
#       },
#       {
#         Effect = "Allow"
#         Action = [
#           "s3:PutObject",
#           "s3:PutObjectAcl",
#           "s3:DeleteObject"
#         ]
#         Resource = [
#           "${var.hls_processed_bucket_arn}",
#           "${var.hls_processed_bucket_arn}/*"
#         ]
#       }
#     ]
#   })
# 
#   tags = var.tags
# }

# IAM Policy for CloudWatch Logs
# resource "aws_iam_policy" "cloudwatch_logs" {
#   name        = "${var.role_name_prefix}-cloudwatch-logs-${var.environment}"
#   description = "Policy for CloudWatch Logs access"
# 
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect = "Allow"
#         Action = [
#           "logs:CreateLogGroup",
#           "logs:CreateLogStream",
#           "logs:PutLogEvents"
#         ]
#         Resource = "arn:aws:logs:${var.region}:*:log-group:/aws/${var.role_name_prefix}/${var.environment}/*"
#       }
#     ]
#   })
# 
#   tags = var.tags
# }

# Attach policies to role
# resource "aws_iam_role_policy_attachment" "s3_access" {
#   role       = aws_iam_role.transcoding_worker.name
#   policy_arn = aws_iam_policy.s3_access.arn
# }
# 
# resource "aws_iam_role_policy_attachment" "cloudwatch_logs" {
#   role       = aws_iam_role.transcoding_worker.name
#   policy_arn = aws_iam_policy.cloudwatch_logs.arn
# }

# Placeholder outputs (uncomment when provider is configured)
# output "transcoding_worker_role_arn" {
#   description = "ARN of the transcoding worker IAM role"
#   value       = aws_iam_role.transcoding_worker.arn
# }
# 
# output "transcoding_worker_role_name" {
#   description = "Name of the transcoding worker IAM role"
#   value       = aws_iam_role.transcoding_worker.name
# }

# Placeholder outputs for blueprint
output "transcoding_worker_role_arn" {
  description = "ARN of the transcoding worker IAM role (placeholder until provider configured)"
  value       = "arn:aws:iam::123456789012:role/${var.role_name_prefix}-transcoding-worker-${var.environment}"
}

output "transcoding_worker_role_name" {
  description = "Name of the transcoding worker IAM role (placeholder until provider configured)"
  value       = "${var.role_name_prefix}-transcoding-worker-${var.environment}"
}

