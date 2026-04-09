#!/usr/bin/env bash

set -euo pipefail

scenario="${SCENARIO:?SCENARIO is required}"
mode="${MODE:-automatic}"
fork_pr="${FORK_PR:-false}"
review_enabled="${CODEX_REVIEW_ENABLED:-true}"
pat_available="${PAT_AVAILABLE:-false}"
openrouter_present="${OPENROUTER_PRESENT:-false}"
openrouter_result="${OPENROUTER_RESULT:-failed}"
gemini_present="${GEMINI_PRESENT:-false}"
gemini_result="${GEMINI_RESULT:-failed}"
label_name="${LABEL_NAME:-}"

comment_publisher="none"
final_comment="false"
manual_trigger_comment="false"
review_provider="none"
review_status="not_run"
fallback_reason="none"
openrouter_attempts="0"
gemini_attempts="0"

if [[ "$fork_pr" == "true" ]]; then
  echo "SCENARIO=$scenario"
  echo "MODE=$mode"
  echo "PATH=skip_fork"
  echo "FINAL_COMMENT=false"
  echo "MANUAL_TRIGGER_COMMENT=false"
  echo "COMMENT_PUBLISHER=none"
  echo "REVIEW_PROVIDER=none"
  echo "REVIEW_STATUS=skipped"
  echo "OPENROUTER_ATTEMPTS=0"
  echo "GEMINI_ATTEMPTS=0"
  echo "FALLBACK_REASON=fork_pr"
  exit 0
fi

if [[ "$mode" == "manual" ]]; then
  if [[ "$label_name" == "codex-review" && "$pat_available" == "true" ]]; then
    manual_trigger_comment="true"
    comment_publisher="maintainer_pat"
    review_status="manual_codex_requested"
  elif [[ "$label_name" == "codex-review" ]]; then
    review_status="manual_codex_unavailable"
    fallback_reason="pat_unavailable"
  else
    review_status="ignored_label"
    fallback_reason="label_not_supported"
  fi

  echo "SCENARIO=$scenario"
  echo "MODE=$mode"
  echo "PATH=manual"
  echo "FINAL_COMMENT=false"
  echo "MANUAL_TRIGGER_COMMENT=$manual_trigger_comment"
  echo "COMMENT_PUBLISHER=$comment_publisher"
  echo "REVIEW_PROVIDER=none"
  echo "REVIEW_STATUS=$review_status"
  echo "OPENROUTER_ATTEMPTS=0"
  echo "GEMINI_ATTEMPTS=0"
  echo "FALLBACK_REASON=$fallback_reason"
  exit 0
fi

comment_publisher="github_token"
final_comment="true"

if [[ "$review_enabled" != "true" ]]; then
  review_status="disabled"
  fallback_reason="codex_review_disabled"
else
  if [[ "$openrouter_present" == "true" ]]; then
    if [[ "$openrouter_result" == "completed" ]]; then
      openrouter_attempts="1"
      review_provider="openrouter"
      review_status="completed"
    elif [[ "$openrouter_result" == "completed_retry" ]]; then
      openrouter_attempts="2"
      review_provider="openrouter"
      review_status="completed"
      fallback_reason="openrouter_retried"
    else
      openrouter_attempts="2"
    fi
  fi

  if [[ "$review_status" != "completed" ]]; then
    if [[ "$gemini_present" == "true" ]]; then
      if [[ "$gemini_result" == "completed" ]]; then
        gemini_attempts="1"
        review_provider="gemini"
        review_status="completed"
        if [[ "$openrouter_present" != "true" ]]; then
          fallback_reason="openrouter_unavailable"
        elif [[ "$openrouter_result" != "completed" ]]; then
          fallback_reason="openrouter_${openrouter_result}"
        fi
      elif [[ "$gemini_result" == "completed_retry" ]]; then
        gemini_attempts="2"
        review_provider="gemini"
        review_status="completed"
        if [[ "$openrouter_present" != "true" ]]; then
          fallback_reason="openrouter_unavailable"
        elif [[ "$openrouter_result" != "completed" ]]; then
          fallback_reason="openrouter_${openrouter_result}"
        fi
      else
        gemini_attempts="2"
      fi
    fi
  fi

  if [[ "$review_status" != "completed" ]]; then
    review_status="fallback_advisory"
    if [[ "$gemini_present" != "true" ]]; then
      if [[ "$openrouter_present" != "true" ]]; then
        fallback_reason="providers_unavailable"
      else
        fallback_reason="gemini_unavailable"
      fi
    elif [[ "$gemini_result" != "completed" && "$gemini_result" != "completed_retry" ]]; then
      fallback_reason="gemini_${gemini_result}"
    elif [[ "$openrouter_present" != "true" ]]; then
      fallback_reason="openrouter_unavailable"
    else
      fallback_reason="openrouter_${openrouter_result}"
    fi
  fi
fi

echo "SCENARIO=$scenario"
echo "MODE=$mode"
echo "PATH=automatic"
echo "FINAL_COMMENT=$final_comment"
echo "MANUAL_TRIGGER_COMMENT=false"
echo "COMMENT_PUBLISHER=$comment_publisher"
echo "REVIEW_PROVIDER=$review_provider"
echo "REVIEW_STATUS=$review_status"
echo "OPENROUTER_ATTEMPTS=$openrouter_attempts"
echo "GEMINI_ATTEMPTS=$gemini_attempts"
echo "FALLBACK_REASON=$fallback_reason"
