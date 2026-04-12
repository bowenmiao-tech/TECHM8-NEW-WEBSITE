CREATE TABLE stores (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  short_description VARCHAR(255),
  seo_title VARCHAR(255),
  seo_description VARCHAR(320),
  suburb VARCHAR(120),
  state VARCHAR(80),
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  postcode VARCHAR(20),
  phone VARCHAR(50),
  email VARCHAR(190),
  opening_hours TEXT,
  hero_heading VARCHAR(255),
  hero_text TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  contact_name VARCHAR(180),
  email VARCHAR(190),
  phone VARCHAR(50),
  website_url VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(180) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(120),
  model VARCHAR(180),
  category_id INT UNSIGNED,
  supplier_id INT UNSIGNED,
  short_description VARCHAR(255),
  description TEXT,
  condition_label VARCHAR(120),
  compatibility TEXT,
  cost_price DECIMAL(10, 2),
  wholesale_price DECIMAL(10, 2),
  retail_price DECIMAL(10, 2),
  compare_at_price DECIMAL(10, 2),
  image_url VARCHAR(500),
  supplier_image_url VARCHAR(500),
  supplier_product_url VARCHAR(500),
  stock_quantity INT NOT NULL DEFAULT 0,
  min_order_quantity INT NOT NULL DEFAULT 1,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_visible TINYINT(1) NOT NULL DEFAULT 1,
  seo_title VARCHAR(255),
  seo_description VARCHAR(320),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE product_images (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE product_store_inventory (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  store_id INT UNSIGNED NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  shelf_location VARCHAR(120),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_product_store (product_id, store_id),
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE price_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  source_name VARCHAR(180),
  source_url VARCHAR(500),
  old_cost_price DECIMAL(10, 2),
  new_cost_price DECIMAL(10, 2),
  old_wholesale_price DECIMAL(10, 2),
  new_wholesale_price DECIMAL(10, 2),
  old_retail_price DECIMAL(10, 2),
  new_retail_price DECIMAL(10, 2),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_price_history_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE repair_bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(40) NOT NULL UNIQUE,
  store_slug VARCHAR(120) NOT NULL,
  repair_category ENUM('phone', 'computer', 'tablet', 'gaming_console') NOT NULL,
  brand VARCHAR(120),
  device_model VARCHAR(180) NOT NULL,
  issue_description TEXT NOT NULL,
  preferred_date DATE NULL,
  preferred_time VARCHAR(60),
  customer_name VARCHAR(180) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(190) NOT NULL,
  preferred_contact_method ENUM('phone', 'email', 'sms') NOT NULL DEFAULT 'phone',
  status ENUM('new', 'contacted', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  ip_address VARCHAR(64),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_repair_bookings_store_status (store_slug, status),
  INDEX idx_repair_bookings_created_at (created_at)
);
