var path = require('path');
var fs = require('fs');

// var reader = require('array-reader');
var a = require('array-tools');

var pdfText = require('pdf-text');
var jf = require('jsonfile');

var pdfDir = path.join(__dirname, 'pdf');
var jsonDir = path.join(__dirname, 'json');

var file = 'new+civil+cases+filed+19-02-2015+to+05-03-2015.pdf';

var origin = path.join(pdfDir, file);
var dest = path.join(jsonDir, file.replace('.pdf', '.json'));

function exit(err) {
  console.log(err);
  process.exit(1);
}

// NOTE Select ONLY the Case Number which occupies the entire chunk, as some chunks
// contain a superfluous copy of that number at the start of the Case Title
var caseNumber = /^S\s+CI\s+2015\s+\d{5}$/;

pdfText(origin, function (err, chunks) {

  if (err) exit(err);

  var temp = chunks;
  var relevant = [];

  // Find the index of each Case Number in the chunks array
  var cases = temp.reduce(function (res, curr, i) {
    if (caseNumber.test(curr)) {
      res.push(i);
    }
    return res;
  }, []);

  var slices = cases.reduce(function (res, curr, i) {
    var ret = [];
    ret[0] = curr;
    ret[1] = cases[i + 1];

    // exclude undefined value at the end of the sequence
    if (cases[i + 1]) {
      res.push(ret);
    }
    return res;
  }, []);

  slices.forEach(function (piece) {

    // collect info for each case, beginning at the Case Number
    var caseInfo = chunks.slice(piece[0], piece[1]);

    // remove excess collected info, including disclaimers and cross-pages headers
    // cf. http://stackoverflow.com/questions/6449131/javascript-regular-expression-to-not-match-a-word
    var cleaned = a.spliceWhile(caseInfo, 0, /^((?!(DISCLAIMER)).)*$/);

    // now select only cases with COM Mortgages action codes
    if (a.exists(cleaned, 'COM Mortgages & Other Securities')) {

      // pick off all the easily identifiable pieces of information ...
      var caseNumber = cleaned.shift();
      var caseStatus = cleaned.pop();
      var actionCode = cleaned.pop();
      var filedDate = cleaned.pop();
      var locality = cleaned.pop();
      // ... until whatever's left must be the Case Title - TOO EASY!!
      var caseTitle = cleaned.join(' ').replace(/\s+/g, ' ').trim();

      var obj = {
        caseNumber: caseNumber,
        caseTitle: caseTitle,
        caseStatus: caseStatus,
        actionCode: actionCode,
        filedDate: filedDate,
        locality: locality
      };

      relevant.push(obj);
    }
  });

  console.log(relevant);

  jf.writeFile(dest, relevant, function (err) {
    console.log(err);
  });
});
