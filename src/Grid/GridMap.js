const Cell = require("../Organism/Cell/GridCell");
const CellStates = require("../Organism/Cell/CellStates");

class GridMap {
    constructor(cols, rows, cell_size) {
        this.resize(cols, rows, cell_size);
    }

    resize(cols, rows, cell_size) {
        this.grid = [];
        this.cols = cols;
        this.rows = rows;
        this.cell_size = cell_size;
        for (let c = 0; c < cols; c++) {
            const row = [];
            for (let r = 0; r < rows; r++) {
                const cell = new Cell(
                    CellStates.empty,
                    c,
                    r,
                    c * cell_size,
                    r * cell_size
                );
                row.push(cell);
            }
            this.grid.push(row);
        }
    }

    resetGrid(ignore_walls = false) {
        for (const col of this.grid) {
            for (const cell of col) {
                if (ignore_walls && cell.state === CellStates.wall) continue;
                cell.setType(CellStates.empty);
                cell.owner = null;
                cell.cell_owner = null;
            }
        }
    }

    cellAt(col, row) {
        return this.grid[col]?.[row] ?? null;
    }

    setCellType(col, row, state) {
        const cell = this.grid[col]?.[row];
        if (cell) cell.setType(state);
    }

    setCellOwner(col, row, cell_owner) {
        const cell = this.grid[col]?.[row];
        if (!cell) return;
        cell.cell_owner = cell_owner;
        if (cell_owner != null) cell.owner = cell_owner.org;
        else cell.owner = null;
    }

    getCenter() {
        return [Math.floor(this.cols / 2), Math.floor(this.rows / 2)];
    }

    xyToColRow(x, y) {
        let c = Math.floor(x / this.cell_size);
        let r = Math.floor(y / this.cell_size);
        if (c >= this.cols) c = this.cols - 1;
        else if (c < 0) c = 0;
        if (r >= this.rows) r = this.rows - 1;
        else if (r < 0) r = 0;
        return [c, r];
    }

    serialize() {
        // Rather than store every single cell, we will store non organism cells (food+walls)
        // and assume everything else is empty. Organism cells will be set when the organism
        // list is loaded. This reduces filesize and complexity.
        const grid = { cols: this.cols, rows: this.rows };
        grid.food = [];
        grid.walls = [];
        for (const col of this.grid) {
            for (const cell of col) {
                if (
                    cell.state === CellStates.wall ||
                    cell.state === CellStates.food
                ) {
                    const c = { c: cell.col, r: cell.row }; // no need to store state
                    if (cell.state === CellStates.food) grid.food.push(c);
                    else grid.walls.push(c);
                }
            }
        }
        return grid;
    }

    loadRaw(grid) {
        for (const f of grid.food) this.setCellType(f.c, f.r, CellStates.food);
        for (const w of grid.walls) this.setCellType(w.c, w.r, CellStates.wall);
    }
}

module.exports = GridMap;
