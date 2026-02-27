-- ============================================================
-- Fund Allocation System V4 - MySQL Initialization Script
-- Database: fund_allocation
-- 架構原則：無 FK、依賴 PK + Index 保證效能
-- ============================================================

CREATE DATABASE IF NOT EXISTS fund_allocation
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fund_allocation;

-- ============================================================
-- 1. portfolios (取代原 account)
--    代操帳戶主表，一個 owner 可擁有多個 portfolio
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolios (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    owner_user_id   VARCHAR(64)     NOT NULL COMMENT '外部系統 User ID',
    name            VARCHAR(100)    NOT NULL COMMENT '代操名稱',
    available_funds DECIMAL(18, 4)  NOT NULL DEFAULT 0,
    total_invested  DECIMAL(18, 4)  NOT NULL DEFAULT 0,
    total_deposited DECIMAL(18, 4)  NOT NULL DEFAULT 0,
    realized_pnl    DECIMAL(18, 4)  NOT NULL DEFAULT 0,
    is_initialized  TINYINT(1)      NOT NULL DEFAULT 0,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_owner (owner_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='代操帳戶主表（多帳戶）';

-- ============================================================
-- 2. fund_ledger
--    資金異動明細
-- ============================================================
CREATE TABLE IF NOT EXISTS fund_ledger (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    portfolio_id    INT UNSIGNED    NOT NULL COMMENT '所屬代操帳戶',
    type            ENUM('INIT','DEPOSIT','WITHDRAW') NOT NULL,
    amount          DECIMAL(18, 4)  NOT NULL,
    note            VARCHAR(255)    NULL,
    trade_date      DATE            NOT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_portfolio (portfolio_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='資金異動明細帳';

-- ============================================================
-- 3. stock_master
--    台股上市/上櫃公司基礎清單
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_master (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    symbol      VARCHAR(10)     NOT NULL,
    name        VARCHAR(100)    NOT NULL,
    sector      VARCHAR(100)    NULL,
    market      ENUM('TWSE','TPEx') NOT NULL DEFAULT 'TWSE',
    is_active   TINYINT(1)      NOT NULL DEFAULT 1,
    synced_at   DATETIME        NULL,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_symbol (symbol),
    INDEX idx_name (name),
    FULLTEXT KEY ft_name_symbol (name, symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='台股上市上櫃基礎資料';

-- ============================================================
-- 4. transactions
--    買賣明細
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    portfolio_id    INT UNSIGNED    NOT NULL COMMENT '所屬代操帳戶',
    symbol          VARCHAR(10)     NOT NULL,
    action          ENUM('BUY','SELL') NOT NULL,
    price           DECIMAL(12, 4)  NOT NULL,
    quantity        INT UNSIGNED    NOT NULL,
    fee             DECIMAL(10, 4)  NOT NULL DEFAULT 0,
    total_amount    DECIMAL(18, 4)  NOT NULL,
    trade_date      DATE            NOT NULL,
    cost_basis      DECIMAL(18, 4)  NULL,
    pnl             DECIMAL(18, 4)  NULL,
    pnl_pct         DECIMAL(10, 4)  NULL,
    note            VARCHAR(255)    NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_portfolio (portfolio_id),
    INDEX idx_symbol (symbol),
    INDEX idx_trade_date (trade_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='買賣交易明細';

-- ============================================================
-- 5. positions
--    當前持股庫存（平均成本法）
-- ============================================================
CREATE TABLE IF NOT EXISTS positions (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    portfolio_id    INT UNSIGNED    NOT NULL COMMENT '所屬代操帳戶',
    symbol          VARCHAR(10)     NOT NULL,
    quantity        INT UNSIGNED    NOT NULL DEFAULT 0,
    avg_cost        DECIMAL(12, 4)  NOT NULL DEFAULT 0,
    total_cost      DECIMAL(18, 4)  NOT NULL DEFAULT 0,
    first_buy_date  DATE            NULL,
    last_updated    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX idx_portfolio_symbol (portfolio_id, symbol),
    INDEX idx_symbol (symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='當前持股庫存（平均成本法）';

-- ============================================================
-- 6. fifo_lots
--    買入批次明細，供 FIFO 損益計算
-- ============================================================
CREATE TABLE IF NOT EXISTS fifo_lots (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    portfolio_id    INT UNSIGNED    NOT NULL COMMENT '所屬代操帳戶',
    symbol          VARCHAR(10)     NOT NULL,
    transaction_id  INT UNSIGNED    NOT NULL,
    price           DECIMAL(12, 4)  NOT NULL,
    original_qty    INT UNSIGNED    NOT NULL,
    remaining_qty   INT UNSIGNED    NOT NULL,
    trade_date      DATE            NOT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_portfolio (portfolio_id),
    INDEX idx_fifo_symbol (symbol, trade_date),
    INDEX idx_transaction (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='FIFO 買入批次庫存';

-- ============================================================
-- 完成
-- ============================================================
SELECT 'fund_allocation V4 database initialized successfully.' AS status;
