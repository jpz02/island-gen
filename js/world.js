function World (app) {
    let world = this;
    this.map = [];
    this.app = app;

    this.selected = null;

    this.config = {
        seed: 188,
        perlin: {
            octaves: 8,
            scale: 256,
            diminish: 0.55,
        },
        size: 180,
        sea_level: 0.08,
        coast_level: 0.03, // above sea level
        snow_level: 0.5,
        real_scale: 750,
    };

    this.showToolTip = function(event) {
        let cell = world.map.getCell(event.target.x, event.target.y);
        let poly = cell.poly;
        let biome = BiomeDB[cell.data.biome];
        let real = world.config.real_scale;

        world.app.popup = {
            title: biome.name,
            elevation: (cell.data.landHeight * real).toFixed(2),
            x: cell.x,
            y: cell.y,
        };

        // world.view.resetSelected();
        world.selected = cell;
        poly.oldColor = poly.fillColor;
        // poly.fillColor = "#F00";

        let tt = $('#tooltip-template');
        tt.find('#tt-image').css('background-color', poly.oldColor.toCSS());
        if (event.target.x < world.config.size / 2) {
            tt.css('left', '');
            tt.css('right', '10px');
        } else {
            tt.css('right', '');
            tt.css('left', '10px');
        }

        if (!tt.is(":visible")) {
            tt.fadeIn(200);
        }
    };

    this.init = function() {
        let size = this.config.size;
        this.map = new Grid(size);
        this.built = false;

        let canvasH = paper.view.size.height;
        let cellLength = canvasH / size;
        let cellSize = new paper.Size(cellLength, cellLength);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let cell = this.map.getCell(x, y);
                let poly = paper.Path.Rectangle(new paper.Point(x * cellLength, y * cellLength), cellSize);
                cell.poly = poly;
                poly.x = x;
                poly.y = y;
                poly.fillColor = "#000";
                poly.onMouseDown = world.showToolTip;
            }
        }

        this.built = true;
        this.view.refresh();
    };

    this.makeHeightMap = function() {
        let size = this.config.size;
        let perlin = new PerlinNoise(
            this.config.seed,
            this.config.perlin.octaves,
            this.config.perlin.scale
        );
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let cell = this.map.getCell(x, y);
                cell.data.height = perlin.noise(x, y, this.config.perlin.diminish);
            }
        }
    };

    this.calculateHeightBiomes = function() {
        let test = 0;
        for (let i = 0; i < this.map.cells.length; i++) {
            let cell = this.map.cells[i];
            let h = cell.data.height;

            cell.data.landHeight = h - world.config.sea_level;

            if (h < world.config.sea_level) {
                test = h;
                cell.data.biome = B_OCEAN;
            } else if (h <= world.config.sea_level + world.config.coast_level) {
                cell.data.biome = B_COAST;
            } else if (cell.data.height >= world.config.snow_level) {
                cell.data.biome = B_SNOW;
            } else {
                cell.data.biome = B_UNK;
            }
        }
        console.log(test);
    };

    this.view = {
        showHeightMap: function () {
            for (let i = 0; i < world.map.cells.length; i++) {
                let cell = world.map.cells[i];
                let poly = cell.poly;
                poly.fillColor = new paper.Color(cell.data.height);
            }
            world.view.refresh();
        },

        showRenderedMap: function () {
            let size = world.config.size;

            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    let cell = world.map.getCell(x, y);
                    let poly = cell.poly;
                    let data = cell.data;
                    let brightness = 1;
                    switch(data.biome) {
                        case B_OCEAN:
                            brightness = (data.height / world.config.sea_level) * 0.5 + 0.5;
                            poly.fillColor = ColourDB.base_ocean.multiply(brightness);
                            break;
                        case B_COAST:
                            brightness =
                                ((data.height - world.config.sea_level) / world.config.coast_level)
                                * 0.2 + 0.8;
                            poly.fillColor = ColourDB.base_coast.multiply(brightness);
                            break;
                        case B_SNOW:
                            brightness = ((data.height - world.config.snow_level) / (1 - world.config.snow_level)) * 0.15 + 0.85;
                            poly.fillColor = ColourDB.base_snow.multiply(brightness);
                            break;
                        case B_UNK:
                        default:
                            poly.fillColor = new paper.Color(0.2, data.height* 0.3 + 0.3, 0.2);
                            break;
                    }
                }
            }
            world.view.refresh();
        },

        resetSelected: function () {
            if (world.selected === null) return;
            world.selected.poly.fillColor = world.selected.poly.oldColor;
            world.selected = null;
        },

        refresh: function() {
            paper.view.draw();
        },
    };

    return this;
}

const B_UNK = 0;
const B_OCEAN = 1;
const B_SNOW = 2;
const B_COAST = 3;

const BiomeDB = [];


BiomeDB[B_UNK] = {
    name: "Unknown",
};
BiomeDB[B_OCEAN] = {
    name: "Ocean",
};
BiomeDB[B_SNOW] = {
    name: "Snow",
};
BiomeDB[B_COAST] = {
    name: "Coast",
};

function Cell (x, y) {
    this.x = x;
    this.y = y;

    this.data = {};

    return this;
}

function Grid(size) {
    this.size = size;
    this.cells = [];

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            this.cells[y * size + x] =  new Cell(x, y);
        }
    }

    this.getCell = function(x, y) {
        return this.cells[y * this.size + x];
    };

    return this;
}