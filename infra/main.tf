terraform {
  required_version = ">= 1.6.0"
  required_providers { aws = { source = "hashicorp/aws", version = "~> 6.0" } }
}
variable "region" { default = "ap-south-1" }
variable "environment" { type = string
  validation { condition = contains(["development", "staging", "production"], var.environment)
    error_message = "Use a separate environment name." }
}
variable "media_bucket_name" { type = string }
provider "aws" { region = var.region }
locals { prefix = "relay-${var.environment}" }
resource "aws_kms_key" "secrets" { description = "${local.prefix} integration encryption"
  enable_key_rotation = true
  deletion_window_in_days = 30
}
resource "aws_sqs_queue" "dead_letter" { name = "${local.prefix}-dead-letter"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled = true
}
resource "aws_sqs_queue" "outreach" { name = "${local.prefix}-outreach"
  visibility_timeout_seconds = 180
  message_retention_seconds = 345600
  sqs_managed_sse_enabled = true
  redrive_policy = jsonencode({deadLetterTargetArn=aws_sqs_queue.dead_letter.arn,maxReceiveCount=3})
}
resource "aws_s3_bucket" "media" { bucket = var.media_bucket_name }
resource "aws_s3_bucket_public_access_block" "media" { bucket = aws_s3_bucket.media.id
  block_public_acls = true
  block_public_policy = true
  ignore_public_acls = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_server_side_encryption_configuration" "media" { bucket = aws_s3_bucket.media.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "aws:kms"
    kms_master_key_id = aws_kms_key.secrets.arn } }
}
resource "aws_s3_bucket_versioning" "media" { bucket = aws_s3_bucket.media.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_cloudwatch_log_group" "voice" { name = "/ecs/${local.prefix}-voice"
  retention_in_days = 30
}
resource "aws_cloudwatch_metric_alarm" "dead_letters" { alarm_name = "${local.prefix}-dead-letters"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods = 1
  metric_name = "ApproximateNumberOfMessagesVisible"
  namespace = "AWS/SQS"
  period = 60
  statistic = "Maximum"
  threshold = 0
  dimensions = { QueueName = aws_sqs_queue.dead_letter.name }
}
output "queue_url" { value = aws_sqs_queue.outreach.url }
output "kms_key_id" { value = aws_kms_key.secrets.arn }
