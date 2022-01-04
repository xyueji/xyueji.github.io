require([], function (){

    var isMobileInit = false;
    var loadMobile = function(){
        require([yiliaConfig.rootUrl + 'js/mobile.js'], function(mobile){
            mobile.init();
            isMobileInit = true;
        });
    }
    var isPCInit = false;
    var loadPC = function(){
        require([yiliaConfig.rootUrl + 'js/pc.js'], function(pc){
            pc.init();
            isPCInit = true;
        });
    }

    var browser={
        versions:function(){
        var u = window.navigator.userAgent;
        return {
            trident: u.indexOf('Trident') > -1, //IE内核
            presto: u.indexOf('Presto') > -1, //opera内核
            webKit: u.indexOf('AppleWebKit') > -1, //苹果、谷歌内核
            gecko: u.indexOf('Gecko') > -1 && u.indexOf('KHTML') == -1, //火狐内核
            mobile: !!u.match(/AppleWebKit.*Mobile.*/), //是否为移动终端
            ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端
            android: u.indexOf('Android') > -1 || u.indexOf('Linux') > -1, //android终端或者uc浏览器
            iPhone: u.indexOf('iPhone') > -1 || u.indexOf('Mac') > -1, //是否为iPhone或者安卓QQ浏览器
            iPad: u.indexOf('iPad') > -1, //是否为iPad
            webApp: u.indexOf('Safari') == -1 ,//是否为web应用程序，没有头部与底部
            weixin: u.indexOf('MicroMessenger') == -1 //是否为微信浏览器
            };
        }()
    }

    $(window).bind("resize", function(){
        if(isMobileInit && isPCInit){
            $(window).unbind("resize");
            return;
        }
        var w = $(window).width();
        if(w >= 700){
            loadPC();
        }else{
            loadMobile();
        }
    });

    if(browser.versions.mobile === true || $(window).width() < 700){
        loadMobile();
    }else{
        loadPC();
    }

    //是否使用fancybox
    if(yiliaConfig.fancybox === true){
        require([yiliaConfig.rootUrl + 'fancybox/jquery.fancybox.js'], function(pc){
            var isFancy = $(".isFancy");
            if(isFancy.length != 0){
                var imgArr = $(".article-inner img");
                for(var i=0,len=imgArr.length;i<len;i++){
                    var src = imgArr.eq(i).attr("src");
                    var title = imgArr.eq(i).attr("alt");
                    imgArr.eq(i).replaceWith("<a href='"+src+"' title='"+title+"' rel='fancy-group' class='fancy-ctn fancybox'><img src='"+src+"' title='"+title+"'></a>");
                }
                $(".article-inner .fancy-ctn").fancybox();
            }
        });

    }
    //是否开启动画
    if(yiliaConfig.animate === true){

        require([yiliaConfig.rootUrl + 'js/jquery.lazyload.js'], function(){
            //avatar
            $(".js-avatar").attr("src", $(".js-avatar").attr("lazy-src"));
            $(".js-avatar")[0].onload = function(){
                $(".js-avatar").addClass("show");
            }
        });

      if(yiliaConfig.isHome === true) {
        // 滚动条监听使用scrollreveal.js
        // https://github.com/jlmakes/scrollreveal.js
        // 使用cdn[//cdn.bootcss.com/scrollReveal.js/3.0.5/scrollreveal.js]
        require([
          '//cdn.bootcss.com/scrollReveal.js/3.0.5/scrollreveal.js'
        ], function (ScrollReveal) {
          // 更多animation:
          // http://daneden.github.io/animate.css/
          var animationNames = [
            "pulse", "fadeIn","fadeInRight", "flipInX", "lightSpeedIn","rotateInUpLeft", "slideInUp","zoomIn",
            ],
            len = animationNames.length,
            randomAnimationName = animationNames[Math.ceil(Math.random() * len) - 1];

          // ie9 不支持css3 keyframe动画, safari不支持requestAnimationFrame, 不使用随机动画，切回原来的动画
          if (!window.requestAnimationFrame) {
              $('.body-wrap > article').css({opacity: 1});

              if (navigator.userAgent.match(/Safari/i)) {
                  function showArticle(){
                      $(".article").each(function(){
                          if( $(this).offset().top <= $(window).scrollTop()+$(window).height() && !($(this).hasClass('show')) ) {
                              $(this).removeClass("hidden").addClass("show");
                              $(this).addClass("is-hiddened");
                          }else{
                              if(!$(this).hasClass("is-hiddened")){
                                  $(this).addClass("hidden");
                              }
                          }
                      });
                  }
                  $(window).on('scroll', function(){
                      showArticle();
                  });
                  showArticle();
              }
              return;
          }
          // document.body有些浏览器不支持监听scroll，所以使用默认的document.documentElement
          ScrollReveal({
            duration: 0,
            afterReveal: function (domEl) {
              // safari不支持requestAnimationFrame不支持document.documentElement的onscroll所以这里不会执行
              // 初始状态设为opacity: 0, 动画效果更平滑一些(由于脚本加载是异步，页面元素渲染后在执行动画，感觉像是延时)
              $(domEl).addClass('animated ' + randomAnimationName).css({opacity: 1});
            }
          }).reveal('.body-wrap > article');

        });
      } else {
        $('.body-wrap > article').css({opacity: 1});
      }

    }

    //是否新窗口打开链接
    if(yiliaConfig.open_in_new == true){
        $(".article a[href]").attr("target", "_blank")
    }
    $(".archive-article-title").attr("target", "_blank");

    // Random Color 边栏顶部随机颜色
    var colorList = ["#6da336", "#ff945c", "#66CC66", "#99CC99", "#CC6666", "#76becc", "#c99979", "#918597", "#4d4d4d"];
    var id = Math.ceil(Math.random()*(colorList.length-1));
    // PC
    $("#container .left-col .overlay").css({"background-color": colorList[id],"opacity": .3});
    // Mobile
    $("#container #mobile-nav .overlay").css({"background-color": colorList[id],"opacity": .7});
});

