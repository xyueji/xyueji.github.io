---
title: hbase的hbck工具
date: 2019-10-21 16:18:24
tags:
- hbck

categories:
- hbase

---
hbase hbck是hbase自带的一项非常实用的工具，很多hbase中出现的问题都可以尝试用hbase hbck修复。
新版本的hbck从 hdfs目录、META、RegionServer这三处获得region的Table和Region的相关信息，根据这些信息判断并尝试进行repair。 
新版本的 hbck 可以修复各种错误，修复选项是：（请注意选项后面是否需要加具体表名）   
（1）-fix
    向下兼容用，被-fixAssignments替代   
（2）-fixAssignments
    用于修复region assignments错误   
（3）-fixMeta
<!--more-->    用于修复meta表的问题，前提是HDFS上面的region info信息有并且正确。   
（4）-fixHdfsHoles
    修复region holes（空洞，某个区间没有region）问题   
（5）-fixHdfsOrphans
    修复Orphan region（hdfs上面没有.regioninfo的region）   
（6）-fixHdfsOverlaps
    修复region overlaps（区间重叠）问题   
（7）-fixVersionFile
    修复缺失hbase.version文件的问题   
（8）-maxMerge <n> （n默认是5）
    当region有重叠是，需要合并region，一次合并的region数最大不超过这个值。   
（9）-sidelineBigOverlaps 
    当修复region overlaps问题时，允许跟其他region重叠次数最多的一些region不参与（修复后，可以把没有参与的数据通过bulk load加载到相应的region）   
（10）-maxOverlapsToSideline <n> （n默认是2）
    当修复region overlaps问题时，一组里最多允许多少个region不参与。由于选项较多，所以有两个简写的选项   
（11） -repair
    相当于-fixAssignments -fixMeta -fixHdfsHoles -fixHdfsOrphans -fixHdfsOverlaps -fixVersionFile 
-sidelineBigOverlaps。如前所述，-repair 打开所有的修复选项，相当于-fixAssignments -fixMeta -fixHdfsHoles -fixHdfsOrphans -fixHdfsOverlaps -fixVersionFile -sidelineBigOverlaps   
（12）-repairHoles
    相当于-fixAssignments -fixMeta -fixHdfsHoles -fixHdfsOrphans  

示例情景：  

Q：缺失hbase.version文件   
A：加上选项 -fixVersionFile 解决 

Q：如果一个region即不在META表中，又不在hdfs上面，但是在regionserver的online region集合中   
A：加上选项 -fixAssignments 解决  

Q：如果一个region在META表中，并且在regionserver的online region集合中，但是在hdfs上面没有   
A：加上选项 -fixAssignments -fixMeta 解决，（ -fixAssignments告诉regionserver close region），（ -fixMeta删除META表中region的记录） 

Q：如果一个region在META表中没有记录，没有被regionserver服务，但是在hdfs上面有   
A：加上选项 -fixMeta -fixAssignments 解决，（ -fixAssignments 用于assign region），（ -fixMeta用于在META表中添加region的记录）   

Q：如果一个region在META表中没有记录，在hdfs上面有，被regionserver服务了   
A：加上选项 -fixMeta 解决，在META表中添加这个region的记录，先undeploy region，后assign。-fixMeta，如果hdfs上面没有，那么从META表中删除相应的记录，如果hdfs上面有，在META表中添加上相应的记录信息 

Q：如果一个region在META表中有记录，但是在hdfs上面没有，并且没有被regionserver服务   
A：加上选项 -fixMeta 解决，删除META表中的记录   

Q：如果一个region在META表中有记录，在hdfs上面也有，table不是disabled的，但是这个region没有被服务   
A：加上选项 -fixAssignments 解决，assign这个region。-fixAssignments，用于修复region没有assign、不应该assign、assign了多次的问题   

Q：如果一个region在META表中有记录，在hdfs上面也有，table是disabled的，但是这个region被某个regionserver服务了   
A：加上选项 -fixAssignments 解决，undeploy这个region  

Q：如果一个region在META表中有记录，在hdfs上面也有，table不是disabled的，但是这个region被多个regionserver服务了   
A：加上选项 -fixAssignments 解决，通知所有regionserver close region，然后assign region 

Q：如果一个region在META表中，在hdfs上面也有，也应该被服务，但是META表中记录的regionserver和实际所在的regionserver不相符   
A：加上选项 -fixAssignments 解决   

Q：region holes   
A：加上 -fixHdfsHoles ，创建一个新的空region，填补空洞，但是不assign 这个 region，也不在META表中添加这个region的相关信息。修复region holes时，-fixHdfsHoles 选项只是创建了一个新的空region，填补上了这个区间，还需要加上-fixAssignments -fixMeta 来解决问题，（ -fixAssignments 用于assign region），（ -fixMeta用于在META表中添加region的记录），所以有了组合拳 -repairHoles 修复region holes，相当于-fixAssignments -fixMeta -fixHdfsHoles -fixHdfsOrphans 

Q：region在hdfs上面没有.regioninfo文件   
A：加上选项 -fixHdfsOrphans 解决   

Q：region overlaps   
A：需要加上 -fixHdfsOverlaps   
