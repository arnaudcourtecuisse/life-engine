const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");

class KillerCell extends BodyCell {
    constructor(org, loc_col, loc_row) {
        super(CellStates.killer, org, loc_col, loc_row);
    }

    performFunction() {
        const env = this.org.env;
        const c = this.getRealCol();
        const r = this.getRealRow();
        for (const loc of Hyperparams.killableNeighbors) {
            const cell = env.grid_map.cellAt(c + loc[0], r + loc[1]);
            this.killNeighbor(cell);
        }
    }

    killNeighbor(n_cell) {
        if (
            n_cell == null ||
            n_cell.owner == null ||
            n_cell.owner == this.org ||
            !n_cell.owner.living ||
            n_cell.state == CellStates.armor
        )
            return;
        const is_hit = n_cell.state == CellStates.killer; // has to be calculated before death
        n_cell.owner.harm();
        if (Hyperparams.instaKill && is_hit) {
            this.org.harm();
        }
    }
}

module.exports = KillerCell;
