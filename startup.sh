#!/bin/bash

# Node.jsのバージョン確認
echo "Node.js version:"
node --version

# npmのバージョン確認
echo "npm version:"
npm --version

# 作業ディレクトリを表示
echo "Working directory:"
pwd

# ファイル一覧を表示
echo "Files:"
ls -la

# Next.jsアプリを起動
echo "Starting Next.js application..."
npm start
