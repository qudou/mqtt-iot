const xmlplus = require("xmlplus");
const viewId = "x827ex27795f";

xmlplus("mqtt-iot", (xp, $_, t) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Mosca id='mosca'/>\
                <Mongo id='mongo'/>\
              </main>",
        map: { defer: "mosca" },
        fun: function (sys, items, opts) {
            sys.mongo.on("connected", e => sys.mosca.show());
        }
    },
    Mosca: {
        xml: "<main id='mosca'/>",
        opt: { port: 3000, http: { port: 8000, bundle: true, static: "./static" } },
        fun: function (sys, items, opts) {
            let mosca = require('mosca'),
                server = new mosca.Server(opts);
            server.on('subscribed', (topic, client) => {
                update(topic, true);
                topic == viewId && this.notify("mongo", ["query", {table: 'homes'}]);
            });
            server.on('unsubscribed', (topic, client) => {
                update(topic, false);
            });
            server.on('published', (packet, client) => {
                if ( packet.topic == "server" ) {
                    let payload = JSON.parse(packet.payload.toString());
                    this.notify("mongo", [payload.topic, payload.data]);
                }
            });
            server.on('ready', () => {
                server.authenticate = (client, user, pwd, callback) => {
                    callback(null, user == "qudouo");
                };
                console.log('Mosca server is up and running');
                this.notify("mongo", ["update", {table: "parts", where: {}, data: {online: false}}]);
            });
            this.watch("publish", (e, topic, payload, sid) => {
                payload = JSON.stringify({topic: topic, data: payload, sid: sid});
                server.publish({topic: viewId, payload: payload, qos: 1, retain: false});
            });
            function update(clientId, online) {
                let object = {table: "parts", where: {_id: clientId}, data: {online: online}};
                sys.mosca.notify("mongo", ["update", object]);
                sys.mosca.notify("publish", ["update", object.data, clientId]);
            }
        }
    },
    Mongo: {
        xml: "<main id='mongo' xmlns:i='mongo'>\
                <i:Homes id='homes'/>\
                <i:Rooms id='rooms'/>\
                <i:Parts id='parts'/>\
              </main>",
        map: { share: "mongo/Mongoose" },
        fun: function (sys, items, opts) {
            function update (table, where, data) {
                return new Promise((resolve, reject) => {
                    items[table].update(where, data, {multi: true}, (err, res) => {
                        if (err) throw err;
                        resolve(res);
                    });
                });
            }
            function query (table, where = {}) {
                return new Promise((resolve, reject) => {
                    items[table].find(where, (err, res) => {
                        if (err) throw err;
                        resolve(res);
                    });
                });
            }
            this.watch("mongo", async (e, topic, d) => {
                let payload;
                switch (topic) {
                    case "query":
                        d.data = await query(d.table, d.where);
                        this.notify("publish", ["list-" + d.table, d]);
                        break;
                    case "update":
                        payload = await update(d.table, d.where, d.data);
                        break;
                    default:;
                }
            });
        }
    }
});

$_("mongo").imports({
    Mongoose: {
        fun: function (sys, items, opts) {
            var mongoose = require('mongoose'),
                DB_URL = 'mongodb://localhost:27017/mosca';
            mongoose.connect(DB_URL,{useMongoClient: true});
            mongoose.connection.on('connected', () => {
                this.trigger("connected");
                console.log('Mongoose connection open to ' + DB_URL);  
            });
            mongoose.connection.on('error', err => {    
                console.log('Mongoose connection error: ' + err);  
            });
            mongoose.connection.on('disconnected', () => {    
                console.log('Mongoose connection disconnected');  
            });    
            return mongoose;
        }
    },
    Homes: {
        xml: "<Mongoose id='mongoose'/>",
        fun: function (sys, items, opts) {
            let Schema = items.mongoose.Schema;
            const ObjectId = Schema.Types.ObjectId;
            let HomeSchema = new Schema({
                _id : { type: ObjectId },
                name: {type: String}                   
            });
            return items.mongoose.model('Home',HomeSchema);
        }
    },
    Rooms: {
        xml: "<Mongoose id='mongoose'/>",
        fun: function (sys, items, opts) {
            let Schema = items.mongoose.Schema;
            const ObjectId = Schema.Types.ObjectId;
            let RoomSchema = new Schema({
                _id : { type: ObjectId },
                name: {type: String}                   
            });
            return items.mongoose.model('Room',RoomSchema);
        }
    },
    Parts: {
        xml: "<Mongoose id='mongoose'/>",
        fun: function (sys, items, opts) {
            let Schema = items.mongoose.Schema;
            const ObjectId = Schema.Types.ObjectId;
            let PartSchema = new Schema({
                _id : { type: ObjectId },
                name: {type: String},
                'class': {type: String},
                room: {type: String},
                online: {type: Boolean}                     
            });
            return items.mongoose.model('Part',PartSchema);
        }
    }
});

