#!/bin/bash

npm install

git submodule init && git submodule update
cp config/package.json modules/angular-split-pane/.
cd modules/angular-split-pane/
npm install
