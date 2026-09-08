FROM php:8.4-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    git \
    curl \
    libpq-dev \
    libzip-dev \
    zip \
    unzip \
    libonig-dev \
    && rm -rf /var/lib/apt/lists/*

# Remove Debian's default Nginx site
RUN rm -f /etc/nginx/sites-enabled/default

# PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    pgsql \
    mbstring \
    bcmath \
    zip \
    opcache

# Redis
RUN pecl install redis \
    && docker-php-ext-enable redis

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copy Laravel application
COPY apps/backend /var/www

# Install production dependencies
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction \
    --prefer-dist

# Production PHP configuration
COPY docker/php/opcache.ini \
    /usr/local/etc/php/conf.d/opcache-custom.ini

# Nginx
COPY docker/production/nginx.conf \
    /etc/nginx/conf.d/default.conf.template

# Supervisor
COPY docker/production/supervisord.conf \
    /etc/supervisor/conf.d/supervisord.conf

# Entrypoint
COPY docker/production/entrypoint.sh \
    /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

# Laravel permissions
RUN mkdir -p \
    /var/www/storage/framework/cache \
    /var/www/storage/framework/sessions \
    /var/www/storage/framework/views \
    /var/www/bootstrap/cache

RUN chown -R www-data:www-data \
    /var/www/storage \
    /var/www/bootstrap/cache

# Render will provide PORT at runtime
EXPOSE 10000

CMD ["/usr/local/bin/entrypoint.sh"]