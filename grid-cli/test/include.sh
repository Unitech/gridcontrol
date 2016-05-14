#
# (C) 2013 Unitech.io Inc.
#

function fail {
  echo -e "######## \033[31m  ✘ $1\033[0m"
  exit 1
}

function success {
  echo -e "\033[32m------------> ✔ $1\033[0m"
}

function spec {
  RET=$?
  sleep 0.3
  [ $RET -eq 0 ] || fail "$1"
  success "$1"
}

function ispec {
  RET=$?
  sleep 0.3
  [ $RET -ne 0 ] || fail "$1"
  success "$1"
}
