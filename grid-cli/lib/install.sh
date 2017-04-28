#!/bin/bash

#
## Colors
#

GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
NEUTRAL="\033[0m"

#
## Displaying functions
#

function already {
  echo -e "${YELLOW}[-]$1 is already installed${NEUTRAL}"
}

function installing {
  echo -e "${GREEN}[~]Installing $1...${NEUTRAL}"
}

function success {
  echo -e "${GREEN}[+]$1 successfully installed${NEUTRAL}"
}

#
## Logic
#

function install_nvm {
  if [ -a $HOME/.nvm ]; then
    already nvm
  else
    installing nvm
    wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh | bash
    . ~/.nvm/nvm.sh
    success nvm
  fi
}

function install_node {
  node -v &>/dev/null
  if [ $? == "0" ]; then
    already node
  else
    installing node
    nvm install stable
    nvm use stable
    nvm alias default stable
    success node
  fi
}

function install_pm2 {
  pm2 &>/dev/null
  if [ $? == "1" ]; then
    already PM2
  else
    installing PM2
    npm install -g pm2@latest
    npm install -g yarn
    . ~/.nvm/nvm.sh
    pm2 update
    success PM2
  fi
}

function install_gridcontrol {
    installing Gridcontrol
    . ~/.nvm/nvm.sh
    pm2 install gridcontrol
    success Gridcontrol
}

#
## Main
#

install_nvm
install_node
install_pm2
install_gridcontrol

echo
echo -e "${GREEN}[+]Done.${NEUTRAL}"
