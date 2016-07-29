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

var makeTable = function(table, subTableCb) {
    var thead = $("<thead/>");
    var headTr = $("<tr/>");
    if (typeof table.axis === "string") {
        headTr.append($("<th/>").text(table.axis));
    } else if (table.axis) {
        headTr.append($("<th/>").append(table.axis));
    } else {
        headTr.append("<th/>");
    }
    $.each(table.colLabels, function(j, label) {
        headTr.append($("<th/>").text(label));
    });
    thead.append(headTr);

    var details = [];
    var mouseOver = function(event) {
        showTooltip($(this), subTableCb(details[$(this).data("detail")]));
    };
    var mouseOut = hideTooltip;

    var tbody = $("<tbody/>");
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
                var detailId = details.length;
                details.push(col.details);
                td.data("detail", detailId).mouseover(mouseOver).mouseout(mouseOut);
            }
            tr.append(td);
        });
        tbody.append(tr);
    });

    return $("<table/>").append(thead).append(tbody);
};

var showTooltip = function(el, content) {
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
    return 32 - new Date(year, month, 32).getUTCDate();
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

var computeExpensesTable = function(expenses, year, month) {
    var monthView = month !== undefined;
    var yearView = !monthView;
    var currentMonth = (year === new Date().getUTCFullYear()) ? new Date().getUTCMonth() : 12;
    var table = [];
    var rowCount = monthView ? daysInMonth(month, year) : 12;
    
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
        table.rowClasses[row] = "";
        //FIXME: proper date formatting!
        if (monthView) {
            table.rowLabels[row] = (row + 1) + "." + (month + 1) + "." + year;
        } else {
            var url = "/static/stats.html?" + $.param({year: year, month: row});
            table.rowLabels[row] = $('<a/>').attr("href", url).text((row + 1) + "." + year);
            table.rowClasses[row] += " " + (row >= currentMonth ? "future" : "past");
        }
    }
    table.rowLabels.push(monthView ? "total" : "average");
    table.rowClasses.push("results");
    table.colLabels = categories.map(function(cat) {return categoryLabels[cat]}).concat("sum");
    if (monthView) {
        var url = "/static/stats.html?" + $.param({year: year});
        table.axis = $('<a/>').attr("href", url).text(year);
    }

    // fill in and sum up expenses
    $.each(expenses, function(i, expense) {
        var date = new Date(expense.date * 1000);
        var row = monthView ? date.getUTCDate() - 1 : date.getUTCMonth();
        var col = $.inArray(expense.category, categories);
        var cell = table.rows[row][col];

        cell.expenses.push(expense);
        cell.sum += expense.amount;
        cell.text = formatMoney(cell.sum);
        cell.details.push(expense);

        table.rowSums[row] += expense.amount;
        table.categorySums[col] += expense.amount;
        if (yearView && date.getUTCMonth() < currentMonth) {
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

    return table;
};

var makeExpSubTable = function(details) {
    var table = $('<table/>');
    $.each(details, function(i, expense) {
        var tr = $('<tr/>');
        tr.append($('<td/>').text(formatMoney(expense.amount)));
        tr.append($('<td/>').text(expense.category));
        tr.append($('<td/>').text(expense.text));
        table.append(tr);
    });

    return table;
};

var showExpenses = function(expenses, year, month) {
    $("#status").append(makeTable(computeExpensesTable(expenses, year, month), makeExpSubTable).addClass("stats"));
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
        year = new Date().getUTCFullYear();
        month = new Date().getUTCMonth();
    }

    var url = "/stats/" + encodeURIComponent(year);
    if (month !== undefined) {
        url += "/" + encodeURIComponent(month);
    }
    $.ajax({
        url: url,
        dataType: 'json',
        cache: false,
        data: {token: localStorage.token},
        success: function(expenses) {
            showExpenses(expenses, year, month);
        }
    }).error(handleAuthError);
});
