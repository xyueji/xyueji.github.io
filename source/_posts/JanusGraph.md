---
title: JanusGraph
date: 2019-10-15 15:04:51
tags:
- JanusGraph

categories:
- JanusGraph

---
## 基础知识
### Configuration
有以下两种方式构建JanusGraph对象：

1、通过配置文件构建图对象
configuration里面至少要说明storage backend是什么，参考此。
如果需要高级功能（e.g full-text search, geo search, or range queries），就需要一个indexing backend。
一个基于Cassandra+ElasticSearch的配置例子：
<!--more-->
```yaml
storage.backend=hbase
storage.hostname=localhost

index.search.backend=elasticsearch
index.search.hostname=100.100.101.1, 100.100.101.2
index.search.elasticsearch.client-only=true
```

Java连接：

```java
JanusGraph graph = JanusGraphFactory.open("conf/janusgraph-hbase-es.properties"); graph.close();
```

2、通过Configuration构建图对象

```java
org.apache.commons.configuration.Configuration conf = new BaseConfiguration();
String tableName = "default:graphtest_x";
conf.addProperty("storage.backend", "hbase");
conf.addProperty("storage.hbase.region-count", 50);
conf.addProperty("storage.hostname", "hostname");
conf.setProperty("cache.db-cache", "true");
conf.setProperty("cache.db-cache-time", "300000");
conf.setProperty("cache.db-cache-size", "0.5");
conf.setProperty("storage.hbase.table", tableName);

JanusGraph janusGraph = JanusGraphFactory.open(conf);
GraphTraversalSource g = janusGraph.traversal();
JanusGraphManagement jgmt = janusGraph.openManagement();

//EdgeLabel
jgmt.makeEdgeLabel("brother").make();
jgmt.makeEdgeLabel("lives").make();

//VertexLabel
jgmt.makeVertexLabel("god").make();
jgmt.makeVertexLabel("place").make();

//Property
jgmt.makePropertyKey("name").dataType(String.class).make();
jgmt.makePropertyKey("age").dataType(Integer.class).make();
jgmt.makePropertyKey("reason").dataType(String.class).make();

jgmt.commit();

//createElement
final Vertex sky = g.addV("place").property("name", "sky").next();
final Vertex sea = g.addV("place").property("name", "sea").next();
final Vertex jupiter = g.addV("god").property("name", "jupiter").property("age", 5000).next();
final Vertex neptune = g.addV("god").property("name", "neptune").property("age", 4500).next();

g.V(jupiter).as("a").V(sky).addE("lives").property("reason", "loves fresh breezes").from("a").next();
g.V(jupiter).as("a").V(neptune).addE("brother").from("a").next();
g.tx().commit();

//查询
System.out.println("=========" + g.V().has("name", "jupiter").next().value("name"));
janusGraph.close();
```

### 数据模型（Schema）
数据的Schema是JanusGraph的一个很重要的部分，数据schema主要定义在三个元素上：顶点，边和属性。听起来可能有点绕口，schema是干什么呢？其实就是去定义顶点的label，边的label的Property的key有哪些，再通俗点讲，就是有哪些类型的点（比如 god 和 human），有哪些类型的边（比如 trade 和 friends），然后点和边的属性列表都有哪些key（比如 human 有一个property key是name 和 age）。

需要注意的几点：

#### schema

schema可以显示地定义也不可以不显示地定义，但还是建议提前定义好。Schema可以在数据库使用的过程中更改和进化，这样并不会影响数据库正常的服务。

#### Vertex label

Vertex label描述的是vertice的语义，不过vertice label是optional的，用来区分不同类型的vertice，比如 user 和 product。利用 makeVertexLabel(String).make() 来创建vertice label，vertice label必须保持全局唯一性。
下面是个创建vertex label的例子：

```mgmt = graph.openManagement()
person = mgmt.makeVertexLabel(‘person‘).make()
mgmt.commit()
// Create a labeled vertex
person = graph.addVertex(label, ‘person‘)
// Create an unlabeled vertex
v = graph.addVertex()
graph.tx().commit()
```

注意，需要显示地调用 builder 的 make() 函数来完成vertex label的定义。

#### Edge label
Edge label主要描述的是relationship的语义（比如friends）。在一个事务中，用 makeEdgeLabel(String) 来定义一个edge label，注意，edge label必须是唯一的，这个方法会返回一个 builder，这个 builder 可以用来获取这种edge label的多度关系multiplicity，这个指标限定了每对（pair）之间edge最大的数量。
multiplicity包含的类型有：multi, simple, many2one, one2many, one2one （结合数据库E-R model这个概念不难理解）。默认的multiplicity 是 MULTI。
下面是创建edge label的一个例子：

```mgmt = graph.openManagement()
follow = mgmt.makeEdgeLabel(‘follow‘).multiplicity(MULTI).make()
mother = mgmt.makeEdgeLabel(‘mother‘).multiplicity(MANY2ONE).make()
mgmt.commit()
```

注意，需要显示地调用 builder 的 make() 函数来完成edge label的定义。

#### Property keys

属性Property定义在顶点和边上，当然也可以用来定义其他东西，property是 key-value 对的形式。举个例子，‘name‘ = ‘John‘ 这就可以看做一个属性，它定义了 name 这个属性，这个属性的value是 ‘John‘。通过 makePropertyKey(String) 方法来常见Property key。属性名应该尽可能避免使用空格和特殊字符。

属性需要关注两点：

1. Property Key Data Type
   每个属性都有自己的数据类型，也就是说它的value必须是某种支持的数据类型，可以通过 dataType(Class) 方法来定义数据类型。JanusGraph会保证加入进来的属性数据都满足该数据类型。属性数据类型可以申明为 Object.class，但这并不推荐，最好控制好数据类型，一来可以节省空间，二来可以让JanusGraph来帮我们检查导入的数据类型是不是符合要求。数据类型必须使用具体的类，不能是接口或者抽象类。JanusGraph使用的是完全相当去判断数据类型是否符合，所以使用子类的数据去导入到父类的属性中也是不会成功的。

2. Property Key Cardinality
   用 cardinality(Cardinality) 方法来定义某一个顶点的某个属性的基底（cardinality）。   

   基底有三种情况：

   SINGLE：每一个元素对于这个key只能有一个value，比如 birthDate 就是一个single基底，因为每个人最多只能有一个生日。
   LIST：每个元素对于这个key可以有任意数量的值，比如我们建模传感器（sensor），其有一个属性是 sensorRecords，那么，对于这个属性，可能有一系列的值。注意，LIST是允许有重复元素的。
   SET: 与LIST相同，不同的是，SET不允许有重复的元素。
   默认的cardinality是single。注意，对于边属性来说，property key的基底始终是single。

下面是在定义property key的时候定义对应的cardinality的例子：

```groovy
birthDate = mgmt.makePropertyKey(‘birthDate‘).dataType(Long.class).cardinality(Cardinality.SINGLE).make()
name = mgmt.makePropertyKey(‘name‘).dataType(String.class).cardinality(Cardinality.SET).make()
sensorReading = mgmt.makePropertyKey(‘sensorReading‘).dataType(Double.class).cardinality(Cardinality.LIST).make()
mgmt.commit()
Relation types
Edge label和property key共同地被称为relation type。
```

#### relation type

Edge label和property key共同地被称为relation type。可以通过 containsRelationType() 方法来检测relation type是否存在。

下面是个例子：

```mgmt = graph.openManagement()
if (mgmt.containsRelationType(‘name‘))
    name = mgmt.getPropertyKey(‘name‘)
mgmt.getRelationTypes(EdgeLabel.class)
mgmt.commit()
```

#### Changing Schema Elements
一旦我们创建好Vertex label, edge label和property key后，就不能更改了，我们唯一能改的是schema的名字，比如下面这个例子：

```mgmt = graph.openManagement()
place = mgmt.getPropertyKey(‘place‘)
mgmt.changeName(place, ‘location‘)
mgmt.commit()
```

上面这个例子中，我们把property key的名字从place改成了location。

#### Schema Constraints

多个property可以绑定到同一个vertex或者edge上面，用 JanusGraphManagement.addProperties(VertexLabel, PropertyKey...) 方法：

