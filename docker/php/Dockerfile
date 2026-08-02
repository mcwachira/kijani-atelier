# Use official PHP 8.3 with FPM (FastCGI Process Manager)
FROM php:8.4-fpm

# Install system dependencies required by Laravel and PHP extensions
# git: version control (used by Composer sometimes)
# curl: making HTTP requests
# libpq-dev: PostgreSQL support
# libzip-dev: zip extension support
# zip/unzip: handling archives
# libonig-dev: required for mbstring
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpq-dev \
    libzip-dev \
    zip \
    unzip \
    libonig-dev \
    && rm -rf /var/lib/apt/lists/*

# Install required PHP extensions for Laravel
# pdo + pdo_pgsql + pgsql: database
# mbstring: string handling
# bcmath: math (important for payments)
# zip: file compression
# opcache: performance
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    pgsql \
    mbstring \
    bcmath \
    zip \
    opcache

# Install Redis extension via PECL
RUN pecl install redis && docker-php-ext-enable redis

# Copy Composer from official image (best practice)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy OPcache configuration
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache-custom.ini

# Fix permissions for Laravel storage/cache
RUN chown -R www-data:www-data /var/www

# Expose PHP-FPM port
EXPOSE 9000

# Start PHP-FPM
CMD ["php-fpm"]