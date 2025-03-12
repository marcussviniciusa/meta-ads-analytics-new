#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print banner
echo -e "${YELLOW}"
echo "====================================================="
echo "        Meta Ads Analytics Test Runner"
echo "====================================================="
echo -e "${NC}"

# Check for arguments
run_backend=true
run_frontend=true

if [ "$1" == "backend" ]; then
  run_frontend=false
elif [ "$1" == "frontend" ]; then
  run_backend=false
fi

# Install dependencies if needed
echo -e "${YELLOW}Checking dependencies...${NC}"

# Run backend tests
if [ "$run_backend" = true ]; then
  echo -e "${YELLOW}\nRunning backend tests...${NC}"
  cd backend
  
  # Check if node_modules exists
  if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
  fi
  
  # Install axios-mock-adapter if not already installed
  if ! grep -q "axios-mock-adapter" package.json; then
    echo "Installing axios-mock-adapter for testing..."
    npm install --save-dev axios-mock-adapter
  fi
  
  # Run the tests
  npm test
  
  # Store result
  BACKEND_RESULT=$?
  
  cd ..
  
  if [ $BACKEND_RESULT -eq 0 ]; then
    echo -e "${GREEN}Backend tests completed successfully!${NC}"
  else
    echo -e "${RED}Backend tests failed!${NC}"
  fi
fi

# Run frontend tests
if [ "$run_frontend" = true ]; then
  echo -e "${YELLOW}\nRunning frontend tests...${NC}"
  cd frontend
  
  # Check if node_modules exists
  if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
  fi
  
  # Run the tests
  CI=true npm test
  
  # Store result
  FRONTEND_RESULT=$?
  
  cd ..
  
  if [ $FRONTEND_RESULT -eq 0 ]; then
    echo -e "${GREEN}Frontend tests completed successfully!${NC}"
  else
    echo -e "${RED}Frontend tests failed!${NC}"
  fi
fi

# Print summary
echo -e "${YELLOW}\nTest Summary:${NC}"

if [ "$run_backend" = true ]; then
  if [ $BACKEND_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Backend tests: PASSED${NC}"
  else
    echo -e "${RED}✗ Backend tests: FAILED${NC}"
  fi
fi

if [ "$run_frontend" = true ]; then
  if [ $FRONTEND_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend tests: PASSED${NC}"
  else
    echo -e "${RED}✗ Frontend tests: FAILED${NC}"
  fi
fi

# Final message
if [ "$run_backend" = true ] && [ "$run_frontend" = true ]; then
  if [ $BACKEND_RESULT -eq 0 ] && [ $FRONTEND_RESULT -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed successfully!${NC}"
  else
    echo -e "\n${RED}Some tests failed. Please check the logs above for details.${NC}"
    exit 1
  fi
elif [ "$run_backend" = true ] && [ $BACKEND_RESULT -ne 0 ]; then
  exit 1
elif [ "$run_frontend" = true ] && [ $FRONTEND_RESULT -ne 0 ]; then
  exit 1
fi

exit 0
