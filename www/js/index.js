xmlplus("musicbox", function (xp, $_, t) {

$_().imports({
    Index: {
        css: "* { -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }\
              input { -webkit-user-select: text; } \
              html, body, #index { width: 100%; height: 100%; margin: 0; padding: 0; font-size: 100%; overflow: hidden; }\
              #index > * { width: 100%; }",
        xml: "<ViewStack id='index'>\
                <Verify id='verify'/>\
                <Service id='service'/>\
                <Login id='login'/>\
                <Content id='content'/>\
                <Client id='client'/>\
              </ViewStack>",
        fun: function (sys, items, opts) {
            var msg = xmlplus.startup("/musicbox/tools/Message").value();
            this.on("message", function (e, type, message) {
                msg[type](message);
            });
        }
    },
    Verify: {
        xml: "<Mask id='check' xmlns='/tools'/>",
        fun: function (sys, items, opts) {
            var o = {
                username: localStorage.getItem("username"),
                password: localStorage.getItem("password")
            };
            setTimeout(function () {
                if (o.username && o.password) {
                    sys.check.trigger("switch", ["service", o]);
                } else {
                    sys.check.trigger("switch", "login");
                }
            }, 0);
        }
    },
    Service: {
        xml: "<Mask id='service' xmlns='/tools'/>",
        fun: function (sys, items, opts) {
            let client;
                clientId = "x827ex27795f",
                url = "ws://192.168.0.118:8000";
            this.on("show", (e, key, config) => {
                client = mqtt.connect(url, config);
                client.on("connect", e => {
                    client.subscribe(clientId);
                    console.log("connected to " + url);
                    this.trigger("switch", "content").notify("online");
                });
                client.on("error", error => {
                    client.end();
                    this.trigger("switch", "login");
                });
                client.on("message", (topic, payload) => {
                    payload = JSON.parse(payload.toString());
                    if ( payload.sid == undefined )
                        return this.notify(payload.topic, [payload.data]);
                    this.notify(payload.sid, [payload.data, payload.topic]);
                });
                client.on("close", e => this.notify("offline"));
            });
            this.watch("subscribe", (e, topic) => {
                client.subscribe(topic, {qos:1});
            });
            this.watch("publish", (e, topic, payload = {}) => {
                payload.ssid = clientId;
                client.publish(topic, JSON.stringify(payload));
            });
        }
    },
    Login: {
        css: "#logo { display: block; width: 50%; }",
        xml: "<i:Flow id='login' xmlns:i='login'>\
                <i:Logo id='logo'/>\
                <i:User id='user'/>\
                <i:Pass id='pass'/>\
                <i:Submit id='submit'/>\
              </i:Flow>",
        fun: function (sys, items, opts) {
            function keypress( e ) {
                if ( e.which === 13 )
                    sys.submit.trigger("touchend");
            }
            sys.user.on("keypress", keypress);
            sys.pass.on("keypress", keypress);
            sys.submit.on("touchend", items.login.start);
        }
    },
    Content: {
        css: "#content, #stack > * { height: 100%; overflow: auto; }\
              #stack { height: 100%; }\
              #about { margin: 0; box-sizing: border-box; }",
        xml: "<div id='content' xmlns:i='content'>\
                <i:Overlay id='overlay'/>\
                <ViewStack id='stack'>\
                    <i:Home id='home'/>\
                    <i:Room id='room'/>\
                    <i:About id='about'/>\
                </ViewStack>\
                <i:Footer id='footer'/>\
              </div>",
        map: { defer: "about" },
        fun: function (sys, items, opts) {
            sys.footer.on("switch", function (e, page) {
                e.stopPropagation();
                sys.stack.trigger("switch", page, false);
            });
        }
    },
    Client: {
        css: "#client, #client > * { height: 100%; }",
        xml: "<div id='client'/>",
        fun: function (sys, items, opts) {
            let table = {};
            this.on("publish", (e, topic, payload) => {
                e.stopPropagation();
                this.notify("publish", [opts._id, {topic: topic, data: payload}]);
            });
            function loadClient(data) {
                require([`/parts/${data.class}/index.js`], e => {
                    let Client = `//${data.class}/Client`;
                    xp.hasComponent(Client).map.msgscope = true;
                    register(data._id, sys.client.append(Client, data));
                });
            }
            this.watch("open-part", (e, data) => {
                sys.client.trigger("switch", "client");
                loadClient(opts = data);
            });
            this.on("close", e => {
                e.stopPropagation();
                sys.client.first().remove();
                sys.client.unwatch(opts._id).trigger("switch", "content");
            }, false);
            function register(_id, client) {
                sys.client.watch(_id, (e, data, topic) => {
                    if ( data.online == false )
                        return sys.client.trigger("close");
                    client.notify(topic, [data]);
                });
            }
        }
    },
    ViewStack: {
        xml: "<div id='viewstack'/>",
        fun: function (sys, items, opts) {
            var args, children = this.children(),
                table = children.call("hide").hash(),
                ptr = table[opts.index] || children[0];
            if (ptr) ptr = ptr.trigger("show").show();
            this.on("switch", function (e, to) {
                table = this.children().hash();
                if ( !table[to] || table[to] == ptr ) return;
                e.stopPropagation();
                args = [].slice.call(arguments).slice(2);
                ptr.trigger("hide", [to+''].concat(args)).hide();
                ptr = table[to].trigger("show", [ptr+''].concat(args)).show();
            });
            return Object.defineProperty({}, "selected", { get: function() {return ptr;}});
        }
    }
});

$_("login").imports({
    Flow: {
        css: "#flow { height: 100%; display: -ms-flexbox; display: -webkit-flex; display: flex; -ms-flex-align: center; -webkit-align-items: center; -webkit-box-align: center; align-items: center; }\
              #content { max-width: 330px; }\
              #content > * { margin: 0 auto 1.25em; }\
              #content > *:last-child { margin-bottom: 0; }",
        xml: "<div id='flow'>\
                <div id='content' class='container'/>\
              </div>",
        map: { "appendTo": "content" },
        fun: function (sys, items, opts) {
            var ptr, first = this.children()[1];
            this.on("next", function ( e, r ) {
                e.stopPropagation();
                ptr = ptr.next();
                ptr.trigger("start", r, false);
            });
            function start() {
                ptr = first;
                ptr.trigger("start", {}, false);
            }
            return { start: start };
        }
    },
    Logo: {
        css: "#logo { fill: #148FB1; }",
        xml: "<svg id='logo' viewBox='0 0 1024 1024' width='200' height='200' class='img-thumbnail'>\
                <path d='M880 688c-32 0-57.6 9.6-83.2 25.6l-99.2-96c28.8-35.2 48-83.2 48-134.4 0-57.6-22.4-108.8-60.8-147.2l80-80c16 9.6 32 12.8 51.2 12.8C876.8 272 928 220.8 928 160c0-60.8-51.2-112-112-112C755.2 48 704 99.2 704 160c0 19.2 6.4 38.4 12.8 54.4l-86.4 86.4c-28.8-16-64-25.6-102.4-25.6-51.2 0-99.2 19.2-137.6 51.2L307.2 240C313.6 224 320 208 320 192c0-60.8-51.2-112-112-112C147.2 80 96 131.2 96 192c0 60.8 51.2 112 112 112 22.4 0 41.6-6.4 60.8-16l86.4 83.2c-22.4 32-32 70.4-32 112 0 35.2 9.6 70.4 25.6 99.2l-70.4 70.4c-28.8-19.2-60.8-32-99.2-32C80 624 0 704 0 800s80 176 176 176S352 896 352 800c0-38.4-12.8-73.6-32-99.2l64-64c38.4 38.4 89.6 60.8 147.2 60.8 44.8 0 86.4-12.8 118.4-35.2l105.6 102.4C742.4 780.8 736 806.4 736 832c0 80 64 144 144 144s144-64 144-144S960 688 880 688z'/>\
              </svg>"
    },
    User: {
        xml: "<Input id='user' value='qudouo' placeholder='用户名' maxlength='32'/>",
        fun: function (sys, items, opts) {
            var patt = /^[a-z][a-z0-9_]{5,31}$/i;
            function error( msg ) {
                items.user.focus();
                sys.user.trigger("message", ["error", msg]);
            }
            this.on("start", function ( e, o ) {
                o.name = items.user.val();
                if ( o.name === "" ) {
                    error("请输入用户名");
                } else if ( o.name.length < 6 ) {
                    error("用户名至少需要6个字符");
                } else if ( !patt.test(o.name) ) {
                    error("您输入的用户名有误");
                } else {
                    sys.user.trigger("next", o);
                }
            });
            return items.user;
        }
    },
    Pass: {
        xml: "<Input id='pass' value='123456' placeholder='密　码' type='password' maxlength='16'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.pass.focus();
                sys.pass.trigger("message", ["error", msg]);
            }
            this.on("start", function ( e, o ) {
                o.pass = items.pass.val();
                if ( o.pass === "" ) {
                    error("请输入密码");
                } else if ( o.pass.length < 6 ) {
                    error("密码至少需要6个字符");
                } else {
                    sys.pass.trigger("next", o);
                }
            });
            return items.pass;
        }
    },
    Submit: {
        xml: "<Button id='submit' label='登录'/>",
        fun: function (sys, items, opts) {
            this.on("start", function ( e, o ) {
                localStorage.setItem("username", o.name);
                localStorage.setItem("password", o.pass);
                sys.submit.trigger("switch", ["service", {username: o.name, password: o.pass}]);
            });
        }
    },
    Input: {
        xml: "<input id='input' type='text' class='form-control'/>",
        map: { attrs: { input: "name value type maxlength placeholder" } },
        fun: function (sys, items, opts) {
            function focus() {
                sys.input.elem().focus();
                return this;
            }
            function val(value) {
                if (value === undefined)
                    return sys.input.prop("value");
                sys.input.prop("value", value);
                return this;
            }
            return { val: val, focus: focus };
        }
    },
    Button: {
        xml: "<button class='btn btn-lg btn-primary btn-block'/>",
        fun: function (sys, items, opts) {
            this.text(opts.label);
        }
    }
});

