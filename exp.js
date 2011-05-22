var http = require("http"), url = require("url"), form = require("./lib/cb-forms"), mime = require("mime");
var mongo = require('./lib/mongo-driver/node-mongodb-native/lib/mongodb');
var fs = require("fs");

var staticRe = /^\/static\/([\w\.]+)$/;

var db = new mongo.Db('test', new mongo.Server("127.0.0.1", 27017, {}));

var withExpenses = function(cb) {
    db.open(function(err, p_client) {
        db.collection('exp', function(err, expenses) {
            if (err) {
                throw err;
            }
            cb(expenses);
        });
    });
};

var sendResponse = function(response, data) {
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify(data) + "\n", "UTF-8");
};

var handleSync = function(request, response) {
    form.onData(request, function(data) {
        console.log("POST data: " + JSON.stringify(data));

        var expense = {};
        expense.eid = data.eid
        expense.date = parseInt(data.date, 10);
        expense.amount = parseInt(data.amount, 10);
        expense.category = data.category || "none";
        expense.text = data.text || "";

        withExpenses(function(expenses) {
            expenses.find({eid:expense.eid}).toArray(function(e, existing) {
                if (existing.length === 0) {
                    expenses.insert(expense, function(err, docs) {
                        sendResponse(response, {ok: true, eid: expense.eid});
                    });
                } else {
                    sendResponse(response, {ok: false, error: "duplicates: " + JSON.stringify(existing)});
                }
            });
        });
    });
};

var handleStatic = function(request, response, resource) {
    console.log("serving " + resource);
    fs.readFile("./static/" + resource, function (err, data) {
        if (!err) {
            response.writeHead(200, {'Content-Type': mime.lookup(resource)});
            response.end(data);
        } else {
            response.writeHead(404, {'Content-Type': 'text/plain'});
            response.end("ERROR", "UTF-8");
        }
    });
};

http.createServer(function (request, response) {
    var reqUrl = url.parse(request.url);

    console.log("----- " + request.connection.remoteAddress + " " + reqUrl.href + " -----");
    if (reqUrl.pathname === "/sync") {
        handleSync(request, response);
    } else if (staticRe.test(reqUrl.pathname)) {
        handleStatic(request, response, staticRe.exec(reqUrl.pathname)[1]);
    } else {
        console.log("ignoring");
        response.writeHead(404, {'Content-Type': 'text/plain'});
        response.end();
    }
}).listen(1337);
