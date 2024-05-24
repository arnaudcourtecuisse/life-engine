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
        const prob = Hyperparams.foodProdProb * 100;
        if (!Random.randomChance(prob)) return;

        const env = this.org.env;
        const cell_c = this.getRealCol();
        const cell_r = this.getRealRow();
        const [c, r] = Random.randomPick(Hyperparams.growableNeighbors);
        const target = env.grid_map.cellAt(cell_c + c, cell_r + r);

        if (target === null || target.state !== CellStates.empty) return;

        env.changeCell(cell_c + c, cell_r + r, CellStates.food, null);
    }
}

module.exports = ProducerCell;
