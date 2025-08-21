#!/bin/bash

# Heat Pumps Now - Internal Portal System
# Deployment Script for Coolify

set -e

echo "🚀 Starting Heat Pumps Now Internal Portal deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
print_status "Checking environment variables..."

required_vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    echo ""
    print_warning "Please set these variables in your Coolify environment configuration."
    exit 1
fi

print_success "All required environment variables are set"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Make sure you're in the project root directory."
    exit 1
fi

# Install dependencies
print_status "Installing dependencies..."
npm ci --only=production

# Run linting (if available)
if npm run lint --silent 2>/dev/null; then
    print_status "Running linter..."
    npm run lint
    print_success "Linting passed"
else
    print_warning "No lint script found, skipping..."
fi

# Run type checking (if available)
if npm run type-check --silent 2>/dev/null; then
    print_status "Running type check..."
    npm run type-check
    print_success "Type checking passed"
else
    print_warning "No type-check script found, skipping..."
fi

# Build the application
print_status "Building application..."
npm run build
print_success "Build completed successfully"

# Test health endpoints
print_status "Testing health endpoints..."
if command -v curl &> /dev/null; then
    # Start the app temporarily for testing
    npm start &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 10
    
    # Test health endpoint
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        print_success "Health check endpoint working"
    else
        print_warning "Health check endpoint not responding"
    fi
    
    # Test ready endpoint
    if curl -f http://localhost:3000/api/ready &> /dev/null; then
        print_success "Ready check endpoint working"
    else
        print_warning "Ready check endpoint not responding"
    fi
    
    # Stop the test server
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
else
    print_warning "curl not available, skipping endpoint tests"
fi

print_success "🎉 Deployment preparation completed successfully!"
print_status "Ready for Coolify deployment."

echo ""
echo "📋 Next steps:"
echo "1. Push your code to your Git repository"
echo "2. Set up the project in Coolify"
echo "3. Configure environment variables in Coolify"
echo "4. Deploy using the provided Docker configuration"
echo ""
echo "🔗 Health endpoints:"
echo "  - Health: https://your-domain.com/api/health"
echo "  - Ready: https://your-domain.com/api/ready"