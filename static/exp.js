/* exp.js */

var resetFields = function() {
    $("#howMuch, #what").val("");
    var now = new Date();
    var nowStr = formatIso8601date(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
    $("#when").val(nowStr);
};

var formatIso8601date = function(date) {
    return pad2(date.getUTCFullYear()) + "-" + pad2(date.getUTCMonth() + 1) + "-" + pad2(date.getUTCDate());
};

var parseIso8601date = function(str) {
    var arr = str.split(/-/);
    return new Date(Date.UTC(arr[0], arr[1]-1, arr[2]));
};

var pad2 = function(number) {
    return (number < 10 ? "0" : "") + number;
};

var parseMoney = function(txt) {
    return Math.round(parseFloat(txt) * 100);
};

var handleAuthError = function(jqXHR, textStatus) {
    if (jqXHR.status === 403) {
        window.location = "/static/token.html";
    } else {
        alert(textStatus);
    }
};

var addExpense = function(expense) {
    var expenses = JSON.parse(localStorage.expenses || "[]");
    expenses.push(expense);
    localStorage.expenses = JSON.stringify(expenses);
};

var clearExpense = function(eid) {
    var expenses = JSON.parse(localStorage.expenses || "[]");
    expenses = expenses.filter(function(ex){
        return ex.eid !== eid;
    });
    localStorage.expenses = JSON.stringify(expenses);
};

var syncExpenses = function(cb) {
    var expenses = JSON.parse(localStorage.expenses || "[]");
    var todo = expenses.length;
    if (todo === 0) {
        alert("nothing to sync");
    }
    $.each(expenses, function(i, expense) {
        var data = $.extend({token: localStorage.token}, expense);
        $.post("/sync", data, function(response) {
            if (response.ok) {
                clearExpense(response.eid);
                statusMessage("success", "OK: " + expense.eid);
            } else {
                alert("failed: " + expense.eid + "\n" + response.error);
                statusMessage("failure", "ERR: " + expense.eid);
            }
            console.log(todo);
            todo -= 1;
            if (todo == 0) {
                cb();
            }
        }).error(handleAuthError);
    });
};

var listExpenses = function(target) {
    var expenses = JSON.parse(localStorage.expenses || "[]");
    var table = $('<table/>');
    $.each(expenses, function(i, expense) {
        var tr = $('<tr/>');
        tr.append($('<td/>').text(formatIso8601date(new Date(expense.date * 1000))));
        tr.append($('<td/>').text(expense.amount / 100));
        tr.append($('<td/>').text(expense.category));
        tr.append($('<td/>').text(expense.text));
        var delLink = $('<a href="#">Del</a>').click(function() {
            clearExpense(expense.eid);
            listExpenses($("#list"));
        });
        var copyLink = $('<a href="#">Edit</a>').click(function() {
            clearExpense(expense.eid);
            $("#howMuch").val(expense.amount / 100);
            $("#category").val(expense.category);
            $("#what").val(expense.text);
            $("#when").val(formatIso8601date(new Date(expense.date * 1000)));
            listExpenses($("#list"));
        });
        tr.append($('<td/>').append(delLink).append('<span> </span>').append(copyLink));
        table.append(tr);
    });
    target.empty().append(table);
};

var statusMessage = function(kind, text) {
    $("#status").append($('<p/>').addClass(kind).text(text));
};

$(window).load(function(){
    window.scrollTo(0,1);
    $("#howMuch").focus();
});

$(document).ready(function() {
    $("#add").click(function() {
        addExpense({
            eid: "" + new Date().getTime() + "_" + Math.random(), 
            date: parseIso8601date($("#when").val()).getTime() / 1000,
            amount: parseMoney($("#howMuch").val()),
            category: $("#category").val(),
            text: $("#what").val(),
            creationTs: Math.floor(new Date().getTime() / 1000)
        });
        resetFields();
        listExpenses($("#list"));
        return false;
    });

    $("#sync").click(function() {
        syncExpenses(function() {
            listExpenses($("#list"));
        });
        return false;
    });

    resetFields();
    listExpenses($("#list"));
});
