function World (app) {
    let world = this;
    this.map = [];
    this.scoreTiles = [];
    this.app = app;

    this.map_layer = null;
    this.over_layer = null;

    this.selected = null;

    this.config = {
        seed: 342337,
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
        walk_dist: 40,
    };

    this.bounds = {};
    this.riverSeeds = [];

    this.showToolTip = function(event) {
        let cell = world.map.getCell(event.target.x, event.target.y);
        let poly = cell.poly;
        let biome = BiomeDB[cell.data.biome];
        let real = world.config.real_scale;
        let resources = [];

        if (cell.data.food > 0) {
            resources.push({name: "Food", amount: cell.data.food});
        }
        if (cell.data.gold > 0) {
            resources.push({name: "Gold", amount: cell.data.gold});
        }

        let score = world.map.cells[event.target.x - (event.target.x % 2) + (event.target.y - (event.target.y % 2) ) * world.config.size].data.score;
        score = score / world.bounds.maxScore;

        world.app.popup = {
            title: biome.name,
            elevation: (cell.data.landHeight * real).toFixed(2),
            x: cell.x,
            y: cell.y,
            temp: cell.data.temp.toFixed(2),
            hm: cell.data.height.toFixed(2),
            precip: cell.data.precip.toFixed(2),
            vegetation: (cell.data.vegetation * 100).toFixed(2),
            resources: resources,
            score: (score * 100).toFixed(2),
        };

        world.selected = cell;
        poly.oldColor = poly.fillColor;

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
            tt.show();
        }

    };

    this.init = function() {
        let size = this.config.size;
        this.map = new Grid(size);
        this.built = false;
        this.origSeed = world.config.seed;
        this.rand = new RandomGen(this.origSeed);

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

        paper.project.layers[1].activate();

        let scoreLength = cellLength * 1;
        let scoreSize = cellSize.multiply(1);

        for (let y = 0; y < size; y++) {
            let ycomp = y * size;
            for (let x = 0; x < size; x++) {
                let poly = paper.Path.Rectangle(new paper.Point(x * scoreLength, y * scoreLength), scoreSize);
                poly.opacity = 0.0;
                poly.x = x;
                poly.y = y;
                poly.onMouseDown = world.showToolTip;
                world.scoreTiles[ycomp + x] = poly;
            }
        }

        paper.project.layers[1].fillColor = "#000";
        paper.project.layers[1].visible = false;
        paper.project.layers[0].activate();

        this.built = true;
        this.view.refresh();
    };

    this.makeHeightMap = function() {
        let size = this.config.size;
        world.min = 1;
        world.max = 0;
        let perlin = new PerlinNoise(
            this.config.seed,
            this.config.perlin.octaves,
            this.config.perlin.scale
        );
        for (let y = 0; y < size; y++) {
            let ycomp = y * size;
            for (let x = 0; x < size; x++) {
                let cell = this.map.cells[ycomp + x];
                cell.data = {};
                cell.data.height = perlin.noise(x, y, this.config.perlin.diminish);
                world.min = Math.min(cell.data.height, world.min);
                world.max = Math.max(cell.data.height, world.max);
            }
        }
        console.log(world.bounds.min + " " + world.bounds.max);
    };

    this.calculateHeightBiomes = function() {
        world.riverSeeds = [];
        for (let i = 0; i < this.map.cells.length; i++) {
            let cell = this.map.cells[i];
            let h = cell.data.height;
            cell.data.is_water = false;
            cell.data.landHeight = h - world.config.sea_level;

            if (h < world.config.sea_level) {
                cell.data.biome = B_OCEAN;
                cell.data.is_water = true;
            } else if (h <= world.config.sea_level + world.config.coast_level) {
                cell.data.biome = B_COAST;
            } else {
                cell.data.biome = B_UNK;
            }
        }
        this.simulateWindRain();
        this.calculateGeneralBiomes();
        if (world.app.rivers) {
            // plant the rivers
            for (let i = 0; i < world.riverSeeds.length; i++) {
                this.calculateRivers(world.riverSeeds[i]);
            }
        }
        this.dropResources();
    };

    this.resetBounds = function () {
        world.bounds = {};
        world.bounds.maxPrecip = 0;
        world.bounds.minPrecipSnow = Number.MAX_SAFE_INTEGER;
        world.bounds.maxPrecipSnow = 0;
        world.bounds.maxPrecipGrass = 0;
        world.bounds.maxScore = 0;
    };

    this.resetCellStats = function () {
        world.riverSeeds = [];
        world.rand = new RandomGen(world.origSeed);
        for (let i = 0; i < this.map.cells.length; i++) {
            let cell = this.map.cells[i];
            let h = cell.data.height;
            cell.data.temp = world.lib.elevationToTemp(h);
            cell.data.precip = 0;
            cell.data.air_water = 0;
            cell.data.food = 0;
            cell.data.gold = 0;
            cell.data.score = 0;
        }
    };

    this.simulateWindRain = function() {
        let size = world.config.size;
        this.resetBounds();
        this.resetCellStats();
        for (let y = 0; y < size; y++) {
            let ycomp = y * size;
            let temp = this.map.cells[ycomp].data.temp;
            let air_water = 0;
            for (let x = 0; x < size; x++) {
                let cell = this.map.cells[ycomp + x];

                temp = 0.3 * cell.data.temp + temp * 0.7;

                let air_capacity = 70 * Math.exp(0.08 * temp);

                if (cell.data.is_water === true || cell.data.biome === B_COAST) {
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
                            neighbours[i].data.precip += rain * 0.6;
                        }
                        air_water -= rain;
                    }

                }
                cell.data.air_water = air_water;
                cell.data.temp = temp;
            }
        }

        for (let i = 0; i < this.map.cells.length; i++) {
            let cell = this.map.cells[i];
            world.bounds.maxPrecip = Math.max(world.bounds.maxPrecip, cell.data.precip);
        }
    };

    this.calculateGeneralBiomes = function() {
        for (let i = 0; i < this.map.cells.length; i++) {
            let cell = this.map.cells[i];
            let data = cell.data;
            data.vegetation = 0;
            if (data.biome === B_OCEAN) continue; // the ocean can't change biome!
            if (data.biome === B_COAST) continue;
            if (data.biome === B_RIVER) continue;
            if (data.temp < -3 && data.precip >= 0.005) {
                data.biome = B_SNOW;
                if (this.rand.next() < 0.04 * (data.precip / world.bounds.maxPrecipSnow)) {
                    world.riverSeeds.push(cell);
                }
                world.bounds.minPrecipSnow = Math.min(world.bounds.minPrecipSnow, data.precip);
                world.bounds.maxPrecipSnow = Math.max(world.bounds.maxPrecipSnow, data.precip);
            } else if (between(data.temp, -3, 5) && between(data.precip, 1, 200)) {
                data.biome = B_TUNDRA;
                data.vegetation = pc_between(data.precip, 1, 200);
            } else if (between(data.temp, -3, 20) && between(data.precip, 40, 1000)) {
                data.biome = B_TEMPFOR;
                data.vegetation = pc_between(data.precip, 40, 200);
            } else if (between(data.temp, 20, 40) && between(data.precip, 40, 1000)) {
                data.biome = B_TROPFOR;
                data.vegetation = pc_between(data.precip, 40, 200);
            } else {
                if (data.precip > 0.5) {
                    data.biome = B_GRASSLAND;
                    data.vegetation = 0;
                    world.bounds.maxPrecipGrass = Math.max(world.bounds.maxPrecipGrass, data.precip);
                } else {
                    data.biome = B_DESERT;
                }
            }
            // if we are in a really wet part of the world, there's a chance a river might start
            if ((cell.data.precip / world.bounds.maxPrecip) > 0.80 && this.rand.next() < 0.018) {
                world.riverSeeds.push(cell);
            }
        }
        // stage 2
        for (let g = 0; g < this.map.cells.length; g++) {
            let cell = this.map.cells[g];
            let data = cell.data;
            if (data.biome === B_GRASSLAND) {
                data.vegetation = pc_between(data.precip, 0, world.bounds.maxPrecipGrass);
                if (data.vegetation > 1) data.vegetation = 1;
            }
        }
    };

    this.calculateRivers = function (cell) {
        let closed = [];
        let max_depth = 0.025;
        let depth = cell.data.height;
        let queue = new PriorityQueue({
            comparator: function(a, b) {
                return a.data.height - b.data.height;
            }
        });
        queue.queue(cell);
        while (queue.length > 0) {
            if ((queue.peek()).data.height > depth + max_depth) {
                break;
            }

            let current = queue.dequeue();

            if (closed[current.y * world.config.size + current.x] === true) {
                continue;
            }

            if (current.data.biome === B_OCEAN) {
                break;
            } else if (current.data.biome === B_RIVER) {
                max_depth = 0.047;
            }

            closed[current.y * world.config.size + current.x] = true;
            let neighbors = world.map.fourNeighbors(current);

            for (let i = 0; i < neighbors.length; i++) {
                let n = neighbors[i];
                if (closed[n.y * world.config.size + n.x] !== true) {
                    queue.queue(n);
                }
            }

            if (current.data.biome !== B_SNOW) {
                current.data.biome = B_RIVER;
                current.data.is_water = true;
                depth = Math.min(current.data.height, depth);
            }
        }
        // conveniently, what is in the open list, is the coast of the river!
        while (queue.length > 0) {
            let shore = queue.dequeue();
            if (!shore.data.is_water && shore.data.biome !== B_SNOW) {
                if (BiomeDB[shore.data.biome].vegetation === 0) {
                    shore.data.biome = B_GRASSLAND;
                    shore.data.vegetation = 1;
                }
            }
        }
    };

    this.dropResources = function() {
        let n = 0;
        for (let i = 0; i < this.map.cells.length; i++) {

            let cell = this.map.cells[i];

            if (cell.data.is_water) continue;

            let pFood = 0;
            let pGold = 0;
            let data = cell.data;
            let neighbors = [];

            pGold += 0.11 * Math.exp(9 * (data.height - 1));
            neighbors = world.map.fourNeighborsAtDist(cell, 2);
            for (n = 0; n < neighbors.length; n++) {
                if (neighbors[n].data.gold > 0) {
                    pGold += 0.14;
                }
            }

            if (data.vegetation > 0.01) {
                pFood += 0.012 * Math.exp(2 * (data.vegetation - 1));
                neighbors = world.map.fourNeighborsAtDist(cell, 1);
                for (n = 0; n < neighbors.length; n++) {
                    if (neighbors[n].data.food > 0) {
                        pFood += 0.3;
                    }
                }
            }

            if (this.rand.next() < pGold) {
                cell.data.gold = this.rand.range(50, 80);
            }

            if (this.rand.next() < pFood) {
                cell.data.food = this.rand.range(90, 200);
            }
        }
    };

    this.scoreCell = function (cell) {
        if (cell.data.is_water) return 0;
        let score = 0;
        let queue = new PriorityQueue({
            comparator: function (a, b) {
                return a.dist - b.dist;
            }
        });

        let closed = [];

        queue.queue({cell: cell, dist: 0});
        while (queue.length > 0) {
            let current = queue.dequeue();
            let cCell = current.cell;
            let cDist = current.dist;

            if (closed[cCell.y * world.config.size + cCell.x] === true) {
                continue;
            }

            if (cDist > world.config.walk_dist) {
                break;
            }

            closed[cCell.y * world.config.size + cCell.x] = true;
            let neighbors = world.map.fourNeighbors(cCell);

            for (let i = 0; i < neighbors.length; i++) {
                let n = neighbors[i];
                if (closed[n.y * world.config.size + n.x] !== true) {
                    let weight = 1;
                    if (n.data.is_water) weight += 20;
                    if (BiomeDB[n.data.biome].vegetation > 2) weight += 1 * n.data.vegetation;
                    if (n.data.biome === B_DESERT) weight += 0.8;
                    if (n.data.biome === B_SNOW) weight += 0.5;
                    weight += Math.abs(n.data.height - cCell.data.height) * world.config.size;

                    queue.queue({cell: n, dist: cDist + weight});
                }
            }

            let dist_factor = ((world.config.walk_dist - cDist) / world.config.walk_dist) * 0.7 + 0.3;
            score += pc_between(cCell.data.food, 90, 200) * 6 * dist_factor;
            score += pc_between(cCell.data.gold, 50, 80) * 4 * dist_factor;
            if (BiomeDB[cCell.data.biome].vegetation > 2) {
                score += 0.005 * dist_factor; // good to have some forest around (for wood etc.)
            }

            if (cCell.data.biome === B_GRASSLAND) {
                score += 0.01 * dist_factor; // flat open grassland is good to have!
            }
        }
        world.bounds.maxScore = Math.max(world.bounds.maxScore, score);
        return score;
    };

    this.scoreCells = function(start_x, start_y) {
        let size = world.config.size;
        if (start_y * size + start_x >= size * size) {
            world.app.progress = 100;
            world.app.scoring = false;
            world.app.scored = true;
            world.app.view.scoring = true;
            world.view.showScoringMap();
            return;
        }
        world.app.progress = Math.round(((start_y * size + start_x) / (size * size)) * 100);
        let step = 2;
        let y = start_y;
        let ycomp = y * size;
        for (let x = start_x; x < size; x += step) {
            let cell = world.map.cells[ycomp + x];
            cell.data.score = world.scoreCell(cell);
        }
        setTimeout(function() {
            world.scoreCells(0, y + step);
        });
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
                let color = cell.data.height;
                if (color < world.config.sea_level) color = world.config.sea_level;
                poly.fillColor = new paper.Color(pc_between(color, world.config.sea_level, world.max));
            }
        },

        showPrecipitation: function () {
            let size = world.config.size;
            paper.project.layers[1].visible = true;
            paper.project.layers[1].fillColor = "#0AF";
            for (let y = 0; y < size; y++) {
                let ycomp = y * size;
                for (let x = 0; x < size; x++) {
                    let cell = world.map.cells[ycomp + x];
                    world.scoreTiles[ycomp + x].opacity = pc_between(cell.data.precip, 0, world.bounds.maxPrecip) * 0.9;
                }
            }
        },

        showRenderedMap: function () {
            let size = world.config.size;

            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    let cell = world.map.getCell(x, y);
                    let poly = cell.poly;
                    let data = cell.data;
                    let brightness = 1;
                    let bma = null;
                    let fill = null;
                    switch(data.biome) {
                        case B_OCEAN:
                            brightness = (data.height / world.config.sea_level) * 0.6 + 0.1;
                            poly.fillColor = ColourDB.base_ocean.multiply(brightness);
                            break;
                        case B_COAST:
                            brightness =
                                ((data.height - world.config.sea_level) / world.config.coast_level)
                                * 0.2 + 0.8;
                            poly.fillColor = ColourDB.base_coast.multiply(data.height * 0.2 + 0.8);
                            break;
                        case B_SNOW:
                            brightness = pc_between(data.precip, world.bounds.minPrecipSnow, world.bounds.maxPrecipSnow);
                            poly.fillColor = ColourDB.base_snow.multiply(brightness * 0.2 + 0.8);
                            break;
                        case B_TUNDRA:
                            poly.fillColor = ColourDB.base_tundra.multiply(data.height);
                            break;
                        case B_TEMPFOR:
                            bma = ColourDB.base_temperate.subtract(ColourDB.base_grassland).multiply(data.vegetation * 0.55 + 0.45);
                            fill = ColourDB.base_grassland.add(bma);
                            poly.fillColor = fill.multiply(data.height);
                            break;
                        case B_TROPFOR:
                            bma = ColourDB.base_tropical.subtract(ColourDB.base_grassland).multiply(data.vegetation * 0.6 + 0.4);
                            fill = ColourDB.base_tropical.add(bma);
                            poly.fillColor = fill.multiply(data.height);
                            break;
                        case B_GRASSLAND:
                            poly.fillColor = ColourDB.base_grassland.multiply(data.height);
                            break;
                        case B_DESERT:
                            poly.fillColor = ColourDB.base_desert.multiply(data.height);
                            break;
                        case B_RIVER:
                            poly.fillColor = ColourDB.base_river.multiply(data.height*0.2 + 0.8);
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
                    if (world.app.view.resources) {
                        if (data.gold > 0) {
                            poly.fillColor = ColourDB.base_gold;
                        }

                        if (data.food > 0) {
                            poly.fillColor = ColourDB.base_food;
                        }
                    }
                }
            }
        },

        showScoringMap: function() {
            let size = world.config.size;
            paper.project.layers[1].visible = true;
            paper.project.layers[1].fillColor = "#F00";
            for (let y = 0; y < size; y += 2) {
                let ycomp = y * size;
                for (let x = 0; x < size; x += 2) {
                    let cell = world.map.cells[ycomp + x];
                    let opac = pc_between(cell.data.score, 0, world.bounds.maxScore) * 0.9;
                    world.scoreTiles[ycomp + x].opacity = opac;
                    world.scoreTiles[ycomp + x + 1].opacity = opac;
                    world.scoreTiles[ycomp + size + x + 1].opacity = opac;
                    world.scoreTiles[ycomp + x + size].opacity = opac;
                }
            }
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
const B_RIVER = 9;

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
BiomeDB[B_RIVER] = {
    name: "River System",
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
        if (x < 0 || y < 0 || x >= this.size || y >= this.size) {
            return null;
        }
        return this.cells[y * this.size + x];
    };

    this.fourNeighbors = function (cell) {
        let results = [];
        let t = null;
        if (t = this.getCell(cell.x - 1, cell.y)) {
            results.push(t);
        }

        if (t = this.getCell(cell.x + 1, cell.y)) {
            results.push(t);
        }

        if (t = this.getCell(cell.x, cell.y - 1)) {
            results.push(t);
        }

        if (t = this.getCell(cell.x, cell.y + 1)) {
            results.push(t);
        }

        return results;
    };

    this.fourNeighborsAtDist = function (cell, x) {
        let results = [];
        let t = null;
        if (t = this.getCell(cell.x - x, cell.y)) {
            results.push(t);
        }

        if (t = this.getCell(cell.x + x, cell.y)) {
            results.push(t);
        }

        if (t = this.getCell(cell.x, cell.y - x)) {
            results.push(t);
        }

        if (t = this.getCell(cell.x, cell.y + x)) {
            results.push(t);
        }

        return results;
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