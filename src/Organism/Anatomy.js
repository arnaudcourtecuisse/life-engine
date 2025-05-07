const CellStates = require("./Cell/CellStates");
const BodyCellFactory = require("./Cell/BodyCells/BodyCellFactory");
const SerializeHelper = require("../Utils/SerializeHelper");

class Anatomy {
    constructor(owner) {
        this.owner = owner;
        this.birth_distance = 2;
        this.move_cost = 0;
        this.rotation_cost = 0;
        this.clear();
    }

    clear() {
        this.grid = {};
        this.cells = [];
        this.is_producer = false;
        this.is_mover = false;
        this.has_eyes = false;
    }

    canAddCellAt(c, r) {
        return !([c, r] in this.grid);
    }

    #addCell(cell, c, r) {
        this.move_cost += 1;
        this.rotation_cost += c * c + r * r;
        const distance = 2 * (1 + Math.max(Math.abs(c), Math.abs(r)));
        if (distance > this.birth_distance) {
            this.birth_distance = distance;
        }
        this.cells.push(cell);
        this.grid[[c, r]] = cell;
        return cell;
    }
    addDefaultCell(state, c, r) {
        const new_cell = BodyCellFactory.createDefault(this.owner, state, c, r);
        return this.#addCell(new_cell, c, r);
    }

    addRandomizedCell(state, c, r) {
        if (state == CellStates.eye && !this.has_eyes) {
            this.owner.brain.randomizeDecisions();
        }
        const new_cell = BodyCellFactory.createRandom(this.owner, state, c, r);
        return this.#addCell(new_cell, c, r);
    }

    addInheritCell(parent_cell) {
        const new_cell = BodyCellFactory.createInherited(
            this.owner,
            parent_cell
        );
        return this.#addCell(
            new_cell,
            parent_cell.loc_col,
            parent_cell.loc_row
        );
    }

    replaceCell(state, c, r, randomize = true) {
        this.removeCell(c, r, true);
        if (randomize) {
            return this.addRandomizedCell(state, c, r);
        } else {
            return this.addDefaultCell(state, c, r);
        }
    }

    removeCell(c, r, allow_center_removal = false) {
        if (c == 0 && r == 0 && !allow_center_removal) return false;
        for (let i = 0; i < this.cells.length; i++) {
            const cell = this.cells[i];
            if (cell.loc_col == c && cell.loc_row == r) {
                this.move_cost -= 1;
                this.rotation_cost -= c * c + r * r;
                this.cells.splice(i, 1);
                delete this.grid[[c, r]];
                break;
            }
        }
        this.checkTypeChange();
        return true;
    }

    getLocalCell(c, r) {
        for (const cell of this.cells) {
            if (cell.loc_col == c && cell.loc_row == r) {
                return cell;
            }
        }
        return null;
    }

    checkTypeChange() {
        this.is_producer = false;
        this.is_mover = false;
        this.has_eyes = false;
        for (const cell of this.cells) {
            if (cell.state == CellStates.producer) this.is_producer = true;
            if (cell.state == CellStates.mover) this.is_mover = true;
            if (cell.state == CellStates.eye) this.has_eyes = true;
        }
    }

    getRandomCell() {
        return this.cells[Math.floor(Math.random() * this.cells.length)];
    }

    getNeighborsOfCell(col, row) {
        const neighbors = [];
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                const neighbor = this.getLocalCell(col + x, row + y);
                if (neighbor) neighbors.push(neighbor);
            }
        }

        return neighbors;
    }

    isEqual(anatomy) {
        // currently unused helper func. inefficient, avoid usage in prod.
        if (this.cells.length !== anatomy.cells.length) return false;
        for (const i in this.cells) {
            const my_cell = this.cells[i];
            const their_cell = anatomy.cells[i];
            if (
                my_cell.loc_col !== their_cell.loc_col ||
                my_cell.loc_row !== their_cell.loc_row ||
                my_cell.state !== their_cell.state
            )
                return false;
        }
        return true;
    }

    serialize() {
        const anatomy = SerializeHelper.copyNonObjects(this);
        anatomy.cells = [];
        for (const cell of this.cells) {
            const newcell = SerializeHelper.copyNonObjects(cell);
            newcell.state = { name: cell.state.name };
            anatomy.cells.push(newcell);
        }
        return anatomy;
    }

    loadRaw(anatomy) {
        this.clear();
        for (const cell of anatomy.cells) {
            this.addInheritCell(cell);
        }
    }
}

module.exports = Anatomy;
