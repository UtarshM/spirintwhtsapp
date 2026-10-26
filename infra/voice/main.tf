terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0"
    }

  }
}
provider "aws" {
  region = var.region
}
variable "region" {
  type    = string
  default = "ap-south-1"
}
variable "environment" {
  type = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Use a separate staging or production environment."

  }
}
variable "vpc_id" {
  type = string
}
variable "public_subnet_ids" {
  type = list(string)
}
variable "private_subnet_ids" {
  type = list(string)
}
variable "certificate_arn" {
  type = string
}
variable "image" {
  type = string
  validation {
    condition     = can(regex("@sha256:[a-f0-9]{64}$", var.image))
    error_message = "Pin the ECR container image by digest."

  }
}
variable "domain" {
  type = string
  validation {
    condition     = can(regex("^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$", var.domain))
    error_message = "Provide only the voice hostname, without scheme or path."

  }
}
variable "secret_arn" {
  type = string
}
variable "secret_kms_key_arn" {
  type    = string
  default = null
}
variable "cartesia_enabled" {
  type        = bool
  default     = false
  description = "Inject optional Cartesia secrets for legacy/selected Cartesia agents. Sarvam agents do not require them."
}
variable "integration_kms_key_arn" {
  type        = string
  description = "KMS key used by the web control plane to encrypt workspace Plivo connections."
}
variable "alarm_topic_arn" {
  type = string
}
variable "calling_enabled" {
  type    = bool
  default = false
}
variable "desired_count" {
  type    = number
  default = 1
}
locals {
  prefix = "sprint-${var.environment}-voice"
}

resource "aws_cloudwatch_log_group" "voice" {
  name              = "/ecs/${local.prefix}"
  retention_in_days = 30
}
resource "aws_security_group" "alb" {
  name   = "${local.prefix}-alb"
  vpc_id = var.vpc_id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.voice.id]
  }
}
resource "aws_security_group" "voice" {
  name   = "${local.prefix}-service"
  vpc_id = var.vpc_id
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
resource "aws_vpc_security_group_ingress_rule" "voice" {
  security_group_id            = aws_security_group.voice.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
}
resource "aws_lb" "voice" {
  name                       = local.prefix
  internal                   = false
  load_balancer_type         = "application"
  subnets                    = var.public_subnet_ids
  security_groups            = [aws_security_group.alb.id]
  idle_timeout               = 1000
  drop_invalid_header_fields = true
  enable_deletion_protection = var.environment == "production"
}
resource "aws_lb_target_group" "voice" {
  name                 = local.prefix
  port                 = 8080
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = var.vpc_id
  deregistration_delay = 30
  health_check {
    path                = "/healthz"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}
resource "aws_lb_listener" "voice" {
  load_balancer_arn = aws_lb.voice.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.voice.arn
  }
}
data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}
resource "aws_iam_role" "execution" {
  name               = "${local.prefix}-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}
resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
resource "aws_iam_role_policy" "secret" {
  role = aws_iam_role.execution.id
  policy = jsonencode({ Version = "2012-10-17", Statement = concat([
    { Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = var.secret_arn
    }
    ], var.secret_kms_key_arn == null ? [] : [
    { Effect = "Allow", Action = ["kms:Decrypt"], Resource = var.secret_kms_key_arn, Condition = { StringEquals = { "kms:ViaService" = "secretsmanager.${var.region}.amazonaws.com"
      }
      }
    }
  ]) })
}
resource "aws_iam_role" "task" {
  name               = "${local.prefix}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}
resource "aws_iam_role_policy" "plivo_connection_decrypt" {
  role = aws_iam_role.task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["kms:Decrypt"]
      Resource = var.integration_kms_key_arn
      Condition = {
        StringEquals = { "kms:EncryptionContext:provider" = "plivo" }
      }
    }]
  })
}
resource "aws_ecs_cluster" "voice" {
  name = local.prefix
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}
resource "aws_ecs_task_definition" "voice" {
  family                   = local.prefix
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }
  container_definitions = jsonencode([{
    name         = "voice", image = var.image, essential = true, user = "1000", readonlyRootFilesystem = true, stopTimeout = 120,
    portMappings = [{ containerPort = 8080, protocol = "tcp" }],
    environment = [
      { name = "NODE_ENV", value = "production" }, { name = "VOICE_PUBLIC_URL", value = "https://${var.domain}" },
      { name = "TSX_DISABLE_CACHE", value = "1" },
      { name = "AWS_REGION", value = var.region },
      { name = "AWS_KMS_KEY_ID", value = var.integration_kms_key_arn },
      { name = "VOICE_PORT", value = "8080" }, { name = "VOICE_SERVICE_MAX_SESSIONS", value = "20" },
      { name = "VOICE_CALLING_ENABLED", value = tostring(var.calling_enabled)
      }
    ],
    secrets = [for key in concat(["SARVAM_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"], var.cartesia_enabled ? ["CARTESIA_API_KEY", "CARTESIA_VOICE_EN", "CARTESIA_VOICE_HI"] : []) : { name = key, valueFrom = "${var.secret_arn}:${key}::" }],
    logConfiguration = { logDriver = "awslogs", options = { awslogs-group = aws_cloudwatch_log_group.voice.name, awslogs-region = var.region, awslogs-stream-prefix = "service"
    } },
    healthCheck = { command = ["CMD-SHELL", "node -e \"fetch('http://127.0.0.1:8080/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))\""], interval = 30, timeout = 5, retries = 3, startPeriod = 30
    }
  }])
}
resource "aws_ecs_service" "voice" {
  name                              = local.prefix
  cluster                           = aws_ecs_cluster.voice.id
  task_definition                   = aws_ecs_task_definition.voice.arn
  desired_count                     = var.desired_count
  launch_type                       = "FARGATE"
  platform_version                  = "1.4.0"
  health_check_grace_period_seconds = 60
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.voice.id]
    assign_public_ip = false
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.voice.arn
    container_name   = "voice"
    container_port   = 8080
  }
  depends_on = [aws_lb_listener.voice, aws_iam_role_policy.secret, aws_iam_role_policy_attachment.execution, aws_iam_role_policy.plivo_connection_decrypt]
}
resource "aws_cloudwatch_metric_alarm" "unhealthy" {
  alarm_name          = "${local.prefix}-unhealthy"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  treat_missing_data  = "breaching"
  dimensions = { LoadBalancer = aws_lb.voice.arn_suffix, TargetGroup = aws_lb_target_group.voice.arn_suffix
  }
  alarm_actions = [var.alarm_topic_arn]
  ok_actions    = [var.alarm_topic_arn]
}
output "load_balancer_dns" {
  value = aws_lb.voice.dns_name
}
output "public_url" {
  value = "https://${var.domain}"
}
output "cluster" {
  value = aws_ecs_cluster.voice.name
}
output "task_definition" {
  value = aws_ecs_task_definition.voice.arn
}
