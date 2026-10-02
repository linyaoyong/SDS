-- Campus Trade Platform — Database Init Script
-- ============================================

DROP DATABASE IF EXISTS db_auth;
DROP DATABASE IF EXISTS db_product;
DROP DATABASE IF EXISTS db_order;
DROP DATABASE IF EXISTS db_message;

CREATE DATABASE db_auth DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE db_product DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE db_order DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE db_message DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- db_auth
-- ============================================
USE db_auth;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    student_id VARCHAR(12) NOT NULL UNIQUE,
    name VARCHAR(50) NULL,
    school VARCHAR(100) NULL,
    college VARCHAR(100) NULL,
    major VARCHAR(100) NULL,
    grade VARCHAR(20) NULL,
    gender TINYINT NULL COMMENT '0未知/1男/2女',
    avatar_url VARCHAR(500) NULL,
    role TINYINT NOT NULL DEFAULT 0 COMMENT '0学生/1管理员/2超级管理员',
    status TINYINT NOT NULL DEFAULT 0 COMMENT '0正常/1冻结',
    credit_score DECIMAL(3,2) DEFAULT 5.00,
    openid VARCHAR(64) NULL,
    unionid VARCHAR(64) NULL,
    last_login_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    version INT DEFAULT 0,
    UNIQUE KEY uk_username_deleted (username, deleted),
    UNIQUE KEY uk_phone_deleted (phone, deleted),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS addresses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    receiver_name VARCHAR(50) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    province VARCHAR(50) NULL,
    city VARCHAR(50) NULL,
    district VARCHAR(50) NULL,
    detail VARCHAR(200) NULL,
    postal_code VARCHAR(10) NULL,
    is_default TINYINT DEFAULT 0,
    tag VARCHAR(20) NULL COMMENT '家/公司/学校',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- db_product
-- ============================================
USE db_product;

