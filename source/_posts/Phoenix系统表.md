---
title: Phoenix系统表
date: 2019-01-04 15:21:03
tags:
- 系统表
- Phoenix
categories:
- Phoenix
---
Phoenix安装完成后，HBase里会创建相应的系统表，分别为SYSTEM.CATALOG、SYSTEM.FUNCTION、SYSTEM.SEQUENCE、SYSTEM.STATS。  
查询这些系统表时，注意除了CATALOG表其他都要加引号（区分大小写），否则会报错。

<!--more-->
## SYSTEM.CATALOG
内容是所有表格的信息，系统表和自建表。
+ TABLE_NAME表示索引表名
+ DATA_TABLE_NAME表示原数据表名
+ TABLE_TYPE表示表类型
	+ "s" 系统表
	+ "u" 用户表
	+ "v" 视图
	+ "i" 索引
+ INDEX_TYPE表示索引类型 GLOBAL(1) LOCAL(2)
+ INDEX_STATE表示索引状态
	+ BUILDING("b")
	+ USABLE("e")
	+ UNUSABLE("d")
	+ ACTIVE("a")
	+ INACTIVE("i")
	+ DISABLE("x")
	+ REBUILD("r")
```text
DISABLE 表示索引将处于不可用的维护状态，同时将不能用于查询中。
REBUILD 表示索引将完成重建，同时一旦重建完成此索引将能被在此用于查询中。
BUILDING 表示将从索引不可用的时间戳处重建索引直到重建完成。
INACTIVE/UNUSABLE 表示索引将不能用于查询中，但索引仍然在不可用的维护状态。
ACTIVE/USABLE 表示索引表能被正常用于查询中。
```

## SYSTEM.FUNCTION
内容是所有函数信息，系统函数和自定义函数。

## SYSTEM.SQEUENCE
内容是自增ID的一些信息，包括起始值、当前值、CACHE大小、最小值和最大值等等。

## SYSTEM.STATS
追踪表的操作，主要包含以下内容：
+ PHYSICAL_NAME
+ COLUMN_FAMILY
+ GUIDE_POST_KEY
+ GUIDE_POSTS_WIDTH
+ LAST_STATS_UPDATE_TIME
+ GUIDE_POSTS_ROW_COUNT