```// 例子1
mgmt = graph.openManagement()
person = mgmt.makeVertexLabel(‘person‘).make()
name = mgmt.makePropertyKey(‘name‘).dataType(String.class).cardinality(Cardinality.SET).make()
birthDate = mgmt.makePropertyKey(‘birthDate‘).dataType(Long.class).cardinality(Cardinality.SINGLE).make()
mgmt.addProperties(person, name, birthDate)
mgmt.commit()
// 例子2
mgmt = graph.openManagement()
follow = mgmt.makeEdgeLabel(‘follow‘).multiplicity(MULTI).make()
name = mgmt.makePropertyKey(‘name‘).dataType(String.class).cardinality(Cardinality.SET).make()
mgmt.addProperties(follow, name)
mgmt.commit()
```

有一种很通俗的定义关系的方法：

```mgmt = graph.openManagement()
person = mgmt.makeVertexLabel(‘person‘).make()
company = mgmt.makeVertexLabel(‘company‘).make()
works = mgmt.makeEdgeLabel(‘works‘).multiplicity(MULTI).make()
mgmt.addConnection(works, person, company)
mgmt.commit()
这里，用到是 addConnection() 方法。
```

### Gremlin

Gremlin是JanusGraph默认的query language。

Gremlin用来从JanusGraph里面查询数据，修改数据，Gremlin是一种traversal查询语言，可以很方便地查询此类查询：

从小明开始，遍历到他的父亲，再从他的父亲遍历到他父亲的父亲，然后返回他父亲的父亲的名字

更多关于JanusGraph中Gremlin相关的说明，参考这个文档https://docs.janusgraph.org/basics/gremlin/。

### JanusGraph Server

JanusGrpah Server其实就是Gremlin server
两种交互方式：分别是webSocket和HTTP

#### 使用方式

使用预先打好的包
这种方式主要是用来学习使用JanusGraph，生产环境下不建议用这种配置。

./bin/janusgraph.sh start 就可以启动了，会自动fork cassandra的包，elasticsearch的包，gremlin-server的包，并连接到对应的服务器

```shell
Forking Cassandra...
Running `nodetool statusthrift`.. OK (returned exit status 0 and printed string "running").
Forking Elasticsearch...
Connecting to Elasticsearch (127.0.0.1:9300)... OK (connected to 127.0.0.1:9300).
Forking Gremlin-Server...
Connecting to Gremlin-Server (127.0.0.1:8182)... OK (connected to 127.0.0.1:8182).
Run gremlin.sh to connect.
```

使用完毕后关系JanusGraph，使用 ./bin/janusgraph.sh stop命令就可以了

```shell
Killing Gremlin-Server (pid 59687)...
Killing Elasticsearch (pid 59494)...
Killing Cassandra (pid 58809)...
```

1. 使用WebSocket的方式
   上面pre-package的方式其实是使用的内置的backend和index backend（在这个例子里面，分别是cassandra和elasticsearch），其实我们也可以把JanusGraph连接到自己的HBase等Backend。

2. 使用Http的方式
   配置方式和使用WebSocket的方式基本相同，可以用Curl命令来test服务的可用性：

```
curl -XPOST -Hcontent-type:application/json -d ‘{"gremlin":"g.V().count()"}‘ http://[IP for JanusGraph server host]:8182
```

3. 同时使用WebSocket和Http的方式
   修改gremlin-server.yaml文件，更改channelizer为：

```channelizer: org.apache.tinkerpop.gremlin.server.channel.WsAndHttpChannelize```

- 一些高级用法
  还有一些高级用法，比如认证（Authentication over HTTP），具体这里就不细说了，可以参考官方文档。

#### 服务部署

