---
title: Phoenix安装问题
date: 2019-01-03 21:14:33
tags:
- Phoenix
categories:
- Phoenix
---
## 下载Phoenix
下载地址:http://phoenix.apache.org/download.html(hbase的版本一定要与phoenix的版本保持一致)

<!--more-->
## 配置Phoenix
* 解压缩文件
* 配置Phoenix环境变量
* 将 Phoenix 目录下的phoenix-core-4.14.1-HBase-1.2.jar、phoenix-4.14.1-HBase-1.2-client.jar 拷贝到 hbase 集群各个节点 hbase 安装目录 lib 中。
* 将 hbase 集群中的配置文件 hbase-site.xml 拷贝到 Phoenix 的 bin 目录下，覆盖原有的配置文件。
* 将 hdfs 集群中的配置文件 core-site.xml、 hdfs-site.xml 拷贝到 Phoenix 的 bin 目录下。
* 重启hbase
## 启动Phoenix
sqlline.py <hbase.zookeeper.quorum>