$("homes").imports({
    Mapping: {
        fun: function ( sys, items, opts ) {
            this.on("enter", function( e, o ) {
                e.target.trigger("next", [o, o.args.action]);
            });
        }
    },
    Select: {
        xml: "<i:Sqlite id='sqlite' xmlns:i='/sqlite'/>",
        fun: function ( sys, items, opts ) {
            var select = "SELECT * FROM project WHERE user=";
            this.on("enter", function( e, r ) {
                items.sqlite.all(select + r.user, function(err, data) {
                    if ( err ) { throw err; }
                    r.data = data;
                    sys.sqlite.trigger("reply", r);
                });
            });
        }
    },
    Insert: {
        xml: "<main id='top' xmlns:v='validate' xmlns:i='/sqlite'>\
                <i:Sqlite id='sqlite'/>\
                <v:Insert id='validate'/>\
              </main>",
        fun: function ( sys, items, opts ) {
            var fs = require("fs"),
                project = "INSERT INTO project(user,name) VALUES(?,?)",
                namespace = "INSERT INTO namespace(name,parent,project) VALUES(?,-1,?)";
            function mkdir( r ) {
                var folder = "static/res/" + r.rowid;
                fs.mkdir(folder, function ( err ) {
                    if ( err ) throw err;
                    r.data = { rowid: r.rowid };
                    sys.top.trigger("reply", r);
                })
            }
            sys.validate.on("success", function ( e, r ) {
                var stmt = items.sqlite.prepare(project);
                stmt.run(r.user, r.body.name, function( err ) {
                    if ( err ) throw err;
                    r.rowid = this.lastID;
                    stmt = items.sqlite.prepare(namespace);
                    stmt.run(r.body.name, this.lastID, function( err ) {
                        if ( err ) throw err;
                        mkdir(r);
                    });
                });
            });
            this.on("enter", items.validate);
        }
    },
    Delete: {
        xml: "<main id='top' xmlns:v='validate' xmlns:i='/sqlite'>\
                <i:Sqlite id='sqlite'/>\
                <v:Delete id='validate'/>\
              </main>",
        fun: function ( sys, items, opts ) {
            var rimraf = require("rimraf"),
                remove = "DELETE FROM project WHERE id=? AND user=?";
            function rmdir( r ) {
                var folder = "static/res/" + r.body.id;
                rimraf(folder, function ( err ) {
                    if ( err ) throw err;
                    sys.top.trigger("reply", r);
                });
            }
            sys.validate.on("success", function( e, r ) {
                var stmt = items.sqlite.prepare(remove);
                stmt.run(r.body.id, r.user, function ( err ) {
                    if ( err ) throw err;
                    this.changes ? rmdir(r) : sys.top.trigger("reply", [r, -1]);
                });
            });
            this.on("enter", items.validate);
        } 
    },
    Update: {
        xml: "<main xmlns:v='validate' xmlns:i='/sqlite'>\
                <i:Sqlite id='sqlite'/>\
                <v:Update id='validate'/>\
              </main>",
        fun: function ( sys, items, opts ) {
            var update = "UPDATE project SET name=?, env=?, theme=? WHERE id=? AND user=?";
            sys.validate.on("success", function( e, r ) {
                var stmt = items.sqlite.prepare(update);
                stmt.run(r.body.name, r.body.env, r.body.theme, r.body.id, r.user, function( err ) {
                    if ( err ) throw err;
                    this.changes ? next(r) : sys.sqlite.trigger("reply", [r, -1]);
                });
            });
            var namespace = "UPDATE namespace SET name=? WHERE parent=-1 AND project=?";
            function next( r ) {
                var stmt = items.sqlite.prepare(namespace);
                stmt.run(r.body.name, r.body.id, function ( err ) {
                    if ( err ) throw err;
                    sys.sqlite.trigger("reply", r);
                });
            }
            this.on("enter", items.validate);
        }
    }
});

