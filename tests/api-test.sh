#!/usr/bin/env bash

# ==============================================================================
# Comprehensive API Verification Script
# Tests health check, CRUD operations, validations, and error handling through Nginx
# ==============================================================================

set -e

BASE_URL="${1:-http://localhost}"
PASSED=0
FAILED=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_step() {
  echo -e "\n${BLUE}==>${NC} ${1}"
}

assert_status() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" -eq "$expected" ]; then
    echo -e "  [${GREEN}PASS${NC}] ${test_name} (HTTP ${actual})"
    PASSED=$((PASSED + 1))
  else
    echo -e "  [${RED}FAIL${NC}] ${test_name} - Expected HTTP ${expected}, got ${actual}"
    FAILED=$((FAILED + 1))
  fi
}

echo -e "${YELLOW}======================================================${NC}"
echo -e "${YELLOW}  Running DevOps API Integration Tests against: ${BASE_URL}${NC}"
echo -e "${YELLOW}======================================================${NC}"

# 1. Health Check
log_step "Test 1: Health Check Endpoint (GET /health)"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/health")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')
echo "Response Body: ${HEALTH_BODY}"
assert_status "GET /health responds with 200" 200 "$HEALTH_CODE"

# 2. Validation Error Test (Missing Title)
log_step "Test 2: Validation Error on Task Creation (POST /api/tasks with empty title)"
INVALID_CREATE_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{"description": "Task without title"}')
INVALID_CREATE_CODE=$(echo "$INVALID_CREATE_RESP" | tail -n1)
INVALID_CREATE_BODY=$(echo "$INVALID_CREATE_RESP" | sed '$d')
echo "Response Body: ${INVALID_CREATE_BODY}"
assert_status "POST /api/tasks without title returns 400" 400 "$INVALID_CREATE_CODE"

# 3. Create Valid Task
log_step "Test 3: Create New Task (POST /api/tasks)"
CREATE_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Configure Nginx Reverse Proxy",
    "description": "Ensure proxy_pass and security headers are working correctly",
    "priority": "high",
    "status": "in-progress"
  }')
CREATE_CODE=$(echo "$CREATE_RESP" | tail -n1)
CREATE_BODY=$(echo "$CREATE_RESP" | sed '$d')
echo "Response Body: ${CREATE_BODY}"
assert_status "POST /api/tasks returns 201 Created" 201 "$CREATE_CODE"

# Extract Task ID using python/node or grep/sed
TASK_ID=$(echo "$CREATE_BODY" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
if [ -z "$TASK_ID" ]; then
  # Fallback extraction
  TASK_ID=$(echo "$CREATE_BODY" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
fi
echo "Extracted Task ID: ${TASK_ID}"

# 4. Get All Tasks
log_step "Test 4: Get All Tasks (GET /api/tasks)"
GET_ALL_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/tasks")
GET_ALL_CODE=$(echo "$GET_ALL_RESP" | tail -n1)
GET_ALL_BODY=$(echo "$GET_ALL_RESP" | sed '$d')
echo "Response Body: ${GET_ALL_BODY}"
assert_status "GET /api/tasks returns 200 OK" 200 "$GET_ALL_CODE"

# 5. Get Task by ID
log_step "Test 5: Get Task by ID (GET /api/tasks/${TASK_ID})"
GET_ONE_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/tasks/${TASK_ID}")
GET_ONE_CODE=$(echo "$GET_ONE_RESP" | tail -n1)
GET_ONE_BODY=$(echo "$GET_ONE_RESP" | sed '$d')
echo "Response Body: ${GET_ONE_BODY}"
assert_status "GET /api/tasks/:id returns 200 OK" 200 "$GET_ONE_CODE"

# 6. Invalid ObjectId format test
log_step "Test 6: Invalid ObjectId Format (GET /api/tasks/invalid-id-123)"
INVALID_ID_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/tasks/invalid-id-123")
INVALID_ID_CODE=$(echo "$INVALID_ID_RESP" | tail -n1)
INVALID_ID_BODY=$(echo "$INVALID_ID_RESP" | sed '$d')
echo "Response Body: ${INVALID_ID_BODY}"
assert_status "GET with malformed ID returns 400" 400 "$INVALID_ID_CODE"

# 7. Non-existent Task ID test
log_step "Test 7: Non-existent Valid ObjectId (GET /api/tasks/507f1f77bcf86cd799439011)"
NOT_FOUND_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/tasks/507f1f77bcf86cd799439011")
NOT_FOUND_CODE=$(echo "$NOT_FOUND_RESP" | tail -n1)
NOT_FOUND_BODY=$(echo "$NOT_FOUND_RESP" | sed '$d')
echo "Response Body: ${NOT_FOUND_BODY}"
assert_status "GET non-existent ID returns 404" 404 "$NOT_FOUND_CODE"

# 8. Update Task
log_step "Test 8: Update Task Status to 'completed' (PUT /api/tasks/${TASK_ID})"
UPDATE_RESP=$(curl -s -w "\n%{http_code}" -X PUT "${BASE_URL}/api/tasks/${TASK_ID}" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "priority": "medium"}')
UPDATE_CODE=$(echo "$UPDATE_RESP" | tail -n1)
UPDATE_BODY=$(echo "$UPDATE_RESP" | sed '$d')
echo "Response Body: ${UPDATE_BODY}"
assert_status "PUT /api/tasks/:id returns 200 OK" 200 "$UPDATE_CODE"

# 9. Delete Task
log_step "Test 9: Delete Task (DELETE /api/tasks/${TASK_ID})"
DELETE_RESP=$(curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}/api/tasks/${TASK_ID}")
DELETE_CODE=$(echo "$DELETE_RESP" | tail -n1)
DELETE_BODY=$(echo "$DELETE_RESP" | sed '$d')
echo "Response Body: ${DELETE_BODY}"
assert_status "DELETE /api/tasks/:id returns 200 OK" 200 "$DELETE_CODE"

# 10. Verify Deletion
log_step "Test 10: Verify Task Is Gone (GET /api/tasks/${TASK_ID})"
VERIFY_DELETE_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/tasks/${TASK_ID}")
VERIFY_DELETE_CODE=$(echo "$VERIFY_DELETE_RESP" | tail -n1)
VERIFY_DELETE_BODY=$(echo "$VERIFY_DELETE_RESP" | sed '$d')
echo "Response Body: ${VERIFY_DELETE_BODY}"
assert_status "GET deleted task returns 404 Not Found" 404 "$VERIFY_DELETE_CODE"

# Summary
echo -e "\n${YELLOW}======================================================${NC}"
echo -e "Test Summary: ${GREEN}${PASSED} Passed${NC}, ${RED}${FAILED} Failed${NC}"
echo -e "${YELLOW}======================================================${NC}"

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}All tests passed successfully!${NC}\n"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}\n"
  exit 1
fi

