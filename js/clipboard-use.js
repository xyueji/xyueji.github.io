/*页面载入完成后，创建复制按钮*/
!function (e, t, a) {
    
    /* code */
    var initCopyCode = function () {
    
        var copyHtml = '';
        copyHtml += '<button class="btn-copy" data-clipboard-snippet="">';
        copyHtml += '<span>copy</span>';
        copyHtml += '</button>';
        $(".highlight .code pre").before(copyHtml);
        new Clipboard('.btn-copy', {
    
            target: function (trigger) {
    
                return trigger.nextElementSibling;
            }
        });
    }
    initCopyCode();
}(window, document);