JanusGraph Server本身是个服务器服务，这个服务背后很多Backends(es, Hbase等等），客户端应用（application）主要通过Gremlin查询语句和JanusGraph instance交互，JanusGraph instance交互然后和对应的后端交互来执行对应的query。
没有master JanusGraph server的概念，application可以连接任何JanusGraph instance。当然，也可以用负载均衡的方法来分流到不同的JanusGraph instance。
各个JanusGraph instance之间并不相互交互。
部署方式：

- 方式1：每个server上起一个JanusGraph Instance，并在同一个server起对应的backend和index
- 方式2：JanusServe和backend server, index server分离
- 方法3：直接embedded到客户端appplication中，相当于引入了一个jar包

### ConfiguredGraphFactory

ConfiguredGraphFactory是一个singleton，和JanusGraphFactory一样。它们提供了一套API（methods，方法）来动态地操作服务器上的图。

在gremlin-console下我们可以直接用这个接口去操作图，如下：

```shell
==>Configured localhost/127.0.0.1:8182
gremlin> :remote console
==>All scripts will now be sent to Gremlin Server - [localhost/127.0.0.1:8182] - type ‘:remote console‘ to return to local mode
gremlin> ConfiguredGraphFactory.open("graph1")
==>standardjanusgraph[cassandrathrift:[127.0.0.1]]
gremlin> graph1
==>standardjanusgraph[cassandrathrift:[127.0.0.1]]
gremlin> graph1_traversal
==>graphtraversalsource[standardjanusgraph[cassandrathrift:[127.0.0.1]], standard]
```

先来谈一谈 JanusGraphFactory，它是我们在gremlin-console里面操作一个图的时候的entry-point，每当我们访问一个图的时候，系统就为我们创建了一个Configuration类的实例。

可以将这个东西和spark-shell里面的sparkSession做类比来方便理解。

ConfiguredGraphFactory不太一样，它也是我们访问、操作一个图的时候的entry-point，但配置是通过另一个singleton来实现的，叫ConfigurationManagementGraph。

ConfigurationManagementGraph 使我们可以很方便地管理图的配置。

就像上面例子一样，我们可以通过下面两种方法来访问一个图：

 ConfiguredGraphFactory.create("graphName") 
或者

ConfiguredGraphFactory.open("graphName")
可以通过下面的方法来罗列所有配置好了的图。配置好是指之前有用ConfigurationManagementGraph的API配置过：

ConfiguredGraphFactory.getGraphNames()
用下面的放来来drop一个graph database：

ConfiguredGraphFactory.drop("graphName")
如果想使用ConfiguredGraphFactory这个接口，比如在启动前JanusGraph server前配置好。修改gremlin-server.yaml文件，在graphs这个section下面，添加一行：

```yaml
ConfigurationManagementGraph: conf/JanusGraph-configurationmanagement.properties
}
```

在这个例子中，ConfigurationManagementGraph这个graph便是使用位于onf/JanusGraph-configurationmanagement.properties下的配置文件来配置，下面是配置文件的一个例子：

```yaml
storage.backend=cql
graph.graphname=ConfigurationManagementGraph
storage.hostname=127.0.0.1
```

具体ConfigurationManagementGraph怎么用呢？下面是一个例子（在gremlin-console下）：

```java
map.put("storage.backend", "cql");
map.put("storage.hostname", "127.0.0.1");
map.put("graph.graphname", "graph1");
ConfiguredGraphFactory.createConfiguration(new MapConfiguration(map));
// then access the graph
ConfiguredGraphFactory.open("graph1");
```


graph.graphname这个属性指定了上述配置是针对哪张graph的。

### Multi-node

如果我们希望在JanusGraph server启动后去动态地创建图，就要用到上面章节提到的ConfiguredGraphFactory，这要求JanusGraph集群的每个server的配置文件里面都声明了使用JanusGraphManager和ConfigurationManagementGraph，具体方法，见这个链接https://docs.janusgraph.org/basics/multi-node/。
为了保证graph的consistency，每个server node都要使用ConfiguredGraphFactory(保持集群上每个node server的配置一致性)。

### Indexing

- 支持两类graph indexing: Graph Index和Vertex-centric Index。
- graph index包含两类：Composite Index和Mixed Index。

实际上在操作时会遇到很多问题，其中最头疼的就是在执行 awaitGraphIndexStatus()方法时，会报 “Script evaluation exceeded the configured 'scriptEvaluationTimeout' threshold of 30000 ms or evaluation was otherwise cancelled directly for request [mgmt.awaitGraphIndexStatus(graph, 'byNameComposite').call()]” 的错误。

　  上面的命令其实忽略了关键的几步，下面具体说明以下。

1. 创建索引之前，确定JanusGraph没有其它事务正在运行

   查询事务命令：graph.getOpenTransactions()

   关闭其他事务：graph.getOpenTransactions().forEach { tx -> tx.rollback() }

2. 执行 REGISTER_INDEX ACTION，使索引状态INSTALLED 转为 REGISTERED

   官方文档里没有这关键的一步，在创建完索引后，需要执行以下命令：

   ```java
   m = graph.openManagement()
   m.updateIndex(m.getGraphIndex('index'), SchemaAction.REGISTER_INDEX).get()
   m.commit()
   ```

​       其中第三条命令执行后实际上是在后台运行的，此时如果我们执行ManagementSystem.awaitGraphIndexStatus(graph,"byNameComposite").status(SchemaStatus.REGISTERED).call() ，等待30s后很可能依然返回超时错误。这时候需要**耐心等待**。期间，我可以直接查看索引的状态：

```java
mgmt = graph.openManagement()
index = mgmt.getGraphIndex('index')
index.getIndexStatus(mgmt.getPropertyKey('name'))
```

等待一段时间后，索引的状态最终会变为 **REGISTERED**，此时再执行awaitGraphIndexStatus() ，会返回

```java
GraphIndexStatusReport[success=true, indexName='byTitleLowercaseComposite', targetStatus=[REGISTERED], notConverged={}, converged={title_lowercase=REGISTERED}, elapsed=PT0.001S]

```

**注意**：若索引迟迟没有变为REGISTERED，也可尝试进行下一步，更新到ENABLE。

3. 执行REINDEX与ENABLE_INDEX，完成索引

   与上一步类似，需要通过updateIndex()方法来改变索引状态。如果要索引的属性中还未导入数据，则不需要REINDEX的操作，下面的命令二选一：

   * REINDEX ACTION

   ```java
   m = graph.openManagement()
   m.updateIndex(m.getGraphIndex('index'), SchemaAction.REINDEX).get()
   m.commit()
    
   ManagementSystem.awaitGraphIndexStatus(graph,'byNameComposite').status(SchemaStatus.ENABLED).call()
   ```

   * ENABLED ACTION

   ```java
   m = graph.openManagement()
   m.updateIndex(m.getGraphIndex('index'), SchemaAction.ENABLE_INDEX).get() 
   m.commit() 
    
   ManagementSystem.awaitGraphIndexStatus(graph, 'byNameComposite').status(SchemaStatus.ENABLED).call()
    
   // 错误示例: 
   i = m.getGraphIndex('index')
   m.updateIndex(i, SchemeAction.ENABLE_INDEX)
   m.commit()
    
   // 必须要加‘get()’
   ```

   　　到最后， 执行awaitGraphIndexStatus()返回成功信息：

   ```java
   GraphIndexStatusReport[success=true, indexName='byTitleLowercaseComposite', targetStatus=[ENABLED], notConverged={}, converged={title_lowercase=ENABLED}, elapsed=PT0.001S]
   ```

#### Janusgraph索引状态不变更的问题

JanusGraph的索引因为要同步不同实例及不同后端的数据，因此不是实时能够完成的，视配置，网络和数据量不同，建立/生效索引通常需要一段时间，这也是为什么创建索引时会创建wait()的原因。

在实践中，我们经常遇到timeout()异常的出现，这一方面有数据量，网络，配置的原因，另外一方面，如果系统中有未关闭的事务或者无效的实例，均会导致索引创建阻塞，不断等待，最后超时。下面是我们团队在使用JansuGraph总结出的，解决索引超时的实践，希望对后来者有所帮助。

**1.存在没有关闭的Transaction**

如果图中存在有没有关系的Transaction，则索引状态不会变更，虽然在官方文档中提到了使用：

```java
graph.tx().rollback()
```

但该方法只能关闭当前事务，对系统中其他打开的事务无效，可以使用下面的语句替换：

```java
for(i=0;i<graph.getOpenTransactions().size();i++) {graph.getOpenTransactions().getAt(i).rollback()}
```

**2.存在幽灵实例**

使用下面的语句查询：

```java
mgmt = graph.openManagement()
mgmt.getOpenInstances();
mgmt.commit();
```

使用下面的语句关闭：

```java
mgmt = graph.openManagement();
ids = mgmt.getOpenInstances();
for(String id : ids){if(!id.contains("(")){mgmt.forceCloseInstance(id)}};
mgmt.commit();
```

#### Composite Index

通过下面的方法创建Composite Index：

```java
mgmt = graph.openManagement()
name = mgmt.getPropertyKey(‘name‘)
age = mgmt.getPropertyKey(‘age‘)
mgmt.buildIndex(‘byNameComposite‘, Vertex.class).addKey(name).buildCompositeIndex()
mgmt.buildIndex(‘byNameAndAgeComposite‘, Vertex.class).addKey(name).addKey(age).buildCompositeIndex()
mgmt.commit()
//Wait for the index to become available
ManagementSystem.awaitGraphIndexStatus(graph, ‘byNameComposite‘).call()
ManagementSystem.awaitGraphIndexStatus(graph, ‘byNameAndAgeComposite‘).call()
//Reindex the existing data
mgmt = graph.openManagement()
mgmt.updateIndex(mgmt.getGraphIndex("byNameComposite"), SchemaAction.REINDEX).get()
mgmt.updateIndex(mgmt.getGraphIndex("byNameAndAgeComposite"), SchemaAction.REINDEX).get()
mgmt.commit()
```

Composite Index方式不需要特殊地去配置底层的存储引擎（比如cassandra），主要的底层存储引擎都支持这种方式。

通过Composite Index可以来保证Property key的唯一性，用下面这种方法：

```java
mgmt = graph.openManagement()
name = mgmt.getPropertyKey(‘name‘)
mgmt.buildIndex(‘byNameUnique‘, Vertex.class).addKey(name).unique().buildCompositeIndex()
mgmt.commit()
//Wait for the index to become available
ManagementSystem.awaitGraphIndexStatus(graph, ‘byNameUnique‘).call()
//Reindex the existing data
mgmt = graph.openManagement()
mgmt.updateIndex(mgmt.getGraphIndex("byNameUnique"), SchemaAction.REINDEX).get()
mgmt.commit()
```

#### Mixed Index

通过下面的方式来创建Mixed Index：

```graph.tx().rollback()  //Never create new indexes while a transaction is active
mgmt = graph.openManagement()
name = mgmt.getPropertyKey(‘name‘)
age = mgmt.getPropertyKey(‘age‘)
mgmt.buildIndex(‘nameAndAge‘, Vertex.class).addKey(name).addKey(age).buildMixedIndex("search")
mgmt.commit()
//Wait for the index to become available
ManagementSystem.awaitGraphIndexStatus(graph, ‘nameAndAge‘).call()
//Reindex the existing data
mgmt = graph.openManagement()
mgmt.updateIndex(mgmt.getGraphIndex("nameAndAge"), SchemaAction.REINDEX).get()
mgmt.commit()
```

Mixed Index方式需要特殊地去配置底层的存储引擎（比如cassandra）的索引。

Mixed Index比Composite Index更加灵活，但是对于含有相等关系的谓语关系的查询效率更慢。

buildMixedIndex方法的参数string要和properties文件中配置的一致，比如：

- index.search.backend
  这个配置中间的部分search就是buildMixedIndex方法的参数。

有了Mixed Index，这面这些query就支持用索引来加速了：

```g.V().has(‘name‘, textContains(‘hercules‘)).has(‘age‘, inside(20, 50))
g.V().has(‘name‘, textContains(‘hercules‘))
g.V().has(‘age‘, lt(50))
g.V().has(‘age‘, outside(20, 50))
g.V().has(‘age‘, lt(50).or(gte(60)))
g.V().or(__.has(‘name‘, textContains(‘hercules‘)), __.has(‘age‘, inside(20, 50)))
```

总结两种Graph Index的区别：

1. Use a composite index for exact match index retrievals. Composite indexes do not require configuring or operating an external index system and are often significantly faster than mixed indexes.

   a. As an exception, use a mixed index for exact matches when the number of distinct values for query constraint is relatively small or if one value is expected to be associated with many elements in the graph (i.e. in case of low selectivity).

2. Use a mixed indexes for numeric range, full-text or geo-spatial indexing. Also, using a mixed index can speed up the order().by() queries.

#### Vertex-centric Indexes

```java
mgmt = graph.openManagement()
time = mgmt.getPropertyKey(‘time‘)
rating = mgmt.makePropertyKey(‘rating‘).dataType(Double.class).make()
battled = mgmt.getEdgeLabel(‘battled‘)
mgmt.buildEdgeIndex(battled, ‘battlesByRatingAndTime‘, Direction.OUT, Order.decr, rating, time)
mgmt.commit()
//Wait for the index to become available
ManagementSystem.awaitRelationIndexStatus(graph, ‘battlesByRatingAndTime‘, ‘battled‘).call()
//Reindex the existing data
mgmt = graph.openManagement()
mgmt.updateIndex(mgmt.getRelationIndex(battled, ‘battlesByRatingAndTime‘), SchemaAction.REINDEX).get()
mgmt.commit()
```

注意上面的Index是有顺序的，先对rating做index，再对time做index，因此：

```h = g.V().has(‘name‘, ‘hercules‘).next()
g.V(h).outE(‘battled‘).property(‘rating‘, 5.0) //Add some rating properties
g.V(h).outE(‘battled‘).has(‘rating‘, gt(3.0)).inV() // query-1
g.V(h).outE(‘battled‘).has(‘rating‘, 5.0).has(‘time‘, inside(10, 50)).inV() // query-2
g.V(h).outE(‘battled‘).has(‘time‘, inside(10, 50)).inV() // query-3
```

上述3个query中，前两个被加速了，但第三没并没有。

JanusGraph automatically builds vertex-centric indexes per edge label and property key. That means, even with thousands of incident battled edges, queries like g.V(h).out(‘mother‘) or g.V(h).values(‘age‘) are efficiently answered by the local index.

### Transaction 事务

JanusGraph具有事务安全性，可以在多个并行的线程中同时使用。通常，使用：graph.V(...) and graph.tx().commit()这样的ThreadLocal接口来执行一次事务。
例：根据TinkerPop框架事务机制的描述，每一个线程在它执行第一个操作的时候开启一个事务：

```java
juno = graph.addVertex() //Automatically opens a new transaction
juno.property("name", "juno")
graph.tx().commit() //Commits transaction
```

在上面这个例子中，addVertex()函数执行的时候，事务被开启，然后当我们显示执行graph.tx().commit()的时候，事务关闭。

当事务还没有完成，却调用了graph.close()关闭了数据库，那么这个事务的后期行为是不得而知的，一般情况下，事务应该会被回滚。但执行close()的线程所对应的事务会被顺利地commit。

#### 事务处理范围（scope）

根据TinkerPop框架事务机制的描述，每一个线程在它执行第一个操作的时候开启一个事务，所有的图操作元素（顶点，边，类型等变量等）均和该事务自动绑定了，当我们使用commit()或者rollback()关闭/回滚一个事务的时候，这些图操作元素就会失效，但是，顶点和类型会被自动地转移到下一个事务中，如下面的例子：

```java
juno = graph.addVertex() //Automatically opens a new transaction
graph.tx().commit() //Ends transaction
juno.property("name", "juno") //Vertex is automatically transitioned
```

但是，边不能自动转移到下一个事务中，需要显式地刷新，如下面的例子：

```java
graph.tx().commit() //Ends transaction
e = g.E(e).next() //Need to refresh edge
e.property("time", 99)
```

#### 事务失败（failure）

当我们在创建一个事务，并做一系列操作的时候，应该事先考虑到事务失败的可能性（IO exceptions, network errors, machine crashes or resource unavailability...），所以推荐用下面的方式处理异常：

```java
if (g.V().has("name", name).iterator().hasNext())
        throw new IllegalArgumentException("Username already taken: " + name)
    user = graph.addVertex()
    user.property("name", name)
    graph.tx().commit()
} catch (Exception e) {
    //Recover, retry, or return error message
    println(e.getMessage())
}
```

上面的例子描述了一个注册功能，先检查名字存不存在，如果不存在，则创建该user，然后commit。

如果事务失败了，会抛出JanusGraphException异常，事务失败有很多种可能，JanusGraph区分了两种常见的failure：

1. potentially temporary failure
   potentially temporary failure主要与是IO异常（IO hiccups (e.g. network timeouts)）和资源可用情况（resource unavailability）有关。
   JanusGrpah会自动去尝试从temporary failure中恢复，重新尝试commit事务，retry的次数可以配置。

2. permanent failure
   permanent failure主要与完全的连接失败，硬件故障和锁挣脱有关（complete connection loss, hardware failure or lock contention）。
   锁的争夺，比如两个人同时同时以"juno"的用户名去注册，其中一个事务必然失败。根据事务的语义，可以通过重试失败的事务来尝试从锁争夺中恢复（比如使用另一个用户名）。
   一般有两种典型的情形

   - PermanentLockingException(Local lock contention)：另一个线程已经被赋予了竞争锁
   - PermanentLockingException(Expected value mismatch for X: expected=Y vs actual=Z)：

   Tips: The verification that the value read in this transaction is the same as the one in the datastore after applying for the lock failed. In other words, another transaction modified the value after it had been read and modified.

#### 多线程事务（Multi-Threaded Transactions）

多线程事务指的是同一个事务可以充分利用机器的多核架构来多线程执行，见TinkerPop关于threaded transaction的描述。

可以通过createThreadedTx()方法来创建一个线程独立的事务：

```java
threads = new Thread[10];
for (int i=0; i<threads.length; i++) {
    threads[i]=new Thread({
        println("Do something with ‘threadedGraph‘‘");
    });
    threads[i].start();
}
for (int i=0; i<threads.length; i++) threads[i].join();
threadedGraph.tx().commit();
```

createThreadedTx()方法返回了一个新的Graph对象，tx()对象在创建线程的时候，并没有为每个线程创建一个事务，也就是说，所有的线程都运行在同一个事务中，这样我们就实现了threaded transaction。

JanusGraph可以支持数百个线程运行在同一个事务中。

通过createThreadedTx()接口可以很轻松的创建并行算法（Concurrent Algorithms），尤其是那些适用于并行计算的算法。

createThreadedTx()接口的另一个应用是创建嵌套式的事务（Nested Transactions），具体的例子见这里，这对于那些long-time running的事务尤其有作用。

#### 事务处理的一些常见问题

再次强调一下，JanusGraph的逻辑是，当我们对一个graph进行第一次操作的时候，事务就自动被打开了，我们并不需要去手动的创建一个事务，除非我们希望创建一个multi-threaded transaction。

每个事物都要显式地用commit()和rollback()方法去关闭。

一个事务在开始的时候，就会去维持它的状态，在多线程应用的环境中，可能会出现不可预知的问题，比如下面这个例子：

```shell
g.V(v).bothE()
>>returns nothing, v has no edges
//thread is idle for a few seconds, another thread adds edges to v
g.V(v).bothE()
>>still returns nothing because the transactional state from the beginning is maintained
```

这种情况在客户端应用端很常见，server会维持多个线程去相应服务器的请求。比较好的一个习惯是，在没完成一部分工作后，就去显式地terminate任务，如下面这个例子：

```shell
g.V(v).bothE()
graph.tx().commit()
//thread is idle for a few seconds, another thread adds edges to v
g.V(v).bothE()
>>returns the newly added edge
graph.tx().commit()
```

多线程事务（Multi-Threaded Transactions）还可以通过newTransaction()方法来创建，但要注意的是，在该事务中创建的点和边只在该事务中可用，事务被关闭以后，访问这些点和边就会抛出异常，如果还想使用这些点和边怎么办？答案是显式地去刷新这些点和边，如下面这个例子：

- g.V(existingVertex)
- g.E(existingEdge)

#### 事务的相关配置（configuration）

JanusGraph.buildTransaction() 也可以启动一个多线程的事务，因此它和上面提到的newTransaction()方法其实是一样的功能，只不过buildTransaction()方法提供了附加的配置选项。

buildTransaction()会返回一个TransactionBuilder实例，TransactionBuilder实例可以配置选项。

配置好后，接着可以调用start()方法来启动一个线程，这样会返回一个JanusGraphTransaction实例。

### 缓存机制（JanusGraph Cache）

#### Transaction-level caching

通过graph.buildTransaction().setVertexCacheSize(int)可以来设置事务的缓存大小（cache.tx-cache-size）。

当一个事务被打开的时候，维持了两类缓存：

- Vertex cache
- Index cache

1. Vertex cache
   Vertex cache主要包含了事务中使用到的点，以及这些点的邻接点列表（adjacency list）的一个子集，这个子集包括了在同一个事务中被取出的该点的邻接点。所以，heap中vertex cache使用的空间不仅与事务中存在的顶点数有关，还与这些点的邻接点数目有关。

   Vertex cache中能维持的最多的顶点数等于transaction cache size。Vertex cache能显著地提高iteractive traversal的速度。当然，如果同样的vertex在后面并没有被重新访问，那vertex cache就没有起到作用。

2. Index cache
   如果在一个事务中，前面部分的query用到了某个索引（index），那么后面使用这个query的时候，获取结果的速度会大大加快，这就是index cache的作用，当然，如果后面并没有再使用相同的index和相同的query，那Index query的作用也就没有体现了。

   Index cache中的每个条目都会被赋予一个权重，这个权重等与 2 + result set size，整个index cache的权重不会超过transaction cache size的一半。

#### Database-level caching

Database-level caching实现了多个transaction之间cache的共享，从空间利用率上来说，database-lvel caching更经济，但访问速度比transaction-level稍慢。

Database-level cache不会在一个事务结束后马上失效，这使得处于多个事务中的读操作速度显著地提高。

- Cache Expiration Time
  Cache expiration time通过 cache.db-cache-time （单位为：milliseconds）参数来调整。

这里有一个trick，如果我们只启动了一个JanusGraph instance，因为没有另一个instance去改变玩我们的图（graph），cache expiration time便可以设置为 0，这样的话，cache就会无限期保留处于cache中的元素（除非因为空间不足被顶替）。

如果我们启动了多个JanusGraph实例，这个时间应该被设置成当一个instance修改了图，另一个instance能够看到修改所需要等待的最大时间。如果希望修改被其他的instance迅速能够看到，那么应该停止使用Database-level cache。允许的时延越长，cache的效率越高。

当然，一个JanusGraph instance始终能够马上看到它自己做出的修改。

- Cache Size
  Cache size通过 cache.db-cache-size 参数来控制Database-level的cache能使用多少heap space，cache越大， 效率越高，但由此带来的GC性能问题却不容小觑。

  cache size也可以配置成百分比（占整个剩余的heap空间的比例）。

  注意cache size的配置是排他性的，也就是说cache会独占你配置的空间，其他资源（e.g. Gremlin Server, embedded Cassandra, etc）也需要heap spave，所以不要把cache size配置得太过分，否则可能会引起out of memory错误或者GC问题。

- Clean Up Wait Time
  还有一个需要注意的参数是 cache.db-cache-clean-wait，当一个顶点被修改后，所有与该顶点有关的Database-level的cache都会失效并且会被驱逐。JanusGraph会从底层的storage backend重新fetch新的顶点数据，并re-populate缓存。

  cache.db-cache-clean-wait 这个参数可以控制，cache会等待 cache.db-cache-clean-wait milliseconds时间再repopulate新的cache。

- Storage Backend Caching
  底层的storage backend也会有自己的cache策略，这个就要参考对应的底层存储的文档了。

### 事务日志（Transaction Log）

可以启动记录事务的变化日志，日志可以用来在后期进行处理，或者作为一个record备份。

在启动一个事务的时候指定是否需要采集日志：

```
tx = graph.buildTransaction().logIdentifier(‘addedPerson‘).start()
u = tx.addVertex(label, ‘human‘)
u.property(‘name‘, ‘proteros‘)
u.property(‘age‘, 36)
tx.commit()
```

这里有个 log processor 的概念，其实就是内置的日志监听处理器。例如，可以统计在一个transaction里面，某一个label下被添加的顶点的数目。

### 其他常见问题

#### Accidental type creation
默认地，当遇到一个新的type的时候，janusGrpah会自动地去创建property keys和边的label。对于schema这个问题，还是建议用户自己去定义schema，而不要使用自动发现schema的方式，可以在配置文件里面如下申明关闭自动infer schema的功能：

#### schema.default = none
创建type的操作也不宜放在不同的线程中，因为这会引起不可知的后果，最好放到一个batch操作中把所有的type都事先创建好，然后再去做其他的图操作。

#### Custom Class Datatype
可以自己去创建class，作为value的类别。

#### Transactional Scope for Edges
边应该先取出来，再操作，每个transaction都是有scope的，如果超出了这个scope，去访问之前的边，会报错。

#### Ghost Vertices
这个概念比较新奇，指的是：我们在一个事务中删除了一个vertex，却同时在另一个transaction中修改了它。这种情况下，这个vertex还是会依然存在的，我们称这种vertex为ghost vertex。

对于这个问题的解决办法最好是暂时允许ghost vertices，然后定期地写脚本去删除它们。

#### Debug-level Logging Slows Execution
Log level如果被设置成了 DEBUG，输出可能会很大，日志中会包括一个query如何被编译、优化和执行的过程，这会显著地影响处理的性能，在生产环境下，不建议使用 DEBUG level，建议是用 INFO level。

#### Elasticsearch OutOfMemoryException

当有很多客户端连接到Elasticsearch的时候，可能会报 OutOfMemoryException 异常，通常这不是一个内存溢出的问题，而是OS不允许运行ES的用户起太多的进程。

可以通过调整运行es的用户可运行的进程数（number of allowed processes）也许可以解决这个问题。

#### Dropping a Database

删除一个graph instance，可以使用：

```java
graph = JanusGraphFactory.open(‘path/to/configuration.properties‘)
JanusGraphFactory.drop(graph);

# ConfiguredGraphFactory接口
graph = ConfiguredGraphFactory.open(‘example‘)
ConfiguredGraphFactory.drop(‘example‘);
```

- Note:
  0.3.0以前的版本除了需要执行上面的命令，还需要显示地调用 JanusGraphFactory.close(graph)和 ConfiguredGraphFactory.close("example")来关闭这个graph，以防cache中还存在这个graph，造成错误。

### 技术上的限制（Technical Limitations）

这个部分可以理解JanusGrpah还存在的一些可改进或者无法改进的地方。

#### 设计上的限制

下面这些缺陷是JanusGraph天然设计上的一些缺陷，这些缺陷短期内是得不到解决的。

- Size Limitation

JanusGraph can store up to a quintillion edges (2^60) and half as many vertices. That limitation is imposed by JanusGraph’s id scheme.

- DataType Definitions

当我们用 dataType(Class) 接口去定义property key的数据类型的时候，JanusGraph会enforce该key的所有属性都严格是该类型。这是严格的类型判断，子类也不可行。比如，如果我们定义的数据类型是Number.class，使用的却是Integer或者Long型，这种情况大多数情况下会报错。

用Object.class或许可以解决这个问题，比较灵活，但带来的问题也显而易见，那就是性能上会降低，同时数据类型的check也会失效。

- Type Definitions cannot be changed

Edge label, vertex label和property key一旦创建就不能改变了，当然，type可以被重命名，新的类型也可以在runtime中创建，所以schema是支持envolving的。

- 保留的关键字（Reserved Keywords）
  下面是JanusGraph保留的关键字，不要使用这些关键字作为变量名、函数名等。

vertex
element
edge
property
label
key

#### 临时的缺陷

下面这些缺陷在将来的release中会被逐渐解决。

- Limited Mixed Index Support
  Mixed Index只支持JanusGraph所支持的数据类型（Data type）的一个子集，Mixed Index目前也不支持 SET 和 LIST 作为基数（cardinality）的property key。

- Batch Loading Speed
  可以通过下面的configuration来开启 batch loading mode：

- Name	Description	Datatype	Default Value	Mutability
  storage.batch-loading	Whether to enable batch loading into the storage backend	Boolean	false	LOCAL
  这个trick其实并没有使用底层的backend的batch loading技术。

另一个限制是，如果同时向一个顶点导入数百万条边，这种情况下很可能failure，我们称这种loading为 supernode loading，这种loading之所以失败是受到了后端存储的限制，具体这里就不细数了。

## 后端存储（Storage Backends）

- Apache Cassandra
  JanusGraph后端通过四种方式来支持整合Cassandra:

- cql - CQL based driver （推荐使用）
- cassandrathrift - JanusGraph’s Thrift connection pool driver （v2.3以后退休了，也不建议使用)
- cassandra - Astyanax driver. The Astyanax project is retired.
- embeddedcassandra - Embedded driver for running Cassandra and JanusGraph within the same
- JVM（测试可以，但生产环境不建议使用这种方式）
- Local Server Mode
- Cassandra可以作为一个standalone的数据库与JanusGraph一样运行在localhost，在这种情况下，JanusGraph和Cassandra之间通过socket通信。

