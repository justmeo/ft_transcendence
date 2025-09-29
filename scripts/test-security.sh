#!/bin/bash
# Security Test Script for ft_transcendence

echo "🔒 ft_transcendence Security Test"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

HOST=${1:-localhost}
PORT=${2:-443}

echo "Testing host: $HOST:$PORT"
echo ""

# Test 1: HTTP to HTTPS redirect
echo "1. Testing HTTP to HTTPS redirect..."
HTTP_RESPONSE=$(curl -s -I -L http://$HOST/ 2>/dev/null | head -n 1)
if [[ $HTTP_RESPONSE == *"200"* ]]; then
    echo -e "${GREEN}✓ HTTP redirect working${NC}"
else
    echo -e "${RED}✗ HTTP redirect failed${NC}"
fi

# Test 2: Security Headers
echo ""
echo "2. Testing security headers..."

# Get headers from HTTPS endpoint
HEADERS=$(curl -s -I -k https://$HOST/ 2>/dev/null)

# Check individual headers
check_header() {
    local header_name=$1
    local header_value=$2
    
    if echo "$HEADERS" | grep -qi "$header_name"; then
        echo -e "${GREEN}✓ $header_name header present${NC}"
        return 0
    else
        echo -e "${RED}✗ $header_name header missing${NC}"
        return 1
    fi
}

check_header "Strict-Transport-Security"
check_header "X-Content-Type-Options"
check_header "X-Frame-Options"
check_header "Content-Security-Policy"
check_header "Referrer-Policy"

# Test 3: API Security
echo ""
echo "3. Testing API security..."

# Test API health endpoint
API_RESPONSE=$(curl -s -k https://$HOST/api/health 2>/dev/null)
if echo "$API_RESPONSE" | jq -e '.security.https' >/dev/null 2>&1; then
    echo -e "${GREEN}✓ API security configuration active${NC}"
else
    echo -e "${RED}✗ API security configuration issue${NC}"
fi

# Test rate limiting (basic test)
echo ""
echo "4. Testing rate limiting..."
RATE_TEST_COUNT=0
for i in {1..10}; do
    RESPONSE=$(curl -s -k -w "%{http_code}" https://$HOST/api/health 2>/dev/null | tail -n1)
    if [ "$RESPONSE" = "200" ]; then
        ((RATE_TEST_COUNT++))
    fi
done

if [ $RATE_TEST_COUNT -eq 10 ]; then
    echo -e "${GREEN}✓ Rate limiting allows normal requests${NC}"
else
    echo -e "${YELLOW}⚠ Rate limiting may be too restrictive${NC}"
fi

# Test 5: API Schema Validation
echo ""
echo "5. Testing API schema validation..."
INVALID_RESPONSE=$(curl -s -k -X POST -H "Content-Type: application/json" -d '{"invalid": "data"}' https://$HOST/api/users/register 2>/dev/null)
if echo "$INVALID_RESPONSE" | jq -e '.error' >/dev/null 2>&1; then
    echo -e "${GREEN}✓ API schema validation working${NC}"
else
    echo -e "${RED}✗ API schema validation issue${NC}"
fi

echo ""
echo "🔒 Security test complete!"
echo ""
echo "💡 Tips:"
echo "   - All HTTP requests should redirect to HTTPS"
echo "   - Security headers should be present on all responses"
echo "   - Rate limiting should prevent abuse"
echo "   - API should validate all inputs"