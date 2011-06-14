/* exp.js */

var resetFields = function() {
    $("#howMuch, #what").val("");
    $("#when").val(iso8601date(new Date()));
};

var iso8601date = function(date) {
    return pad2(date.getFullYear()) + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
};

var pad2 = function(number) {
    return (number < 10 ? "0" : "") + number;
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
    $.each(expenses, function(i, expense) {
        $.post("/sync", expense, function(response) {
            if (response.ok) {
                clearExpense(response.eid);
                statusMessage("success", "OK: " + expense.eid);
            } else {
                alert("failed: " + expense.eid + "\n" + response.error);
                statusMessage("failure", "ERR: " + expense.eid);
            }
            todo -= 1;
            if (todo == 0) {
                cb();
            }
        });
    });
};

var listExpenses = function(target) {
    var expenses = JSON.parse(localStorage.expenses || "[]");
    var table = $('<table/>');
    $.each(expenses, function(i, expense) {
        var tr = $('<tr/>');
        tr.append($('<td/>').text(iso8601date(new Date(expense.date * 1000))));
        tr.append($('<td/>').text(expense.amount / 100));
        tr.append($('<td/>').text(expense.category));
        tr.append($('<td/>').text(expense.text));
        var delLink = $('<a href="#">Delete</a>').click(function() {
            clearExpense(expense.eid);
            listExpenses($("#list"));
        });
        tr.append($('<td/>').append(delLink));
        table.append(tr);
    });
    target.empty().append(table);
};

var statusMessage = function(kind, text) {
    $("#status").append($('<p/>').addClass(kind).text(text));
};

$(document).ready(function() {
    $("#add").click(function() {
        addExpense({
            eid: "" + new Date().getTime() + "_" + Math.random(), 
            date: Date.parse($("#when").val()) / 1000,
            amount: $("#howMuch").val() * 100,
            category: $("#category").val(),
            text: $("#what").val(),
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