$("sqlite").imports({
    Sqlite: {
        fun: function ( sys, items, opts ) {
            var sqlite = require("sqlite3").verbose(),
                db = new sqlite.Database("data.db");
			db.exec("VACUUM");
            db.exec("PRAGMA foreign_keys = ON");
            return db;
        }
    },
    Prepare: {
        fun: function ( sys, items, opts ) {
            function prepare( stmt ) {
                var args = [].slice.call(arguments).slice(1);
                args.forEach(function ( item ) {
                    stmt = stmt.replace("?", typeof item == "string" ? '"' + item + '"' : item);
                });
                return stmt;
            }
            return prepare;
        }
    }
});

$("mosca").imports({
    Mosca: {
        xml: "<main id='mosca'/>",
        opt: { port: 3000, http: { port: 8000, bundle: true, static: "./static" } },
        fun: function (sys, items, opts) {
            let first = this.first(),
                table = this.find("./*[@id]").hash(),
                mosca = require('mosca'),
                server = new mosca.Server(opts);
            this.on("next", (e, d, next) => {
                d.ptr[0] = table[next] || d.ptr[0].next();
                d.ptr[0] ? d.ptr[0].trigger("enter", d, false) : this.trigger("reject", d);
            });
            this.watch("reply", (e, d) => {
                delete d.ptr;
                server.publish({topic: d.sid, payload: d, qos: 1, retain: false});
            });
            this.on("reject", (e, d) => {
                delete d.ptr;
                server.publish({topic: d.sid, payload: d, qos: 1, retain: false});
            });
            server.on('subscribed', (topic, client) => {
                update(topic, true);
                topic == viewId && this.notify("mongo", ["query", {table: 'homes'}]);
            });
            server.on('unsubscribed', (topic, client) => {
                update(topic, false);
            });
            server.on('published', (packet, client) => {
                if ( packet.topic == "server" ) {
                    let d = JSON.parse(packet.payload.toString());
                    first.trigger("enter", {topic: d.topic, req: d.req, ptr:[first]}, false);
                }
            });
            server.on('ready', () => {
                server.authenticate = (client, user, pwd, callback) => callback(null, user == "qudouo");
                this.notify("mongo", ["update", {table: "parts", where: {}, data: {online: false}}]);
                console.log('Mosca server is up and running');
            });
        }
    }
});

$("parts").imports({
    Update: {
        xml: "<main xmlns:v='validate' xmlns:i='/sqlite'>\
                <i:Sqlite id='sqlite'/>\
                <v:Update id='validate'/>\
              </main>",
        fun: function (sys, items, opts) {
            let SELECT = "SELECT * FROM parts WHERE id=",
                UPDATE = "UPDATE parts SET name=?, room=?, class=?, online=? WHERE id=?";
            this.on("enter" (e, r) => {
                xp.extend(r.body, await select(r.body.id));
                items.validate(e, d);
            });
            sys.validate.on("success", async (e, r) => {
                let d = r.body,
                    stmt = items.sqlite.prepare(update);
                stmt.run(d.name, d.room, d.class, d.online, function (err) {
                    if ( err ) throw err;
                    r.body.code = this.changes;
                    sys.sqlite.trigger("reply", r);
                });
            });
            function select(partId) {
                return new Promise((resolve, reject) => {
                    items.sqlite.all(SELECT + partId, (err, data) => {
                        if ( err ) { throw err; }
                        resolve(data);
                    });
                });
            }
        }
    }
});

$("parts/validate").imports({
    Validate: {
        fun: function ( sys, items, opts ) {
            function id( value ) {
                return xp.isNumeric(value) && /^\d+$/.test(value + "");
            }
            function name( value ) {
                return typeof value == "string" && /^[a-z_][a-z0-9_]*$/i.test(value);
            }
            return { id: id, name: name };
        }
    },
    Insert: {
        xml: "<i:Validate id='validate' xmlns:i='.'/>",
        fun: function ( sys, items, opts ) {
            function validate( e, r ) {
                items.validate.name(r.body.name) ? sys.validate.trigger("success", r, false) : sys.validate.trigger("reply", [r, -1]);
            }
            return validate;
        }
    },
    Delete: {
        xml: "<i:Validate id='validate' xmlns:i='.'/>",
        fun: function ( sys, items, opts ) {
            function validate( e, r ) {
                items.validate.id(r.body.id) ? sys.validate.trigger("success", r, false) : sys.validate.trigger("reply", [r, -1]);
            }
            return validate;
        }
    },
    Update: {
        xml: "<Validate id='validate'/>",
        fun: function ( sys, items, opts ) {
            var check = items.validate;
            return function (e, r) {
                r.code = check.id(r.body.id) && check.name(r.body.name) ? 0 : -1;
                sys.validate.trigger(r.code == 0 ? "success" : "reply", r);
            };
        }
    }
});

}).startup("//mqtt-iot/Index");