$_("content").imports({
    Overlay: {
        css: "#overlay { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,.4); z-index: 13000; visibility: hidden; opacity: 0; -webkit-transition-duration: .4s; transition-duration: .4s; }\
              #visible { visibility: visible; opacity: 1; }",
        xml: "<div id='overlay'/>",
        fun: function (sys, items, opts) {
            this.watch("show-overlay", e => {
                sys.overlay.addClass("#visible");
            });
            this.watch("hide-overlay", e => {
                sys.overlay.removeClass("#visible");
            });
        }
    },
    Home: {
        css: "#home { padding: 12px; background: url(/img/background.jpg) no-repeat; background-size:100% 100%; }\
              #rooms { max-height: calc(100% - 130px); }",
        xml: "<div id='home' xmlns:i='home'>\
                <i:Header id='header' for='home'/>\
                <i:Title id='title'/>\
                <i:Homelist id='homelist'/>\
                <i:Rooms id='rooms'/>\
              </div>", 
        fun: function (sys, items, opts) {
            var homes = {};
            this.watch("list-rooms", (e, rooms) => {
                homes[rooms.where.home] = rooms;
            });
            this.watch("open-home", (e, home) => {
                sys.title.text(home.name);
                if ( homes[home._id] )
                    return this.notify("list-rooms", homes[home._id]);
                let data = {table: "rooms", where: {home: home._id}};
                this.notify("publish", ['server', {topic: "query", data: data}]);
            }).watch("offline", e => homes = {});
        }
    },
    Room: {
        css: "#room { padding: 12px; background: url(/img/background.jpg) no-repeat; background-size: 100% 100%; }\
              #parts { max-height: calc(100% - 130px); }",
        xml: "<div id='room' xmlns:i='room'>\
                <i:Header id='header' for='room'/>\
                <i:Title id='title'/>\
                <i:Roomlist id='roomlist'/>\
                <i:Parts id='parts'/>\
              </div>", 
        fun: function (sys, items, opts) {
            var rooms = {};
            this.watch("list-parts", (e, parts) => {
                rooms[parts.where.room] = parts;
            });
            this.watch("open-room", (e, room) => {
                sys.title.text(room.name);
                if ( rooms[room._id] )
                    return this.notify("list-parts", rooms[room._id]);
                let data = {table: "parts", where: {room: room._id}};
                this.notify("publish", ['server', {topic: "query", data: data}]);
            }).watch("offline", e => rooms = {});
        }
    },
    About: {
        css: "#about { height: 100%; text-align: center; overflow-y: auto; display: -ms-flexbox; display: -webkit-flex; display: flex; -ms-flex-align: center; -webkit-align-items: center; -webkit-box-align: center; align-items: center; }\
              #logo { width: 160px; }\
              #content > * { margin: 0 0 .5em; }",
        xml: "<div id='about'>\
                <div id='content' class='container'>\
                    <Logo id='logo' xmlns='/login'/>\
                    <div>MQTT-IOT</div>\
                    <div>北海流形物联科技有限公司</div>\
                </div>\
              </div>"
    },
    Footer: {
        xml: "<i:Tabbar id='nav' xmlns:i='footer'>\
                <i:TabItem id='home' label='家庭'/>\
                <i:TabItem id='room' label='房间'/>\
                <i:TabItem id='about' label='关于'/>\
              </i:Tabbar>",
        fun: function (sys, items, opts) {
            this.watch("switch-page", function (e, page) {
                sys[page].trigger("touchend");
            });
        }
    }
});

