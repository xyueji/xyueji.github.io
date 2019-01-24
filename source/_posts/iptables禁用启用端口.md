---
title: iptables禁用启用端口
date: 2019-01-04 15:54:38
tags:
- iptables
- 端口
categories:
- Linux
---
## 只允许指定ip访问本机的指定端口
+ 目标：只允许指定的ip访问本机的指定端口8765，其他ip都禁止访问。
+ ip白名单：127.0.0.1,192.168.1.124, 192.168.1.100

<!--more-->
切换到root用户
+ 1、在tcp协议中，禁止所有的ip访问本机的1521端口。
```bash
iptables -I INPUT -p tcp --dport 8765 -j DROP
```
+ 2、允许192.168.1.123访问本机的1521端口
```bash
iptables -I INPUT -s 127.0.0.1 -p tcp --dport 8765 -j ACCEPT
```
+ 3、允许192.168.1.124访问本机的1521端口
```bash
iptables -I INPUT -s 192.168.1.124 -p tcp --dport 8765 -j ACCEPT
```
+ 4、允许192.168.1.100访问本机的1521端口
```bash
iptables -I INPUT -s 192.168.1.100 -p tcp --dport 8765 -j ACCEPT
```
以上是临时设置。
+ 5、然后保存iptables
```bash
service iptables save
```
+ 6、重启防火墙
```bash
service iptables restart
```
## 删除规则
首先我们要知道 这条规则的编号，每条规则都有一个编号,通过 iptables -L -n --line-number 可以显示规则和相对应的编号。<br>
删除INPUT链编号为2的规则
```bash
iptables -D INPUT 2
```
