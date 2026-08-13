#!/usr/bin/env powershell

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& node "$scriptDir\cli.js" @args