$_("content/home").imports({
    Header: {
        css: "#header { margin: 0 4px; height: 26px; line-height: 26px; color: white; }\
              #add { float: right; margin: 0 0 0 8px; }\
              #line { float: right; }",
        xml: "<header id='header' xmlns:i='header'>\
                <i:Icon id='list'/>\
                <i:Icon id='add'/>\
                <i:Line id='line'/>\
              </header>",
        fun: function (sys, items, opts) {
            sys.list.on("touchend", e => {
                let line = sys.line.text();
                line == "在线" && this.notify("show-overlay").notify("show-" + opts['for'] + "list");
            });
            this.watch("online", e => sys.line.text("在线"));
            this.watch("offline", e => sys.line.text("离线"));
        }
    },
    Title: {
        css: "#title { letter-spacing: 0.1em; margin: 16px 4px 12px; font-weight: bold; color: white; }",
        xml: "<h3 id='title'/>"
    },
    HomeList: {
        xml: "<i:List id='homelist' xmlns:i='list'/>",
        fun: function (sys, items, opts) {
            var checked = {};
            this.watch("list-homes", (e, homes) => {
                var tmp, selected;
                sys.homelist.children().call("remove");
                homes.data.forEach(function(item) {
                    item.key = "home";
                    tmp = sys.homelist.append("list/Item", item);
                    item._id == checked._id && (selected = tmp);
                });
                (selected || sys.homelist.first()).trigger("touchend");
            });
            this.watch("show-homelist", function () {
                items.homelist.addClass("#modal-in");
            });
            sys.homelist.on("touchend", "*", function (e) {
                checked = this.data("data");
                this.trigger("checked", true).notify("hide-overlay");
                items.homelist.removeClass("#modal-in").notify("open-home", this.data("data"));
            });
        }
    },
    Rooms: {
        css: "#rooms { display: flex; overflow: auto; flex-wrap: wrap; }\
              #rooms > * { margin: 4px }",
        xml: "<div id='rooms'/>",
        fun: function (sys, items, opts) {
            this.watch("list-rooms", (e, rooms) => {
                var item, list = sys.rooms.children();
                for ( i = 0; i < rooms.data.length; i++ ) {
                    item = rooms.data[i];
                    item.online = true;
                    list[i] || list.push(sys.rooms.append("Thumbnail"));
                    list[i].unwatch(list[i].attr("_id"));
                    list[i].data("data", item).trigger("data", item, false);
                    list[i].watch(item._id, listener).attr("_id", item._id).show();
                }
                for ( var k = i; k < list.length; k++ )
                    list[k].unwatch(list[i].attr("_id")).hide();
            });
            function listener(e, item) {
                e.currentTarget.trigger("data", item, false);
            }
            sys.rooms.on("touchend", "*", function (e) {
                var data = this.data("data");
                data.online && this.notify("switch-page", "room").notify("open-room", data);
            });
            this.watch("offline", e => {
                sys.rooms.children().forEach(item => {
                    item.trigger("data", {online: false}, false);
                })
            });
        }
    },
    Thumbnail: {
        css: "a#thumbnail { padding-top: 4px; padding-bottom: 4px; height: 100%; -webkit-box-pack: justify; -ms-flex-pack: justify; -webkit-justify-content: space-between; justify-content: space-between; width: 100%; box-sizing: border-box; display: -webkit-box; display: -ms-flexbox; display: -webkit-flex; display: flex; -webkit-box-pack: center; -ms-flex-pack: center; -webkit-justify-content: center; justify-content: center; -webkit-box-align: center; -ms-flex-align: center; -webkit-align-items: center; align-items: center; overflow: visible; -webkit-box-flex: 1; -ms-flex: 1; -webkit-box-orient: vertical; -moz-box-orient: vertical; -ms-flex-direction: column; -webkit-flex-direction: column; flex-direction: column; color: #929292; -webkit-flex-shrink: 1; -ms-flex: 0 1 auto; flex-shrink: 1; position: relative; white-space: nowrap; text-overflow: ellipsis; text-decoration: none; outline: 0; color: #8C8185; }\
              a#thumbnail { width: 66px; height: 66px; border-radius: 10px; background:rgba(255,255,255,0.8) none repeat scroll; }\
              #label { margin: 3px 0 0; line-height: 1; display: block; letter-spacing: .01em; font-size: 10px; position: relative; text-overflow: ellipsis; white-space: nowrap; }\
              a#active { color: #FF9501; }",
        xml: "<a id='thumbnail'>\
                <Icon id='icon'/>\
                <span id='label'>我的家</span>\
              </a>",
        fun: function (sys, items, opts) {
            this.on("data",  (e, payload) => {
                var data = e.currentTarget.data("data");
                xp.extend(data, payload);
                items.icon(data._id, data.icon);
                sys.label.text(data.name);
                sys.thumbnail[data.online ? 'addClass' : 'removeClass']("#active");
            });
        }
    },
    Icon: {
        css: "#icon { fill: currentColor; height: 30px; display: block; width: 30px; vertical-align: middle; background-size: 100% auto; background-position: center; background-repeat: no-repeat; font-style: normal; position: relative; }",
        xml: "<span id='icon'/>",
        fun: function (sys, items, opts) {
            let iPath, icon = sys.icon;
            return (id, path) => {
                let iconPath = `//musicbox/content/room/icon/${path}`;
                if ( !xp.hasComponent(iconPath) )
                    iconPath = "icon/Default";
                if ( iPath != iconPath ) {
                    icon = icon.replace(iPath = iconPath).addClass("#icon");
                }
            };
        }
    }
});

