#!/bin/bash

# Script to run the same checks as the CI workflow locally
# Usage: ./scripts/check-workflow.sh

set -e

echo "🔍 Running CI workflow checks locally..."

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Checking TypeScript compilation..."
npm run build

echo "🧹 Running ESLint..."
npm run lint

echo "🎨 Checking code formatting..."
npm run format:check

echo "🧪 Running tests..."
npm run test:ci

echo "🔒 Running security audit..."
npm audit --audit-level=moderate

echo "✅ All checks passed! Your code is ready for CI." 