CREATE TABLE IF NOT EXISTS categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(200) NULL,
    parent_id BIGINT NULL,
    icon VARCHAR(500) NULL,
    sort_order INT DEFAULT 0,
    level TINYINT NULL COMMENT '0一级/1二级',
    status TINYINT DEFAULT 1 COMMENT '0禁用/1启用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent_id (parent_id),
    FOREIGN KEY (parent_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Category seed data
INSERT INTO categories (id, name, parent_id, level, sort_order) VALUES
(1,  '电子产品', NULL, 0, 1),
(2,  '图书教材', NULL, 0, 2),
(3,  '生活用品', NULL, 0, 3),
(4,  '服饰鞋包', NULL, 0, 4),
(5,  '美妆护肤', NULL, 0, 5),
(6,  '数码娱乐', NULL, 0, 6),
(7,  '运动户外', NULL, 0, 7),
(8,  '其他',     NULL, 0, 8);

INSERT INTO categories (id, name, parent_id, level, sort_order) VALUES
(11, '手机',        1, 1, 1),
(12, '平板/笔记本', 1, 1, 2),
(13, '台式机/配件', 1, 1, 3),
(14, '耳机/音箱',   1, 1, 4),
(15, '相机/镜头',   1, 1, 5),
(16, '智能穿戴',    1, 1, 6),
(21, '公共课教材', 2, 1, 1),
(22, '专业课教材', 2, 1, 2),
(23, '考研/考公',  2, 1, 3),
(24, '外语考试',   2, 1, 4),
(25, '考证/教资',  2, 1, 5),
(26, '课外读物',   2, 1, 6),
(31, '宿舍家具',  3, 1, 1),
(32, '厨具/餐具', 3, 1, 2),
(33, '收纳/清洁', 3, 1, 3),
(34, '床上用品',  3, 1, 4),
(35, '日用杂货',  3, 1, 5),
(41, '男装', 4, 1, 1),
(42, '女装', 4, 1, 2),
(43, '鞋靴', 4, 1, 3),
(44, '箱包', 4, 1, 4),
(45, '配饰', 4, 1, 5),
(51, '面部护肤', 5, 1, 1),
(52, '彩妆',    5, 1, 2),
(53, '香水',    5, 1, 3),
(54, '个护工具', 5, 1, 4),
(61, '游戏主机/卡带', 6, 1, 1),
(62, '键盘/鼠标',     6, 1, 2),
(63, '显示器',        6, 1, 3),
(64, '其他外设',      6, 1, 4),
(71, '健身器材', 7, 1, 1),
(72, '球类',    7, 1, 2),
(73, '骑行',    7, 1, 3),
(74, '户外装备', 7, 1, 4),
(81, '乐器',     8, 1, 1),
(82, '手办/周边', 8, 1, 2),
(83, '票券/卡',  8, 1, 3),
(84, '其他',     8, 1, 4);

CREATE TABLE IF NOT EXISTS products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2) NULL,
    category_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    images JSON NULL COMMENT '["url1","url2"]',
    `condition` TINYINT DEFAULT 5 COMMENT '1-10成色',
    stock_quantity INT DEFAULT 1,
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    sold_count INT DEFAULT 0,
    status TINYINT DEFAULT 1 COMMENT '1已上架/2已售出/3已下架',
    location VARCHAR(200) NULL,
    tags JSON NULL COMMENT '["教材","计算机"]',
    audit_status TINYINT NULL,
    audit_reason VARCHAR(500) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    version INT DEFAULT 0,
    INDEX idx_category_id (category_id),
    INDEX idx_seller_id (seller_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_title (title),
    FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_operation_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(23) NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    operation_type VARCHAR(10) NOT NULL COMMENT 'DEDUCT / RESTORE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_order_no_type (order_no, operation_type),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS favorites (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    status TINYINT DEFAULT 1 COMMENT '1有效/0取消',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS like_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    status TINYINT DEFAULT 1 COMMENT '1已点赞/0已取消',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- db_order
-- ============================================
USE db_order;

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(23) NOT NULL UNIQUE,
    buyer_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_title VARCHAR(200) NOT NULL,
    unit_price DECIMAL(10,2) NULL,
    quantity INT DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,
    status TINYINT DEFAULT 0 COMMENT '0待付款/1已付款/2已发货/3已完成/4已取消/5已关闭/6库存扣减失败',
    buyer_name VARCHAR(50) NULL,
    buyer_avatar VARCHAR(500) NULL,
    seller_name VARCHAR(50) NULL,
    seller_avatar VARCHAR(500) NULL,
    receiver_name VARCHAR(50) NULL,
    receiver_phone VARCHAR(20) NULL,
    receiver_address VARCHAR(500) NULL,
    tracking_no VARCHAR(100) NULL,
    logistics_company VARCHAR(100) NULL,
    buyer_remark VARCHAR(500) NULL,
    cancel_reason VARCHAR(500) NULL,
    deduct_retry_count INT DEFAULT NULL,
    deduct_next_retry_time DATETIME DEFAULT NULL,
    restore_retry_count INT DEFAULT NULL,
    restore_next_retry_time DATETIME DEFAULT NULL,
    paid_at DATETIME NULL,
    delivered_at DATETIME NULL,
    completed_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    version INT DEFAULT 0,
    INDEX idx_buyer_id (buyer_id),
    INDEX idx_seller_id (seller_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_status_histories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    old_status TINYINT NULL,
    new_status TINYINT NOT NULL,
    operator_id BIGINT NULL,
    operator_name VARCHAR(50) NULL,
    remark VARCHAR(500) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    reviewer_id BIGINT NOT NULL COMMENT '评价人(买家)',
    reviewer_name VARCHAR(50) NULL,
    reviewer_avatar VARCHAR(500) NULL,
    reviewee_id BIGINT NOT NULL COMMENT '被评人(卖家)',
    rating TINYINT NOT NULL COMMENT '1-5星',
    content VARCHAR(500) NULL,
    images JSON NULL,
    status TINYINT DEFAULT 0 COMMENT '0正常/1隐藏',
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_product_id (product_id),
    INDEX idx_reviewee_id (reviewee_id),
    INDEX idx_order_reviewer (order_id, reviewer_id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- db_message
-- ============================================
USE db_message;

CREATE TABLE IF NOT EXISTS conversations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    user_a_id BIGINT NOT NULL COMMENT '较小的userId',
    user_b_id BIGINT NOT NULL COMMENT '较大的userId',
    last_message_content VARCHAR(200) NULL,
    last_message_at DATETIME NULL,
    user_a_unread_count INT DEFAULT 0,
    user_b_unread_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_product_users (product_id, user_a_id, user_b_id)
) ENGINE=InnoDB DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender_id BIGINT NOT NULL,
    sender_name VARCHAR(50) NULL,
    sender_avatar VARCHAR(500) NULL,
    receiver_id BIGINT NOT NULL,
    receiver_name VARCHAR(50) NULL,
    receiver_avatar VARCHAR(500) NULL,
    related_id BIGINT NOT NULL COMMENT '商品ID',
    related_type VARCHAR(20) NOT NULL COMMENT '始终为PRODUCT',
    order_id BIGINT NULL,
    message_type VARCHAR(20) DEFAULT 'TEXT' COMMENT 'TEXT/SYSTEM',
    content VARCHAR(1000) NULL,
    images JSON NULL,
    is_read TINYINT DEFAULT 0,
    read_at DATETIME NULL,
    is_deleted_by_sender TINYINT DEFAULT 0,
    is_deleted_by_receiver TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_related (related_id, related_type, sender_id, receiver_id),
    INDEX idx_receiver_read (receiver_id, is_read, created_at),
    INDEX idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
