#!/bin/sh

set -eu

ping_response="$(wget -q -O - http://127.0.0.1:8080/ping 2>/dev/null || true)"

if [ "$ping_response" != 'OK' ]; then
  exit 1
fi

exit 0