### Apache Cassandra

通过下面的步骤配置JanusGraph on Cassandra：

Download Cassandra, unpack it, and set filesystem paths in conf/cassandra.yaml and conf/log4j-server.properties
Connecting Gremlin Server to Cassandra using the default configuration files provided in the pre-packaged distribution requires that Cassandra Thrift is enabled. To enable Cassandra Thrift open conf/cassandra.yaml and update start_rpc: false to start_rpc: true. If Cassandra is already running Thrift can be started manually with bin/nodetool enablethrift. the Thrift status can be verified with bin/nodetool statusthrift.
Start Cassandra by invoking bin/cassandra -f on the command line in the directory where Cassandra was unpacked. Read output to check that Cassandra started successfully.
Now, you can create a Cassandra JanusGraph as follows

```
JanusGraph g = JanusGraphFactory.build().
set("storage.backend", "cql").
set("storage.hostname", "127.0.0.1").
open();
```

#### Local Container Mode

通过docker安装Cassandra，去release界面看一下JanusGraph版本测试通过的Cassandra版本，使用下面的docker命令运行Cassandra：

docker run --name jg-cassandra -d -e CASSANDRA_START_RPC=true -p 9160:9160 -p 9042:9042 -p 7199:7199 -p 7001:7001 -p 7000:7000 cassandra:3.11
Note: Port 9160 is used for the Thrift client API. Port 9042 is for CQL native clients. Ports 7000, 7001 and 7099 are for inter-node communication.