$_("content/home/icon").imports({
    Default: {
        xml: "<svg viewBox='0 0 1024 1024' width='200' height='200'>\
                <path d='M0 64l256 0 0 896-256 0 0-896Z' p-id='7567'></path><path d='M320 64l704 0 0 256-704 0 0-256Z' p-id='7568'></path><path d='M320 384l704 0 0 576-704 0 0-576Z'/>\
              </svg>"
    }
});

$_("content/home/header").imports({
    Icon: {
        css: "#icon { display: inline-block; border-radius: 13px; background:rgba(0,0,0,0.2) none repeat scroll; width: 26px; height: 26px; }\
              #icon svg { color: white; fill: currentColor; width: 16px; height: 16px; margin: 5px; }",
        xml: "<a id='icon'/>",
        fun: function (sys, items, opts) {
            sys.icon.append(opts.id);
        }
    },
    List: {
        xml: "<svg viewBox='0 0 1024 1024' width='200' height='200'>\
                <path d='M309.474912 719.986985c26.89658 0 48.695049-21.798469 48.695049-48.646953l-49.715285-264.667915c0-26.920116-21.798469-48.767703-48.695049-48.767703L136.249639 357.904413c-26.89658 0-48.646953 21.847587-48.646953 48.767703l49.715285 264.667915c0 26.848485 21.750373 48.646953 48.646953 48.646953L309.474912 719.986985z' p-id='6348'></path><path d='M591.985194 719.986985c26.89658 0 48.646953-21.798469 48.646953-48.646953l49.714262-476.756311c0-26.89658-21.750373-48.719608-48.646953-48.719608L418.711825 145.864112c-26.847461 0-48.744167 21.823028-48.744167 48.719608l49.715285 476.756311c0 26.848485 21.895683 48.646953 48.743144 48.646953L591.985194 719.986985z' p-id='6349'></path><path d='M874.446357 719.986985c26.89658 0 48.744167-21.798469 48.744167-48.646953L923.190525 547.709293c0-26.921139-21.847587-48.743144-48.744167-48.743144l-73.844845 0c-26.846438 0-35.634592 15.730263-48.694025 48.743144l-49.715285 123.630738c0 26.848485 21.847587 48.646953 48.695049 48.646953L874.446357 719.986985z' p-id='6350'></path><path d='M913.139611 773.779122 146.930909 773.779122c-12.720719 0-23.206538 10.414187-23.206538 23.231097 0 12.792351 18.157545 53.550637 30.974455 53.550637l758.440785-30.271444c12.769838 0 23.25668-10.486842 23.25668-23.279193C936.395268 784.193309 925.908426 773.779122 913.139611 773.779122z'/>\
              </svg>"
    },
    Add: {
        xml: "<svg viewBox='0 0 1024 1024' width='200' height='200'>\
                <path d='M116.364 438.014h791.273v171.241h-791.273v-171.241z'/>\
                <path d='M424.081 138.342h175.838v770.586h-175.838v-770.586z'/>\
              </svg>"
    },
    Line: {
        css: "#line { letter-spacing: 0.1em;  display: inline-block; border-radius: 13px; background:rgba(0,0,0,0.2) none repeat scroll; padding: 0 16px; font-size: 14px; color: white; }",
        xml: "<span id='line'>离线</span>"
    }
});

$_("content/home/list").imports({
    List: {
        css: "#list { -webkit-transition-duration: .3s; transition-duration: .3s; position: absolute; left: 0; bottom: 0; z-index: 13500; width: 100%; -webkit-transform: translate3d(0,100%,0); transform: translate3d(0,100%,0); max-height: 100%; overflow: auto; -webkit-overflow-scrolling: touch; }\
              #modal-in { -webkit-transform: translate3d(0,0,0); transform: translate3d(0,0,0);}",
        xml: "<div id='list'>\
                <Group id='group'/>\
                <Cancel id='cancel'/>\
              </div>",
        map: { appendTo: "group" },
        fun: function (sys, items, opts) {
            sys.cancel.on("touchend", e => {
                e.stopPropagation();
                sys.list.removeClass("#modal-in").notify("hide-overlay");;
            });
            return sys.list;
        }
    },
    Item: {
        css: "#item { cursor: pointer; height: 57px; line-height: 57px; font-size: 20px; color: #007aff; white-space: normal; text-overflow: ellipsis; }\
              #item { width: 100%; text-align: center; font-weight: 400; margin: 0; background: rgba(255,255,255,.95); box-sizing: border-box; display: block; position: relative; overflow: hidden; }\
              #item:after { content: ''; position: absolute; left: 0; bottom: 0; right: auto; top: auto; height: 1px; width: 100%; background-color: rgba(0,0,0,.2); display: block; z-index: 15; -webkit-transform-origin: 50% 100%; transform-origin: 50% 100%;}\
              #label, #icon { display: block; width: 100%; height: 100%; position: absolute; top: 0; left: 0; }\
              #input { display: none; } #input:checked ~ div { background: no-repeat center; background-image: url(\"data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2013%2010'%3E%3Cpolygon%20fill%3D'%23007aff'%20points%3D'11.6%2C0%204.4%2C7.2%201.4%2C4.2%200%2C5.6%204.4%2C10%204.4%2C10%204.4%2C10%2013%2C1.4%20'%2F%3E%3C%2Fsvg%3E\"); -webkit-background-size: 13px 10px; background-size: 13px 10px; background-position: calc(100% - 15px) center; }",
        xml: "<div id='item'>\
                <span id='span'/>\
                <label id='label'>\
                    <input id='input' type='radio'/>\
                    <div id='icon'/>\
                </label>\
              </div>",
        fun: function (sys, items, opts) {
            this.data("data", opts);
            sys.span.text(opts.name);
            sys.input.attr("name", opts.key);
            sys.input.prop("value", opts.name);
            this.on("checked", (e, value) => sys.input.prop("checked", value));
        }
    },
    Group: {
        css: "#group { margin: 8px; position: relative; border-radius: 13px; overflow: hidden; -webkit-transform: translate3d(0,0,0); transform: translate3d(0,0,0); }",
        xml: "<div id='group'/>"
    },
    Cancel: {
        css: "#cancel { margin: 8px; position: relative; border-radius: 13px; overflow: hidden; -webkit-transform: translate3d(0,0,0); transform: translate3d(0,0,0);}\
              #label { border-radius: 13px; font-weight: 500; cursor: pointer; height: 57px; line-height: 57px; font-size: 20px; color: #007aff; white-space: normal; text-overflow: ellipsis; }\
              #label { width: 100%; text-align: center; margin: 0; background: rgba(255,255,255,.95); box-sizing: border-box; display: block; position: relative; overflow: hidden; }",
        xml: "<div id='cancel'>\
                <div id='label'>取消</div>\
              </div>",
    }
});

