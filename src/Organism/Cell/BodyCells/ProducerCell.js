const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");
const Random = require("../../../Utils/Random");

class ProducerCell extends BodyCell {
    constructor(org, loc_col, loc_row) {
        super(CellStates.producer, org, loc_col, loc_row);
        this.org.anatomy.is_producer = true;
    }

    performFunction() {
        if (this.org.anatomy.is_mover && !Hyperparams.moversCanProduce) return;
        const env = this.org.env;
        const prob = Hyperparams.foodProdProb * 100;
        const real_c = this.getRealCol();
        const real_r = this.getRealRow();
        if (Random.randomChance(prob)) {
            const loc =
                Hyperparams.growableNeighbors[
                    Math.floor(
                        Math.random() * Hyperparams.growableNeighbors.length
                    )
                ];
            const loc_c = loc[0];
            const loc_r = loc[1];
            const cell = env.grid_map.cellAt(real_c + loc_c, real_r + loc_r);
            if (cell != null && cell.state == CellStates.empty) {
                env.changeCell(
                    real_c + loc_c,
                    real_r + loc_r,
                    CellStates.food,
                    null
                );
                return;
            }
        }
    }
}

module.exports = ProducerCell;
