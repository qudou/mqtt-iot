/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("9dd8a38b-a406-4679-82d5-dd8b7e3a30b7", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<i:Flow id='index' xmlns:i='//miot/middle'>\
                <i:Router id='router' url='/auths/:action'/>\
                <Users id='users'/>\
                <Areas id='areas'/>\
                <Links id='links'/>\
                <Parts id='parts'/>\
                <Auth id='auth'/>\
              </i:Flow>"
    },
    Users: {
        xml: "<Sqlite id='db' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, p) => {
                let stmt = `SELECT id,name,email FROM users WHERE id<>0`;
                items.db.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = [];
                    data.forEach(i => {
                        p.data.push({'id':i.id,'name':i.name,'email':i.email});
                    });
                    this.trigger("to-user", p);
                });
            });
        }
    },
    Areas: {
        xml: "<Sqlite id='db' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            let stmt = "SELECT id, name FROM areas WHERE id <> 0";
            this.on("enter", (e, p) => {
                items.db.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = data;
                    this.trigger("to-user", p);
                });
            });
        }
    },
    Links: {
        xml: "<Sqlite id='db' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            let stmt = "SELECT id, name, area FROM links WHERE area<>0 ORDER BY area";
            this.on("enter", (e, p) => {
                items.db.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = data;
                    this.trigger("to-user", p);
                });
            });
        }
    },
    Parts: {
        xml: "<Sqlite id='db' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("enter", async (e, p) => {
                let table = {};
                let parts = await getParts(p.body.link);
                parts.forEach(i=>table[i.id]=i);
                let auths = await getAuths(p.body.user);
                auths.forEach(i=>table[i.part] && (table[i.part].auth = 1));
                p.data = parts;
                this.trigger("to-user", p);
            });
            function getParts(link) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT id,name,link,class FROM parts WHERE link='${link}' AND type<>0`;
                    items.db.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows);
                    });
                });
            }
            function getAuths(user) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM auths WHERE user = ${user}`;
                    items.db.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows);
                    });
                });
            }
        }
    },
    Auth: {
        xml: "<Sqlite id='db' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, p) => {
                p.body.auth ? exists(p) : remove(p);
            });
            function exists(p) {
                let stmt = `SELECT * FROM auths WHERE user=${p.body.user} AND part='${p.body.part}'`;
                items.db.all(stmt, (err, data) => {
                    if (err) throw err;
                    if (!data.length)
                        return insert(p);
                    p.data = {code: 0, desc: "授权成功"};
                    sys.db.trigger("to-user", p);
                });
            }
            function insert(p) {
                let stmt = items.db.prepare("INSERT INTO auths (user,part) VALUES(?,?)");
                stmt.run(p.body.user, p.body.part);
                stmt.finalize(() => {
                    p.data = {code: 0, desc: "授权成功"};
                    sys.db.trigger("to-user", p);
                });
            }
            function remove(p) {
                let stmt = items.db.prepare("DELETE FROM auths WHERE user=? AND part=?");
                stmt.run(p.body.user, p.body.part, function (err) {
                    if (err) throw err;
                    p.data = this.changes ? {code: 0, desc: "删除成功"} : {code: -1, desc: "删除失败"};
                    sys.db.trigger("to-user", p);
                });
            }
        }
    }
});

});