//此函数用于创建复制按钮
function createCopyBtns() {
    
    var $codeArea = $("figure table");
    //查看页面是否具有代码区域，没有代码块则不创建 复制按钮
    if ($codeArea.length > 0) {
    
        //复制成功后将要干的事情
        function changeToSuccess(item) {
    
            $imgOK = $("#copyBtn").find("#imgSuccess");
            if ($imgOK.css("display") == "none") {
    
                $imgOK.css({
    
                    opacity: 0,
                    display: "block"
                });
                $imgOK.animate({
    
                    opacity: 1
                }, 1000);
                setTimeout(function () {
    
                    $imgOK.animate({
    
                        opacity: 0
                    }, 2000);
                }, 2000);
                setTimeout(function () {
    
                    $imgOK.css("display", "none");
                }, 4000);
            };
        };
        //创建 全局复制按钮，仅有一组。包含：复制按钮，复制成功响应按钮
        //值得注意的是：1.按钮默认隐藏，2.位置使用绝对位置 position: absolute; (position: fixed 也可以，需要修改代码)
        $(".post-body").before('<div id="copyBtn" style="opacity: 0; position: absolute;top:0px;display: none;line-height: 1; font-size:1.5em"><span id="imgCopy" ><i class="fa fa-paste fa-fw"></i></span><span id="imgSuccess" style="display: none;"><i class="fa fa-check-circle fa-fw" aria-hidden="true"></i></span>');
        //创建 复制 插件，绑定单机时间到 指定元素，支持JQuery
        var clipboard = new Clipboard('#copyBtn', {
    
            target: function () {
    
                //返回需要复制的元素内容
                return document.querySelector("[copyFlag]");
            },
            isSupported: function () {
    
                //支持复制内容
                return document.querySelector("[copyFlag]");
            }
        });
        //复制成功事件绑定
        clipboard.on('success',
            function (e) {
    
                //清除内容被选择状态
                e.clearSelection();
                changeToSuccess(e);
            });
        //复制失败绑定事件
        clipboard.on('error',
            function (e) {
    
                console.error('Action:', e.action);
                console.error('Trigger:', e.trigger);
            });
        //鼠标 在复制按钮上滑动和离开后渐变显示/隐藏效果
        $("#copyBtn").hover(
            function () {
    
                $(this).stop();
                $(this).css("opacity", 1);
            },
            function () {
    
                $(this).animate({
    
                    opacity: 0
                }, 2000);
            }
        );
    }
}
//感应鼠标是否在代码区
$("figure").hover(
    function () {
    
        //-------鼠标活动在代码块内
        //移除之前含有复制标志代码块的 copyFlag
        $("[copyFlag]").removeAttr("copyFlag");
        //在新的（当前鼠标所在代码区）代码块插入标志：copyFlag
        $(this).find(".code").attr("copyFlag", 1);
        //获取复制按钮
        $copyBtn = $("#copyBtn");
        if ($copyBtn.lenght) {
    
            //获取到按钮的前提下进行一下操作
            //停止按钮动画效果
            //设置为 显示状态
            //修改 复制按钮 位置到 当前代码块开始部位
            //设置代码块 左侧位置
            $copyBtn.stop();
            $copyBtn.css("opacity", 0.8);
            $copyBtn.css("display", "block");
            $copyBtn.css("top", parseInt($copyBtn.css("top")) + $(this).offset().top - $copyBtn.offset().top + 3);
            $copyBtn.css("left", -$copyBtn.width() - 3);
        }
    },
    function () {
    
        //-------鼠标离开代码块
        //设置复制按钮可见度 2秒内到 0
        $("#copyBtn").animate({
    
            opacity: 0
        }, 2000);
    }
);
//页面载入完成后，创建复制按钮
$(document).ready(function () {
    
    createCopyBtns();
});
