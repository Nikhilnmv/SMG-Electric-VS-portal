# Terraform Infrastructure Blueprint for Video Streaming Platform

This directory contains a cloud-agnostic, modular Terraform infrastructure blueprint for the video streaming platform. The infrastructure is designed to be ready for deployment but does not require AWS credentials or actual deployment at this stage.

## 📁 Directory Structure

```
terraform/
├── dev/                    # Development environment configuration
│   ├── main.tf            # Main configuration for dev
│   ├── variables.tf       # Variable definitions for dev
│   └── outputs.tf         # Output definitions for dev
├── prod/                   # Production environment configuration
│   ├── main.tf            # Main configuration for prod
│   ├── variables.tf       # Variable definitions for prod
│   └── outputs.tf         # Output definitions for prod
└── modules/                # Reusable Terraform modules
    ├── s3_bucket/         # S3 bucket module (raw uploads, HLS, analytics)
    ├── cloudfront/        # CloudFront CDN module
    ├── iam_role/         # IAM role module for transcoding worker
    ├── vpc/              # VPC module with networking
    └── ecs_eks/          # Container orchestration placeholder
```

## 🎯 Design Principles

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

## 📦 Modules Overview

### 1. S3 Bucket Module (`modules/s3_bucket/`)
Creates three S3 buckets:
- **Raw Uploads**: For storing original video files
- **HLS Processed**: For storing transcoded HLS segments and manifests
- **Analytics Exports**: For storing analytics data exports

**Features:**
- Configurable versioning
- Server-side encryption (AES256 or KMS)
- Public access blocking
- Environment-specific naming

### 2. CloudFront CDN Module (`modules/cloudfront/`)
Creates a CloudFront distribution for video delivery:
- Optimized cache behaviors for HLS files (`.m3u8`, `.ts`)
- Origin Access Identity (OAI) for secure S3 access
- Configurable TTL values
- Geo-restriction support
- IPv6 support

### 3. IAM Role Module (`modules/iam_role/`)
Creates IAM roles and policies for transcoding workers:
- S3 access policies (read raw uploads, write processed HLS)
- CloudWatch Logs permissions
- Service principal-based trust relationships

### 4. VPC Module (`modules/vpc/`)
Creates a complete VPC with:
- Public and private subnets across multiple AZs
- Internet Gateway for public subnets
- NAT Gateways for private subnets
- Route tables and associations
- Configurable CIDR blocks

### 5. ECS/EKS Module (`modules/ecs_eks/`)
Placeholder module for container orchestration:
- Supports both ECS and EKS
- Configurable cluster settings
- Ready for expansion when needed

## 🚀 Getting Started

### Prerequisites
- Terraform >= 1.5.0 installed
- AWS CLI configured (when ready to deploy)
- Appropriate AWS IAM permissions (when ready to deploy)

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

## 🔄 Adapting for Other Cloud Providers

### Google Cloud Platform (GCP)
To adapt for GCP:

1. **S3 Bucket → Cloud Storage**
   - Replace `aws_s3_bucket` with `google_storage_bucket`
   - Update bucket naming conventions
   - Adjust IAM policies

2. **CloudFront → Cloud CDN**
   - Replace `aws_cloudfront_distribution` with `google_compute_backend_bucket`
   - Update cache configuration

3. **IAM Role → Service Account**
   - Replace `aws_iam_role` with `google_service_account`
   - Update permission bindings

4. **VPC → VPC Network**
   - Replace `aws_vpc` with `google_compute_network`
   - Update subnet and routing configurations

### Microsoft Azure
To adapt for Azure:

1. **S3 Bucket → Blob Storage**
   - Replace `aws_s3_bucket` with `azurerm_storage_account` and `azurerm_storage_container`
   - Update access policies

2. **CloudFront → Azure CDN**
   - Replace with `azurerm_cdn_profile` and `azurerm_cdn_endpoint`
   - Update cache rules

3. **IAM Role → Managed Identity**
   - Replace `aws_iam_role` with `azurerm_user_assigned_identity`
   - Update role assignments

