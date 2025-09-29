#!/bin/bash

# Create certs directory
mkdir -p /etc/nginx/certs

# Generate self-signed certificate for local development
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/key.pem \
    -out /etc/nginx/certs/cert.pem \
    -subj "/C=US/ST=State/L=City/O=ft_transcendence/OU=Dev/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

# Set proper permissions
chmod 600 /etc/nginx/certs/key.pem
chmod 644 /etc/nginx/certs/cert.pem

echo "Self-signed certificates generated for local development"