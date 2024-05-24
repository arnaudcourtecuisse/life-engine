const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Hyperparams = require("../../../Hyperparameters");
const Directions = require("../../Directions");
const Observation = require("../../Perception/Observation");

class EyeCell extends BodyCell {
    constructor(org, loc_col, loc_row) {
        super(CellStates.eye, org, loc_col, loc_row);
        this.org.anatomy.has_eyes = true;
        this.observation = null; // cell most recently seen
    }

    initInherit(parent) {
        // deep copy parent values
        super.initInherit(parent);
        this.direction = parent.direction;
    }

    initRandom() {
        // initialize values randomly
        this.direction = Directions.getRandomDirection();
    }

    initDefault() {
        // initialize to default values
        this.direction = Directions.up;
    }

    getAbsoluteDirection() {
        return (this.org.rotation + this.direction) % 4;
    }

    performFunction() {
        this.observation = this.look();
    }

    getNumSensorNeurons() {
        return 3; // [observed cell type, observed cell distance, observed cell direction]
    }

    // Properties from observed cell
    // [type, distance, direction]
    getSensorValues() {
        if (this.observation == null) return [0.0, 0.0, 0.0]; // TODO: maybe create unique values for no cell found
        let stateIdx = 0;
        // TODO: clean this shit up it messy af
        for (var i = 0; i < CellStates.all.length; ++i) {
            if (this.observation.cell.state == CellStates.all[i]) {
                stateIdx = i;
                break;
            }
        }
        let typeScaled = stateIdx / CellStates.all.length;
        return [
            typeScaled,
            this.observation.distance / Hyperparams.lookRange,
            this.observation.direction / 3.0,
        ];
    }

    look() {
        const env = this.org.env;
        const direction = this.getAbsoluteDirection();
        let addCol = 0;
        let addRow = 0;
        switch (direction) {
            case Directions.up:
                addRow = -1;
                break;
            case Directions.down:
                addRow = 1;
                break;
            case Directions.right:
                addCol = 1;
                break;
            case Directions.left:
                addCol = -1;
                break;
        }
        const start_col = this.getRealCol();
        const start_row = this.getRealRow();
        let col = start_col;
        let row = start_row;
        let cell = null;
        for (let i = 0; i < Hyperparams.lookRange; i++) {
            col += addCol;
            row += addRow;
            cell = env.grid_map.cellAt(col, row);
            if (cell == null) {
                break;
            }
            if (cell.owner === this.org && Hyperparams.seeThroughSelf) {
                continue;
            }
            if (cell.state !== CellStates.empty) {
                const distance =
                    Math.abs(start_col - col) + Math.abs(start_row - row);
                return new Observation(cell, distance, direction);
            }
        }
        return null;
    }
}

module.exports = EyeCell;
