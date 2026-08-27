CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS players (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  facebook_name VARCHAR(191) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS freeplay_spins (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_id BIGINT UNSIGNED NOT NULL,
  game_id VARCHAR(60) NOT NULL,
  prize VARCHAR(191) NOT NULL,
  claim_code VARCHAR(60) NOT NULL,
  spin_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(player_id,spin_date),
  CONSTRAINT fk_free_player FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS deposit_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(191) NOT NULL,
  token VARCHAR(191) NOT NULL UNIQUE,
  wheel_id VARCHAR(60) NOT NULL DEFAULT 'deposit',
  prizes LONGTEXT NOT NULL,
  status ENUM('pending','spun','expired','cancelled','awarded') NOT NULL DEFAULT 'pending',
  result VARCHAR(191) NULL,
  claim_code VARCHAR(60) NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  spun_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS live_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source ENUM('real','manual') NOT NULL DEFAULT 'manual',
  winner_name VARCHAR(191) NOT NULL,
  prize VARCHAR(191) NOT NULL,
  frequency TINYINT UNSIGNED NOT NULL DEFAULT 1,
  top_rank TINYINT UNSIGNED NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO settings(setting_key,setting_value) VALUES
('freeplay_games','{"os2":{"name":"OS2","colors":["#ef4a90","#7141d8","#ffb834"],"prizes":[{"label":"FREEPLAY","amount":5,"weight":60,"color":"#ef4a90"},{"label":"FREEPLAY","amount":10,"weight":30,"color":"#7141d8"},{"label":"FREEPLAY","amount":20,"weight":10,"color":"#ffb834"}]},"moolah":{"name":"MOOLAH","colors":["#13bc8b","#f8ad2f","#7048d9"],"prizes":[{"label":"FREEPLAY","amount":5,"weight":60,"color":"#13bc8b"},{"label":"FREEPLAY","amount":10,"weight":30,"color":"#f8ad2f"},{"label":"FREEPLAY","amount":20,"weight":10,"color":"#7048d9"}]}}'),
('deposit_wheels','{"deposit":{"name":"DEPOSIT","colors":["#ef4a90","#7141d8"],"prizes":[{"label":"FREEPLAY","amount":10,"weight":95,"color":"#ef4a90"},{"label":"","amount":10,"weight":5,"color":"#7141d8"},{"label":"","amount":99,"weight":0,"color":"#ef4a90"},{"label":"","amount":299,"weight":0,"color":"#7141d8"}]}}'),
('offers','{"os2":{"badge":"HOT OFFER","headline":"UP TO 150% BONUS","description":"Deposit $10+ to unlock more rewards."},"moolah":{"badge":"HOT OFFER","headline":"UP TO 150% BONUS","description":"Deposit $10+ to unlock more rewards."}}');