$_("content/room").imports({
    Header: {
        map: { extend: {"from": "../home/Header"} }
    },
    Title: {
        map: { extend: {"from": "../home/Title"} }
    },
    RoomList: {
        xml: "<i:List id='roomlist' xmlns:i='../home/list'/>",
        fun: function (sys, items, opts) {
            var checked = {};
            this.watch("list-rooms", (e, rooms) => {
                var tmp, selected;
                sys.roomlist.children().call("remove");
                rooms.data.forEach(item => {
                    item.key = "room";
                    tmp = sys.roomlist.append("../home/list/Item", item);
                    item._id == checked._id && (selected = tmp);
                });
                (selected || sys.roomlist.first()).trigger("touchend");
            });
            this.watch("show-roomlist", e => {
                items.roomlist.addClass("#modal-in");
            });
            sys.roomlist.on("touchend", "*", function (e) {
                checked = this.data("data");
                this.trigger("checked", true).notify("hide-overlay");
                items.roomlist.removeClass("#modal-in").notify("open-room", this.data("data"));
            });
        }
    },
    Parts: {
        css: "#parts { display: flex; overflow: auto; flex-wrap: wrap; }\
              #parts > * { margin: 4px }",
        xml: "<div id='parts'/>",
        fun: function (sys, items, opts) {
            this.watch("list-parts", (e, parts) => {
                var item, list = sys.parts.children();
                for ( i = 0; i < parts.data.length; i++ ) {
                    item = parts.data[i];
                    list[i] || list.push(sys.parts.append("Thumbnail"));
                    list[i].unwatch(list[i].attr("_id"));
                    list[i].data("data", item).trigger("data", item, false);
                    list[i].watch(item._id, listener).attr("_id", item._id).show();
                }
                for ( var k = i; k < list.length; k++ )
                    list[k].unwatch(list[i].attr("_id")).hide();
            });
            function listener(e, item) {
                e.currentTarget.trigger("data", item, false);
            }
            sys.parts.on("touchend", "*", function (e) {
                var data = this.data("data");
                data.online && this.notify("open-part", data);
            });
            this.watch("offline", e => {
                sys.parts.children().forEach(item => {
                    item.trigger("data", {online: false}, false);
                })
            });
        }
    },
    Thumbnail: {
        map: { extend: { "from": "../home/Thumbnail" } }
    },
    Icon: {
        css: "#icon { fill: currentColor; height: 30px; display: block; width: 30px; vertical-align: middle; background-size: 100% auto; background-position: center; background-repeat: no-repeat; font-style: normal; position: relative; }",
        xml: "<span id='icon'/>",
        fun: function (sys, items, opts) {
            let iPath, icon = sys.icon;
            return (id, path) => {
                let iconPath = `//${id}/${path}`;
                if ( !xp.hasComponent(iconPath) )
                    iconPath = `//musicbox/content/room/icon/${path}`;
                if ( !xp.hasComponent(iconPath) )
                    iconPath = "icon/Unknow";
                if ( iPath != iconPath ) {
                    icon = icon.replace(iPath = iconPath).addClass("#icon");
                }
            };
        }
    }
});

