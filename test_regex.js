const CROSS_SHEET_REF = /('([^']+)'|([^'"\s:!*^\\/&+=<>(),\-]+))!(\$?[A-Z]+\$?[0-9]+(:\$?[A-Z]+\$?[0-9]+)?)/g;
const INTRA_CELL_REF = /(?<![A-Za-z0-9_!'])(\$?[A-Z]{1,3}\$?\d{1,7})(?::(\$?[A-Z]{1,3}\$?\d{1,7}))?(?![A-Za-z0-9_(])/g;

const formula = "C22/'1.Input_Raw_hide'!F68";
const clean = formula.replace(CROSS_SHEET_REF, '___XREF___');
console.log('Clean formula:', clean);

let m;
INTRA_CELL_REF.lastIndex = 0;
while ((m = INTRA_CELL_REF.exec(clean)) !== null) {
    console.log('Found intra ref:', m[1]);
}