#### Remote Server Mode

集群模式下，有一个Cassandra集群，然后所有的JanusGraph的instance通过socket的方式去读写Cassandra集群，客户端应用程序也可以和JanusGraph的实例运行在同一个JVM中。

举个例子，我们启动了一个Cassandra的集群，其中一个机器的IP是77.77.77.77，我们可以通过以下方式连接：

```shell
JanusGraph graph = JanusGraphFactory.build().
set("storage.backend", "cql").
set("storage.hostname", "77.77.77.77").
open();
>>Remote Server Mode with Gremlin Server
```

可以在JanusGraph server外面包上一层Gremlin server，这样，不仅可以和JanusGraph server交互，也可以和Gremlin server交互。

通过：

bin/gremlin-server.sh
启动Gremlin server，然后通过 bin/gremlin.sh 打开Gremlin的终端，然后运行：

```shell
:remote connect tinkerpop.server conf/remote.yaml
:> g.addV()
```

便可以了。

#### JanusGraph Embedded Mode

Cassandra也可以整合到JanusGraph中，在这种情况下，JanusGraph和Cassandra运行在同一个JVM中，本次通过进程间通信而不是网络传输信息，这种情况通过在performance上有很大的帮助。

如果想使用Cassandra的embedded mode，需要配置embeddedcassandra作为存储后端。

