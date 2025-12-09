# Day 10: Terraform Infrastructure Blueprint

**Date**: Day 10  
**Focus**: Complete Terraform infrastructure blueprint for cloud deployment

---

## Overview

Day 10 created a comprehensive, cloud-agnostic Terraform infrastructure blueprint. The infrastructure is designed to be ready for deployment but does not require AWS credentials or actual deployment at this stage. All provider blocks are commented out to prevent accidental deployment.

---

## Design Principles

### Cloud-Agnostic Architecture
- **Modular Design**: Each infrastructure component is a separate, reusable module
- **Provider Abstraction**: AWS provider blocks are commented out, ready to be enabled when credentials are available
- **Portable Configuration**: Variables and outputs are structured to allow easy adaptation to other cloud providers

### Terraform Best Practices
- ✅ **Versioned Providers**: All modules specify provider version constraints
- ✅ **Environment Separation**: Separate configurations for dev and prod
- ✅ **Variable Defaults**: Sensible defaults for all variables
- ✅ **Comprehensive Outputs**: All important resource identifiers are exposed as outputs
- ✅ **Tagging Strategy**: Consistent tagging across all resources

---

## Module Structure

### 1. S3 Bucket Module (`modules/s3_bucket/`)

**Purpose**: Creates three S3 buckets for video storage

**Buckets Created**:
- Raw Uploads: For storing original video files
- HLS Processed: For storing transcoded HLS segments and manifests
- Analytics Exports: For storing analytics data exports

**Features**:
- Configurable versioning
- Server-side encryption (AES256 or KMS)
- Public access blocking
- Environment-specific naming

### 2. CloudFront CDN Module (`modules/cloudfront/`)

**Purpose**: Creates a CloudFront distribution for video delivery

**Features**:
- Optimized cache behaviors for HLS files (`.m3u8`, `.ts`)
- Origin Access Identity (OAI) for secure S3 access
- Configurable TTL values
- Geo-restriction support
- IPv6 support

### 3. IAM Role Module (`modules/iam_role/`)

**Purpose**: Creates IAM roles and policies for transcoding workers

**Features**:
- S3 access policies (read raw uploads, write processed HLS)
- CloudWatch Logs permissions
- Service principal-based trust relationships

### 4. VPC Module (`modules/vpc/`)

**Purpose**: Creates a complete VPC with networking

**Features**:
- Public and private subnets across multiple AZs
- Internet Gateway for public subnets
- NAT Gateways for private subnets
- Route tables and associations
- Configurable CIDR blocks

### 5. ECS/EKS Module (`modules/ecs_eks/`)

**Purpose**: Placeholder module for container orchestration

**Features**:
- Supports both ECS and EKS
- Configurable cluster settings
- Ready for expansion when needed

---

## Environment Configurations

### Development Environment (`dev/`)

**Characteristics**:
- Minimal networking (NAT Gateway disabled by default)
- No CDN (CloudFront disabled by default)
- No versioning (S3 versioning disabled)
- Bucket naming includes `-dev` suffix
- Single AZ configuration possible

### Production Environment (`prod/`)

**Characteristics**:
- Full networking (NAT Gateways enabled)
- CDN enabled (CloudFront distribution active)
- Versioning enabled (S3 versioning for data protection)
- Multi-AZ configuration
- Enhanced security (private EKS endpoints)

---

## Getting Started

### Current Status

**⚠️ This is a blueprint - no actual deployment will occur until:**
1. AWS credentials are provided
2. Provider blocks are uncommented
3. Backend configuration is set up

### Step 1: Review Configuration

All AWS provider blocks are commented out. Review the configuration files to understand the infrastructure design.

### Step 2: Configure Variables (When Ready)

Create `terraform.tfvars` files in `dev/` or `prod/` directories:

```hcl
# dev/terraform.tfvars
aws_region = "us-east-1"
project_name = "vs-platform"
enable_cdn = false
create_nat_gateway = false
```

### Step 3: Enable Provider (When Credentials Available)

1. Uncomment the `terraform` and `provider` blocks in:
   - `dev/main.tf` or `prod/main.tf`
   - Each module's `main.tf` file

2. Configure backend (recommended for production):
   ```hcl
   backend "s3" {
     bucket = "vs-platform-terraform-state-prod"
     key    = "prod/terraform.tfstate"
     region = "us-east-1"
     dynamodb_table = "terraform-state-lock-prod"
     encrypt        = true
   }
   ```

### Step 4: Initialize and Plan

```bash
cd dev  # or prod
terraform init
terraform plan
```

### Step 5: Apply (When Ready)

```bash
terraform apply
```

---

## Adapting for Other Cloud Providers

### Google Cloud Platform (GCP)

1. **S3 Bucket → Cloud Storage**: Replace `aws_s3_bucket` with `google_storage_bucket`
2. **CloudFront → Cloud CDN**: Replace with `google_compute_backend_bucket`
3. **IAM Role → Service Account**: Replace `aws_iam_role` with `google_service_account`
4. **VPC → VPC Network**: Replace `aws_vpc` with `google_compute_network`

### Microsoft Azure

1. **S3 Bucket → Blob Storage**: Replace with `azurerm_storage_account` and `azurerm_storage_container`
2. **CloudFront → Azure CDN**: Replace with `azurerm_cdn_profile` and `azurerm_cdn_endpoint`
3. **IAM Role → Managed Identity**: Replace `aws_iam_role` with `azurerm_user_assigned_identity`
4. **VPC → Virtual Network**: Replace `aws_vpc` with `azurerm_virtual_network`

---

## Files Created

### Directory Structure

```
infra/terraform/
├── dev/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
├── prod/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
├── modules/
│   ├── s3_bucket/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── cloudfront/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── iam_role/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── ecs_eks/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── README.md
└── .gitignore
```

---

## Key Decisions

1. **Cloud-Agnostic Design**: Modules can be adapted for GCP/Azure
2. **Commented Provider Blocks**: Prevents accidental deployment
3. **Environment Separation**: Dev and prod configurations separate
4. **Modular Structure**: Reusable modules for different components

---

## Security Considerations

### Before Deployment

1. Review IAM policies (least-privilege access)
2. Enable encryption (consider KMS for S3 in production)
3. Review network security (security groups, NACLs)
4. Configure CloudFront OAI properly
5. Use remote backend with encryption and locking

### Production Checklist

- [ ] Enable S3 bucket versioning
- [ ] Enable S3 bucket encryption (prefer KMS)
- [ ] Configure CloudFront with custom domain and SSL certificate
- [ ] Enable VPC Flow Logs
- [ ] Configure CloudWatch alarms
- [ ] Set up backup and disaster recovery
- [ ] Review and restrict IAM permissions
- [ ] Enable AWS Config for compliance

---

## Next Steps

When ready to deploy:
1. Uncomment provider blocks
2. Configure AWS credentials
3. Set up Terraform backend
4. Review and customize variables
5. Run `terraform plan` and review
6. Apply infrastructure

---

**Previous**: [Day 9: Reliability and Security](./DAY_09_RELIABILITY_AND_SECURITY.md)

**Reference**: `infra/terraform/README.md`

