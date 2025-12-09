# Deployment Guide

## Prerequisites

- AWS account with appropriate permissions
- Terraform >= 1.5.0
- Docker
- Kubernetes CLI (kubectl)
- AWS CLI configured

## Infrastructure Deployment

1. Navigate to infrastructure directory:

```bash
cd infra
```

2. Configure Terraform variables:

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

3. Initialize and apply Terraform:

```bash
terraform init
terraform plan
terraform apply
```

4. Save infrastructure outputs for application configuration.

## Application Deployment

### Docker Build

Build all services:

```bash
docker build -t frontend -f frontend/Dockerfile .
docker build -t backend -f backend/Dockerfile .
docker build -t worker -f worker/Dockerfile .
```

### Kubernetes Deployment

1. Create Kubernetes namespace:

```bash
kubectl create namespace vs-platform
```

2. Create secrets:

```bash
kubectl create secret generic app-secrets \
  --from-literal=db-password=<password> \
  --from-literal=jwt-secret=<secret> \
  --from-literal=aws-access-key=<key> \
  --from-literal=aws-secret-key=<secret> \
  -n vs-platform
```

3. Deploy services (Kubernetes manifests to be created):

```bash
kubectl apply -f k8s/ -n vs-platform
```

## Environment Configuration

Configure environment variables for each service:

- Database connection strings
- Redis connection
- AWS credentials
- JWT secrets
- S3 bucket names
- CloudFront distribution URLs

## CI/CD

GitHub Actions workflows will be configured for:

- Automated testing
- Docker image building
- Kubernetes deployment
- Infrastructure updates

## Monitoring

- Prometheus metrics collection
- Grafana dashboards
- Loki log aggregation

## Scaling

- Horizontal pod autoscaling in Kubernetes
- Database read replicas
- Redis cluster mode
- CloudFront edge caching

