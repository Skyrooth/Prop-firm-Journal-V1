@echo off
title Prop Journal
cd /d "%~dp0"
start "" http://localhost:5599
node server.js
