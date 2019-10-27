/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("26cfb15c-1bb5-11e8-accf-0ed5f89f718b", (xp, $_) => { //sysinfo

$_().imports({
    Index: {
        xml: "<div id='index'>\
                <Navbar id='navbar'/>\
                <Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            items.navbar.title(opts.name);
            this.trigger("publish", "/sysinfo");
        }
    },
    Navbar: {
        css: ".ios .navbar-inner { padding: 0 14px; }\
              .ios .navbar #close { margin-right: 0; padding-right: 10px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='close' class='left'>\
                      <i class='icon f7-icons ios-only'>close</i>\
                   </div>\
                   <div id='title' class='title'/>\
                   <div class='right'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.close.on("touchend", e => this.trigger("close"));
            return { title: sys.title.text };
        }
    },
    Content: {
        css: "#content .page-content div { margin-left: 15px; margin-right: 15px; }",
        xml: "<div id='content' class='page'>\
                <div class='page-content'>\
                    <div class='block-title'>系统信息</div>\
                    <div>更新时间：<span id='dateTime'/></div>\
                    <div>　制造商：<span id='manufacturer'/></div>\
                    <div>　　ＩＰ：<span id='ip'/></div>\
                    <div>　ＣＰＵ：<span id='temp'/></div>\
                    <div>磁盘容量：<span id='diskspace'/></div>\
                    <Reboot id='reboot'/>\
                </div>\
              </div>",
        map: { nofragment: true },
        fun: function (sys, items, opts) {
            this.watch("/sysinfo", (e, data) => {
                for(let key in items)
                    data[key] && sys[key].text(data[key]);
            });
        }
    },
    Reboot: {
        xml: "<div class='list inset'>\
                <Button id='reboot'>重启</Button><br/>\
                <Button id='shutdown'>关机</Button>\
              </div>",
        fun: function (sys, items, opts) {
            sys.reboot.on("touchend", e => {
                window.app.dialog.confirm("确定重启系统吗？", "温馨提示", e => {
                    this.trigger("publish", ["/reboot", {}]);
                });
            });
            sys.shutdown.on("touchend", e => {
                window.app.dialog.confirm("确定关闭系统吗？", "温馨提示", e => {
                    this.trigger("publish", ["/shutdown", {}]);
                });
            });
        }
    },
    Button: {
        xml: "<ul><li>\
                <a id='label' href='#' class='list-button item-link color-red'/>\
              </li></ul>",
        map: { appendTo: "label" }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}