这种embedded模式推荐通过Gremlin server来暴露JanusGraph。

需要注意的是，embedded方式需要GC调优。

### Apache HBase

#### Local Server Mode

从此处http://hbase.apache.org/下载一个HBase的stable release。
Start HBase by invoking the start-hbase.sh script in the bin directory inside the extracted HBase directory. To stop HBase, use stop-hbase.sh.
然后通过：

```
JanusGraph graph = JanusGraphFactory.build()
.set("storage.backend", "hbase")
.open();
```

连接到HBase。

Remote Server Mode
集群模式，JanusGraph的实例通过socket与HBase建立连接，并进行读写操作。

假设我们启动了一个HBase并使用zookeeper作为协调器，zk的IP是 77.77.77.77, 77.77.77.78和77.77.77.79，那么我们通过下面的方式连接到HBase：

```
JanusGraph g = JanusGraphFactory.build()
.set("storage.backend", "hbase")
.set("storage.hostname", "77.77.77.77, 77.77.77.78, 77.77.77.79")
.open();
>>Remote Server Mode with Gremlin Server
```

和Cassandra章节讲的一样，我们可以在JanusGraph server外面再包一层Gremlin server：

http://gremlin-server.janusgraph.machine1/mygraph/vertices/1
http://gremlin-server.janusgraph.machine2/mygraph/tp/gremlin?script=g.v(1).out(‘follows‘).out(‘created‘)
Gremlin-server的配置文件也要做响应的修改，下面是个例子：

```properties
graphs: {
  g: conf/janusgraph-hbase.properties
}
scriptEngines: {
  gremlin-groovy: {
    plugins: { org.janusgraph.graphdb.tinkerpop.plugin.JanusGraphGremlinPlugin: {},
               org.apache.tinkerpop.gremlin.server.jsr223.GremlinServerGremlinPlugin: {},
               org.apache.tinkerpop.gremlin.tinkergraph.jsr223.TinkerGraphGremlinPlugin: {},
               org.apache.tinkerpop.gremlin.jsr223.ImportGremlinPlugin: {classImports: [java.lang.Math], methodImports: [java.lang.Math#*]},
               org.apache.tinkerpop.gremlin.jsr223.ScriptFileGremlinPlugin: {files: [scripts/empty-sample.groovy]}}}}
...
```

#### HBase的配置

在配置说明章节，有一系列配置选项，要注意 storage.hbase.table 参数，默认table的名字是janusgraph。

- Gloabl Graph Operations

JanusGraph over HBase 支持全局的点和边的遍历，但这种情况下，会把所有的点和边导入到内存中，可能会报 OutOfMemoryException 错误。可以使用 Gremlin-hadoop 的方式去遍历。

- InMemory Storage Backend

JanusGraph支持使用纯内存，可以通过下面的属性配置：

- storage.backend=inmemory

### InMemory Storage Backend

可以在Gremlin-console直接打开内存中的图：

graph = JanusGraphFactory.build().set(‘storage.backend‘, ‘inmemory‘).open()
这种情况下，如果关闭该图或者停止graph的进程，图的所有数据都会丢失。这种模式也只支持单点模式，不支持多个JanusGraph的图实例共享。

这种存储策略不适合在生产中使用。

#### 后端索引（Index Backends）

查询谓语和数据类型
比较谓语
eq (equal)
neq (not equal)
gt (greater than)
gte (greater than or equal)
lt (less than)
lte (less than or equal)
文本操作谓语（Text Predicate）
主要可以用这些operator做full-text search，常见的有两类：

1. String中以词为粒度的
   textContains
   textContainsPrefix
   textContainsRegex
   textContainsFuzzy
2. 以整个String为粒度的
   textPrefix
   textRegex
   textFuzzy
   区间操作谓语（Geo Predicate)
   区间操作谓语包括：

geoIntersect
geoWithin
geoDisjoint
geoContains
查询样例

```java
g.V().has("name", "hercules")
// 2) Find all vertices with an age greater than 50
g.V().has("age", gt(50))
// or find all vertices between 1000 (inclusive) and 5000 (exclusive) years of age and order by increasing age
g.V().has("age", inside(1000, 5000)).order().by("age", incr)
// which returns the same result set as the following query but in reverse order
g.V().has("age", inside(1000, 5000)).order().by("age", decr)
// 3) Find all edges where the place is at most 50 kilometers from the given latitude-longitude pair
g.E().has("place", geoWithin(Geoshape.circle(37.97, 23.72, 50)))
// 4) Find all edges where reason contains the word "loves"
g.E().has("reason", textContains("loves"))
// or all edges which contain two words (need to chunk into individual words)
g.E().has("reason", textContains("loves")).has("reason", textContains("breezes"))
// or all edges which contain words that start with "lov"
g.E().has("reason", textContainsPrefix("lov"))
// or all edges which contain words that match the regular expression "br[ez]*s" in their entirety
g.E().has("reason", textContainsRegex("br[ez]*s"))
// or all edges which contain words similar to "love"
g.E().has("reason", textContainsFuzzy("love"))
// 5) Find all vertices older than a thousand years and named "saturn"
g.V().has("age", gt(1000)).has("name", "saturn")
数据类型（Data Type Support）
```

Composite index可以支持任何类型的index，mixed index只支持下面的数据类型：

Byte
Short
Integer
Long
Float
Double
String
Geoshape
Date
Instant
UUID

#### Geoshape Data Type

只有mixed indexes支持Geoshape Data Type，支持的数据类型有point, circle, box, line, polygon, multi-point, multi-line 和 multi-polygon。

#### 集合类型（Collections）

如果使用 Elasticsearch，可以索引cardinality为 SET 或者 LIST 的属性，如下面的例子：

```java
mgmt = graph.openManagement()
nameProperty = mgmt.makePropertyKey("names").dataType(String.class).cardinality(Cardinality.SET).make()
mgmt.buildIndex("search", Vertex.class).addKey(nameProperty, Mapping.STRING.asParameter()).buildMixedIndex("search")
mgmt.commit()
//Insert a vertex
person = graph.addVertex()
person.property("names", "Robert")
person.property("names", "Bob")
graph.tx().commit()
//Now query it
g.V().has("names", "Bob").count().next() //1
g.V().has("names", "Robert").count().next() //1
```

#### 索引参数和全局搜索

当我们定义一个Mixed index的时候，每一个被添加到索引中的property key都有一系列参数可以设置。

Full-Text Search
全局索引，这是一个很重要的功能。当我们去索引字符串类型的property key的时候，我们可以选择从character层面后者text层面去索引，这需要改变 mapping 参数。