4. **VPC → Virtual Network**
   - Replace `aws_vpc` with `azurerm_virtual_network`
   - Update subnet and gateway configurations

## 🔧 Environment-Specific Configurations

### Development Environment (`dev/`)
- **Minimal Networking**: NAT Gateway disabled by default (cost savings)
- **No CDN**: CloudFront disabled by default
- **No Versioning**: S3 versioning disabled
- **Bucket Naming**: Includes `-dev` suffix
- **Single AZ**: Can be configured for minimal resources

### Production Environment (`prod/`)
- **Full Networking**: NAT Gateways enabled for high availability
- **CDN Enabled**: CloudFront distribution active
- **Versioning Enabled**: S3 versioning for data protection
- **Multi-AZ**: Configured across multiple availability zones
- **Enhanced Security**: Private EKS endpoints, stricter access controls

## 📝 Variable Customization

### Common Variables
- `aws_region`: AWS region for resources
- `project_name`: Prefix for resource naming
- `environment`: Environment identifier (automatically set to "dev" or "prod")
- `common_tags`: Tags applied to all resources

### Module-Specific Variables
Each module has its own variables file. Key variables include:
- **S3**: `bucket_name_prefix`, `enable_versioning`, `encryption_algorithm`
- **CloudFront**: `enabled`, `min_ttl`, `default_ttl`, `max_ttl`
- **VPC**: `vpc_cidr`, `public_subnet_cidrs`, `private_subnet_cidrs`
- **IAM**: `service_principal`, bucket ARNs

## 🔐 Security Considerations

### Before Deployment
1. **Review IAM Policies**: Ensure least-privilege access
2. **Encryption**: Consider KMS for S3 encryption in production
3. **Network Security**: Review security groups and NACLs
4. **Access Control**: Configure CloudFront OAI properly
5. **State File**: Use remote backend with encryption and locking

### Production Checklist
- [ ] Enable S3 bucket versioning
- [ ] Enable S3 bucket encryption (prefer KMS)
- [ ] Configure CloudFront with custom domain and SSL certificate
- [ ] Enable VPC Flow Logs
- [ ] Configure CloudWatch alarms
- [ ] Set up backup and disaster recovery
- [ ] Review and restrict IAM permissions
- [ ] Enable AWS Config for compliance

## 📊 Outputs

Each environment exposes outputs for:
- VPC and networking resources
- S3 bucket IDs and ARNs
- CloudFront distribution details
- IAM role ARNs
- Container cluster information

Access outputs after deployment:
```bash
terraform output
terraform output vpc_id
terraform output cloudfront_domain_name
```

## 🛠️ Maintenance

### Updating Modules
1. Make changes in the `modules/` directory
2. Test in dev environment first
3. Review plan output carefully
4. Apply to dev, then prod

### State Management
- Use remote backend (S3) for production
- Enable state locking (DynamoDB)
- Never commit state files to version control
- Use workspaces for additional environments if needed

## 🐛 Troubleshooting

### Common Issues

**Provider Not Configured**
- Ensure AWS credentials are set: `aws configure`
- Check environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

**State Lock Errors**
- Check if another Terraform process is running
- If stuck, manually release lock in DynamoDB (if using remote backend)

**Module Not Found**
- Run `terraform init` to download modules
- Check module source paths in `main.tf`

**Variable Not Set**
- Create `terraform.tfvars` file
- Or set via command line: `terraform apply -var="key=value"`
- Or use environment variables: `TF_VAR_key=value`

## 📚 Additional Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

## 🤝 Contributing

When modifying this infrastructure:
1. Update relevant module documentation
2. Test changes in dev environment
3. Update this README if structure changes
4. Follow Terraform style guide

## 📄 License

This infrastructure code is part of the VS Platform project.

---

**Note**: This is a blueprint. Actual deployment requires AWS credentials and uncommenting provider configurations. All resource definitions are commented out to prevent accidental deployment.

