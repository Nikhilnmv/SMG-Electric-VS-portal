# Development Environment Outputs

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "raw_uploads_bucket_id" {
  description = "ID of the raw uploads S3 bucket"
  value       = module.s3_buckets.raw_uploads_bucket_id
}

output "hls_processed_bucket_id" {
  description = "ID of the HLS processed S3 bucket"
  value       = module.s3_buckets.hls_processed_bucket_id
}

output "analytics_exports_bucket_id" {
  description = "ID of the analytics exports S3 bucket"
  value       = module.s3_buckets.analytics_exports_bucket_id
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution (if enabled)"
  value       = module.cloudfront.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution (if enabled)"
  value       = module.cloudfront.cloudfront_domain_name
}

output "transcoding_worker_role_arn" {
  description = "ARN of the transcoding worker IAM role"
  value       = module.iam_transcoding_worker.transcoding_worker_role_arn
}

output "ecs_cluster_id" {
  description = "ID of the ECS cluster (if orchestration_type is ecs)"
  value       = module.container_orchestration.ecs_cluster_id
}

output "eks_cluster_id" {
  description = "ID of the EKS cluster (if orchestration_type is eks)"
  value       = module.container_orchestration.eks_cluster_id
}

