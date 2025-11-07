#!/usr/bin/env bash
set -euo pipefail

# =============================================================
# Stepwords Deployment Script (SPA + PHP API under Nginx)
#
# What this script does:
#  - Builds the frontend (Vite)
#  - Rsyncs dist/ and api/ to the server under a single root
#  - Ensures permissions for PHP to write submissions
#  - (Optional) Installs and starts PHP-FPM on the server
#  - (Optional) Writes an Nginx server config for SPA + /api alias
#  - Reloads Nginx and verifies the API
#
# Configure the variables below, then run: npm run deploy
# =============================================================

# ===== User Config =====
DOMAIN="stepwords.xyz"                 # Your domain (used for quick checks)
SERVER_HOST="user@server"              # e.g. ubuntu@1.2.3.4 or web@stepwords.xyz
REMOTE_ROOT="/var/www/stepwords"       # Should contain both dist/ and api/

# If true, script will attempt to install PHP-FPM and write Nginx config
APPLY_SERVER_SETUP=false                 # Set to true after first dry run

# Nginx config target: auto-detects between conf.d or sites-available
NGINX_CONF_NAME="stepwords.conf"

# ===== End User Config =====

info() { echo -e "\033[1;34m$*\033[0m"; }
warn() { echo -e "\033[1;33m$*\033[0m"; }
err()  { echo -e "\033[1;31m$*\033[0m"; }

REMOTE_BIN_CHECK="command -v"

detect_nginx_layout() {
  # Returns either /etc/nginx/conf.d or /etc/nginx/sites-available
  if ssh "$SERVER_HOST" 'grep -q sites-enabled /etc/nginx/nginx.conf 2>/dev/null && [ -d /etc/nginx/sites-available ]'; then
    echo "/etc/nginx/sites-available"
  else
    echo "/etc/nginx/conf.d"
  fi
}

detect_php_fpm_socket() {
  # Try common sockets; fallback to TCP 127.0.0.1:9000
  ssh "$SERVER_HOST" '(
    for s in \
      /run/php/php8.3-fpm.sock \
      /run/php/php8.2-fpm.sock \
      /run/php/php8.1-fpm.sock \
      /run/php/php7.4-fpm.sock \
      /run/php-fpm/www.sock; do
      if [ -S "$s" ]; then echo "$s"; exit 0; fi;
    done;
    echo "127.0.0.1:9000";
  )'
}

maybe_install_php_fpm() {
  ssh "$SERVER_HOST" 'set -e; \
    if ! command -v php >/dev/null 2>&1; then \
      if command -v apt-get >/dev/null 2>&1; then \
        sudo apt-get update && sudo apt-get install -y php-fpm php-cli curl; \
      elif command -v yum >/dev/null 2>&1; then \
        sudo yum install -y php-fpm php-cli curl || sudo dnf install -y php-fpm php-cli curl; \
      else \
        echo "Unknown package manager; install PHP-FPM manually"; \
      fi; \
    fi; \
    # Start/enable php-fpm if present
    (sudo systemctl enable --now php8.3-fpm || true); \
    (sudo systemctl enable --now php8.2-fpm || true); \
    (sudo systemctl enable --now php8.1-fpm || true); \
    (sudo systemctl enable --now php-fpm || true);
  '
}

write_nginx_config() {
  local nginx_dir="$1"  # conf.d or sites-available
  local fpm_target="$2" # socket or 127.0.0.1:9000

  info "Writing Nginx config to $nginx_dir/$NGINX_CONF_NAME"
  ssh "$SERVER_HOST" "sudo tee $nginx_dir/$NGINX_CONF_NAME >/dev/null" <<EOF
server {
    server_name ${DOMAIN} www.${DOMAIN};

    # SPA root
    root ${REMOTE_ROOT}/dist;
    index index.html;

    # Serve favicon at /favicon.ico with 200 (helps Google favicon fetchers using http://)
    location = /favicon.ico {
        default_type image/png;
        try_files /favicon.ico /icon-48.png =404;
    }

    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Map /api/* to PHP files in ${REMOTE_ROOT}/api
    location ^~ /api/ {
        alias ${REMOTE_ROOT}/api/;
        index submit-puzzle.php;

        location ~ \.php$ {
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME \$request_filename;
            fastcgi_pass unix:${fpm_target};
        }
    }

    listen 80;
}
EOF

  # If using sites-available layout, ensure symlink exists
  if [[ "$nginx_dir" == "/etc/nginx/sites-available" ]]; then
    ssh "$SERVER_HOST" "sudo ln -sf $nginx_dir/$NGINX_CONF_NAME /etc/nginx/sites-enabled/$NGINX_CONF_NAME"
  fi
}

# ---------------- Build ----------------
info "[1/7] Clean install and build"
npm ci
npm run build

# ---------------- Upload ----------------
info "[2/7] Rsync dist and api to server: ${SERVER_HOST}:${REMOTE_ROOT}"
rsync -avz --delete ./dist ./api "${SERVER_HOST}:${REMOTE_ROOT}/"

# Ensure API dir exists and set ownership/permissions
info "[3/7] Ensure API permissions (so PHP can write submissions)"
ssh "${SERVER_HOST}" "sudo mkdir -p ${REMOTE_ROOT}/api && \
  sudo chown -R www-data:www-data ${REMOTE_ROOT}/api || sudo chown -R nginx:nginx ${REMOTE_ROOT}/api; \
  sudo find ${REMOTE_ROOT}/api -type d -exec chmod 755 {} \; ; \
  sudo find ${REMOTE_ROOT}/api -type f -exec chmod 644 {} \;"

# ---------------- Server setup (optional) ----------------
if [[ "$APPLY_SERVER_SETUP" == "true" ]]; then
  info "[4/7] Install/enable PHP-FPM if needed"
  maybe_install_php_fpm

  info "Detecting PHP-FPM socket"
  FPM_SOCKET=$(detect_php_fpm_socket)
  warn "Using PHP-FPM at: $FPM_SOCKET"

  info "[5/7] Write Nginx config (SPA + /api alias)"
  NGINX_DIR=$(detect_nginx_layout)
  write_nginx_config "$NGINX_DIR" "$FPM_SOCKET"
else
  warn "[4-5/7] Skipping server setup (APPLY_SERVER_SETUP=false)."
  warn "Set APPLY_SERVER_SETUP=true in deploy.sh to write Nginx config and install PHP-FPM."
fi

# ---------------- Reload Nginx ----------------
info "[6/7] Test Nginx config and reload"
ssh "${SERVER_HOST}" "sudo nginx -t && sudo systemctl reload nginx"

# ---------------- Verify ----------------
info "[7/7] Quick API reachability check (expect 405)"
ssh "${SERVER_HOST}" "curl -s -o /dev/null -w '%{http_code}\\n' https://${DOMAIN}/api/submit-puzzle.php" || true

info "Test API POST"
ssh "${SERVER_HOST}" "curl -s -X POST -H 'Content-Type: application/json' -d '{\\"health\\":\\"ok\\"}' https://${DOMAIN}/api/submit-puzzle.php || true"

info "Deployment complete."

