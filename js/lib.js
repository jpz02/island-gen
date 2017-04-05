function RandomGen (seed) {
    this.val = 0;

    this.seed = function(seed) {
        this.val = seed;
        this.gen();
        this.gen();
        this.gen();
    };

    this.gen = function() {
        this.val = (this.val * 17047) % Number.MAX_SAFE_INTEGER;
        return this.val;
    };

    this.next = function () {
        return this.gen() / Number.MAX_SAFE_INTEGER;
    };

    this.range = function(min, max) {
        return (this.gen() % (max - min + 1)) + min;
    };

    this.seed(seed);

    return this;
}

function MathRandomGen (seed) {

    this.seed = function(seed) {
        // do nothing
    };

    this.gen = function() {
        return Math.random() * Number.MAX_SAFE_INTEGER;
    };

    this.next = function () {
        return Math.random();
    };

    this.range = function(min, max) {
        return (this.gen() % (max - min + 1)) + min;
    };

    return this;
}

function SimplexNoise (seed) {
    // based upon Stefan Gustavson's work/implementation
    // http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf

    this.seed = 0;
    this.profile = 2048;
    this.rand = null;
    this.p = [];
    this.perm = [];

    this.grad3 = [
        [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
        [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
        [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];

    this.simplex = [
        [0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],
        [0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],
        [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],
        [1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],
        [1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],
        [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],
        [2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],
        [2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]
    ];

    this.setSeed = function (seed) {
        this.seed = seed;
        this.rand = new RandomGen(seed);

        for (let i=0; i< this.profile; i++) {
            this.p[i] = Math.floor(this.rand.range(0, this.profile - 1));
        }

        for (let i=0; i< this.profile * 2; i++) {
            this.perm[i]=this.p[i & this.profile - 1];
        }
    };

    // function definitions
    this.dot = function(g, x, y) {
        return g[0] * x + g[1] * y;
    };

    this.noise = function(xin, yin) {
        let n0 = 0, n1 = 0, n2 = 0;
        let f2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        let g2 = (3.0 - Math.sqrt(3.0)) / 6.0;

        let s = (xin + yin) * f2;
        let i = Math.floor(xin + s);
        let j = Math.floor(yin + s);

        let t = (i + j) * g2;
        let X0, Y0, x0, y0;
        X0 = i - t;
        Y0 = j - t;
        x0 = xin - X0;
        y0 = yin - Y0;

        let i1, j1;

        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } else {
            i1 = 0;
            j1 = 1;
        }

        let x1, y1, x2, y2;
        x1 = x0 - i1 + g2;
        y1 = y0 - j1 + g2;
        x2 = x0 - 1 + 2 * g2;
        y2 = y0 - 1 + 2 * g2;

        let ii, jj, gi0, gi1, gi2;

        ii = i & this.profile - 1;
        jj = j & this.profile - 1;

        gi0 = this.perm[ii + this.perm[jj]] % 12;
        gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
        gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

        let t0 = 0.5 - x0 * x0 - y0 * y0;

        if (t0 < 0) {
            n0 = 0;
        } else {
            t0 = t0 * t0;
            n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;

        if (t1 < 0 ) {
            n1 = 0;
        } else {
            t1 = t1 * t1;
            n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;

        if (t2 < 0 ) {
            n2 = 0;
        } else {
            t2 = t2 * t2;
            n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
        }

        let val = 70 * (n0 + n1 + n2);
        return (val + 1) / 2;
    };

    // init stuff
    this.setSeed(seed);

    return this;
}

function PerlinNoise (seed, octaves, scale) {
    this.simplex = [];
    this.seed = seed;
    this.octaves = octaves;
    this.scale = scale;

    this.initNoise = function() {
        let scale = this.scale;

        for (let i = 0; i < this.octaves && scale > 1; i++) {
            scale *= 0.5;
            this.simplex[i] = new SimplexNoise(seed + i);
        }

        this.octaves = this.simplex.length;
    };

    this.noise = function (x, y, diminish) {
        let result = 0;
        let scale = this.scale;
        let max = 0;
        let amplitude = 1;

        for (let i = 0; i < this.octaves && scale > 1; i++) {
            max += amplitude;
            result += this.simplex[i].noise(x / scale, y / scale) * amplitude;
            scale *= 0.5;
            amplitude *= diminish;
        }

        return result / max;
    };

    this.makeMap = function (width, height, diminish) {
        let map = [];
        for (let y = 0; y < height; y++) {
            map[y] = [];
            for (let x = 0; x < width; x++) {
                map[y][x] = this.noise(x, y, diminish);
            }
        }
        return map;
    };

    this.initNoise();

    return this;
}

let ColourDB = {
    base_ocean: new paper.Color(0.149, 0.243, 0.549),
    base_coast: new paper.Color(1, 1, 0.667),
    base_snow: new paper.Color(1, 1, 1),

    scale: function (color, brightness) {
        return color * brightness;
    },

    scaleMin: function (color, brightness, min) {
        let scale = min + ((1 - min) * brightness);
        return color * scale;
    }
};