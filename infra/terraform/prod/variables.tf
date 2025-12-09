variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "vs-platform"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24", "10.0.30.0/24"]
}

variable "availability_zones" {
  description = "List of availability zones (should match subnet count)"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "create_internet_gateway" {
  description = "Create Internet Gateway for public subnets"
  type        = bool
  default     = true
}

variable "create_nat_gateway" {
  description = "Create NAT Gateway for private subnets (enabled for prod)"
  type        = bool
  default     = true
}

variable "enable_s3_versioning" {
  description = "Enable versioning on S3 buckets (enabled for prod)"
  type        = bool
  default     = true
}

variable "s3_encryption_algorithm" {
  description = "Server-side encryption algorithm for S3"
  type        = string
  default     = "AES256"
  # For production, consider using "aws:kms" with a KMS key
}

variable "enable_cdn" {
  description = "Enable CloudFront CDN (enabled for prod)"
  type        = bool
  default     = true
}

variable "enable_ipv6" {
  description = "Enable IPv6 for CloudFront"
  type        = bool
  default     = true
}

variable "cdn_min_ttl" {
  description = "Minimum TTL for CloudFront cache (seconds)"
  type        = number
  default     = 0
}

variable "cdn_default_ttl" {
  description = "Default TTL for CloudFront cache (seconds)"
  type        = number
  default     = 3600
}

variable "cdn_max_ttl" {
  description = "Maximum TTL for CloudFront cache (seconds)"
  type        = number
  default     = 86400
}

variable "cdn_geo_restriction_type" {
  description = "Geo restriction type for CloudFront (none, whitelist, blacklist)"
  type        = string
  default     = "none"
}

variable "cdn_geo_restriction_locations" {
  description = "List of country codes for CloudFront geo restrictions"
  type        = list(string)
  default     = []
}

variable "worker_service_principal" {
  description = "Service principal for transcoding worker IAM role"
  type        = string
  default     = "ecs-tasks.amazonaws.com"
}

variable "orchestration_type" {
  description = "Container orchestration type (ecs or eks)"
  type        = string
  default     = "eks"  # EKS for production
}

variable "enable_container_insights" {
  description = "Enable CloudWatch Container Insights"
  type        = bool
  default     = true  # Enabled for prod
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_endpoint_private_access" {
  description = "Enable private API server endpoint for EKS"
  type        = bool
  default     = true
}

variable "eks_endpoint_public_access" {
  description = "Enable public API server endpoint for EKS"
  type        = bool
  default     = false  # Disabled for prod security
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "VS Platform"
    Environment = "prod"
    ManagedBy   = "Terraform"
  }
}

