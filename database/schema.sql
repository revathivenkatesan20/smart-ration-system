admins-- ============================================================
-- SMART RATION DISTRIBUTION SYSTEM - MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_ration_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_ration_db;

-- ============================================================
-- SHOPS TABLE
-- ============================================================
CREATE TABLE shops (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    shop_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    district VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    contact_number VARCHAR(15),
    manager_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    opening_time TIME DEFAULT '09:00:00',
    closing_time TIME DEFAULT '17:00:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- USERS (Ration Card Holders)
-- ============================================================
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ration_card_number VARCHAR(20) UNIQUE NOT NULL,
    head_of_family VARCHAR(100) NOT NULL,
    mobile_number VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100),
    address TEXT NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    district VARCHAR(50) NOT NULL,
    card_type ENUM('APL', 'BPL', 'AAY', 'PHH') NOT NULL DEFAULT 'APL',
    assigned_shop_id BIGINT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT TRUE,
    otp_code VARCHAR(6),
    otp_expiry TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_shop_id) REFERENCES shops(id) ON DELETE SET NULL
);

-- ============================================================
-- FAMILY MEMBERS
-- ============================================================
CREATE TABLE members (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    relation VARCHAR(50) NOT NULL,
    aadhaar_number VARCHAR(12),
    is_head BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- RATION ITEMS CATALOG
-- ============================================================
CREATE TABLE items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(20) UNIQUE NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_ta VARCHAR(100) NOT NULL,
    category ENUM('Grain', 'Pulse', 'Oil', 'Sugar', 'Kerosene', 'Other') NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    price_per_unit DECIMAL(10, 2) NOT NULL,
    subsidy_price DECIMAL(10, 2) NOT NULL,
    monthly_entitlement DECIMAL(10, 2) NOT NULL COMMENT 'Per family per month',
    is_active BOOLEAN DEFAULT TRUE,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- STOCK TABLE (Per Shop)
-- ============================================================
CREATE TABLE stock (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    quantity_available DECIMAL(10, 2) NOT NULL DEFAULT 0,
    quantity_reserved DECIMAL(10, 2) NOT NULL DEFAULT 0,
    threshold_min DECIMAL(10, 2) NOT NULL DEFAULT 50,
    last_restocked_at TIMESTAMP,
    last_restocked_quantity DECIMAL(10, 2),
    status ENUM('Available', 'Low', 'Out of Stock') GENERATED ALWAYS AS (
        CASE
            WHEN quantity_available <= 0 THEN 'Out of Stock'
            WHEN quantity_available <= threshold_min THEN 'Low'
            ELSE 'Available'
        END
    ) STORED,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_shop_item (shop_id, item_id),
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- ============================================================
-- TOKENS
-- ============================================================
CREATE TABLE tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    token_number VARCHAR(30) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    shop_id BIGINT NOT NULL,
    token_date DATE NOT NULL,
    time_slot_start TIME NOT NULL,
    time_slot_end TIME NOT NULL,
    status ENUM('Pending', 'Confirmed', 'Collected', 'Expired', 'Cancelled') DEFAULT 'Pending',
    payment_mode ENUM('Online', 'Cash') NOT NULL DEFAULT 'Cash',
    payment_status ENUM('Pending', 'Paid', 'Failed') DEFAULT 'Pending',
    total_amount DECIMAL(10, 2) DEFAULT 0,
    qr_code_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

-- ============================================================
-- TOKEN ITEMS (Items in a token)
-- ============================================================
CREATE TABLE token_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    token_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_ref VARCHAR(50) UNIQUE NOT NULL,
    token_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_mode ENUM('UPI', 'Card', 'Cash') NOT NULL,
    payment_gateway_ref VARCHAR(100),
    status ENUM('Success', 'Failed', 'Pending', 'Refunded') DEFAULT 'Pending',
    transaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (token_id) REFERENCES tokens(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- ADMINS
-- ============================================================
CREATE TABLE admins (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('SuperAdmin', 'ShopAdmin', 'DistrictAdmin') DEFAULT 'ShopAdmin',
    shop_id BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    token_id BIGINT,
    title_en VARCHAR(200) NOT NULL,
    title_ta VARCHAR(200),
    message_en TEXT NOT NULL,
    message_ta TEXT,
    type ENUM('Token', 'Stock', 'System', 'Payment') DEFAULT 'System',
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE SET NULL
);

-- ============================================================
-- AI DEMAND PREDICTIONS (stored for reference)
-- ============================================================
CREATE TABLE demand_predictions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    predicted_month DATE NOT NULL,
    predicted_quantity DECIMAL(10, 2) NOT NULL,
    confidence_score DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO shops (shop_code, name, address, pincode, district, latitude, longitude, contact_number, manager_name) VALUES
('SHOP001', 'Madurai Central Ration Shop', '14, Anna Nagar Main Road, Madurai', '625020', 'Madurai', 9.9252, 78.1198, '9876543210', 'Rajan Kumar'),
('SHOP002', 'Arappalayam Fair Price Shop', '7, Market Street, Arappalayam', '625016', 'Madurai', 9.9312, 78.1050, '9876543211', 'Selvi Devi'),
('SHOP003', 'Tallakulam Ration Center', '3, West Veli Street, Tallakulam', '625002', 'Madurai', 9.9195, 78.1298, '9876543212', 'Murugan S');

INSERT INTO items (item_code, name_en, name_ta, category, unit, price_per_unit, subsidy_price, monthly_entitlement) VALUES
('RICE001', 'Rice', 'அரிசி', 'Grain', 'kg', 37.00, 1.00, 10.00),
('WHEAT001', 'Wheat', 'கோதுமை', 'Grain', 'kg', 27.00, 2.00, 5.00),
('SUGAR001', 'Sugar', 'சர்க்கரை', 'Sugar', 'kg', 42.00, 13.50, 1.00),
('PALMOI001', 'Palm Oil', 'பாமாயில்', 'Oil', 'litre', 110.00, 25.00, 1.00),
('TOOR001', 'Toor Dal', 'துவரம் பருப்பு', 'Pulse', 'kg', 130.00, 30.00, 2.00),
('KERO001', 'Kerosene', 'மண்ணெண்ணெய்', 'Kerosene', 'litre', 65.00, 15.00, 3.00);

INSERT INTO stock (shop_id, item_id, quantity_available, threshold_min) VALUES
(1, 1, 500, 50), (1, 2, 200, 30), (1, 3, 80, 20), (1, 4, 60, 15), (1, 5, 30, 20), (1, 6, 100, 20),
(2, 1, 40, 50), (2, 2, 150, 30), (2, 3, 5, 20), (2, 4, 80, 15), (2, 5, 200, 20), (2, 6, 50, 20),
(3, 1, 300, 50), (3, 2, 0, 30), (3, 3, 100, 20), (3, 4, 20, 15), (3, 5, 90, 20), (3, 6, 75, 20);

INSERT INTO admins (username, password_hash, name, email, role) VALUES
('superadmin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhu2', 'Super Admin', 'admin@rationdept.gov.in', 'SuperAdmin');
-- Default password: admin@123
