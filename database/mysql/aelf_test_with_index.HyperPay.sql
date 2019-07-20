/*
 Navicat MySQL Data Transfer

 Source Server         : hzz780
 Source Server Type    : MySQL
 Source Server Version : 100309
 Source Host           : localhost:3306
 Source Schema         : aelf_test_0719

 Target Server Type    : MySQL
 Target Server Version : 100309
 File Encoding         : 65001

 Date: 20/07/2019 14:44:02
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for address_contracts
-- ----------------------------
DROP TABLE IF EXISTS `address_contracts`;
CREATE TABLE `address_contracts` (
  `address` varchar(64) NOT NULL,
  `contract_address` varchar(64) NOT NULL,
  `symbol` varchar(64) NOT NULL,
  `update_time` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`address`,`contract_address`,`symbol`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for blocks_0
-- ----------------------------
DROP TABLE IF EXISTS `blocks_0`;
CREATE TABLE `blocks_0` (
  `block_hash` varchar(64) NOT NULL,
  `pre_block_hash` varchar(64) NOT NULL,
  `chain_id` varchar(64) NOT NULL,
  `block_height` int(64) NOT NULL,
  `tx_count` int(32) NOT NULL,
  `merkle_root_tx` varchar(64) NOT NULL,
  `merkle_root_state` varchar(64) NOT NULL,
  `time` varchar(64) NOT NULL COMMENT '直接转存节点来的',
  PRIMARY KEY (`block_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for blocks_unconfirmed
-- ----------------------------
DROP TABLE IF EXISTS `blocks_unconfirmed`;
CREATE TABLE `blocks_unconfirmed` (
  `block_hash` varchar(64) NOT NULL,
  `pre_block_hash` varchar(64) NOT NULL,
  `chain_id` varchar(64) NOT NULL,
  `block_height` int(64) NOT NULL,
  `tx_count` int(32) NOT NULL,
  `merkle_root_tx` varchar(64) NOT NULL,
  `merkle_root_state` varchar(64) NOT NULL,
  `time` varchar(64) NOT NULL COMMENT '直接转存节点来的',
  PRIMARY KEY (`block_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for contract_aelf20
-- ----------------------------
DROP TABLE IF EXISTS `contract_aelf20`;
CREATE TABLE `contract_aelf20` (
  `contract_address` varchar(64) NOT NULL,
  `symbol` varchar(64) NOT NULL,
  `chain_id` varchar(64) NOT NULL,
  `block_hash` varchar(64) NOT NULL,
  `tx_id` varchar(64) NOT NULL,
  `name` varchar(64) NOT NULL,
  `total_supply` bigint(64) unsigned NOT NULL,
  `decimals` int(32) DEFAULT NULL,
  PRIMARY KEY (`symbol`,`contract_address`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for nodes_0
-- ----------------------------
DROP TABLE IF EXISTS `nodes_0`;
CREATE TABLE `nodes_0` (
  `contract_address` varchar(64) NOT NULL COMMENT 'token contract address',
  `chain_id` varchar(64) NOT NULL,
  `api_ip` varchar(128) NOT NULL,
  `api_domain` varchar(255) NOT NULL,
  `rpc_ip` varchar(128) NOT NULL,
  `rpc_domain` varchar(255) NOT NULL,
  `token_name` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `status` int(1) NOT NULL,
  `create_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`contract_address`,`chain_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for resource_0
-- ----------------------------
DROP TABLE IF EXISTS `resource_0`;
CREATE TABLE `resource_0` (
  `tx_id` varchar(64) NOT NULL,
  `address` varchar(64) NOT NULL,
  `method` varchar(64) NOT NULL,
  `type` varchar(8) NOT NULL COMMENT 'resource type',
  `resource` int(64) NOT NULL COMMENT 'quantity of resource',
  `elf` int(64) NOT NULL COMMENT 'quantity of resource',
  `fee` int(64) NOT NULL COMMENT 'quantity of resource',
  `chain_id` varchar(64) NOT NULL,
  `block_height` int(32) NOT NULL,
  `tx_status` varchar(64) NOT NULL,
  `time` bigint(64) NOT NULL,
  PRIMARY KEY (`tx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for resource_unconfirmed
-- ----------------------------
DROP TABLE IF EXISTS `resource_unconfirmed`;
CREATE TABLE `resource_unconfirmed` (
  `tx_id` varchar(64) NOT NULL,
  `address` varchar(64) NOT NULL,
  `method` varchar(64) NOT NULL,
  `type` varchar(8) NOT NULL COMMENT 'resource type',
  `resource` int(64) NOT NULL COMMENT 'quantity of resource',
  `elf` int(64) NOT NULL COMMENT 'quantity of resource',
  `fee` int(64) NOT NULL COMMENT 'quantity of resource',
  `chain_id` varchar(64) NOT NULL,
  `block_height` int(32) NOT NULL,
  `tx_status` varchar(64) NOT NULL,
  `time` bigint(64) NOT NULL,
  PRIMARY KEY (`tx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for tps_0
-- ----------------------------
DROP TABLE IF EXISTS `tps_0`;
CREATE TABLE `tps_0` (
  `start` varchar(255) NOT NULL COMMENT 'start time, fromblocks_0',
  `end` varchar(255) NOT NULL COMMENT 'start + N(the value of key: type)',
  `txs` int(32) NOT NULL COMMENT 'tx count during N minutes',
  `blocks` int(32) NOT NULL COMMENT 'block count during N minutes',
  `tps` int(32) NOT NULL COMMENT 'transactions per second',
  `tpm` int(32) NOT NULL COMMENT 'transactions per minute',
  `type` int(16) NOT NULL COMMENT 'N, interval time',
  PRIMARY KEY (`start`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for transactions_0
-- ----------------------------
DROP TABLE IF EXISTS `transactions_0`;
CREATE TABLE `transactions_0` (
  `tx_id` varchar(64) NOT NULL,
  `params_to` varchar(64) NOT NULL DEFAULT '-1' COMMENT 'target address',
  `chain_id` varchar(64) NOT NULL,
  `block_height` int(32) unsigned NOT NULL,
  `address_from` varchar(64) NOT NULL,
  `address_to` varchar(64) NOT NULL COMMENT 'contract address',
  `params` text NOT NULL,
  `method` varchar(64) NOT NULL,
  `block_hash` varchar(64) NOT NULL,
  `quantity` bigint(64) unsigned NOT NULL,
  `tx_status` varchar(64) NOT NULL,
  `time` varchar(64) NOT NULL COMMENT 'time of blocks',
  PRIMARY KEY (`tx_id`,`params_to`),
  KEY `params_to` (`params_to`),
  KEY `method` (`method`),
  KEY `address_to` (`address_to`),
  KEY `address_from` (`address_from`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for transactions_unconfirmed
-- ----------------------------
DROP TABLE IF EXISTS `transactions_unconfirmed`;
CREATE TABLE `transactions_unconfirmed` (
  `tx_id` varchar(64) NOT NULL,
  `params_to` varchar(64) NOT NULL DEFAULT '-1' COMMENT 'target address',
  `chain_id` varchar(64) NOT NULL,
  `block_height` int(32) unsigned NOT NULL,
  `address_from` varchar(64) NOT NULL,
  `address_to` varchar(64) NOT NULL COMMENT 'contract address',
  `params` text NOT NULL,
  `method` varchar(64) NOT NULL,
  `block_hash` varchar(64) NOT NULL,
  `quantity` bigint(64) unsigned NOT NULL,
  `tx_status` varchar(64) NOT NULL,
  `time` varchar(64) NOT NULL COMMENT 'time of blocks',
  PRIMARY KEY (`tx_id`,`params_to`),
  KEY `params_to` (`params_to`),
  KEY `method` (`method`),
  KEY `address_to` (`address_to`),
  KEY `address_from` (`address_from`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` int(255) NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `avatar_url` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `phone` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

SET FOREIGN_KEY_CHECKS = 1;