当我们从text层面去索引的时候，字符串会被tokenize成bag of words，用户便可以去query是否包含一个或多个词，这叫做 full-text search。

当我们从char层面去索引的时候，string会直接和char串做match，不会有futher analysis后者tokenize操作。这可以方便我们去查找是否包含某个字符序列，这也叫做 string search。

下面分开讲：

- Full-Text Search

默认地，string会使用text层面的索引，可以通过下面的方式显示地去创建：

```java
mgmt = graph.openManagement()
summary = mgmt.makePropertyKey(‘booksummary‘).dataType(String.class).make()
mgmt.buildIndex(‘booksBySummary‘, Vertex.class).addKey(summary, Mapping.TEXT.asParameter()).buildMixedIndex("search")
mgmt.commit()
```

可以看到，这和普通的创建索引唯一的一个区别是我们在调用 addKey() 方法的时候，多添加了一个 Mapping.TEXT 映射参数。

前面我们提到过，如果是使用text层面的index，JanusGraph会自己去维护一个bag of words，JanusGraph默认的tokenization方案是：它会使用非字母数字的字段去split，然后会移除到所有小于2个字符的token。

当我们使用text层面的index的时候，只有全局索引的谓语才真正用到了我们创建的索引，包括textContains方法，textContainsPrefix方法，textContainsRegex方法和textContainsFuzzy方法，注意，full-text search是case-insensitive的，下面是具体的例子：

```java
import static org.janusgraph.core.attribute.Text.*
g.V().has(‘booksummary‘, textContains(‘unicorns‘))
g.V().has(‘booksummary‘, textContainsPrefix(‘uni‘))
g.V().has(‘booksummary‘, textContainsRegex(‘.*corn.*‘))
g.V().has(‘booksummary‘, textContainsFuzzy(‘unicorn‘))
```

- String Search

首先要明确的是，string search会把数据load到内存中，这其实是非常costly的。

可以通过下面的方式去显示地创建string search：

```java
mgmt = graph.openManagement()
name = mgmt.makePropertyKey(‘bookname‘).dataType(String.class).make()
mgmt.buildIndex(‘booksBySummary‘, Vertex.class).addKey(name, Mapping.STRING.asParameter()).buildMixedIndex("search")
mgmt.commit()
```

这种 bookname 会按照 as-is 的方式去分析，包括stop word和no-letter character。

当我们使用string层面的index的时候，只有下面的谓语才真正用到了我们创建的索引，包括eq，neq、textPrefix、textRegex和textFuzzy。注意，string search是case-insensitive的，下面是具体的例子：

```java
import static org.apache.tinkerpop.gremlin.process.traversal.P.*
import static org.janusgraph.core.attribute.Text.*
g.V().has(‘bookname‘, eq(‘unicorns‘))
g.V().has(‘bookname‘, neq(‘unicorns‘))
g.V().has(‘bookname‘, textPrefix(‘uni‘))
g.V().has(‘bookname‘, textRegex(‘.*corn.*‘))
g.V().has(‘bookname‘, textFuzzy(‘unicorn‘))
```

同时使用text和string层面的full-text search
如果我们使用elasticsearch作为后端，这样就可以用所有的谓语去做精确或者模糊的查询了。

通过下面的方式创建这种叫做 Mapping.TEXTSTRING 的full-text search方案：

```java
mgmt = graph.openManagement()
summary = mgmt.makePropertyKey(‘booksummary‘).dataType(String.class).make()
mgmt.buildIndex(‘booksBySummary‘, Vertex.class).addKey(summary, Mapping.TEXTSTRING.asParameter()).buildMixedIndex("search")
mgmt.commit()
```

- Geo Mapping

默认地，JanusGraph支持索引点（point）的索引，并且去查询circle或者box类型的property，如果想索引一个非-点类型的property，需要使用 Mapping.PREFIX_TREE：

```java
mgmt = graph.openManagement()
name = mgmt.makePropertyKey(‘border‘).dataType(Geoshape.class).make()
mgmt.buildIndex(‘borderIndex‘, Vertex.class).addKey(name, Mapping.PREFIX_TREE.asParameter()).buildMixedIndex("search")
mgmt.commit()
Direct Index Query
```

可以直接向index backend发送query，下面是个例子：

```java
ManagementSystem mgmt = graph.openManagement();
PropertyKey text = mgmt.makePropertyKey("text").dataType(String.class).make();
mgmt.buildIndex("vertexByText", Vertex.class).addKey(text).buildMixedIndex("search");
mgmt.commit();
// ... Load vertices ...
for (Result<Vertex> result : graph.indexQuery("vertexByText", "v.text:(farm uncle berry)").vertices()) {
   System.out.println(result.getElement() + ": " + result.getScore());
}
```

需要指明两个元素：

想要查询的index backend的index名字，在上面的例子中是 vertexByText 。
查询语句，在上面的例子中是 v.text:(farm uncle berry) 。
Elasticsearch
Running elasticsearch
下载包里面本身包含兼容的elasticsearch的distribution，通过：

elasticsearch/bin/elasticsearch
来运行elasticsearch。要注意的是，es不能使用root运行。

ES配置
JanusGraph支持通过HTTP客户端连接到正在运行的ES集群。

在配置文件中，Elasticsearch client需要通过下面这一行指明：

index.search.backend=elasticsearch
通过 index.[X].hostname 指明某一个或者一系列es的实例的地址：

index.search.backend=elasticsearch
index.search.hostname=10.0.0.10:9200
可以通过下面的方式绑定要一段连续的IP:PORT对：

index.search.backend=elasticsearch
index.search.hostname=10.0.0.10, 10.0.0.20:7777
REST Client
Rest client可以通过 index.[X].bulk-refresh 参数控制改变多久能被索引到。

REST Client 既可以配置成HTTP的方式也可以配置成HTTPS的方式。

HTTPS authentification
可以通过 index.[X].elasticsearch.ssl.enabled 开启HTTP的SSL支持。注意，这可能需要修改 index.[X].port 参数，因为ES的HTTPS服务的端口号可能和通常意义的REST API端口（9200）不一样。

HTTP authentification
可以通过配置 index.[X].elasticsearch.http.auth.basic.realm 参数来通过HTTP协议做认证。

```java
index.search.elasticsearch.http.auth.type=basic
index.search.elasticsearch.http.auth.basic.username=httpuser
index.search.elasticsearch.http.auth.basic.password=httppassword
tips:
```

可以自己实现class来实现认证：

```java
index.search.elasticsearch.http.auth.custom.authenticator-class=fully.qualified.class.Name
index.search.elasticsearch.elasticsearch.http.auth.custom.authenticator-args=arg1,arg2,...
```

自己实现的class必须实现 org.janusgraph.diskstorage.es.rest.util.RestClientAuthenticator 接口。

### 高级功能

#### Advanced Schema

1. Static Vertex
   Vertex label可以定义为static的，一旦创建，就不能修改了。

```java
mgmt = graph.openManagement()
tweet = mgmt.makeVertexLabel(‘tweet‘).setStatic().make()
mgmt.commit()
```

2. Edge and Vertex TTL
   边和顶点可以配置对应的time-to-live(TTL)，这个概念有点类似于数据库中的临时表的概念，用这种方式创建的点和边在使用一段时间以后会被自动移除掉。

* Edge TTL

  ```java
  mgmt = graph.openManagement()
  visits = mgmt.makeEdgeLabel(‘visits‘).make()
  mgmt.setTTL(visits, Duration.ofDays(7))
  mgmt.commit()
  ```

  需要注意的是，这种方法后端数据库必须支持cell level TTL，目前只有Cassandra和HBase支持。

* Property TTL

  ```java
  mgmt = graph.openManagement()
  sensor = mgmt.makePropertyKey(‘sensor‘).cardinality(Cardinality.LIST).dataType(Double.class).make()
  mgmt.setTTL(sensor, Duration.ofDays(21))
  mgmt.commit()
  ```

* Vertex TTL

  ```java
  mgmt = graph.openManagement()
  tweet = mgmt.makeVertexLabel(‘tweet‘).setStatic().make()
  mgmt.setTTL(tweet, Duration.ofHours(36))
  mgmt.commit()
  Undirected Edges
  mgmt = graph.openManagement()
  mgmt.makeEdgeLabel(‘author‘).unidirected().make()
  mgmt.commit()
  ```

  这种undirected edge只能通过out-going的方向去遍历，这有点像万维网。

#### Eventually-Consistent Storage Backends

