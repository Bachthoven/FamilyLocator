#!/bin/bash

echo "Starting FamilyLocator Mobile Development Environment..."
echo "========================================"

# Function to kill all child processes on exit
cleanup() {
    echo "\nShutting down servers..."
    pkill -P $$
    exit 0
}

# Set up cleanup on script exit
trap cleanup INT TERM EXIT

# Start Express backend server on port 5000
echo "Starting Express backend on port 5000..."
NODE_ENV=development tsx server/index.ts &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
sleep 3

# Check if backend is responding
curl -s http://localhost:5000/api/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Backend is running on http://localhost:5000"
else
    echo "⚠ Backend may not be ready yet"
fi

# Start Expo development server
echo ""
echo "Starting Expo development server..."
echo "========================================"
npx expo start --clear

# Wait for all background processes
wait