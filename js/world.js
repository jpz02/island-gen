function World (app) {
    let world = this;
    this.map = [];
    this.app = app;

    this.selected = null;

    this.config = {
        seed: 14,
        perlin: {
            octaves: 8,
            scale: 128,
            diminish: 0.50,
        },
        size: 180,
        sea_level: 0.5,
        coast_level: 0.02, // above sea level
        snow_level: 0.715,
        real_scale: 750,
        base_temp: 36,
    };

    this.bounds = {};

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
            temp: cell.data.temp.toFixed(2),
            hm: cell.data.height.toFixed(2),
            precip: cell.data.precip.toFixed(2),
        };

        // world.view.resetSelected();
        world.selected = cell;
        poly.oldColor = poly.fillColor;
        // poly.fillColor = "#F00";

        console.log(cell.data.air_water + " " + cell.data.precip + ", TEST TEMP: " + cell.data.test_temp);

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
            let ycomp = y * size;
            for (let x = 0; x < size; x++) {
                let cell = this.map.cells[ycomp + x];
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
            let ycomp = y * size;
            for (let x = 0; x < size; x++) {
                let cell = this.map.cells[ycomp + x];
                cell.data.height = perlin.noise(x, y, this.config.perlin.diminish);
            }
        }
    };

    this.calculateHeightBiomes = function() {
        for (let i = 0; i < this.map.cells.length; i++) {
            let cell = this.map.cells[i];
            let h = cell.data.height;

            cell.data.landHeight = h - world.config.sea_level;

            if (h < world.config.sea_level) {
                cell.data.biome = B_OCEAN;
            } else if (h <= world.config.sea_level + world.config.coast_level) {
                cell.data.biome = B_COAST;
            } else {
                cell.data.biome = B_UNK;
            }
        }
        this.simulateWindRain();
        this.calculateGeneralBiomes();
    };

    this.resetBounds = function () {
        world.bounds.maxPrecip = 0;
        world.bounds.minPrecipSnow = Number.MAX_SAFE_INTEGER;
        world.bounds.maxPrecipSnow = 0;
    };

    this.resetHeightStats = function () {
        for (let i = 0; i < this.map.cells.length; i++) {
            let cell = this.map.cells[i];
            let h = cell.data.height;
            cell.data.temp = world.lib.elevationToTemp(h);
            cell.data.precip = 0;
            cell.data.air_water = 0;
        }
    };

    this.simulateWindRain = function() {
        let size = world.config.size;
        this.resetBounds();
        this.resetHeightStats();
        for (let y = 0; y < size; y++) {
            let ycomp = y * size;
            let temp = this.map.cells[ycomp].data.temp;
            let air_water = 0;
            for (let x = 0; x < size; x++) {
                let cell = this.map.cells[ycomp + x];

                temp = 0.3 * cell.data.temp + temp * 0.7;

                let air_capacity = 70 * Math.exp(0.08 * temp);

                if (cell.data.biome === B_OCEAN || cell.data.biome === B_COAST) {
                    air_water += Math.exp(0.1 * temp) * (size / 180);
                    if (air_water > air_capacity) {
                        air_water = air_capacity;
                    }
                } else {
                    // the amount of water the air can't hold at this temperature
                    if (air_water > 0) {
                        let excess = air_water - air_capacity;
                        if (excess < 0) {
                            // excess would mean the air would dry out the ground
                            // but we are starting from a dry world, so w/e
                            excess = 0.01 * air_water;
                        }
                        let rain = excess * 0.05 * (size / 180);
                        let neighbours = this.map.neighbors(cell);
                        cell.data.precip += rain ;
                        for (let i = 0; i < neighbours.length; i++) {
                            neighbours[i].data.precip += rain * 0.3;
                        }
                        air_water -= rain;
                        world.bounds.maxPrecip = Math.max(world.bounds.maxPrecip, rain);
                    }

                }
                cell.data.air_water = air_water;
                cell.data.temp = temp;
            }
        }
    };

    this.calculateGeneralBiomes = function() {
        for (let i = 0; i < this.map.cells.length; i++) {
            let cell = this.map.cells[i];
            let data = cell.data;
            if (data.biome === B_OCEAN) continue; // the ocean can't change biome!
            if (data.biome === B_COAST) continue;
            if (data.temp < -3 && data.precip >= 0.005) {
                data.biome = B_SNOW;
                world.bounds.minPrecipSnow = Math.min(world.bounds.minPrecipSnow, data.precip);
                world.bounds.maxPrecipSnow = Math.max(world.bounds.maxPrecipSnow, data.precip);
            } else if (between(data.temp, -3, 5) && between(data.precip, 1, 100)) {
                data.biome = B_TUNDRA;
            } else if (between(data.temp, -3, 20) && between(data.precip, 40, 1000)) {
                data.biome = B_TEMPFOR;
            } else if (between(data.temp, 20, 40) && between(data.precip, 40, 1000)) {
                data.biome = B_TROPFOR;
            } else {
                if (data.precip > 0.4) {
                    data.biome = B_GRASSLAND;
                } else {
                    data.biome = B_DESERT;
                }
            }
        }
    };

    this.lib = {
        elevationToTemp: function (height) {
            let sea = world.config.sea_level;
            let snow = world.config.snow_level;
            let temp = world.config.base_temp;
            let val = 0;

            if (height < sea) {
                val = temp;
            } else {
                val = (((temp + 3) * height) / (sea - snow)) - ((3 * sea + snow * temp)/ (sea - snow));
            }
            return val;
        },
    };

    this.view = {
        showHeightMap: function () {
            for (let i = 0; i < world.map.cells.length; i++) {
                let cell = world.map.cells[i];
                let poly = cell.poly;
                poly.fillColor = new paper.Color((cell.data.height - 0.5) * 3);
            }
            world.view.refresh();
        },

        showPrecipitation: function () {
            for (let i = 0; i < world.map.cells.length; i++) {
                let cell = world.map.cells[i];
                let poly = cell.poly;
                poly.fillColor = new paper.Color(cell.data.precip / world.bounds.maxPrecip);
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
                            brightness = (data.height / world.config.sea_level) * 0.5 + 0.3;
                            poly.fillColor = ColourDB.base_ocean.multiply(brightness);
                            break;
                        case B_COAST:
                            brightness =
                                ((data.height - world.config.sea_level) / world.config.coast_level)
                                * 0.2 + 0.8;
                            poly.fillColor = ColourDB.base_coast.multiply(brightness);
                            break;
                        case B_SNOW:
                            brightness = pc_between(data.precip, world.bounds.minPrecipSnow, world.bounds.maxPrecipSnow);
                            poly.fillColor = ColourDB.base_snow.multiply(brightness * 0.2 + 0.8);
                            break;
                        case B_TUNDRA:
                            poly.fillColor = ColourDB.base_tundra.multiply(data.height);
                            break;
                        case B_TEMPFOR:
                            poly.fillColor = ColourDB.base_temperate.multiply(data.height);
                            break;
                        case B_TROPFOR:
                            poly.fillColor = ColourDB.base_tropical.multiply(data.height);
                            break;
                        case B_GRASSLAND:
                            poly.fillColor = ColourDB.base_grassland.multiply(data.height);
                            break;
                        case B_DESERT:
                            poly.fillColor = ColourDB.base_desert.multiply(data.height);
                            break;
                        case B_UNK:
                        default:
                            if ((x % 2) ^ (y % 2)) {
                                poly.fillColor = new paper.Color(0.5);
                            } else {
                                poly.fillColor = new paper.Color(0.4);
                            }
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
            //paper.view.draw();
        },
    };

    return this;
}