$_("content/room/icon").imports({
    Unknow: {
        xml: "<svg viewBox='0 0 1024 1024' width='200' height='200'>\
                  <path d='M797.75744 438.02624c-11.07968 0-21.95456 0.8192-32.72704 2.56 2.2528-13.6192 3.62496-27.36128 3.62496-41.69728 0-146.47296-118.6816-265.3184-265.29792-265.3184-142.56128 0-258.62144 112.78336-264.62208 254.03392C105.6768 394.38336 0 503.99232 0 638.64832c0 139.10016 112.68096 251.76064 251.82208 251.76064h545.93536C922.64448 890.40896 1024 789.13536 1024 664.18688c0-124.88704-101.35552-226.16064-226.24256-226.16064zM510.27968 808.38656c-22.69184 0-41.14432-18.06336-41.14432-40.30464 0-22.24128 18.39104-40.30464 41.14432-40.30464 22.67136 0 41.14432 18.06336 41.14432 40.30464-0.02048 22.24128-18.41152 40.30464-41.14432 40.30464z m110.46912-228.0448c-8.06912 12.6976-25.1904 29.92128-51.44576 51.77344-13.57824 11.28448-22.03648 20.3776-25.31328 27.29984-3.2768 6.8608-4.8128 19.16928-4.48512 36.90496h-58.5728c-0.12288-8.3968-0.24576-13.5168-0.24576-15.38048 0-18.96448 3.13344-34.52928 9.4208-46.77632 6.26688-12.24704 18.8416-26.0096 37.62176-41.2672 18.78016-15.31904 30.04416-25.31328 33.71008-30.04416 5.632-7.49568 8.51968-15.7696 8.51968-24.73984 0-12.4928-5.05856-23.18336-15.0528-32.1536-9.99424-8.9088-23.57248-13.39392-40.57088-13.39392-16.40448 0-30.12608 4.68992-41.14432 13.96736-11.01824 9.29792-20.50048 29.7984-22.75328 42.496-2.10944 11.9808-59.84256 17.03936-59.14624-7.24992 0.69632-24.28928 13.33248-50.62656 34.97984-69.71392 21.66784-19.08736 50.11456-28.65152 85.2992-28.65152 37.04832 0 66.4576 9.68704 88.3712 29.02016 21.9136 19.3536 32.80896 41.84064 32.80896 67.54304a74.07616 74.07616 0 0 1-12.00128 40.36608z'/>\
              </svg>"
    },
    Lamp: {
        xml: "<svg viewBox='0 0 1024 1024' width='200' height='200'>\
                <path d='M224.827 183.45c-11.903-11.902-31.174-11.902-43.076 0-11.903 11.904-11.903 31.174 0 43.077l43.076 43.076c11.902 11.903 31.173 11.903 43.076 0 11.902-11.903 11.902-31.173 0-43.076l-43.076-43.076z m578.314 0l-43.076 43.077c-11.903 11.903-11.903 31.173 0 43.076 11.903 11.903 31.173 11.903 43.076 0l43.076-43.076c11.903-11.903 11.903-31.173 0-43.076-11.903-11.903-31.173-11.903-43.076 0zM148.688 424.338H87.852c-16.814 0-30.417 13.602-30.417 30.417s13.603 30.418 30.417 30.418h60.836c16.815 0 30.418-13.603 30.418-30.418 0-16.815-13.603-30.417-30.418-30.417z m791.427 0H879.28c-16.815 0-30.418 13.602-30.418 30.417s13.603 30.418 30.418 30.418h60.835c16.815 0 30.418-13.603 30.418-30.418 0-16.815-13.603-30.417-30.418-30.417zM483.472 74.249v60.836c0 16.815 13.603 30.418 30.417 30.418 16.815 0 30.418-13.603 30.418-30.418V74.249c0-16.814-13.603-30.417-30.418-30.417-16.814 0-30.417 13.603-30.417 30.417zM300.965 500.286c0-117.703 95.41-213.113 213.113-213.113 117.704 0 213.113 95.41 213.113 213.113 0 117.704-95.41 213.113-213.113 213.113s-213.113-95.41-213.113-213.113z m-60.835 0c0 151.333 122.615 273.949 273.948 273.949 151.333 0 273.949-122.616 273.949-273.949 0-151.332-122.616-273.948-273.949-273.948-151.333 0.189-273.948 122.804-273.948 273.948z m212.924 426.226c0 16.815 13.603 30.418 30.418 30.418h60.835c16.815 0 30.418-13.603 30.418-30.418 0-16.815-13.603-30.418-30.418-30.418h-60.835c-16.815 0-30.418 13.603-30.418 30.418z m-60.836-91.442c0 16.815 13.603 30.418 30.418 30.418h182.695c16.815 0 30.418-13.603 30.418-30.418 0-16.815-13.603-30.418-30.418-30.418H422.636c-16.815 0-30.418 13.603-30.418 30.418z m0 0'/>\
              </svg>"
    },
    Music: {
        xml: "<svg viewBox='0 0 1024 1024' width='48' height='48'>\
                <path d='M1002.051291 609.834423C1003.297646 340.26496 785.605486 119.954286 516.036023 118.707931 246.468023 117.461577 26.748343 335.750583 25.503451 605.322971l-0.519314 112.174812 0.01024-1.825646c-0.443246 95.68256 77.070629 168.708389 172.750263 169.151634l17.533806 0.080458 1.569645-339.668115-17.535268-0.080457c-52.308846-0.242834-106.371657 22.724023-138.384823 59.282286 1.813943-245.561051 209.160777-451.423086 454.910537-450.287909 245.72928 1.135177 456.933669 221.668206 456.480183 467.249737-31.67232-36.871314-91.204754-73.097509-143.5136-73.33888l-17.535269-0.08192-1.568182 339.67104 17.535268 0.080458c95.68256 0.443246 173.86496-71.887726 174.306743-167.568823l-0.008777 1.847588 0.516388-112.174811z m-820.389302-33.297554l-1.29024 279.497874c-68.768914-11.30496-124.048823-70.007954-123.724069-140.296777 0.323291-70.239086 56.14592-128.531017 125.014309-139.201097z m662.914194 284.0576l1.278537-276.825235c68.110629 11.196709 125.758903 69.318949 125.437074 138.955337-0.323291 69.592503-58.508434 127.325623-126.715611 137.869898z'/>\
                <path d='M359.030491 671.901989c-9.887451-0.043886-17.931703 7.924297-17.975588 17.80736l-0.332069 71.561508c-0.045349 9.893303 7.922834 17.936091 17.810286 17.98144 9.878674 0.045349 17.93024-7.922834 17.975589-17.816137l0.330605-71.561509c0.046811-9.884526-7.930149-17.928777-17.808823-17.972662zM416.971337 609.54624c-9.8816-0.045349-17.928777 7.92576-17.974126 17.811749l-0.964022 208.7424c-0.045349 9.877211 7.927223 17.928777 17.810285 17.974125 9.8816 0.045349 17.928777-7.933074 17.972663-17.810285l0.964023-208.740938c0.045349-9.885989-7.92576-17.931703-17.808823-17.977051zM474.335817 672.437394c-9.8816-0.045349-17.927314 7.922834-17.972663 17.805897l-0.53248 115.303863c-0.045349 9.89184 7.92576 17.93024 17.80736 17.975589 9.885989 0.045349 17.93024-7.919909 17.977052-17.808823l0.531017-115.305326c0.045349-9.884526-7.924297-17.925851-17.810286-17.9712zM649.112137 709.02784c-9.884526-0.043886-17.93024 7.927223-17.975588 17.804434l-0.457875 99.42016c-0.045349 9.874286 7.924297 17.931703 17.810286 17.977052s16.679497-7.937463 16.726309-17.811749l0.457874-99.42016c0.046811-9.874286-6.67648-17.922926-16.561006-17.969737zM592.043154 583.51616c-9.883063-0.045349-17.925851 7.924297-17.972663 17.80736l-1.253668 271.371703c-0.043886 9.878674 7.924297 17.93024 17.80736 17.974126 9.885989 0.045349 17.931703-7.931611 17.977051-17.808823l1.252206-271.373166c0.049737-9.8816-7.934537-17.925851-17.810286-17.9712zM534.150583 635.431497c-9.8816-0.043886-17.931703 7.933074-17.977052 17.814674l-0.797257 172.473783c-0.045349 9.872823 7.930149 17.928777 17.813212 17.974126 9.880137 0.046811 17.927314-7.934537 17.9712-17.808823l0.797257-172.475246c0.045349-9.8816-7.927223-17.931703-17.80736-17.978514z'/>\
              </svg>"
    }
});

