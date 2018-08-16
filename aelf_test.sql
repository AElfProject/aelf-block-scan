/*
 Navicat MySQL Data Transfer

 Source Server         : hzz780
 Source Server Type    : MySQL
 Source Server Version : 50721
 Source Host           : localhost:3306
 Source Schema         : aelf_test

 Target Server Type    : MySQL
 Target Server Version : 50721
 File Encoding         : 65001

 Date: 15/08/2018 18:37:14
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for address_contracts
-- ----------------------------
DROP TABLE IF EXISTS `address_contracts`;
CREATE TABLE `address_contracts` (
  `address` varchar(255) NOT NULL,
  `contract_address` varchar(255) NOT NULL,
  PRIMARY KEY (`address`,`contract_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for blocks_0
-- ----------------------------
DROP TABLE IF EXISTS `blocks_0`;
CREATE TABLE `blocks_0` (
  `block_hash` varchar(255) NOT NULL,
  `pre_block_hash` varchar(255) NOT NULL,
  `chain_id` varchar(255) NOT NULL,
  `block_height` int(255) NOT NULL,
  `tx_count` int(11) NOT NULL,
  `merkle_root_tx` varchar(255) NOT NULL,
  `merkle_root_state` varchar(255) NOT NULL,
  `time` varchar(255) NOT NULL COMMENT '直接转存节点来的',
  PRIMARY KEY (`block_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for contract_aelf20
-- ----------------------------
DROP TABLE IF EXISTS `contract_aelf20`;
CREATE TABLE `contract_aelf20` (
  `contract_address` varchar(255) NOT NULL,
  `tx_id` varchar(255) NOT NULL,
  `symbol` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_supply` bigint(20) NOT NULL,
  `decimals` int(11) DEFAULT NULL,
  PRIMARY KEY (`contract_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for transactions_0
-- ----------------------------
DROP TABLE IF EXISTS `transactions_0`;
CREATE TABLE `transactions_0` (
  `tx_id` varchar(255) NOT NULL,
  `params_to` varchar(255) NOT NULL DEFAULT '-1' COMMENT 'target address',
  `chain_id` varchar(255) NOT NULL,
  `block_height` int(11) NOT NULL,
  `address_from` varchar(255) NOT NULL,
  `address_to` varchar(255) NOT NULL COMMENT 'contract address',
  `params` text NOT NULL,
  `method` varchar(255) NOT NULL,
  `block_hash` varchar(255) NOT NULL,
  `increment_id` bigint(20) NOT NULL,
  `quantity` bigint(20) NOT NULL,
  PRIMARY KEY (`tx_id`,`params_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

SET FOREIGN_KEY_CHECKS = 1;
