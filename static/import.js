// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
function CSVToArray( strData, strDelimiter ){
    // Check to see if the delimiter is defined. If not,
    // then default to comma.
    strDelimiter = (strDelimiter || ",");

    // Create a regular expression to parse the CSV values.
    var objPattern = new RegExp(
            (
                    // Delimiters.
                    "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

                    // Quoted fields.
                    "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

                    // Standard fields.
                    "([^\"\\" + strDelimiter + "\\r\\n]*))"
            ),
            "gi"
            );


    // Create an array to hold our data. Give the array
    // a default empty first row.
    var arrData = [[]];

    // Create an array to hold our individual pattern
    // matching groups.
    var arrMatches = null;


    // Keep looping over the regular expression matches
    // until we can no longer find a match.
    while (arrMatches = objPattern.exec( strData )){

            // Get the delimiter that was found.
            var strMatchedDelimiter = arrMatches[ 1 ];

            // Check to see if the given delimiter has a length
            // (is not the start of string) and if it matches
            // field delimiter. If id does not, then we know
            // that this delimiter is a row delimiter.
            if (
                    strMatchedDelimiter.length &&
                    (strMatchedDelimiter != strDelimiter)
                    ){

                    // Since we have reached a new row of data,
                    // add an empty row to our data array.
                    arrData.push( [] );

            }


            // Now that we have our delimiter out of the way,
            // let's check to see which kind of value we
            // captured (quoted or unquoted).
            if (arrMatches[ 2 ]){

                    // We found a quoted value. When we capture
                    // this value, unescape any double quotes.
                    var strMatchedValue = arrMatches[ 2 ].replace(
                            new RegExp( "\"\"", "g" ),
                            "\""
                            );

            } else {

                    // We found a non-quoted value.
                    var strMatchedValue = arrMatches[ 3 ];

            }


            // Now that we have our value string, let's add
            // it to the data array.
            arrData[ arrData.length - 1 ].push( strMatchedValue );
    }

    // Return the parsed data.
    return( arrData );
}

var addExpensesFromCsv = function(text) {
    var csv = CSVToArray(text);
    var categories = ["food", "household", "party", "leisure", "health", "rent", "clothes", "transport", "misc"];

    csv.filter(function(fields){return fields.length > 1}).forEach(function(fields) {
        var ymd = fields[0].split("/");
        var date = new Date(ymd[2], ymd[0] - 1, ymd[1]);

        var rowSum = 0;
        for (var i = 2; i <= 10; i++) {
            if (fields[i]) {
                addExpense({
                    eid: "" + new Date().getTime() + "_" + Math.random(), 
                    date: date.getTime() / 1000,
                    amount: Math.round(parseFloat(fields[i]) * 100),
                    category: categories[i - 2],
                    text: (i >= 5 && i != 9) ? (fields[11] || "") : "",
                });
                rowSum += parseFloat(fields[i]);
            }
        }

        if (Math.abs(rowSum - parseFloat(fields[1])) > 0.0001) {
            console.log("ERROR: " + fields[0]);
        }
    });
};

$(document).ready(function() {
    $("#addCSV").click(function() {
        addExpensesFromCsv($("#csv").val());
        listExpenses($("#list"));
        return false;
    });
});
