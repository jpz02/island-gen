// function HexCell (q, r) {
//     this.q = q;
//     this.r = r;
//     this.s = -q -r;
//
//     this.data = {
//
//     };
//
//     this.subtract = function(other) {
//         return new HexCell(this.q - other.q, this.r - other.r)
//     };
//
//     this.length = function () {
//         return Math.floor((Math.abs(this.q) + Math.abs(this.q) + Math.abs(this.q)) / 2);
//     };
//
//     this.distance = function(other) {
//         return (this.subtract(other)).length();
//     };
//
//     this.equals = function(a, b) {
//         return a.q === b.q &&
//             a.r === b.r &&
//             a.s === b.s;
//     };
//
//     return this;
// }
//
// function HexGrid (size) {
//     this.grid = [];
//     this.size = size;
//
//     for (let r = 0; r < size; r++) {
//         this.grid[r] = [];
//         let r_off = Math.floor(r / 2); // or r>>1
//         for (let q = -r_off; q < size - r_off; q++) {
//             this.grid[r][q] = new HexCell(q, r);
//         }
//     }
//     function Cell(x, y) {
//         this.x = x;
//         this.y = y;
//
//         this.data = {};
//
//         return this;
//     }
//
//     function Grid(size) {
//         this.size = size;
//         this.cells = [];
//
//         for (let y = 0; y < size; y++) {
//             this.cells[y] = [];
//             for (let x = 0; x < size; x++) {
//                 this.cells[y][x] = new Cell(x, y);
//             }
//         }
//
//         return this;
//     }
// }

// retired hex version

// var cellWidth  = (canvasW) / (map.size + 0.5);
// var cellHeight = (cellWidth * 2) / Math.sqrt(3);
// var cellSize = cellHeight / 2;
//
// for (let r = 0; r < map.size; r++) {
//     let r_off = Math.floor(r/2);
//     for (let q = -r_off; q < map.size - r_off; q++) {
//         let x = (0.5*(r+1) + q) * cellWidth;
//         let y = (0.75 * r + 0.5) * cellHeight;
//         let cell =paper.Path.RegularPolygon(new paper.Point(x, y), 6, cellSize);
//         cell.fillColor = "#FFA";
//         cell.strokeWidth = 1;
//         cell.strokeColor = "#AA5";
//         map.grid[r][q].data.poly = cell;
//     }
// }