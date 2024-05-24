const MouthCell = require("./MouthCell");
const ProducerCell = require("./ProducerCell");
const MoverCell = require("./MoverCell");
const KillerCell = require("./KillerCell");
const ArmorCell = require("./ArmorCell");
const EyeCell = require("./EyeCell");
const CellStates = require("../CellStates");

const BodyCellFactory = {
    type_map: {
        [CellStates.mouth.name]: MouthCell,
        [CellStates.producer.name]: ProducerCell,
        [CellStates.mover.name]: MoverCell,
        [CellStates.killer.name]: KillerCell,
        [CellStates.armor.name]: ArmorCell,
        [CellStates.eye.name]: EyeCell,
    },

    createInherited: function (org, to_copy) {
        const cell = new this.type_map[to_copy.state.name](
            org,
            to_copy.loc_col,
            to_copy.loc_row
        );
        cell.initInherit(to_copy);
        return cell;
    },

    createRandom: function (org, state, loc_col, loc_row) {
        const cell = new this.type_map[state.name](org, loc_col, loc_row);
        cell.initRandom();
        return cell;
    },

    createDefault: function (org, state, loc_col, loc_row) {
        const cell = new this.type_map[state.name](org, loc_col, loc_row);
        cell.initDefault();
        return cell;
    },
};

module.exports = BodyCellFactory;
