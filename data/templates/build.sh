#!/usr/bin/env bash

node patients.js && \
  node incidencesFromPatients.js && \
  node countsFromPatients.js
