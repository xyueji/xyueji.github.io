---
title: Prometheus安装+HDFS指标收集
date: 2019-01-02 18:06:19
tags:
- Prometheus
categories:
- Prometheus
---
## 1.安装Prometheus
+ 1）在官网下载Prometheus安装包：
```bash
wget https://github.com/prometheus/prometheus/releases/download/v2.6.0/prometheus-2.6.0.linux-amd64.tar.gz
```

<!--more-->
+ 2）解压：
```bash	
tar -zvxf prometheus-2.6.0.linux-amd64.tar.gz
```
## 2.安装jmx_exporter以及配置文件
在Hadoop集群各个节点上：
+ 1）创建jmx_exporter目录：
```bash
mkdir prometheus_jmx_export_0.3.1
```
+ 2）进入目录，下载jmx_exporter:
```bash
wget https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/0.3.1/jmx_prometheus_javaagent-0.3.1.jar
```
+ 3）创建NameNode配置
```bash
vim namenode.yaml
```
+ 内容如下：
```text
startDelaySeconds: 0
hostPort: localhost:1234  #1234为想设置的jmx端口（可设置为未被占用的端口）
ssl: false
lowercaseOutputName: false
lowercaseOutputLabelNames: false
```
+ 4）创建DataNode配置
```bash
	vim datanode.yaml
```
+ 内容如下：  
```text
startDelaySeconds: 0
hostPort: localhost:1235
ssl: false
lowercaseOutputName: false
lowercaseOutputLabelNames: false
```
+ 5）修改$HADOOP_HOME/etc/hadoop/hadoop-env.sh （注意：端口1234（1235）要与之前设置的jmx端口保持一致
内容如下：  
```text
#jmx_exporter
export HADOOP_NAMENODE_JMX_OPTS="-Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false -Dcom.sun.management.jmxremote.local.only=false   -Dcom.sun.management.jmxremote.port=1234 -javaagent:/home/bigdata/local/prometheus_jmx_export_0.3.1/jmx_prometheus_javaagent-0.3.1.jar=9101:/home/bigdata/local/prometheus_jmx_export_0.3.1/namenode.yaml"
export HADOOP_DATANODE_JMX_OPTS="-Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false -Dcom.sun.management.jmxremote.local.only=false   -Dcom.sun.management.jmxremote.port=1235 -javaagent:/home/bigdata/local/prometheus_jmx_export_0.3.1/jmx_prometheus_javaagent-0.3.1.jar=9102:/home/bigdata/local/prometheus_jmx_export_0.3.1/datanode.yaml"
```
+ 6）修改$HADOOP_HOME/bin/hdfs 修改 namenode、datanode启动参数如下
```text
if [ "$COMMAND" = "namenode" ] ; then
CLASS='org.apache.hadoop.hdfs.server.namenode.NameNode'
HADOOP_OPTS="$HADOOP_OPTS $HADOOP_NAMENODE_JMX_OPTS $HADOOP_NAMENODE_OPTS"
...
elif [ "$COMMAND" = "datanode" ] ; then
CLASS='org.apache.hadoop.hdfs.server.datanode.DataNode'
HADOOP_OPTS="$HADOOP_OPTS $HADOOP_DATANODE_JMX_OPTS"
```
+ 7）依次重启各个节点的DataNode和NameNode
```bash
hadoop-daemon.sh stop datanode
hadoop-daemon.sh start datanode
```
## 3.配置Prometheus,修改prometheus.yml
+ 修改内容如下：  
```text
- job_name: 'NameNodes'
static_configs:
- targets: ['master:9101']

- job_name: 'DataNodes'
static_configs:
- targets: ['slave1:9102']
- targets: ['slave2:9102']
- targets: ['slave3:9102']
```
+ 启动Prometheus：
```bash
nohup ./prometheus >> prometheus.log &
```
&emsp;查看Prometheus是否启动成功：<hostname>:9090
	
## 4.配置远程存储（Opentsdb所在机器）
+ 1）获取远程存储和读取配置文件：
```bash
go get github.com/yueji12321/opentsdb-adapter
go build github.com/yueji12321/opentsdb-adapter
go get github.com/yueji12321/opentsdb-promql-frontend
go build github.com/yueji12321/opentsdb-promql-frontend
```
+ 2）执行两个可执行文件：
```bash
nohup ./remote_storage_adapter --opentsdb-url=<Opentsdb地址+端口> >> adapter_storage.log &
nohup ./opentsdb-promql-frontend ADDR=<Prometheus地址+端口> OPENTSDB_URL=<Opentsdb地址+端口> >> adapter_read.log &
```
+ 3）修改prometheus文件，添加内容：
```text
remote_write:
   - url: "http://<hostname>:9201/write" #地址为./remote_storage_adapter所在的机器地址
	 queue_config:
	   capacity: 100000
```
+ 4）重启Prometheus

## 5.Grafana配置
+ 读取本地Prometheus数据地址：Prometheus安装所在机器地址+端口9090
+ 读取远程存储数据地址：./opentsdb-promql-frontend所设定的Prometheus地址