$_("content/room/header").imports({
    Icon: {
        map: { extend: {"from": "../../home/header/Icon"} }
    },
    List: {
        xml: "<svg viewBox='0 0 1024 1024' width='200' height='200'>\
                <path d='M931.2 227.2 396.8 227.2c-19.2 0-35.2-19.2-35.2-41.6 0-22.4 16-41.6 35.2-41.6l534.4 0c19.2 0 35.2 19.2 35.2 41.6C966.4 208 950.4 227.2 931.2 227.2L931.2 227.2 931.2 227.2zM931.2 534.4 396.8 534.4c-19.2 0-35.2-19.2-35.2-41.6 0-22.4 16-41.6 35.2-41.6l534.4 0c19.2 0 35.2 19.2 35.2 41.6C966.4 515.2 950.4 534.4 931.2 534.4L931.2 534.4 931.2 534.4zM931.2 859.2 396.8 859.2c-19.2 0-35.2-19.2-35.2-41.6 0-22.4 16-41.6 35.2-41.6l534.4 0c19.2 0 35.2 19.2 35.2 41.6C966.4 841.6 950.4 859.2 931.2 859.2L931.2 859.2 931.2 859.2zM171.2 896c-44.8 0-80-35.2-80-80 0-44.8 35.2-80 80-80 44.8 0 80 35.2 80 80C251.2 860.8 216 896 171.2 896L171.2 896 171.2 896zM171.2 576c-44.8 0-80-35.2-80-80 0-44.8 35.2-80 80-80 44.8 0 80 35.2 80 80C251.2 539.2 216 576 171.2 576L171.2 576 171.2 576zM171.2 254.4c-44.8 0-80-35.2-80-80 0-44.8 35.2-80 80-80 44.8 0 80 35.2 80 80C251.2 219.2 216 254.4 171.2 254.4L171.2 254.4 171.2 254.4zM404.8 776'/>\
              </svg>"
    },
    Add: {
        map: { extend: {"from": "../../home/header/Add"} }
    },
    Line: {
        map: { extend: {"from": "../../home/header/Line"} }
    }
});

$_("content/footer").imports({
    TabBar: {
        css: "#tabbar { position: absolute; width: 100%; height: 50px; color: #929292; z-index: 5001; left: 0; bottom: 0; background: rgba(0,0,0,0.7) none repeat scroll; }\
              #tabbar { box-sizing: border-box; font-size: 17px; margin: 0; -webkit-backface-visibility: hidden; backface-visibility: hidden; transform: translate3d(0,0,0); -webkit-transform: translate3d(0,0,0); }\
              #tabbar:before { content: ''; position: absolute; left: 0; top: 0; bottom: auto; right: auto; height: 1px; width: 100%; background-color: #c4c4c4; display: block; z-index: 15; -webkit-transform-origin: 50% 0; transform-origin: 50% 0;}\
              #inner { position: absolute; left: 0; top: 0; width: 100%; height: 100%; padding: 0 8px; box-sizing: border-box; display: -webkit-box; display: -ms-flexbox; display: -webkit-flex; display: flex; -webkit-box-pack: justify; -ms-flex-pack: justify; -webkit-justify-content: space-between; justify-content: space-between; -webkit-box-align: center; -ms-flex-align: center; -webkit-align-items: center; align-items: center; }",
        xml: "<div id='tabbar'>\
                <div id='inner'/>\
              </div>",
        map: { appendTo: "inner" },
        fun: function (sys, items, opts) {
            var sel = this.first();
            this.on("touchend", "./*[@id]", function (e) {
                sel.value().unselect();
                (sel = this).value().select();
                this.trigger("switch", this.toString());
            });
            if (sel) sel.value().select();
        }
    },
    TabItem: {
        css: "a#tabitem { padding-top: 4px; padding-bottom: 4px; height: 100%; -webkit-box-pack: justify; -ms-flex-pack: justify; -webkit-justify-content: space-between; justify-content: space-between; width: 100%; box-sizing: border-box; display: -webkit-box; display: -ms-flexbox; display: -webkit-flex; display: flex; -webkit-box-pack: center; -ms-flex-pack: center; -webkit-justify-content: center; justify-content: center; -webkit-box-align: center; -ms-flex-align: center; -webkit-align-items: center; align-items: center; overflow: visible; -webkit-box-flex: 1; -ms-flex: 1; -webkit-box-orient: vertical; -moz-box-orient: vertical; -ms-flex-direction: column; -webkit-flex-direction: column; flex-direction: column; color: #929292; -webkit-flex-shrink: 1; -ms-flex: 0 1 auto; flex-shrink: 1; position: relative; white-space: nowrap; text-overflow: ellipsis; text-decoration: none; outline: 0; color: #8C8185; }\
              #label { margin: 0;line-height: 1; display: block; letter-spacing: .01em; font-size: 10px; position: relative; text-overflow: ellipsis; white-space: nowrap; }\
              a#active { color: #FF9501; }",
        xml: "<a id='tabitem'>\
                <TabIcon id='icon'/>\
                <span id='label'>首页</span>\
              </a>",
        map: { attrs: { icon: "id->icon" }},
        fun: function (sys, items, opts) {
            sys.label.text(opts.label);
            function select() {
                sys.tabitem.addClass("#active");
            }
            function unselect() {
                sys.tabitem.removeClass("#active");
            }
            return { select: select, unselect: unselect };
        }
    },
    TabIcon: {
        css: "#icon { fill: currentColor; height: 30px; display: block; width: 30px; vertical-align: middle; background-size: 100% auto; background-position: center; background-repeat: no-repeat; font-style: normal; position: relative; }",
        xml: "<span id='icon'/>",
        opt: { icon: "Home" },
        fun: function (sys, items, opts) {
            sys.icon.replace("icon/" + opts.icon).addClass("#icon");
        }
    }
});

