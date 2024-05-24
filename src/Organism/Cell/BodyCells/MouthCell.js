const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");

class MouthCell extends BodyCell {
    constructor(org, loc_col, loc_row) {
        super(CellStates.mouth, org, loc_col, loc_row);
    }

    performFunction() {
        const env = this.org.env;
        const real_c = this.getRealCol();
        const real_r = this.getRealRow();
        for (const [c, r] of Hyperparams.edibleNeighbors) {
            const cell = env.grid_map.cellAt(real_c + c, real_r + r);
            this.eatNeighbor(cell, env);
        }
    }

    eatNeighbor(n_cell, env) {
        if (n_cell?.state === CellStates.food) {
            env.changeCell(n_cell.col, n_cell.row, CellStates.empty, null);
            ++this.org.energy;
        }
    }
}

module.exports = MouthCell;
