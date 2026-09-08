#!/bin/sh
set -e

PORT="${PORT:-10000}"

sed "s/__PORT__/${PORT}/" \
    /etc/nginx/conf.d/default.conf.template \
    > /etc/nginx/conf.d/default.conf

rm -f /etc/nginx/conf.d/default.conf.template

cd /var/www

echo "Caching Laravel configuration..."
php artisan config:cache

echo "Caching Laravel routes..."
php artisan route:cache

echo "Caching Laravel views..."
php artisan view:cache

echo "Starting Supervisor..."
exec /usr/bin/supervisord \
    -c /etc/supervisor/conf.d/supervisord.conf