底层数据的最终一致性问题。

Eventually consistent storage backend有哪些？Apache Cassandra 或者 Apache HBase其实都是这种数据库类型。

* 数据的一致性
  通过 JanusGraphManagement.setConsistency(element, ConsistencyModifier.LOCK) 方法去定义数据的一致性问题， 如下面的例子：

  ```java
  mgmt = graph.openManagement()
  name = mgmt.makePropertyKey(‘consistentName‘).dataType(String.class).make()
  index = mgmt.buildIndex(‘byConsistentName‘, Vertex.class).addKey(name).unique().buildCompositeIndex()
  mgmt.setConsistency(name, ConsistencyModifier.LOCK) // Ensures only one name per vertex
  mgmt.setConsistency(index, ConsistencyModifier.LOCK) // Ensures name uniqueness in the graph
  mgmt.commit()
  ```

  使用锁其实开销还是很大的，在对数据一致性要求不高的情形，最好不用锁，让后期数据库自己在读操作中去解决数据一致性问题。

当有两个事务同时对一个元素进行写操作的时候，怎么办呢？我们可以先让写操作成功，然后后期再去解决一致性问题，具体有两种思路解决这个问题：

1. Forking Edges
   思想就是，每一个事务fork一个对应的要修改的edge，再根据时间戳去在后期修改。

下面是个例子：

```java
mgmt = graph.openManagement()
related = mgmt.makeEdgeLabel(‘related‘).make()
mgmt.setConsistency(related, ConsistencyModifier.FORK)
mgmt.commit()
```


这里，我们创建了一个edge label，叫做 related，然后我们把一致性属性设置成了 ConsistencyModifier.FORK。

这个策略只对MULTI类别的边适用。其他的multiplicity并不适用，因为其它multiplicity显式地应用了锁。

#### Failure & Recovery

失败和恢复，主要是两个部分：

* 事务的失败和恢复
* 实例的宕机和恢复

1. 事务的失败和恢复

   事务如果在调用 commit() 之前失败，是可以恢复的。commit() 之前的改变也会被回滚。

有时候，数据persist到存储系统的过程成功了，但创建index的的过程却失败了。这种情况下，该事务会被认为成功了，因为底层存储才是source of graph。

但这样会带来数据和索引的不一致性。JanusGraph维护了一份 transaction write-ahead log，对应的有两个参数可以调整：

tx.log-tx = true
tx.max-commit-time = 10000
如果一个事务的persistance过程超过了 max-commit-time，JanusGrpah会尝试从中恢复。与此同时，另外有一个进程去扫描维护好的这份log，去identify那些只成功了一半的事务。建议使用另一台机器专门去做失败恢复，运行：

recovery = JanusGraphFactory.startTransactionRecovery(graph, startTime, TimeUnit.MILLISECONDS);
transaction write-ahead log 本身也有维护成本，因为涉及到大量的写操作。transaction write-ahead log 自动维护的时间是2天，2天前的数据会被自动删除。

对于这样的系统，如何 fine tune log system 也是需要仔细考虑的因素。

2. 实例的恢复
   如果某个JanusGraph instance宕机了，其他的实例应该不能受影响。如果涉及到schema相关的操作，比如创建索引，这就需要不同instance保持协作了，JanusGraph会自动地去维护一份running instance的列表，如果某一个实例被意外关闭了，创建索引的操作就会失败。

在这种情况下，有一个方案是去手动地remove某一个实例：

```java
mgmt = graph.openManagement()
mgmt.getOpenInstances() //all open instances
==>7f0001016161-dunwich1(current)
==>7f0001016161-atlantis1
mgmt.forceCloseInstance(‘7f0001016161-atlantis1‘) //remove an instance
mgmt.commit()
```

但这样做有数据不一致的风险，应该尽量少使用这种方式。

#### 索引的管理

1. 重新索引

一般来讲，我们在创建schema的时候，就应该把索引建立好，如果事先没有创建好索引，就需要重新索引了。

可以通过两种方式来执行重索引：

* MapReduce
* JanusGraphManagement
具体的代码可以参考：https://docs.janusgraph.org/index-management/index-reindexing/

2. 删除索引
   删除索引分两步：

JanusGraph通知所有其他的实例，说明索引即将被删除，索引便会标记成 DISABLED 状态，此时JanusGraph便会停止使用该索引去回答查询，或者更新索引，索引相关的底层数据还保留但会被忽略。
根据索引是属于composite索引还是mixed索引，如果是composite索引，可以直接用 JanusGraphManagement 或者 MapReduce 去删除，如果是mixed索引就比较麻烦了，因为这涉及到后端存储的索引，所以需要手动地去后端drop掉对应的索引。

3. 重建索引的相关问题
   当一个索引刚刚被建立，就执行重索引的时候，可能会报如下错误：

The index mixedExample is in an invalid state and cannot be indexed.
The following index keys have invalid status: desc has status INSTALLED
(status must be one of [REGISTERED, ENABLED])
这是因为建立索引后，索引信息会被慢慢地广播到集群中其他的Instances，这需要一定的时间，所以，最好不要在索引刚刚建立以后就去执行重索引任务。

#### 大规模导入（Bulk Loading）

大规模导入需要的配置
通过 storage.batch-loading 参数来支持 Bulk loading。

如果打开了 Builk loading，最好关闭自动创建schema的功能（schema.default = none）。因为automatic type creation会不断地check来保证数据的一致性和完整性，对于Bulk loading的场合，这或许是不需要的。

另外一个需要关注的参数是 ids.block-size，可以通过增大这个参数来减少id获取过程的数量（id block acquisition process），但这会造成大量的id浪费，这个参数需要根据每台机器添加的顶点的数量来做调整，默认值已经比较合理了，如果不行，可以适当地增大这个数值（10倍，100倍，比如）。

对于这个参数，有个技巧：Rule of thumb: Set ids.block-size to the number of vertices you expect to add per JanusGraph instance per hour.

* Note：要保证所有JanusGraph instance这个参数的配置都一样，如果需要调整这个参数，最好先关闭所有的instance，调整好后再上线。

如果有多个实例，这些实例在不断地分配id，可能会造成冲突问题，有时候甚至会报出异常，一般来说，对于这个问题，可以调整下面几个参数：

* ids.authority.wait-time：单位是milliseconds，id pool mamager在等待id block应用程序获得底层存储所需要等待的时间，这个时间越短，越容易出问题。
* Rule of thumb: Set this to the sum of the 95th percentile read and write times measured on the storage backend cluster under load. Important: This value should be the same across all JanusGraph instances.

* ids.renew-timeout：单位是milliseconds，JanusGraph 的 id pool manager 在获取新一个id之前会等待的总时间。
* Rule of thumb: Set this value to be as large feasible to not have to wait too long for unrecoverable failures. The only downside of increasing it is that JanusGraph will try for a long time on an unavailable storage backend cluster.

还有一些需要注意的读写参数：

* storage.buffer-size：我们执行很多query的时候，JanusGraph会把它们封装成一个个的小batch，然后推送到后端的存储执行，当我们在短时间内执行大量的写操作的时候，后端存储可能承受不了这么大的压力。在这种情况下，我们可以增大这个buffer参数，但与此相对的代价是每秒中可以发送的request数量会减小。这个参数不建议在用事务的方式导入数据的时候进行修改。

* storage.read-attempts 和 storage.write-attempts 参数，这个参数指的是每个推送到后端的batch会被尝试多少次（直至认为这个batch fail），如果希望在导数据的时候支持 high load，最好调大这几个参数。

* storage.attempt-wait 参数指定了JanusGraph在重新执行一次失败的操作之前会等待的时间（millisecond)，这个值越大，后端能抗住的load越高。

#### Graph Partitioning

分区策略，主要是两种：

* Edge Cut
砍边策略，经常一起遍历到的点尽量放在同一个机器上。

* Vertex Cut
  砍点策略。砍边策略的目的是减小通信量，砍点策略主要是为了处理hotspot问题（超级点问题），比如有的点，入度非常大，这种情况下，用邻接表的方式+砍边的方式存储的话，势必造成某一个分区上某一个点的存储量过大（偏移），这个时候，利用砍点策略，把这种点均匀地分布到不同的partition上面就显得很重要了。

一个典型的场景是 User 和 Product 的关系，product 可能只有几千个，但用户却有上百万个，这种情况下，product 最好就始终砍点策略。

对与分区这个问题，如果数据量小，就用随机分区（默认的）就好，如果数据量过大，就要好好地去fine tune分区的策略了。
