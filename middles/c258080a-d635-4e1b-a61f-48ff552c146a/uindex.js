/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("c258080a-d635-4e1b-a61f-48ff552c146a", (xp, $_) => { // 模板管理

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Select id='select'/>\
                <Signup id='signup'/>\
                <Remove id='remove'/>\
                <Update id='update'/>\
              </main>"
    },
    Select: {
        xml: "<Sqlite id='select' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/classes/select", (e, p) => {
                let stmt = `SELECT * FROM classes WHERE type<>0`;
                items.select.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = data;
                    this.trigger("to-users", p);
                });
            });
        }
    },
    Signup: {
        xml: "<Flow id='signup' xmlns:i='signup'>\
                <i:Validate/>\
                <i:Signup/>\
              </Flow>",
        fun: function (sys, items, opts) {
            this.watch("/classes/signup", items.signup.start);
        }
    },
    Remove: {
        xml: "<Sqlite id='remove' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/classes/remove", (e, p) => {
                let remove = "DELETE FROM classes WHERE id=?";
                let stmt = items.remove.prepare(remove);
                stmt.run(p.body.id, function (err) {
                    if (err) throw err;
                    p.data = this.changes ? {code: 0, desc: "删除成功"} : {code: -1, desc: "删除失败"};
                    sys.remove.trigger("to-users", p);
                });
            });
        }
    },
    Update: {
        xml: "<Flow id='update' xmlns:i='update'>\
                <i:Validate/>\
                <i:Update/>\
              </Flow>",
        fun: function (sys, items, opts) {
            this.watch("/classes/update", items.update.start);
        }
    },
    Flow: {
        fun: function (sys, items, opts) {
            var ptr, first = this.first();
            this.on("next", (e, p) => {
                e.stopPropagation();
                ptr = ptr.next();
                ptr.trigger("exec", p, false);
            });
            function start(e, p) {
                ptr = first;
                ptr.trigger("exec", p, false);
            }
            return { start: start };
        }
    }
});

$_("signup").imports({
    Validate: {
        fun: function ( sys, items, opts ) {
            this.on("exec", (e, p) => {
                e.stopPropagation();
                if (p.body.name.length > 1)
                    return this.trigger("next", p);
                p.data = {code: -1, desc: "模板名称至少2个字符"};
                this.trigger("to-users", p);
            });
        }
    },
    Signup: {
       xml: "<Sqlite id='signup' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("exec", (e, p) => {
                let stmt = items.signup.prepare("INSERT INTO classes (id,name,desc) VALUES(?,?,?)");
                let id = require("uuid/v1")();
                stmt.run(id, p.body.name, p.body.desc);
                stmt.finalize(() => {
                    p.data = {code: 0, desc: "注册成功"};
                    sys.signup.trigger("to-users", p);
                }); 
            });
        }
    }
});

$_("update").imports({
    Validate: {
        map: {extend: {"from": "../signup/Validate"}}
    },
    Update: {
        xml: "<Sqlite id='update' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("exec", (e, p) => {
                let update = "UPDATE classes SET name=?, desc=? WHERE id=?";
                let stmt = items.update.prepare(update);
                stmt.run(p.body.name,p.body.desc,p.body.id, err => {
                    if (err) throw err;
                    p.data = {code: 0, desc: "更新成功"};
                    this.trigger("to-users", p);
                });
            });
        }
    }
});

});