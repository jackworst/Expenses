/* stats.js */

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

var makeTable = function(table) {
    var tbl = $("<table/>");

    var headTr = $("<tr/>");
    if (typeof table.axis === "string") {
        headTr.append($("<td/>").text(table.axis));
    } else if (table.axis) {
        headTr.append($("<td/>").append(table.axis));
    } else {
        headTr.append("<td/>");
    }
    $.each(table.colLabels, function(j, label) {
        headTr.append($("<td/>").text(label));
    });
    tbl.append(headTr);

    $.each(table.rows, function(i, row) {
        var tr = $("<tr/>").addClass(table.rowClasses[i] || "");
        if (typeof table.rowLabels[i] === "string") {
            tr.append($("<td/>").text(table.rowLabels[i]));
        } else {
            tr.append($("<td/>").append(table.rowLabels[i]));
        }
        $.each(row, function(j, col) {
            var td = $("<td/>").text(col.text);
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

var getUrlParams = function() {
    var params = {};

    $.each(location.search.slice(1).split("&"), function(i, param) {
        var keyVal = param.split("=");
        params[decodeURIComponent(keyVal[0])] = decodeURIComponent(keyVal[1]);
    });

    return params;
};

var formatMoney = function(amount) {
    return (amount / 100).toFixed(2);
};

var showExpenses = function(expenses, year, month) {
    var monthView = month !== undefined;
    var yearView = !monthView;
    var currentMonth = new Date().getMonth();
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
    if (yearView) {
        table.pastCategorySums = categories.map(function(cat) {return 0});
    }
    table.rowSums = table.rows.map(function(cat) {return 0});

    // add labels
    table.rowLabels = [];
    table.rowClasses = [];
    for (var row = 0; row < rowCount; row++) {
        //FIXME: proper date formatting!
        if (monthView) {
            table.rowLabels[row] = (row + 1) + "." + (month + 1) + "." + year;
        } else {
            var url = "/static/stats.html?" + $.param({year: year, month: row});
            table.rowLabels[row] = $('<a/>').attr("href", url).text((row + 1) + "." + year);
            table.rowClasses[row] = row >= currentMonth ? "future" : "past";
        }
    }
    table.rowLabels.push(monthView ? "total" : "average");
    table.colLabels = categories.map(function(cat) {return categoryLabels[cat]}).concat("sum");
    if (monthView) {
        var url = "/static/stats.html?" + $.param({year: year});
        table.axis = $('<a/>').attr("href", url).text(year);
    }

    // fill in and sum up expenses
    $.each(expenses, function(i, expense) {
        var date = new Date(expense.date * 1000);
        var row = month ? date.getDate() - 1 : date.getMonth();
        var col = $.inArray(expense.category, categories);
        var cell = table.rows[row][col];

        cell.expenses.push(expense);
        cell.sum += expense.amount;
        cell.text = formatMoney(cell.sum);
        cell.details.push(formatMoney(expense.amount) + " " + expense.category + (expense.text ? " (" + expense.text + ")" : ""));

        table.rowSums[row] += expense.amount;
        table.categorySums[col] += expense.amount;
        if (yearView && date.getMonth() < currentMonth) {
            table.pastCategorySums[col] += expense.amount;
        }
    });

    // compute grand total in three ways and do sanity check
    var categorySumsSum = table.categorySums.reduce(function(sumSum, sum) {return sumSum + sum;});
    var pastCategorySumsSum = yearView ? table.pastCategorySums.reduce(function(sumSum, sum) {return sumSum + sum;}) : 0;
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
        table.rows[i].push({text: formatMoney(sum)});
    });
    if (yearView) {
        var averagesRow = table.pastCategorySums.map(function(sum) {return {text: formatMoney(sum / currentMonth)}});
        averagesRow.push({text: formatMoney(pastCategorySumsSum / currentMonth)});
        table.rows.push(averagesRow);
    } else if (monthView) {
        table.rows.push(table.categorySums.map(function(sum) {return {text: formatMoney(sum)}}).concat({text: formatMoney(expensesSum)}));
    }

    $("#status").append(makeTable(table));
};

var handleAuthError = function(jqXHR) {
    if (jqXHR.status === 403) {
        window.location = "/static/token.html";
    }
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

    var url = "/stats/" + encodeURIComponent(year);
    if (month !== undefined) {
        url += "/" + encodeURIComponent(month);
    }
    $.getJSON(url, {token: localStorage.token}, function(expenses) {
        showExpenses(expenses, year, month);
    }).error(handleAuthError);
});
