const perlin = {
    rand_vect: function () {
        const theta = Math.random() * 2 * Math.PI;
        return { x: Math.cos(theta), y: Math.sin(theta) };
    },
    dot_prod_grid: function (x, y, vx, vy) {
        let g_vect;
        const d_vect = { x: x - vx, y: y - vy };
        if (this.gradients[[vx, vy]]) {
            g_vect = this.gradients[[vx, vy]];
        } else {
            g_vect = this.rand_vect();
            this.gradients[[vx, vy]] = g_vect;
        }
        return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
    },
    smootherstep: function (x) {
        return 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
    },
    interp: function (x, a, b) {
        return a + this.smootherstep(x) * (b - a);
    },
    seed: function () {
        this.gradients = {};
        this.memory = {};
    },
    get: function (x, y) {
        if ([x, y] in this.memory) return this.memory[[x, y]];
        const xf = Math.floor(x);
        const yf = Math.floor(y);
        //interpolate
        const tl = this.dot_prod_grid(x, y, xf, yf);
        const tr = this.dot_prod_grid(x, y, xf + 1, yf);
        const bl = this.dot_prod_grid(x, y, xf, yf + 1);
        const br = this.dot_prod_grid(x, y, xf + 1, yf + 1);
        const xt = this.interp(x - xf, tl, tr);
        const xb = this.interp(x - xf, bl, br);
        const v = this.interp(y - yf, xt, xb);
        this.memory[[x, y]] = v;
        return v;
    },
};
perlin.seed();

module.exports = perlin;
