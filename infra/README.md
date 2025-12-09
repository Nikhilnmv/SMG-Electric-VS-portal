# Infrastructure - Terraform

Terraform configurations for AWS infrastructure resources.

## Resources

- **S3 Bucket**: Video storage with versioning and encryption
- **CloudFront**: CDN distribution for global video delivery
- **RDS PostgreSQL**: Primary database for metadata
- **ElastiCache Redis**: Caching and job queue storage
- **EKS**: Kubernetes cluster (placeholder - to be fully configured)

## Prerequisites

- Terraform >= 1.5.0
- AWS CLI configured with appropriate credentials
- AWS account with necessary permissions

## Setup

1. Copy `terraform.tfvars.example` to `terraform.tfvars`:

```bash
cp terraform.tfvars.example terraform.tfvars
```

2. Update `terraform.tfvars` with your values:
   - AWS region
   - S3 bucket name (must be globally unique)
   - Database credentials
   - VPC subnet IDs
   - CIDR blocks for access

3. Initialize Terraform:

```bash
terraform init
```

4. Review the plan:

```bash
terraform plan
```

5. Apply the configuration:

```bash
terraform apply
```

## Outputs

After applying, Terraform will output:
- S3 bucket name
- CloudFront distribution ID and domain
- RDS endpoint
- Redis endpoint and port

Use these values to configure your application services.

## Backend Configuration

Configure Terraform backend in `main.tf` or via environment variables:

```bash
export TF_BACKEND_BUCKET="vs-platform-terraform-state"
export TF_BACKEND_KEY="terraform.tfstate"
export TF_BACKEND_REGION="us-east-1"
```

## Destroying Resources

To destroy all resources:

```bash
terraform destroy
```

**Warning**: This will delete all infrastructure including databases. Ensure you have backups.

