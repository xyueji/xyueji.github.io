---
title: Linux-top命令详解
date: 2020-01-17 10:37:54
tags:
- top

categories:
- linux

---
# Linux top命令详解

![image-20200116174612220](/Users/xiongzhigang/Library/Application Support/typora-user-images/image-20200116174612220.png)

**第一行，任务队列信息，同 uptime 命令的执行结果**

> 系统时间：07:27:05
>
<!--more-->> 运行时间：up 1:57 min,
>
> 当前登录用户： 3 user
>
> 负载均衡(uptime) load average: 0.00, 0.00, 0.00
>
>    average后面的三个数分别是1分钟、5分钟、15分钟的负载情况。
>
> load average数据是每隔5秒钟检查一次活跃的进程数，然后按特定算法计算出的数值。如果这个数除以逻辑CPU的数量，结果高于5的时候就表明系统在超负荷运转了

**第二行，Tasks — 任务（进程）**

> 总进程:150 total, 运行:1 running, 休眠:149 sleeping, 停止: 0 stopped, 僵尸进程: 0 zombie

**第三行，cpu状态信息**

> 0.0%us【user space】— 用户空间占用CPU的百分比。
>
> 0.3%sy【sysctl】— 内核空间占用CPU的百分比。
>
> 0.0%ni【】— 改变过优先级的进程占用CPU的百分比
>
> 99.7%id【idolt】— 空闲CPU百分比
>
> 0.0%wa【wait】— IO等待占用CPU的百分比
>
> 0.0%hi【Hardware IRQ】— 硬中断占用CPU的百分比
>
> 0.0%si【Software Interrupts】— 软中断占用CPU的百分比

**第四行,内存状态**

>  1003020k total,  234464k used,  777824k free,  24084k buffers【缓存的内存量】

**第五行，swap交换分区信息**

> 2031612k total,   536k used, 2031076k free,  505864k cached【缓冲的交换区总量】

> 备注：
>
> 可用内存=free + buffer + cached
>
> 对于内存监控，在top里我们要时刻监控第五行swap交换分区的used，如果这个数值在不断的变化，说明内核在不断进行内存和swap的数据交换，这是真正的内存不够用了。
>
> 第四行中使用中的内存总量（used）指的是现在系统内核控制的内存数，
>
> 第四行中空闲内存总量（free）是内核还未纳入其管控范围的数量。
>
> 纳入内核管理的内存不见得都在使用中，还包括过去使用过的现在可以被重复利用的内存，内核并不把这些可被重新使用的内存交还到free中去，因此在linux上free内存会越来越少，但不用为此担心。

**第六行，空行**

**第七行以下：各进程（任务）的状态监控**

> PID — 进程id
> USER — 进程所有者
> PR — 进程优先级
> NI — nice值。负值表示高优先级，正值表示低优先级
> VIRT — 进程使用的虚拟内存总量，单位kb。VIRT=SWAP+RES
> RES — 进程使用的、未被换出的物理内存大小，单位kb。RES=CODE+DATA
> SHR — 共享内存大小，单位kb
> S —进程状态。D=不可中断的睡眠状态 R=运行 S=睡眠 T=跟踪/停止 Z=僵尸进程
> %CPU — 上次更新到现在的CPU时间占用百分比
> %MEM — 进程使用的物理内存百分比
> TIME+ — 进程使用的CPU时间总计，单位1/100秒
> COMMAND — 进程名称（命令名/命令行）

详解

> **VIRT：virtual memory usage 虚拟内存
> **1、进程“需要的”虚拟内存大小，包括进程使用的库、代码、数据等
> 2、假如进程申请100m的内存，但实际只使用了10m，那么它会增长100m，而不是实际的使用量
>
> **RES：resident memory usage 常驻内存**
> 1、进程当前使用的内存大小，但不包括swap out
> 2、包含其他进程的共享
> 3、如果申请100m的内存，实际使用10m，它只增长10m，与VIRT相反
> 4、关于库占用内存的情况，它只统计加载的库文件所占内存大小
>
> **SHR：shared memory 共享内存**
> 1、除了自身进程的共享内存，也包括其他进程的共享内存
> 2、虽然进程只使用了几个共享库的函数，但它包含了整个共享库的大小
> 3、计算某个进程所占的物理内存大小公式：RES – SHR
> 4、swap out后，它将会降下来
>
> **DATA**
> 1、数据占用的内存。如果top没有显示，按f键可以显示出来。
> 2、真正的该程序要求的数据空间，是真正在运行中要使用的。
>
> **top 运行中可以通过 top 的内部命令对进程的显示方式进行控制。内部命令如下：**
> s – 改变画面更新频率
> l – 关闭或开启第一部分第一行 top 信息的表示
> t – 关闭或开启第一部分第二行 Tasks 和第三行 Cpus 信息的表示
> m – 关闭或开启第一部分第四行 Mem 和 第五行 Swap 信息的表示
> N – 以 PID 的大小的顺序排列表示进程列表
> P – 以 CPU 占用率大小的顺序排列进程列表
> M – 以内存占用率大小的顺序排列进程列表
> h – 显示帮助
> n – 设置在进程列表所显示进程的数量
> q – 退出 top
> s – 改变画面更新周期



## 附：Linux查看物理CPU个数、核数、逻辑CPU个数

```shell
# 总核数 = 物理CPU个数 X 每颗物理CPU的核数 
# 总逻辑CPU数 = 物理CPU个数 X 每颗物理CPU的核数 X 超线程数

# 查看物理CPU个数
cat /proc/cpuinfo| grep "physical id"| sort| uniq| wc -l

# 查看每个物理CPU中core的个数(即核数)
cat /proc/cpuinfo| grep "cpu cores"| uniq

# 查看逻辑CPU的个数
cat /proc/cpuinfo| grep "processor"| wc -l

# 查看CPU信息（型号）
cat /proc/cpuinfo | grep name | cut -f2 -d: | uniq -c
```

