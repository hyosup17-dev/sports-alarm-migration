variable "region" {
  description = "AWS Region"
  default     = "ap-northeast-2"
}

variable "github_token" {
  description = "GitHub Personal Access Token"
  type        = string
  sensitive   = true # 로그에 안 찍히게 가림
}

variable "repository" {
  description = "GitHub Repository URL (예: https://github.com/아이디/리포지토리)"
  type        = string
}

# .env.local에 있던 값들을 여기서 받습니다
variable "aws_access_key" {
  type      = string
  sensitive = true
}

variable "aws_secret_key" {
  type      = string
  sensitive = true
}