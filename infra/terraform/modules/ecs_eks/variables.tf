variable "cluster_name_prefix" {
  description = "Prefix for cluster name"
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

variable "orchestration_type" {
  description = "Type of orchestration (ecs or eks)"
  type        = string
  default     = "ecs"
  validation {
    condition     = contains(["ecs", "eks"], var.orchestration_type)
    error_message = "Orchestration type must be either 'ecs' or 'eks'."
  }
}

variable "enable_container_insights" {
  description = "Enable CloudWatch Container Insights for ECS"
  type        = bool
  default     = false
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_cluster_role_arn" {
  description = "ARN of IAM role for EKS cluster (required if orchestration_type is eks)"
  type        = string
  default     = ""
}

variable "subnet_ids" {
  description = "List of subnet IDs for EKS cluster"
  type        = list(string)
  default     = []
}

variable "endpoint_private_access" {
  description = "Enable private API server endpoint for EKS"
  type        = bool
  default     = true
}

variable "endpoint_public_access" {
  description = "Enable public API server endpoint for EKS"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