const B_UNK = 0;
const B_OCEAN = 1;
const B_SNOW = 2;
const B_COAST = 3;
const B_TUNDRA = 4;
const B_TEMPFOR = 5;
const B_TROPFOR = 6;
const B_GRASSLAND = 7;
const B_DESERT = 8;

const BiomeDB = [];


BiomeDB[B_UNK] = {
    name: "Unknown",
    vegetation: 0,
};
BiomeDB[B_OCEAN] = {
    name: "Ocean",
    vegetation: 0,
};
BiomeDB[B_SNOW] = {
    name: "Snow",
    vegetation: 0,
};
BiomeDB[B_COAST] = {
    name: "Coast",
    vegetation: 0,
};
BiomeDB[B_TUNDRA] = {
    name: "Tundra",
    vegetation: 1,
};
BiomeDB[B_TEMPFOR] = {
    name: "Temperate Forest",
    vegetation: 3,
};
BiomeDB[B_TROPFOR] = {
    name: "Tropical Forest",
    vegetation: 3,
};
BiomeDB[B_GRASSLAND] = {
    name: "Grassland",
    vegetation: 2,
};
BiomeDB[B_DESERT] = {
    name: "Desert",
    vegetation: 0,
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

    this.neighbors = function (cell) {
        let xmin = Math.max(0, cell.x - 1);
        let xmax = Math.min(this.size - 1, cell.x + 1);

        let ymin = Math.max(0, cell.y - 1);
        let ymax = Math.min(this.size - 1, cell.y + 1);

        let results = [];
        for (let y = ymin; y <= ymax; y++) {
            let ycomp = y * size;
            for (let x = xmin; x <= xmax; x++) {
                if (x === cell.x && y === cell.y) continue;
                results.push(this.getCell(x, y));
            }
        }
        return results;
    };

    return this;
}