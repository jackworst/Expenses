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
    table.categorySums = categories.map(function(cat) {return 0});
    table.rowSums = table.rows.map(function(cat) {return 0});

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
    table.rowLabels.push("total");
    table.colLabels = categories.map(function(cat) {return categoryLabels[cat]}).concat("sum");

    // fill in and sum up expenses
    $.each(expenses, function(i, expense) {
        var date = new Date(expense.date * 1000);
        var row = month ? date.getDate() - 1 : date.getMonth();
        var col = $.inArray(expense.category, categories);
        var cell = table.rows[row][col];

        cell.expenses.push(expense);
        cell.sum += expense.amount;
        cell.text = "" + cell.sum;
        cell.details.push(expense.amount + " " + expense.category + (expense.text ? " (" + expense.text + ")" : ""));

        table.categorySums[col] += expense.amount;
        table.rowSums[row] += expense.amount;
    });

    // compute grand total in three ways and do sanity check
    var categorySumsSum = table.categorySums.reduce(function(sumSum, sum) {return sumSum + sum;});
    var rowSumsSum = table.rowSums.reduce(function(sumSum, sum) {return sumSum + sum;});
    var expensesSum = expenses.reduce(function(sumSum, expense) {return sumSum + expense.amount;}, 0);
    if (Math.abs(expensesSum - categorySumsSum) > 0.1) {
        alert("categories sum incorrect? is " + categorySumsSum + " but should be " + expensesSum);
    }
    if (Math.abs(expensesSum - rowSumsSum) > 0.1) {
        alert("rows sum incorrect? is " + rowSumsSum + " but should be " + expensesSum);
    }

    // add row and col sums
    $.each(table.rowSums, function(i, sum) {
        table.rows[i].push({text: "" + sum});
    });
    table.rows.push(table.categorySums.map(function(sum) {return {text: "" + sum}}).concat({text: "" + expensesSum}));

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
