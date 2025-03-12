#!/bin/bash

# Cria as tabelas necessárias para integração com Google Analytics
NODE_PATH=/home/m/code/speedfunnelsv2/meta-ads-analytics/backend/node_modules
node /home/m/code/speedfunnelsv2/meta-ads-analytics/backend/src/create-google-tables.js
