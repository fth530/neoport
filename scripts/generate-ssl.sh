#!/bin/bash

# SSL Certificate Generation Script for Development

echo "🔐 SSL sertifikaları oluşturuluyor..."

# Create SSL directory
mkdir -p nginx/ssl

# Generate private key
openssl genrsa -out nginx/ssl/nginx.key 2048

# Generate certificate signing request
openssl req -new -key nginx/ssl/nginx.key -out nginx/ssl/nginx.csr -subj "/C=TR/ST=Istanbul/L=Istanbul/O=NeoPort/OU=Development/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -days 365 -in nginx/ssl/nginx.csr -signkey nginx/ssl/nginx.key -out nginx/ssl/nginx.crt

# Set proper permissions
chmod 600 nginx/ssl/nginx.key
chmod 644 nginx/ssl/nginx.crt

# Clean up CSR
rm nginx/ssl/nginx.csr

echo "✅ SSL sertifikaları oluşturuldu:"
echo "   - nginx/ssl/nginx.crt"
echo "   - nginx/ssl/nginx.key"
echo ""
echo "⚠️  Bu sertifikalar sadece development için uygundur!"
echo "   Production için Let's Encrypt veya CA sertifikası kullanın."