var setExpensesCSV = function(expenses, year, month) {
    var table = computeExpensesTable(expenses, year, month);
    var txt = "";

    $.each(table.rows.slice(0, table.rows.length - 1), function(i, row) {
        $.each(row.slice(0, row.length - 1), function(j, col) {
            txt += (j === 0 ? "" : ",") + '"' + col.text.replace(/("|\\)/g, "\\$1") + '"';
        });
        txt += "\n";
    });

    $("#csv").text(txt);
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
        setExpensesCSV(expenses, year, month);
    }).error(handleAuthError);
});
