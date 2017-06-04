#!/usr/bin/env bash

# Architecture diagram
cd ..
grunt

# Sequence diagrams
cd docs/architecture/plantuml
plantuml ./*.plantuml -tsvg

# PDF
cd ../..
markdown-pdf -f A4 \
    --css-path ./resources/markdown-to-pdf.css \
    -o HACKING.pdf HACKING.md;
