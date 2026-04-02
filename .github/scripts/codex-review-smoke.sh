#!/usr/bin/env bash

set -euo pipefail

scenario="${SCENARIO:?SCENARIO is required}"
fork_pr="${FORK_PR:-false}"
review_enabled="${CODEX_REVIEW_ENABLED:-true}"
pat_available="${PAT_AVAILABLE:-false}"
openai_present="${OPENAI_PRESENT:-false}"
openai_result="${OPENAI_RESULT:-failed}"
openrouter_present="${OPENROUTER_PRESENT:-false}"
openrouter_result="${OPENROUTER_RESULT:-failed}"

comment_publisher="none"
final_comment="false"
review_provider="none"
review_status="not_run"
fallback_reason="none"

if [[ "$fork_pr" == "true" ]]; then
  echo "SCENARIO=$scenario"
  echo "PATH=skip_fork"
  echo "FINAL_COMMENT=false"
  echo "COMMENT_PUBLISHER=none"
  echo "REVIEW_PROVIDER=none"
  echo "REVIEW_STATUS=skipped"
  echo "FALLBACK_REASON=fork_pr"
  exit 0
fi

if [[ "$pat_available" == "true" ]]; then
  comment_publisher="maintainer_pat"
else
  comment_publisher="github_token"
fi

final_comment="true"

if [[ "$review_enabled" != "true" ]]; then
  review_status="disabled"
  fallback_reason="codex_review_disabled"
else
  if [[ "$openai_present" == "true" && "$openai_result" == "completed" ]]; then
    review_provider="openai"
    review_status="completed"
  elif [[ "$openrouter_present" == "true" && "$openrouter_result" == "completed" ]]; then
    review_provider="openrouter"
    review_status="completed"
    if [[ "$openai_present" == "true" && "$openai_result" != "completed" ]]; then
      fallback_reason="openai_${openai_result}"
    fi
  else
    review_status="fallback_human"
    if [[ "$openrouter_present" != "true" ]]; then
      fallback_reason="openrouter_unavailable"
    elif [[ "$openrouter_result" != "completed" ]]; then
      fallback_reason="openrouter_${openrouter_result}"
    elif [[ "$openai_present" != "true" ]]; then
      fallback_reason="openai_unavailable"
    else
      fallback_reason="openai_${openai_result}"
    fi
  fi
fi

echo "SCENARIO=$scenario"
echo "PATH=standard"
echo "FINAL_COMMENT=$final_comment"
echo "COMMENT_PUBLISHER=$comment_publisher"
echo "REVIEW_PROVIDER=$review_provider"
echo "REVIEW_STATUS=$review_status"
echo "FALLBACK_REASON=$fallback_reason"
