-- ================================================================
-- FANCY NETWORK STORE — database.sql
-- Import ke database STORE di phpMyAdmin/MySQL
-- (database PLAYER/JPremium terpisah, tidak perlu diimport)
--
-- DOMAIN : https://fancynet.my.id
-- HOSTING: 208.84.103.117:25580
-- PLUGIN : http://MC_SERVER:12025 (port 12025)
-- ================================================================

CREATE TABLE IF NOT EXISTS site_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value MEDIUMTEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL, slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(100) DEFAULT '📦', color VARCHAR(20) DEFAULT 'orange',
  description TEXT, sort_order INT DEFAULT 0, is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store_products (
  id INT AUTO_INCREMENT PRIMARY KEY, category_id INT,
  name VARCHAR(200) NOT NULL, slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT, features JSON, price INT NOT NULL DEFAULT 0,
  original_price INT DEFAULT NULL, image_url VARCHAR(500),
  badge VARCHAR(50), badge_color VARCHAR(20) DEFAULT 'orange',
  reward_trigger VARCHAR(100) COMMENT 'product_id di config.yml plugin ShadowynAPI',
  purchase_limit INT DEFAULT 0,
  limit_scope ENUM('per_product','per_category','global') DEFAULT 'per_product',
  sort_order INT DEFAULT 0, is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES store_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(100) UNIQUE NOT NULL,
  player_username VARCHAR(100) NOT NULL, player_uuid VARCHAR(100), player_rank VARCHAR(50),
  product_id INT NOT NULL, product_name VARCHAR(200), reward_trigger VARCHAR(100),
  amount INT NOT NULL, discount_amount INT DEFAULT 0, redeem_code VARCHAR(50),
  payment_method VARCHAR(50) DEFAULT 'qris',
  payment_status ENUM('pending','paid','success','failed','expired','cancelled') DEFAULT 'pending',
  midtrans_transaction_id VARCHAR(200), midtrans_snap_token TEXT,
  plugin_notified TINYINT(1) DEFAULT 0, plugin_queued TINYINT(1) DEFAULT 0,
  plugin_response TEXT, notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_player (player_username), INDEX idx_status (payment_status),
  INDEX idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store_purchase_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_username VARCHAR(100) NOT NULL, product_id INT NOT NULL,
  category_id INT, order_id VARCHAR(100),
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pp (player_username, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store_admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL,
  email VARCHAR(200), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store_redeem_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type ENUM('percent','fixed') DEFAULT 'percent',
  discount_value INT NOT NULL DEFAULT 0, max_uses INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0, product_id INT DEFAULT NULL,
  min_price INT DEFAULT 0, expires_at DATETIME DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Leaderboard (dari plugin ShadowynAPI HTTP POST)
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  board_name VARCHAR(50) NOT NULL COMMENT 'balance | auraskills | votes',
  rank_pos INT NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  score BIGINT DEFAULT 0,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_board_rank (board_name, rank_pos),
  INDEX idx_board (board_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Support & Report
CREATE TABLE IF NOT EXISTS support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id VARCHAR(20) UNIQUE NOT NULL,
  type ENUM('banding','bug','report_player','lainnya') NOT NULL,
  player_username VARCHAR(100) NOT NULL,
  subject VARCHAR(200) NOT NULL, description TEXT NOT NULL,
  target_player VARCHAR(100), evidence_url VARCHAR(500),
  status ENUM('open','in_review','resolved','rejected') DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status), INDEX idx_player (player_username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default settings
INSERT IGNORE INTO site_settings (setting_key,setting_value) VALUES
('server_name','Fancy Network'),('server_ip','play.fancynet.my.id'),
('server_description','Economy Semi RPG Server terbaik di Indonesia!'),
('discord_url',''),('vote_url',''),('tiktok_url',''),('youtube_url',''),('whatsapp_url',''),
('hero_title','Selamat Datang di Fancy Network'),
('hero_subtitle','Economy Semi RPG — Rank, Weapon, SellWand & lebih banyak!'),
('announcement',''),('logo_text','Fancy Network'),('logo_icon','⚔️'),
('logo_url',''),('bg_desktop',''),('bg_mobile',''),
('footer_text','© 2024 Fancy Network. All rights reserved.'),
('mc_status_url','https://api.mcsrvstat.us/2/play.fancynet.my.id'),
('plugin_http_url',''),('plugin_server_key',''),
('webhook_transaction_url',''),('webhook_report_url','');

-- Default categories
INSERT IGNORE INTO store_categories (name,slug,icon,color,description,sort_order) VALUES
('Rank','rank','👑','orange','Rank eksklusif',1),('Weapon','weapon','⚔️','red','Senjata powerful',2),
('SellWand','sellwand','🪄','green','Jual item otomatis',3),
('AuraSkills','auraskills','✨','purple','Boost skill RPG',4),
('Crate Key','crate-key','🗝️','yellow','Kunci crate langka',5),('Kit','kit','🎒','blue','Starter kit',6);

-- ================================================================
-- ENDPOINT REFERENSI
-- Login player : GET  http://MC_SERVER:12025/api/check-player?name=Steve
-- Leaderboard  : POST https://fancynet.my.id/api/plugin/leaderboard
-- Webhook      : POST https://fancynet.my.id/api/orders/webhook (Midtrans)
-- Init DB      : GET  https://fancynet.my.id/api/init?secret=JWT_SECRET
-- ================================================================
