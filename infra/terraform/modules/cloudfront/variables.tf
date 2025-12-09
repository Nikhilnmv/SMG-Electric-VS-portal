variable "enabled" {
  description = "Enable CloudFront distribution"
  type        = bool
  default     = true
}

variable "bucket_name" {
  description = "Name of the S3 bucket to serve via CloudFront"
  type        = string
}

variable "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket (bucket regional domain name)"
  type        = string
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

variable "enable_ipv6" {
  description = "Enable IPv6 for CloudFront distribution"
  type        = bool
  default     = true
}

variable "default_root_object" {
  description = "Default root object for CloudFront distribution"
  type        = string
  default     = "index.html"
}

variable "min_ttl" {
  description = "Minimum TTL for cached content (seconds)"
  type        = number
  default     = 0
}

variable "default_ttl" {
  description = "Default TTL for cached content (seconds)"
  type        = number
  default     = 3600
}

variable "max_ttl" {
  description = "Maximum TTL for cached content (seconds)"
  type        = number
  default     = 86400
}

variable "geo_restriction_type" {
  description = "Geo restriction type (none, whitelist, blacklist)"
  type        = string
  default     = "none"
}

variable "geo_restriction_locations" {
  description = "List of country codes for geo restrictions"
  type        = list(string)
  default     = []
}

variable "use_default_certificate" {
  description = "Use CloudFront default certificate"
  type        = bool
  default     = true
}

variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for custom domain (optional)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

