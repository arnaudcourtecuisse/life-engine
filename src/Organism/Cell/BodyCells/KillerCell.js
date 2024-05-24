const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");

class KillerCell extends BodyCell {
    constructor(org, loc_col, loc_row) {
        super(CellStates.killer, org, loc_col, loc_row);
    }

    performFunction() {
        const env = this.org.env;
        const [kc, kr] = this.getPosition();
        for (const [tc, tr] of Hyperparams.killableNeighbors) {
            const cell = env.grid_map.cellAt(kc + tc, kr + tr);
            this.harmOrganism(cell);
        }
    }

    harmOrganism(targetCell) {
        const target = targetCell?.owner;
        if (
            !target ||
            target === this.org ||
            !target.living ||
            targetCell.state === CellStates.armor
        ) {
            return;
        }
        if (Hyperparams.instaKill && targetCell.state === CellStates.killer) {
            // Since insta-kill kills, we need to reciprocate now
            this.org.harm();
        }
        target.harm();
    }
}

module.exports = KillerCell;
