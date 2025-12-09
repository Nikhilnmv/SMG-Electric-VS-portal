variable "role_name_prefix" {
  description = "Prefix for IAM role names"
  type        = string
  default     = "vs-platform"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "service_principal" {
  description = "Service principal that can assume this role (e.g., ecs-tasks.amazonaws.com, ec2.amazonaws.com)"
  type        = string
  default     = "ecs-tasks.amazonaws.com"
}

variable "raw_uploads_bucket_arn" {
  description = "ARN of the raw uploads S3 bucket"
  type        = string
}

variable "hls_processed_bucket_arn" {
  description = "ARN of the HLS processed S3 bucket"
  type        = string
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