$_("content/footer/icon").imports({
    Home: {
        xml: "<svg width='48' height='48' viewBox='0 0 1024 1024'>\
                <path d='M949.082218 519.343245 508.704442 107.590414 68.326667 518.133697c-8.615215 8.03193-9.096169 21.538549-1.043772 30.144554 8.043187 8.599865 21.566178 9.085936 30.175253 1.035586l411.214573-383.337665 411.232992 384.505257c4.125971 3.854794 9.363252 5.760191 14.5903 5.760191 5.690606 0 11.384281-2.260483 15.58393-6.757914C958.138478 540.883841 957.695387 527.388479 949.082218 519.343245L949.082218 519.343245zM949.082218 519.343245M814.699602 527.800871c-11.787464 0-21.349237 9.555633-21.349237 21.327748l0 327.037405L622.552373 876.166023 622.552373 648.662543 394.824789 648.662543l0 227.503481L224.032938 876.166023 224.032938 549.128619c0-11.772115-9.55154-21.327748-21.348214-21.327748-11.802814 0-21.35333 9.555633-21.35333 21.327748l0 369.691877 256.19494 0L437.526333 691.318038l142.329613 0 0 227.502457 256.1888 0L836.044746 549.128619C836.045769 537.356504 826.481949 527.800871 814.699602 527.800871L814.699602 527.800871zM814.699602 527.800871M665.254941 222.095307l128.095423 0 0 113.74867c0 11.789511 9.562796 21.332864 21.349237 21.332864 11.783371 0 21.346167-9.543354 21.346167-21.332864L836.045769 179.439812 665.254941 179.439812c-11.789511 0-21.35333 9.538237-21.35333 21.327748C643.900587 212.554 653.464407 222.095307 665.254941 222.095307L665.254941 222.095307zM665.254941 222.095307'/>\
              </svg>",
    },
    Room: {
        xml: "<svg viewBox='0 0 1024 1024' width='200' height='200'>\
                <path d='M404.552849 81.875752l-257.873162 0c-35.603893 0-64.46829 28.862351-64.46829 64.46829l0 258.543428c0 35.605939 28.864398 64.46829 64.46829 64.46829l257.873162 0c35.605939 0 64.46829-28.862351 64.46829-64.46829L469.02114 146.344043C469.02114 110.738104 440.158788 81.875752 404.552849 81.875752zM425.820222 426.66138 124.971269 426.66138 124.971269 125.136022l300.849976 0L425.821245 426.66138zM404.552849 554.643216l-257.873162 0c-35.603893 0-64.46829 28.862351-64.46829 64.46829l0 258.543428c0 35.605939 28.864398 64.46829 64.46829 64.46829l257.873162 0c35.605939 0 64.46829-28.862351 64.46829-64.46829L469.02114 619.111506C469.02114 583.505567 440.158788 554.643216 404.552849 554.643216zM425.820222 899.428843 124.971269 899.428843 124.971269 597.905532l300.849976 0L425.821245 899.428843zM877.320313 81.875752l-257.873162 0c-35.605939 0-64.46829 28.862351-64.46829 64.46829l0 258.543428c0 35.605939 28.862351 64.46829 64.46829 64.46829l257.873162 0c35.605939 0 64.46829-28.862351 64.46829-64.46829L941.788603 146.344043C941.788603 110.738104 912.926252 81.875752 877.320313 81.875752zM898.587686 426.66138 597.738733 426.66138 597.738733 125.136022l300.849976 0L898.588709 426.66138zM877.320313 554.643216l-257.873162 0c-35.605939 0-64.46829 28.862351-64.46829 64.46829l0 258.543428c0 35.605939 28.862351 64.46829 64.46829 64.46829l257.873162 0c35.605939 0 64.46829-28.862351 64.46829-64.46829L941.788603 619.111506C941.788603 583.505567 912.926252 554.643216 877.320313 554.643216zM898.587686 899.428843 597.738733 899.428843 597.738733 597.905532l300.849976 0L898.588709 899.428843z'/>\
              </svg>"
    },
    About: {
        xml: "<svg width='48' height='48' viewBox='0 0 1024 1024'>\
                <path d='M507.577907 23.272727C240.142852 23.272727 23.272727 239.870837 23.272727 507.094323 23.272727 774.535126 240.153546 991.375225 507.577907 991.375225 775.101356 991.375225 991.883087 774.596878 991.883087 507.094323 991.883087 239.824352 775.104293 23.272727 507.577907 23.272727ZM507.577907 69.818182C749.408866 69.818182 945.337633 265.541628 945.337633 507.094323 945.337633 748.890368 749.395172 944.82977 507.577907 944.82977 265.857934 944.82977 69.818182 748.826829 69.818182 507.094323 69.818182 265.590268 265.836128 69.818182 507.577907 69.818182ZM460.17174 368.061568 555.443661 368.061568 555.443661 763.664179 460.17174 763.664179 460.17174 368.061568ZM507.761743 230.268948C534.095946 230.268948 555.397702 251.580874 555.397702 277.899264 555.397702 304.171723 534.072967 325.506614 507.761743 325.506614 481.450515 325.506614 460.17174 304.171723 460.17174 277.899264 460.17174 251.580874 481.450515 230.268948 507.761743 230.268948Z'/>\
              </svg>"
    }
});

$_("tools").imports({
    Mask: {
        css: "#overlay { position: fixed; left: 0; top: 0; width: 100%; height: 100%; z-index: 13000; -webkit-transition-duration: .4s; transition-duration: .4s; }",
        xml: "<div id='overlay'>\
                <Loader/>\
              </div>",
        fun: function (sys, items, opts) {
            var count = 1;
            function show(val) {
                count = (val === undefined ? 1 : val);
                sys.overlay.show();
            }
            function hide() {
                count--;
                if ( count === 0 ) sys.overlay.hide();
            }
            return { show: show, hide: hide };
        }
    },
    Loader: {
        css: "#preloader { position: absolute; left: 50%; top: 50%; padding: 8px; margin-left: -25px; margin-top: -25px; background: rgba(0, 0, 0, 0.8); z-index: 13500; border-radius: 5px; }\
              #spinner { display: block; width: 34px; height: 34px; background-position: 50%; background-size: 100%; background-repeat: no-repeat; -webkit-animation: $spin 1s steps(12, end) infinite; animation: $spin 1s steps(12, end) infinite; background-image: url(\"data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D'0%200%20120%20120'%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20xmlns%3Axlink%3D'http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink'%3E%3Cdefs%3E%3Cline%20id%3D'l'%20x1%3D'60'%20x2%3D'60'%20y1%3D'7'%20y2%3D'27'%20stroke%3D'%23fff'%20stroke-width%3D'11'%20stroke-linecap%3D'round'%2F%3E%3C%2Fdefs%3E%3Cg%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(30%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(60%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(90%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(120%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(150%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.37'%20transform%3D'rotate(180%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.46'%20transform%3D'rotate(210%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.56'%20transform%3D'rotate(240%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.66'%20transform%3D'rotate(270%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.75'%20transform%3D'rotate(300%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.85'%20transform%3D'rotate(330%2060%2C60)'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E\"); }\
              @-webkit-keyframes $spin { 100% { -webkit-transform: rotate(360deg); } }\
              @keyframes $spin { 100% { transform: rotate(360deg); } }",
        xml: "<div id='preloader'>\
                <span id='spinner'/>\
              </div>"
    },
    Message: {
        css: "#message { position: fixed; top: 16px; left: 0; width: 100%; }\
              #message { z-index: 99999; display: none; height: 36px; line-height: 36px; text-align: center; }\
              #text { border-radius: 6px; font-size: 20px; padding: 3px 10px 5px; }\
              #text { background: #f2dede; border: 1px solid #eed3d7; color: #b94a48; }",
        xml: "<div id='message'>\
                <span id='text'/>\
              </div>",
        fun: function (sys, items, opts) {
            var timer;
            function error( label ) {
                clearTimeout(timer);
                sys.text.text(label);
                sys.message.show();
                timer = setTimeout(sys.message.hide, 3000);
            }
            return { error: error }; 
        }
    }
});

});