#!/bin/bash
# =============================================================================
# OrbitPayroll Demo Environment Setup Script
# =============================================================================
# This script helps set up the demo environment for hackathon judging.
#
# Usage:
#   ./scripts/setup-demo.sh [command]
#
# Commands:
#   seed      - Seed demo data to database
#   verify    - Verify demo environment is working
#   reset     - Reset and re-seed demo data
#   status    - Check status of all components
#   help      - Show this help message
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="${FRONTEND_URL:-https://orbitpayroll.vercel.app}"
API_URL="${API_URL:-https://orbitpayroll-api.railway.app}"
TREASURY_ADDRESS="0xA6f85Ad3CC0E251624F066052172e76e6edF2380"
MNEE_ADDRESS="0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"

# Helper functions
print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if a URL is accessible
check_url() {
    local url=$1
    local name=$2
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|301\|302"; then
        print_success "$name is accessible"
        return 0
    else
        print_error "$name is not accessible"
        return 1
    fi
}

# Seed demo data
cmd_seed() {
    print_header "Seeding Demo Data"
    
    print_info "Running demo seed script..."
    npm run demo:seed
    
    print_success "Demo data seeded successfully!"
    echo ""
    echo "Demo organization created:"
    echo "  • Name: Orbit Demo Corp"
    echo "  • Treasury: $TREASURY_ADDRESS"
    echo "  • Contractors: 5 active"
    echo "  • Payroll history: 3 executed, 1 pending"
}

# Verify demo environment
cmd_verify() {
    print_header "Verifying Demo Environment"
    
    local all_ok=true
    
    # Check frontend
    echo "Checking frontend..."
    if ! check_url "$FRONTEND_URL" "Frontend"; then
        all_ok=false
    fi
    
    # Check API health
    echo ""
    echo "Checking API..."
    if ! check_url "$API_URL/health" "API Health"; then
        all_ok=false
    fi
    
    # Check API response
    echo ""
    echo "Checking API response..."
    local health_response=$(curl -s "$API_URL/health" 2>/dev/null)
    if echo "$health_response" | grep -q '"status":"healthy"'; then
        print_success "API is healthy"
        echo "  Response: $health_response"
    else
        print_error "API health check failed"
        all_ok=false
    fi
    
    # Check smart contract on Etherscan
    echo ""
    echo "Checking smart contract..."
    if check_url "https://sepolia.etherscan.io/address/$TREASURY_ADDRESS" "Treasury Contract"; then
        print_info "View contract: https://sepolia.etherscan.io/address/$TREASURY_ADDRESS"
    fi
    
    echo ""
    if $all_ok; then
        print_success "All components are operational!"
    else
        print_error "Some components have issues. Please check the logs."
        exit 1
    fi
}

# Reset demo data
cmd_reset() {
    print_header "Resetting Demo Environment"
    
    print_warning "This will delete all existing data and re-seed the demo."
    read -p "Are you sure? (y/N) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Running database migrations..."
        npm run db:migrate:deploy -w @orbitpayroll/database
        
        print_info "Seeding demo data..."
        npm run demo:seed
        
        print_success "Demo environment reset successfully!"
    else
        print_info "Reset cancelled."
    fi
}

# Check status of all components
cmd_status() {
    print_header "Demo Environment Status"
    
    echo "Component URLs:"
    echo "  Frontend:  $FRONTEND_URL"
    echo "  API:       $API_URL"
    echo "  Treasury:  $TREASURY_ADDRESS"
    echo "  MNEE:      $MNEE_ADDRESS"
    echo ""
    
    echo "Checking components..."
    echo ""
    
    # Frontend status
    echo -n "Frontend: "
    if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200"; then
        echo -e "${GREEN}ONLINE${NC}"
    else
        echo -e "${RED}OFFLINE${NC}"
    fi
    
    # API status
    echo -n "API:      "
    local api_status=$(curl -s "$API_URL/health" 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$api_status" = "healthy" ]; then
        echo -e "${GREEN}HEALTHY${NC}"
    else
        echo -e "${RED}UNHEALTHY${NC}"
    fi
    
    # Database status (from API health)
    echo -n "Database: "
    local db_status=$(curl -s "$API_URL/health" 2>/dev/null | grep -o '"database":{"status":"[^"]*"' | cut -d'"' -f6)
    if [ "$db_status" = "ok" ]; then
        echo -e "${GREEN}CONNECTED${NC}"
    else
        echo -e "${YELLOW}UNKNOWN${NC}"
    fi
    
    echo ""
    echo "Etherscan Links:"
    echo "  Treasury: https://sepolia.etherscan.io/address/$TREASURY_ADDRESS"
    echo "  MNEE:     https://sepolia.etherscan.io/address/$MNEE_ADDRESS"
}

# Show help
cmd_help() {
    echo "OrbitPayroll Demo Environment Setup"
    echo ""
    echo "Usage: ./scripts/setup-demo.sh [command]"
    echo ""
    echo "Commands:"
    echo "  seed      Seed demo data to database"
    echo "  verify    Verify demo environment is working"
    echo "  reset     Reset and re-seed demo data"
    echo "  status    Check status of all components"
    echo "  help      Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  FRONTEND_URL  Frontend URL (default: https://orbitpayroll.vercel.app)"
    echo "  API_URL       API URL (default: https://orbitpayroll-api.railway.app)"
    echo ""
    echo "Examples:"
    echo "  ./scripts/setup-demo.sh seed"
    echo "  ./scripts/setup-demo.sh verify"
    echo "  API_URL=http://localhost:3001 ./scripts/setup-demo.sh status"
}

# Main
case "${1:-help}" in
    seed)
        cmd_seed
        ;;
    verify)
        cmd_verify
        ;;
    reset)
        cmd_reset
        ;;
    status)
        cmd_status
        ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        cmd_help
        exit 1
        ;;
esac
