-- ============================================================
-- Fund Allocation System - MySQL Initialization Script
-- Database: fund_allocation
-- ============================================================

CREATE DATABASE IF NOT EXISTS fund_allocation
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fund_allocation;

-- ============================================================
-- 1. account
--    單一帳戶主表，快照當前可用資金（由應用層計算更新）
-- ============================================================
CREATE TABLE IF NOT EXISTS account (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    available_funds DECIMAL(18, 4)  NOT NULL DEFAULT 0,   -- 即時可用資金（快照）
    total_invested  DECIMAL(18, 4)  NOT NULL DEFAULT 0,   -- 目前持倉總成本
    total_deposited DECIMAL(18, 4)  NOT NULL DEFAULT 0,   -- 歷次入金加總
    realized_pnl    DECIMAL(18, 4)  NOT NULL DEFAULT 0,   -- 累計已實現損益
    is_initialized  TINYINT(1)      NOT NULL DEFAULT 0,   -- 是否已設定初始資金
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='帳戶主表（系統只維護一筆紀錄）';

-- 預插入唯一帳戶列
INSERT INTO account (id, available_funds, total_invested, total_deposited, realized_pnl, is_initialized)
VALUES (1, 0, 0, 0, 0, 0);

-- ============================================================
-- 2. fund_ledger
--    資金異動明細（不可刪除、不可修改）
-- ============================================================
CREATE TABLE IF NOT EXISTS fund_ledger (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    type        ENUM('INIT','DEPOSIT','WITHDRAW') NOT NULL,
    amount      DECIMAL(18, 4)  NOT NULL,                 -- 正數為入金，負數為出金
    note        VARCHAR(255)    NULL,
    trade_date  DATE            NOT NULL,                  -- 資金生效日
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='資金異動明細帳（初始設定 + 歷次增資）';

-- ============================================================
-- 3. stock_master
--    台股上市/上櫃公司基礎清單
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_master (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    symbol      VARCHAR(10)     NOT NULL,                  -- 股票代號，e.g. 2330
    name        VARCHAR(100)    NOT NULL,                  -- 公司名稱，e.g. 台積電
    sector      VARCHAR(100)    NULL,                      -- 產業別
    market      ENUM('TWSE','TPEx') NOT NULL DEFAULT 'TWSE', -- 上市/上櫃
    is_active   TINYINT(1)      NOT NULL DEFAULT 1,
    synced_at   DATETIME        NULL,                      -- 最後同步時間
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
--    買賣明細（每一筆交易單獨一列）
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    symbol          VARCHAR(10)     NOT NULL,
    action          ENUM('BUY','SELL') NOT NULL,
    price           DECIMAL(12, 4)  NOT NULL,              -- 成交均價
    quantity        INT UNSIGNED    NOT NULL,               -- 股數
    fee             DECIMAL(10, 4)  NOT NULL DEFAULT 0,    -- 手續費（含稅）
    total_amount    DECIMAL(18, 4)  NOT NULL,              -- 買入：price*qty+fee  賣出：price*qty-fee
    trade_date      DATE            NOT NULL,              -- 交易日期
    -- 以下欄位僅 SELL 時填入
    cost_basis      DECIMAL(18, 4)  NULL,                  -- FIFO 成本（賣出時）
    pnl             DECIMAL(18, 4)  NULL,                  -- 已實現損益（賣出時）
    pnl_pct         DECIMAL(10, 4)  NULL,                  -- 損益率 % （賣出時）
    note            VARCHAR(255)    NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_symbol (symbol),
    INDEX idx_trade_date (trade_date),
    CONSTRAINT fk_tx_symbol FOREIGN KEY (symbol)
        REFERENCES stock_master (symbol)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='買賣交易明細';

-- ============================================================
-- 5. positions
--    當前持股庫存（平均成本法）
-- ============================================================
CREATE TABLE IF NOT EXISTS positions (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    symbol          VARCHAR(10)     NOT NULL,
    quantity        INT UNSIGNED    NOT NULL DEFAULT 0,    -- 庫存股數
    avg_cost        DECIMAL(12, 4)  NOT NULL DEFAULT 0,   -- 平均成本（每股）
    total_cost      DECIMAL(18, 4)  NOT NULL DEFAULT 0,   -- 總持倉成本
    first_buy_date  DATE            NULL,                  -- 首次買入日
    last_updated    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_position_symbol (symbol),
    CONSTRAINT fk_pos_symbol FOREIGN KEY (symbol)
        REFERENCES stock_master (symbol)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='當前持股庫存（平均成本法）';

-- ============================================================
-- 6. fifo_lots
--    買入批次明細，供 FIFO 損益計算（賣出時按此扣減）
-- ============================================================
CREATE TABLE IF NOT EXISTS fifo_lots (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    symbol          VARCHAR(10)     NOT NULL,
    transaction_id  INT UNSIGNED    NOT NULL,              -- 對應的 BUY 交易
    price           DECIMAL(12, 4)  NOT NULL,              -- 買入成本價
    original_qty    INT UNSIGNED    NOT NULL,              -- 原始買入股數
    remaining_qty   INT UNSIGNED    NOT NULL,              -- 剩餘未賣股數
    trade_date      DATE            NOT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_fifo_symbol (symbol, trade_date),
    CONSTRAINT fk_fifo_tx FOREIGN KEY (transaction_id)
        REFERENCES transactions (id),
    CONSTRAINT fk_fifo_symbol FOREIGN KEY (symbol)
        REFERENCES stock_master (symbol)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='FIFO 買入批次庫存（供賣出時計算成本）';

-- ============================================================
-- 完成
-- ============================================================
SELECT 'fund_allocation database initialized successfully.' AS status;
