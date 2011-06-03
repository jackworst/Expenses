/* stats.js */

var makeTable = function(table) {
    var tbl = $("<table/>");

    var headTr = $("<tr/>");
    headTr.append("<td/>");
    $.each(table.colLabels, function(j, label) {
        headTr.append($("<td/>").text(label));
    });
    tbl.append(headTr);

    $.each(table.rows, function(i, row) {
        var tr = $("<tr/>");
        tr.append($("<td/>").text(table.rowLabels[i]));
        $.each(row, function(j, col) {
            var td = $("<td/>");
            td.text(col.text);
            if (col.details && col.details.length > 0) {
                td.mouseover(function() {
                    showTooltip($(this), col.details);
                }).mouseout(hideTooltip);
            }
            tr.append(td);
        });
        tbl.append(tr);
    });

    return tbl;
};

var showTooltip = function(el, details) {
    var content = $('<div/>');
    $.each(details, function(t, line) {
        content.append($('<p/>').text(line));
    });

    hideTooltip();
    var tip = $('<div id="tooltip"/>').append(content).css({
        left: el.position().left,
        top: el.position().top + el.outerHeight(),
    });
    $("body").prepend(tip);
};

var hideTooltip = function(el, content) {
    $("#tooltip").remove();
};

var daysInMonth = function(month, year) {
    return 32 - new Date(year, month, 32).getDate();
};

var categories = ["food", "household", "party", "leisure", "health", "rent", "clothes", "transport", "misc"];
var categoryLabels = {
    food: "Food",
    household: "Household",
    party: "Party",
    leisure: "Free Time",
    health: "Health",
    rent: "Rent",
    clothes: "Clothes",
    transport: "Transportation",
    misc: "Miscellaneous"
};

var getUrlParams = function() {
    var params = {};

    $.each(location.search.slice(1).split("&"), function(i, param) {
        var keyVal = param.split("=");
        params[decodeURIComponent(keyVal[0])] = decodeURIComponent(keyVal[1]);
    });

    return params;
};

var showExpenses = function(expenses, year, month) {
    var table = [];
//    var days;
//    if (month) {
//        days = daysInMonth(month, year);
//    }
    var rowCount = month ? daysInMonth(month, year) : 12;
    
    // init empty table
    table.rows = [];
    for (var row = 0; row < rowCount; row++) {
        table.rows[row] = [];
        for (var col = 0; col < categories.length; col++) {
            table.rows[row][col] = {
                expenses: [],
                sum: 0,
                text: "",
                details: []
            };
        }
    }
    table.categorySums = [];
    for (var col = 0; col < categories.length; col++) {
        table.categorySums[col] = 0;
    }

    // add labels
    table.rowLabels = [];
    for (var row = 0; row < rowCount; row++) {
        //FIXME: proper date formatting!
        if (month) {
            table.rowLabels[row] = (row + 1) + "." + (month + 1) + "." + year;
        } else {
            table.rowLabels[row] = (row + 1) + "." + year;
        }
    }
    table.colLabels = [];
    for (var col = 0; col < categories.length; col++) {
        table.colLabels[col] = categoryLabels[categories[col]];
    }

    // fill in and sum up expenses
    $.each(expenses, function(i, expense) {
        var date = new Date(expense.date * 1000);
        var row = month ? date.getDate() - 1 : date.getMonth();
        var col = $.inArray(expense.category, categories);
        table.rows[row][col].expenses.push(expense);
        table.rows[row][col].sum += expense.amount;
        table.rows[row][col].text = "" + table.rows[row][col].sum;
        var txt = expense.amount + " " + expense.category + (expense.text ? " (" + expense.text + ")" : "");
        table.rows[row][col].details.push(txt);
        table.categorySums[col] += expense.amount;
    });
    table.rows.push([{text: "total"}].concat(table.categorySums.map(function(sum) {return {text: sum}})));

    //TODO: sanity check that nothing got lost

    $("#status").append(makeTable(table));
};

$(document).ready(function() {
    var params = getUrlParams();
    var year, month;
    if (params.year && params.month) {
        // given month
        year = parseInt(params.year, 10);
        month = parseInt(params.month, 10);
    } else  if (params.year) {
        // given  year
        year = parseInt(params.year, 10);
    } else {
        // current month
        year = new Date().getFullYear();
        month = new Date().getMonth();
    }

    $.getJSON("/stats/" + encodeURIComponent(year) + (month ? "/" + encodeURIComponent(month) : ""), function(expenses) {
        showExpenses(expenses, year, month);
    });
});
