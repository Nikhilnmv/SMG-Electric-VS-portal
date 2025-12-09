# Production Environment Configuration
# This file orchestrates all modules for the production environment
# AWS provider is commented out until credentials are provided

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    # Uncomment when ready to deploy
    # aws = {
    #   source  = "hashicorp/aws"
    #   version = "~> 5.0"
    # }
  }

  # Backend configuration - uncomment and configure when ready
  # backend "s3" {
  #   bucket = "vs-platform-terraform-state-prod"
  #   key    = "prod/terraform.tfstate"
  #   region = "us-east-1"
  #   # Enable state locking
  #   dynamodb_table = "terraform-state-lock-prod"
  #   encrypt        = true
  # }
}

# Provider configuration - uncomment when credentials are available
# provider "aws" {
#   region = var.aws_region
#   # Credentials via environment variables or AWS config
# }

# VPC Module
module "vpc" {
  source = "../modules/vpc"

  vpc_name_prefix      = var.project_name
  environment          = "prod"
  region               = var.aws_region
  vpc_cidr             = var.vpc_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  availability_zones   = var.availability_zones
  create_internet_gateway = var.create_internet_gateway
  create_nat_gateway     = var.create_nat_gateway  # Enabled for prod

  tags = var.common_tags
}

# S3 Buckets Module
module "s3_buckets" {
  source = "../modules/s3_bucket"

  bucket_name_prefix   = var.project_name
  environment          = "prod"
  region               = var.aws_region
  enable_versioning    = var.enable_s3_versioning  # Enabled for prod
  encryption_algorithm = var.s3_encryption_algorithm

  tags = var.common_tags
}

# CloudFront CDN Module (enabled for prod)
module "cloudfront" {
  source = "../modules/cloudfront"

  enabled              = var.enable_cdn
  bucket_name          = module.s3_buckets.hls_processed_bucket_id
  s3_bucket_domain_name = "${module.s3_buckets.hls_processed_bucket_id}.s3.${var.aws_region}.amazonaws.com"
  environment          = "prod"
  region               = var.aws_region
  enable_ipv6          = var.enable_ipv6
  min_ttl              = var.cdn_min_ttl
  default_ttl          = var.cdn_default_ttl
  max_ttl              = var.cdn_max_ttl
  geo_restriction_type = var.cdn_geo_restriction_type
  geo_restriction_locations = var.cdn_geo_restriction_locations

  tags = var.common_tags
}

# IAM Role for Transcoding Worker
module "iam_transcoding_worker" {
  source = "../modules/iam_role"

  role_name_prefix         = var.project_name
  environment              = "prod"
  region                   = var.aws_region
  service_principal        = var.worker_service_principal
  raw_uploads_bucket_arn   = module.s3_buckets.raw_uploads_bucket_arn
  hls_processed_bucket_arn = module.s3_buckets.hls_processed_bucket_arn

  tags = var.common_tags
}

# ECS/EKS Placeholder Module
module "container_orchestration" {
  source = "../modules/ecs_eks"

  cluster_name_prefix       = var.project_name
  environment               = "prod"
  region                    = var.aws_region
  orchestration_type        = var.orchestration_type
  enable_container_insights = var.enable_container_insights
  subnet_ids                = module.vpc.private_subnet_ids
  kubernetes_version        = var.kubernetes_version
  endpoint_private_access   = var.eks_endpoint_private_access
  endpoint_public_access    = var.eks_endpoint_public_access

  tags = var.common_tags
}

