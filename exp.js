var http = require("http"), url = require("url"), form = require("./lib/cb-forms"), mime = require("mime");
var mongo = require('./lib/mongo-driver/node-mongodb-native/lib/mongodb');
var fs = require("fs");
var config = require("./config").config;

var staticRe = /^\/static\/([\w\.]+)$/;
var statsRe = /^\/stats\/(\d+)(\/(\d+))?$/;

var db = new mongo.Db('local', new mongo.Server("127.0.0.1", 27017, {}));

var dbClient;
db.open(function(err, client) {
    dbClient = client;
});

var withExpenses = function(cb) {
    dbClient.collection('exp', function(err, expenses) {
        if (err) {
            throw err;
        }
        cb(expenses);
    });
};

var sendResponse = function(response, data) {
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify(data) + "\n", "utf8");
};

var sendError = function(response, code, msg) {
    response.writeHead(code || 500, {'Content-Type': 'text/plain'});
    response.end(msg || "ERROR", "utf8");
};

var checkAuthToken = function(token) {
    return token === config.token;
};

var handleSync = function(request, response) {
    form.onData(request, function(data) {
        console.log("POST data: " + JSON.stringify(data));

        if (checkAuthToken(data.token)) {
            var expense = {};
            expense.eid = data.eid
            expense.date = parseInt(data.date, 10);
            expense.amount = parseInt(data.amount, 10);
            expense.category = data.category || "none";
            expense.text = data.text || "";

            withExpenses(function(expenses) {
                expenses.find({eid:expense.eid}).toArray(function(e, existing) {
                    if (existing.length === 0) {
                        expenses.insert(expense, {safe: true}, function(err, docs) {
                            if (!err) {
                                sendResponse(response, {ok: true, eid: expense.eid});
                            } else {
                                sendResponse(response, {ok: false, error: err});
                            }
                        });
                    } else {
                        sendResponse(response, {ok: false, error: "duplicates: " + JSON.stringify(existing)});
                    }
                });
            });
        } else {
            sendError(response, 403, "ACCESS DENIED");
        }
    });
};

var handleStats = function(request, response) {
    withExpenses(function(expenses) {
        var reqUrl = url.parse(request.url, true);
        if (checkAuthToken(reqUrl.query.token)) {
            var match = statsRe.exec(reqUrl.pathname);
            var year = parseInt(match[1], 10), month = match[3] ? parseInt(match[3], 10) : undefined;
            var start, end;
            if (year !== undefined && month !== undefined) {
                start = new Date(year, month, 1).getTime() / 1000;
                end = new Date(year, month + 1, 1).getTime() / 1000;
            } else {
                start = new Date(year, 0, 1).getTime() / 1000;
                end = new Date(year + 1, 0, 1).getTime() / 1000;
            }
            expenses.find({date:{$gte: start, $lt: end}}).toArray(function(e, expenses) {
                sendResponse(response, expenses);
            });
        } else {
            sendError(response, 403, "ACCESS DENIED");
        }
    });
};

var handleStatic = function(request, response, resource) {
    console.log("serving " + resource);
    fs.readFile("./static/" + resource, function (err, data) {
        if (!err) {
            var contentType = mime.lookup(resource);
            if (contentType === "text/html") {
                contentType += ";charset=UTF-8";
            }
            response.writeHead(200, {'Content-Type': contentType});
            response.end(data);
        } else {
            sendError(response, 404, "NOT FOUND");
        }
    });
};

http.createServer(function (request, response) {
    var reqUrl = url.parse(request.url);

    console.log("----- " + request.connection.remoteAddress + " " + reqUrl.href + " -----");
    if (reqUrl.pathname === "/sync") {
        handleSync(request, response);
    } else if (statsRe.test(reqUrl.pathname)) {
        handleStats(request, response);
    } else if (staticRe.test(reqUrl.pathname)) {
        handleStatic(request, response, staticRe.exec(reqUrl.pathname)[1]);
    } else {
        console.log("ignoring");
        sendError(response, 404, "NOT FOUND");
    }
}).listen(13373);
